import { Router, Request, Response } from 'express';
import Joi from 'joi';
import bcrypt from 'bcryptjs';
import { generateTokenPair, refreshAccessToken, revokeRefreshToken } from '../utils/jwt';
import { query } from '../utils/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Validation schemas
const loginSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  password: Joi.string().min(6).required(),
});

// Default admin credentials for development
const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123', // In production, this would be hashed
  name: 'System Administrator',
  email: 'admin@civictracker.com',
  role: 'ADMIN'
};

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.message });

  const { username, password } = value;

  // Check if it's the default admin credentials
  if (username === DEFAULT_ADMIN.username && password === DEFAULT_ADMIN.password) {
    // Create/update admin user in database
    const userResult = await query(
      `INSERT INTO users (name, email, username, password_hash, phone_number, role, is_verified, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE)
       ON CONFLICT (username) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, name, username, email, role, is_verified, is_active, created_at;`,
      [DEFAULT_ADMIN.name, DEFAULT_ADMIN.email, DEFAULT_ADMIN.username, 
       await bcrypt.hash(DEFAULT_ADMIN.password, 10), '+1234567890', DEFAULT_ADMIN.role]
    );

    const user = userResult.rows[0];

    // Issue JWT tokens
    const tokens = await generateTokenPair({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
          isVerified: user.is_verified,
          createdAt: user.created_at,
        },
        tokens,
      },
    });
  }

  // Check database for other users (for future expansion)
  const userResult = await query(
    'SELECT id, name, username, email, password_hash, role, is_verified, is_active, created_at FROM users WHERE username = $1 AND is_active = TRUE',
    [username]
  );

  if (userResult.rows.length === 0) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const user = userResult.rows[0];
  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  if (!isValidPassword) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // Issue JWT tokens
  const tokens = await generateTokenPair({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  return res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        isVerified: user.is_verified,
        createdAt: user.created_at,
      },
      tokens,
    },
  });
});

// POST /api/auth/refresh-token
router.post('/refresh-token', async (req: Request, res: Response) => {
  const refreshToken = req.body?.refreshToken as string | undefined;
  if (!refreshToken) return res.status(400).json({ success: false, message: 'refreshToken is required' });

  try {
    const newTokens = await refreshAccessToken(refreshToken);
    return res.json({ success: true, data: { tokens: newTokens } });
  } catch (e: any) {
    return res.status(401).json({ success: false, message: e.message || 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
  await revokeRefreshToken(req.user.userId);
  return res.json({ success: true, message: 'Logged out successfully' });
});

// OAuth routes removed for now - focusing on username/password login

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await query(
    'SELECT id, name, phone_number, email, role, is_verified, is_active, created_at FROM users WHERE id = $1',
    [userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
  const user = result.rows[0];
  return res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      phoneNumber: user.phone_number,
      email: user.email,
      role: user.role,
      isVerified: user.is_verified,
      createdAt: user.created_at,
    }
  });
});

export default router;
