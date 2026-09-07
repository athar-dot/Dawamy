import { Router, Request, Response } from 'express';
import { DataService } from '../services/dataService';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/attendance
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { employeeId, date } = req.query;
    // Non-HR/Manager can only query their own attendance unless admin/hr/manager
    const targetEmpId =
      req.user?.role === 'employee'
        ? req.user.employeeId
        : (employeeId as string) || undefined;

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
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/attendance/check-out
router.post('/check-out', requireAuth, async (req: Request, res: Response) => {
  try {
    const { notes } = req.body;
    const employeeId = req.user!.employeeId;

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
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
