import { assertProductionDatabaseConfigured, checkDatabaseConnection } from '../server/db';
import { DataService } from '../server/services/dataService';

async function runTests() {
  console.log('====================================================');
  console.log(' Dawamy Production Fail-Closed & Storage Security Tests');
  console.log('====================================================');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  // Save original env
  const origEnv = process.env.NODE_ENV;
  const origDbUrl = process.env.DATABASE_URL;

  // -------------------------------------------------------------
  // Test 1: NODE_ENV=development, DATABASE_URL not set
  // Expected: Development works with preview fallback safely.
  // -------------------------------------------------------------
  console.log('\n--- Scenario 1: Development / Preview without DATABASE_URL ---');
  delete process.env.DATABASE_URL;
  (process.env as any).NODE_ENV = 'development';

  try {
    assertProductionDatabaseConfigured();
    assert(true, 'Scenario 1: assertProductionDatabaseConfigured allows development preview');
  } catch (e: any) {
    assert(false, `Scenario 1: Expected allow in development, but threw: ${e.message}`);
  }

  const isDevDb = await checkDatabaseConnection();
  assert(isDevDb === false, 'Scenario 1: checkDatabaseConnection correctly reports DB is not connected');

  // In development, fallback store is accessible
  try {
    const admin = await DataService.getEmployeeById('emp-admin-1');
    assert(admin !== null && admin.name.length > 0, 'Scenario 1: Fallback store is active in development/preview');
  } catch (e: any) {
    assert(false, `Scenario 1: Fallback store failed in dev: ${e.message}`);
  }

  // -------------------------------------------------------------
  // Test 2: NODE_ENV=production, DATABASE_URL not set
  // Expected: Startup fails closed immediately. Fallback store is forbidden.
  // -------------------------------------------------------------
  console.log('\n--- Scenario 2: Production without DATABASE_URL ---');
  delete process.env.DATABASE_URL;
  (process.env as any).NODE_ENV = 'production';

  let caughtProdMissingUrl = false;
  try {
    assertProductionDatabaseConfigured();
  } catch (e: any) {
    caughtProdMissingUrl = true;
    assert(e.message.includes('DATABASE_URL environment variable is missing'), 'Scenario 2: assertProductionDatabaseConfigured throws descriptive fatal error');
  }
  assert(caughtProdMissingUrl, 'Scenario 2: Production startup throws fatal exception when DATABASE_URL is missing');

  // Verify that any DataService operations FAIL CLOSED and never touch in-memory store in production
  let caughtCreateEmp = false;
  try {
    await DataService.createEmployee({
      name: 'Test Hack',
      email: 'hack@example.com',
      passwordPlain: 'Hack@123',
      role: 'employee',
      department: 'Engineering',
      jobTitle: 'Hacker',
    });
  } catch (e: any) {
    caughtCreateEmp = true;
    assert(e.message.includes('FAIL CLOSED'), 'Scenario 2: createEmployee throws FAIL CLOSED error in production without DB');
  }
  assert(caughtCreateEmp, 'Scenario 2: In-memory store is strictly blocked from saving Employee in production');

  let caughtAttendance = false;
  try {
    await DataService.checkIn('emp-admin-1', 'web');
  } catch (e: any) {
    caughtAttendance = true;
    assert(e.message.includes('FAIL CLOSED'), 'Scenario 2: checkIn throws FAIL CLOSED error in production without DB');
  }
  assert(caughtAttendance, 'Scenario 2: In-memory store is strictly blocked from saving Attendance in production');

  let caughtLeave = false;
  try {
    await DataService.createLeaveRequest({
      employeeId: 'emp-admin-1',
      leaveType: 'annual_leave',
      startDate: '2026-10-01',
      endDate: '2026-10-05',
      reason: 'Vacation',
    });
  } catch (e: any) {
    caughtLeave = true;
    assert(e.message.includes('FAIL CLOSED'), 'Scenario 2: createLeaveRequest throws FAIL CLOSED error in production without DB');
  }
  assert(caughtLeave, 'Scenario 2: In-memory store is strictly blocked from saving LeaveRequest in production');

  let caughtRemote = false;
  try {
    await DataService.createRemoteWorkRequest({
      employeeId: 'emp-admin-1',
      date: '2026-10-01',
      reason: 'Concentration day',
    });
  } catch (e: any) {
    caughtRemote = true;
    assert(e.message.includes('FAIL CLOSED'), 'Scenario 2: createRemoteWorkRequest throws FAIL CLOSED error in production without DB');
  }
  assert(caughtRemote, 'Scenario 2: In-memory store is strictly blocked from saving RemoteWorkRequest in production');

  let caughtAudit = false;
  try {
    await DataService.logAudit({
      action: 'TEST_AUDIT',
      entityType: 'test',
    });
  } catch (e: any) {
    caughtAudit = true;
    assert(e.message.includes('FAIL CLOSED'), 'Scenario 2: logAudit throws FAIL CLOSED error in production without DB');
  }
  assert(caughtAudit, 'Scenario 2: In-memory store is strictly blocked from saving AuditLog in production');

  // -------------------------------------------------------------
  // Test 3: NODE_ENV=production, DATABASE_URL set, but PostgreSQL unreachable
  // Expected: checkDatabaseConnection returns false; DataService operations FAIL CLOSED.
  // -------------------------------------------------------------
  console.log('\n--- Scenario 3: Production with unreachable PostgreSQL ---');
  process.env.DATABASE_URL = 'postgresql://invalid_user:invalid_pass@127.0.0.1:5439/non_existent_db?connect_timeout=2';
  (process.env as any).NODE_ENV = 'production';

  const isProdDbReachable = await checkDatabaseConnection();
  assert(isProdDbReachable === false, 'Scenario 3: checkDatabaseConnection returns false for unreachable DB');

  let caughtReadInProd = false;
  try {
    await DataService.getEmployeeById('emp-admin-1');
  } catch (e: any) {
    caughtReadInProd = true;
    assert(e.message.includes('FAIL CLOSED'), 'Scenario 3: Reading data when DB is down throws FAIL CLOSED');
  }
  assert(caughtReadInProd, 'Scenario 3: System refuses to read from memory store in production when DB is down');

  // Restore original environment
  (process.env as any).NODE_ENV = origEnv;
  if (origDbUrl) process.env.DATABASE_URL = origDbUrl;
  else delete process.env.DATABASE_URL;

  console.log('\n====================================================');
  console.log(` Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
