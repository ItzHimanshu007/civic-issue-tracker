import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { otpService } from '../services/otpService';
import { oauthService } from '../services/oauthService';
import { generateTokenPair, refreshAccessToken, revokeRefreshToken, extractToken, verifyAccessToken } from '../utils/jwt';
import { query } from '../utils/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Validation schemas
const phoneSchema = Joi.object({
  phoneNumber: Joi.string().min(8).max(20).required(),
});

const verifyOTPSchema = Joi.object({
  phoneNumber: Joi.string().min(8).max(20).required(),
  code: Joi.string().length(6).required(),
  name: Joi.string().max(100).optional(),
  email: Joi.string().email().optional(),
});

const googleOAuthSchema = Joi.object({
  token: Joi.string().required(),
});

const facebookOAuthSchema = Joi.object({
  token: Joi.string().required(),
});

const appleOAuthSchema = Joi.object({
  identityToken: Joi.string().required(),
  authorizationCode: Joi.string().required(),
  user: Joi.object({
    name: Joi.string().optional(),
  }).optional(),
});

// POST /api/auth/send-otp
router.post('/send-otp', async (req: Request, res: Response) => {
  const { error, value } = phoneSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.message });

  const result = await otpService.sendOTP(value.phoneNumber, 'login');
  return res.status(result.success ? 200 : 400).json(result);
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req: Request, res: Response) => {
  const { error, value } = verifyOTPSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.message });

  const { phoneNumber, code, name, email } = value;
  const verifyResult = await otpService.verifyOTP(phoneNumber, code);
  if (!verifyResult.success) return res.status(400).json(verifyResult);

  // Upsert user by phone number
  const userResult = await query(
    `INSERT INTO users (phone_number, name, email, is_verified)
     VALUES ($1, COALESCE($2, 'Citizen'), $3, TRUE)
     ON CONFLICT (phone_number) DO UPDATE SET
       name = COALESCE(EXCLUDED.name, users.name),
       email = COALESCE(EXCLUDED.email, users.email),
       is_verified = TRUE,
       updated_at = CURRENT_TIMESTAMP
     RETURNING id, name, phone_number, email, role, is_verified, is_active, created_at;`,
    [phoneNumber, name || null, email || null]
  );

  const user = userResult.rows[0];

  // Issue JWT tokens
  const tokens = await generateTokenPair({
    userId: user.id,
    phoneNumber: user.phone_number,
    role: user.role,
  });

  return res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        phoneNumber: user.phone_number,
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

// POST /api/auth/google
router.post('/google', async (req: Request, res: Response) => {
  const { error, value } = googleOAuthSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.message });

  const result = await oauthService.authenticateGoogle(value.token);
  return res.status(result.success ? 200 : 400).json(result);
});

// POST /api/auth/facebook
router.post('/facebook', async (req: Request, res: Response) => {
  const { error, value } = facebookOAuthSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.message });

  const result = await oauthService.authenticateFacebook(value.token);
  return res.status(result.success ? 200 : 400).json(result);
});

// POST /api/auth/apple
router.post('/apple', async (req: Request, res: Response) => {
  const { error, value } = appleOAuthSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.message });

  const result = await oauthService.authenticateApple(
    value.identityToken, 
    value.authorizationCode, 
    value.user
  );
  return res.status(result.success ? 200 : 400).json(result);
});

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
