import { Router } from 'express';
const router = Router();

router.get('/profile', (req, res) => {
  res.json({ success: true, data: { id: '1', name: 'John Doe' } });
});

export default router;
