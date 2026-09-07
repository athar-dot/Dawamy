import { DataService } from '../server/services/dataService';

async function runVerification() {
  console.log('====================================================');
  console.log(' Dawamy Production Readiness & Security Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // Test 1: IDOR Scope check for Employee
  try {
    const scopedSara = await DataService.getEmployeesScoped({
      id: 'usr-emp-1',
      role: 'employee',
      employeeId: 'emp-sara-1',
    });
    assert(
      scopedSara.length === 1 && scopedSara[0].id === 'emp-sara-1',
      'IDOR: Standard Employee can only retrieve their own record'
    );
  } catch (e: any) {
    assert(false, `IDOR: Employee scope test failed: ${e.message}`);
  }

  // Test 2: IDOR Prevention on Employee Update
  try {
    let errorThrown = false;
    try {
      await DataService.updateEmployee(
        'emp-mgr-1',
        { phone: '+966 50 000 0000' },
        { id: 'usr-emp-1', role: 'employee', employeeId: 'emp-sara-1' }
      );
    } catch (err: any) {
      errorThrown = err.message.toLowerCase().includes('forbidden');
    }
    assert(errorThrown, 'IDOR: Employee cannot modify other employees profiles (Throws 403 Forbidden)');
  } catch (e: any) {
    assert(false, `IDOR update test: ${e.message}`);
  }

  // Test 3: Hierarchy Verification
  try {
    const isSaraSubordinateOfTariq = await DataService.isManagerOf('emp-mgr-1', 'emp-sara-1');
    const isTariqSubordinateOfSara = await DataService.isManagerOf('emp-sara-1', 'emp-mgr-1');
    const isSelfSubordinate = await DataService.isManagerOf('emp-mgr-1', 'emp-mgr-1');

    assert(isSaraSubordinateOfTariq === true, 'Hierarchy: Direct reporting recognized (Sara reports to Tariq)');
    assert(isTariqSubordinateOfSara === false, 'Hierarchy: Reverse relation rejected (Tariq does NOT report to Sara)');
    assert(isSelfSubordinate === false, 'Hierarchy: Self-management rejected');
  } catch (e: any) {
    assert(false, `Hierarchy test: ${e.message}`);
  }

  // Test 4: Self-Approval Prevention on Remote Work
  try {
    const testReq = await DataService.createRemoteWorkRequest({
      employeeId: 'emp-mgr-1',
      date: '2026-12-01',
      reason: 'Testing self approval prevention',
    });

    let selfApproveBlocked = false;
    try {
      await DataService.approveRemoteWorkRequest(testReq.id, {
        id: 'usr-mgr-1',
        name: 'طارق الخالدي',
        role: 'manager',
        employeeId: 'emp-mgr-1',
      });
    } catch (err: any) {
      selfApproveBlocked = err.message.toLowerCase().includes('self-approval');
    }
    assert(selfApproveBlocked, 'Business Logic: Self-approval is strictly forbidden on Remote Work');
  } catch (e: any) {
    assert(false, `Self-approval test: ${e.message}`);
  }

  // Test 5: Unrelated Manager Approval Prevention
  try {
    // Reem (HR employee ID emp-hr-1 acting as manager role) tries to approve Sara's request
    let unrelatedBlocked = false;
    try {
      await DataService.approveRemoteWorkRequest('remote-1', {
        id: 'usr-unrelated',
        name: 'مدير خارجي',
        role: 'manager',
        employeeId: 'emp-unrelated-mgr',
      });
    } catch (err: any) {
      unrelatedBlocked = err.message.toLowerCase().includes('forbidden');
    }
    assert(unrelatedBlocked, 'RBAC: Unrelated manager cannot approve requests for other teams');
  } catch (e: any) {
    assert(false, `Unrelated manager test: ${e.message}`);
  }

  // Test 6: Attendance Duplicate Check-In & Check-Out Sequence
  try {
    const testEmpId = 'emp-admin-1';
    // First check-in
    await DataService.checkIn(testEmpId, 'web', 'First punch');
    let duplicateCheckInBlocked = false;
    try {
      await DataService.checkIn(testEmpId, 'web', 'Second punch');
    } catch (err: any) {
      duplicateCheckInBlocked = err.message.includes('already checked in');
    }
    assert(duplicateCheckInBlocked, 'Attendance: Duplicate check-in on the same day is blocked');

    // Check-out
    await DataService.checkOut(testEmpId, 'End of shift');
    let duplicateCheckOutBlocked = false;
    try {
      await DataService.checkOut(testEmpId, 'Second checkout');
    } catch (err: any) {
      duplicateCheckOutBlocked = err.message.includes('already checked out');
    }
    assert(duplicateCheckOutBlocked, 'Attendance: Duplicate check-out on the same day is blocked');
  } catch (e: any) {
    assert(false, `Attendance sequence test: ${e.message}`);
  }

  // Test 7: Leave Balance Validation
  try {
    let excessLeaveBlocked = false;
    try {
      await DataService.createLeaveRequest({
        employeeId: 'emp-sara-1',
        leaveType: 'annual_leave',
        startDate: '2026-10-01',
        endDate: '2026-11-20', // ~50 days, balance is 21
        reason: 'Excessive vacation request',
      });
    } catch (err: any) {
      excessLeaveBlocked = err.message.includes('Insufficient');
    }
    assert(excessLeaveBlocked, 'Leave Management: Requests exceeding annual leave balance are rejected');
  } catch (e: any) {
    assert(false, `Leave balance test: ${e.message}`);
  }

  // Test 8: Failed Login Audit Logging
  try {
    const res = await DataService.login('sara.mansoor@dawamy.app', 'WrongPassword123');
    assert(res.success === false, 'Auth: Invalid password rejected');
  } catch (e: any) {
    assert(false, `Login test: ${e.message}`);
  }

  console.log('\n====================================================');
  console.log(` Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
