import { Router, Request, Response } from 'express';
import { DataService } from '../services/dataService';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/dashboard
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = {
      id: req.user!.userId,
      role: req.user!.role,
      employeeId: req.user!.employeeId,
    };

    const dashboard = await DataService.getDashboard(user);
    res.json({ success: true, ...dashboard });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
