import { Router } from 'express';
const router = Router();

// GET /api/reports
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

// POST /api/reports
router.post('/', (req, res) => {
  const mockReport = {
    id: Date.now().toString(),
    title: req.body.title,
    description: req.body.description,
    category: req.body.category,
    priority: req.body.priority,
    status: 'SUBMITTED',
    location: req.body.location,
    address: req.body.address,
    images: [],
    videos: [],
    audioNotes: [],
    userId: '1',
    upvotes: 0,
    hasUserUpvoted: false,
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  res.status(201).json({
    success: true,
    data: mockReport
  });
});

// GET /api/reports/:id
router.get('/:id', (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.params.id,
      title: 'Sample Report',
      description: 'Sample description',
      status: 'SUBMITTED'
    }
  });
});

export default router;
