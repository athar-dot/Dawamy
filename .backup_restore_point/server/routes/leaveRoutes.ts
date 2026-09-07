import { Router, Request, Response } from 'express';
import { DataService } from '../services/dataService';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/leaves
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = {
      id: req.user!.userId,
      role: req.user!.role,
      employeeId: req.user!.employeeId,
    };

    const leaves = await DataService.getLeaveRequests(user);
    res.json({ success: true, leaves });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leaves
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required leave fields (leaveType, startDate, endDate, reason).',
      });
    }

    const employeeId = req.user!.employeeId;
    const leave = await DataService.createLeaveRequest({
      employeeId,
      leaveType,
      startDate,
      endDate,
      reason,
    });

    await DataService.logAudit({
      userId: req.user!.userId,
      action: 'REQUEST_LEAVE',
      entityType: 'leave_request',
      entityId: leave.id,
      details: `Submitted leave request (${leaveType}) from ${startDate} to ${endDate}`,
    });

    res.status(201).json({
      success: true,
      leave,
      message: 'Leave request submitted successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/leaves/:id/approve
router.put('/:id/approve', requireAuth, requireRole(['manager', 'hr', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const approverUser = {
      id: req.user!.userId,
      name: req.user!.name,
      role: req.user!.role,
    };

    const approved = await DataService.approveLeaveRequest(id, approverUser);
    if (!approved) {
      return res.status(404).json({ success: false, error: 'Leave request not found.' });
    }

    res.json({
      success: true,
      leave: approved,
      message: 'Leave request approved successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/leaves/:id/reject
router.put('/:id/reject', requireAuth, requireRole(['manager', 'hr', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const rejectorUser = {
      id: req.user!.userId,
      name: req.user!.name,
      role: req.user!.role,
    };

    const rejected = await DataService.rejectLeaveRequest(id, rejectorUser, reason);
    if (!rejected) {
      return res.status(404).json({ success: false, error: 'Leave request not found.' });
    }

    res.json({
      success: true,
      leave: rejected,
      message: 'Leave request rejected.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
