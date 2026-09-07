import { Router, Request, Response } from 'express';
import { DataService } from '../services/dataService';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/employees - All employees (protected)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const employees = await DataService.getAllEmployees();
    res.json({ success: true, employees });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/employees - Create employee (Admin & HR only)
router.post('/', requireAuth, requireRole(['admin', 'hr']), async (req: Request, res: Response) => {
  try {
    const { name, nameEn, email, password, role, department, jobTitle, jobTitleEn, phone, avatar } = req.body;

    if (!name || !email || !password || !role || !department || !jobTitle) {
      return res.status(400).json({
        success: false,
        error: 'Missing required employee fields (name, email, password, role, department, jobTitle).',
      });
    }

    const created = await DataService.createEmployee({
      name,
      nameEn,
      email,
      passwordPlain: password,
      role,
      department,
      jobTitle,
      jobTitleEn,
      phone,
      avatar,
    });

    await DataService.logAudit({
      userId: req.user?.userId,
      action: 'CREATE_EMPLOYEE',
      entityType: 'employee',
      entityId: (created as any).id,
      details: `Created employee ${name} (${role}) by ${req.user?.name}`,
    });

    res.status(201).json({ success: true, employee: created });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
