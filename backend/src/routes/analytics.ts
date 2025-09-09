import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
  res.json({ success: true, data: { totalReports: 0, resolved: 0 } });
});

export default router;
