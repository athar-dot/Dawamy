import { Router, Request, Response } from 'express';
import { DataService } from '../services/dataService';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/remote-work - View remote work requests based on role
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = {
      id: req.user!.userId,
      role: req.user!.role,
      employeeId: req.user!.employeeId,
    };

    const requests = await DataService.getRemoteWorkRequests(user);
    res.json({
      success: true,
      requests,
      hrAudited: req.user!.role === 'hr' || req.user!.role === 'admin',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/remote-work - Create remote work request (Employee)
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { date, reason, tasksPlan, managerId } = req.body;

    if (!date || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Date and reason are required for remote work requests.',
      });
    }

    const employeeId = req.user!.employeeId;
    const request = await DataService.createRemoteWorkRequest({
      employeeId,
      date,
      reason,
      tasksPlan,
      managerId,
    });

    await DataService.logAudit({
      userId: req.user!.userId,
      action: 'REQUEST_REMOTE_WORK',
      entityType: 'remote_work_request',
      entityId: request.id,
      details: `Submitted remote work request for date ${date}. Pending direct manager approval.`,
    });

    res.status(201).json({
      success: true,
      request,
      message: 'Remote work request submitted. Awaiting manager approval.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/remote-work/:id/approve - Direct Manager or HR approves
router.put('/:id/approve', requireAuth, requireRole(['manager', 'hr', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const approverUser = {
      id: req.user!.userId,
      name: req.user!.name,
      role: req.user!.role,
      employeeId: req.user!.employeeId,
    };

    const approved = await DataService.approveRemoteWorkRequest(id, approverUser);
    if (!approved) {
      return res.status(404).json({ success: false, error: 'Request not found.' });
    }

    res.json({
      success: true,
      request: approved,
      message: 'Remote work approved. Employee attendance updated to WFH and visible to HR.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/remote-work/:id/reject - Direct Manager or HR rejects
router.put('/:id/reject', requireAuth, requireRole(['manager', 'hr', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const rejectorUser = {
      id: req.user!.userId,
      name: req.user!.name,
      role: req.user!.role,
    };

    const rejected = await DataService.rejectRemoteWorkRequest(id, rejectorUser, reason);
    if (!rejected) {
      return res.status(404).json({ success: false, error: 'Request not found.' });
    }

    res.json({
      success: true,
      request: rejected,
      message: 'Remote work request rejected.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
