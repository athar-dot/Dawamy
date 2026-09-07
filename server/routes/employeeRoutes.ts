import { Router, Request, Response } from 'express';
import { DataService } from '../services/dataService';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/employees - Scoped employee directory (RBAC enforced)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = {
      id: req.user!.userId,
      role: req.user!.role,
      employeeId: req.user!.employeeId,
    };

    const employees = await DataService.getEmployeesScoped(user);
    res.json({ success: true, employees });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/employees/:id - IDOR protected single employee profile
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const caller = req.user!;

    // IDOR Check 1: Standard employee cannot view other employees
    if (caller.role === 'employee' && caller.employeeId !== id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Access to another employee record is restricted.',
      });
    }

    // IDOR Check 2: Manager can only view own or direct subordinates
    if (caller.role === 'manager' && caller.employeeId !== id) {
      const isSubordinate = await DataService.isManagerOf(caller.employeeId!, id);
      if (!isSubordinate) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You can only view profiles of employees who directly report to you.',
        });
      }
    }

    const employee = await DataService.getEmployeeById(id);
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found.' });
    }

    res.json({ success: true, employee });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/employees/:id - Edit employee profile (RBAC & Field level security)
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updaterUser = {
      id: req.user!.userId,
      role: req.user!.role,
      employeeId: req.user!.employeeId,
    };

    const updated = await DataService.updateEmployee(id, req.body, updaterUser);

    await DataService.logAudit({
      userId: req.user!.userId,
      action: 'UPDATE_EMPLOYEE',
      entityType: 'employee',
      entityId: id,
      details: `Updated employee profile for ID: ${id} by ${req.user!.name} (${req.user!.role})`,
    });

    res.json({ success: true, employee: updated, message: 'Employee profile updated successfully.' });
  } catch (err: any) {
    const status = err.message.includes('Forbidden') ? 403 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
});

// POST /api/employees - Create employee (Admin & HR only)
router.post('/', requireAuth, requireRole(['admin', 'hr']), async (req: Request, res: Response) => {
  try {
    const { name, nameEn, email, password, role, department, jobTitle, jobTitleEn, phone, avatar, managerId } = req.body;

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
      managerId,
    });

    await DataService.logAudit({
      userId: req.user?.userId,
      action: 'CREATE_EMPLOYEE',
      entityType: 'employee',
      entityId: (created as any).id,
      details: `Created new employee ${name} (${role}) in department ${department} by ${req.user?.name}`,
    });

    res.status(201).json({ success: true, employee: created, message: 'Employee created successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
