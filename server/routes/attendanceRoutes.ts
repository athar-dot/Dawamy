import { Router, Request, Response } from 'express';
import { DataService } from '../services/dataService';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/attendance - Scoped attendance query
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { employeeId, date } = req.query;
    const caller = req.user!;

    let targetEmpId: string | undefined = undefined;

    // RBAC and IDOR Enforcement:
    if (caller.role === 'employee') {
      if (employeeId && employeeId !== caller.employeeId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You can only query your own attendance records.',
        });
      }
      targetEmpId = caller.employeeId;
    } else if (caller.role === 'manager') {
      if (employeeId && employeeId !== caller.employeeId) {
        const isSubordinate = await DataService.isManagerOf(caller.employeeId!, employeeId as string);
        if (!isSubordinate) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: You can only query attendance records for yourself or direct subordinates.',
          });
        }
        targetEmpId = employeeId as string;
      } else {
        targetEmpId = (employeeId as string) || caller.employeeId;
      }
    } else {
      // HR and Admin can query any employee
      targetEmpId = (employeeId as string) || undefined;
    }

    const records = await DataService.getAttendanceRecords({
      employeeId: targetEmpId,
      date: (date as string) || undefined,
    });

    res.json({ success: true, records });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/attendance/check-in
router.post('/check-in', requireAuth, async (req: Request, res: Response) => {
  try {
    const { method = 'web', notes } = req.body;
    const employeeId = req.user!.employeeId;

    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'User is not linked to an employee profile.' });
    }

    const record = await DataService.checkIn(employeeId, method, notes);
    await DataService.logAudit({
      userId: req.user!.userId,
      action: 'CHECK_IN',
      entityType: 'attendance',
      entityId: employeeId,
      details: `Daily check-in via ${method}`,
    });

    res.json({ success: true, record, message: 'Check-in recorded successfully.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/attendance/check-out
router.post('/check-out', requireAuth, async (req: Request, res: Response) => {
  try {
    const { notes } = req.body;
    const employeeId = req.user!.employeeId;

    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'User is not linked to an employee profile.' });
    }

    const record = await DataService.checkOut(employeeId, notes);
    await DataService.logAudit({
      userId: req.user!.userId,
      action: 'CHECK_OUT',
      entityType: 'attendance',
      entityId: employeeId,
      details: `Check-out recorded`,
    });

    res.json({ success: true, record, message: 'Check-out recorded successfully.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
