import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { DataService } from '../services/dataService';
import { generateAuthToken, requireAuth } from '../middleware/auth';

const router = Router();

// Rate limiting for login route (defense against brute force attacks)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per 15 minutes window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both email and password.',
      });
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const result = await DataService.login(email, password, ipAddress);

    if (!result.success || !result.user) {
      return res.status(401).json({
        success: false,
        error: result.error || 'Authentication failed.',
      });
    }

    const user = result.user;
    const token = generateAuthToken({
      userId: user.id,
      employeeId: user.employee?.id || user.employeeId,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    });

    // Set secure HTTP-only cookie
    res.cookie('dawamy_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({
      success: true,
      token,
      user,
      message: 'Logged in successfully.',
    });
  } catch (error: any) {
    console.error('Error in /api/auth/login:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during login.',
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('dawamy_token');
  if (req.user) {
    DataService.logAudit({
      userId: req.user.userId,
      action: 'LOGOUT',
      entityType: 'user',
      entityId: req.user.userId,
      details: 'User explicitly logged out',
    }).catch(console.warn);
  }

  return res.json({
    success: true,
    message: 'Logged out successfully.',
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await DataService.getUserById(req.user!.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found.',
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        employeeId: (user as any).employee?.id || user.employeeId,
        name: user.name,
        nameEn: user.nameEn,
        email: user.email,
        role: user.role,
        department: user.department,
        employee: (user as any).employee,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/auth/me:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch user session.',
    });
  }
});

export default router;
