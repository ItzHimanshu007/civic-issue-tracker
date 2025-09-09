import { Router } from 'express';
const router = Router();

// POST /api/auth/send-otp
router.post('/send-otp', (req, res) => {
  res.json({ 
    success: true, 
    message: 'OTP sent successfully' 
  });
});

// POST /api/auth/verify-otp  
router.post('/verify-otp', (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: '1',
        name: 'John Doe',
        phoneNumber: req.body.phoneNumber,
        email: 'john@example.com',
        isVerified: true,
        points: 150,
        badges: [],
        createdAt: new Date().toISOString(),
      },
      token: 'mock-jwt-token'
    }
  });
});

// POST /api/auth/google
router.post('/google', (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: '1',
        name: 'John Doe',
        phoneNumber: '+1234567890',
        email: 'john@example.com',
        isVerified: true,
        points: 150,
        badges: [],
        createdAt: new Date().toISOString(),
      },
      token: 'mock-jwt-token'
    }
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
});

export default router;
