import { Router, Request, Response } from 'express';
import multer from 'multer';
import Joi from 'joi';
import { authenticateToken, requireVerification, authorizeRoles, optionalAuth } from '../middleware/auth';
import { query, withTransaction } from '../utils/database';
import { s3Service } from '../services/s3Service';
import { mlClassificationService } from '../services/mlClassificationService';
import { workflowService } from '../services/workflowService';
import { gamificationService } from '../services/gamificationService';
import { notificationService } from '../services/notificationService';
import { logger } from '../utils/logger';

const router = Router();

// Multer in-memory storage for direct S3 upload
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// Validation schemas
const createReportSchema = Joi.object({
  title: Joi.string().max(200).required(),
  description: Joi.string().max(5000).required(),
  category: Joi.string().valid('POTHOLE','STREETLIGHT','GARBAGE','WATER_LEAK','SEWAGE','ROAD_MAINTENANCE','TRAFFIC_SIGNAL','PARK_MAINTENANCE','NOISE_POLLUTION','OTHER').optional(),
  priority: Joi.string().valid('NORMAL','URGENT','CRITICAL').default('NORMAL'),
  latitude: Joi.number().required(),
  longitude: Joi.number().required(),
  address: Joi.string().required(),
  departmentId: Joi.string().uuid().optional(),
  autoClassify: Joi.boolean().default(true),
});

// GET /api/reports - list with optional filters
router.get('/', async (req: Request, res: Response) => {
  const { status, category, userId, limit = 20, offset = 0 } = req.query as any;

  let whereClauses: string[] = [];
  const params: any[] = [];

  if (status) { params.push(status); whereClauses.push(`status = $${params.length}`); }
  if (category) { params.push(category); whereClauses.push(`category = $${params.length}`); }
  if (userId) { params.push(userId); whereClauses.push(`user_id = $${params.length}`); }

  const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
  params.push(limit);
  params.push(offset);

  const result = await query(
    `SELECT id, title, description, category, priority, status, latitude, longitude, address, upvotes, created_at
     FROM reports ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({ success: true, data: result.rows });
});

// POST /api/reports - create report with media upload
router.post('/', authenticateToken, requireVerification, upload.array('files', 6), async (req: Request, res: Response) => {
  const { error, value } = createReportSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.message });

  const userId = req.user!.id;
  const files = (req.files as Express.Multer.File[]) || [];

  try {
    // Auto-classify if no category provided and enabled
    let category = value.category;
    if (!category && value.autoClassify !== false) {
      // Find first image if any
      const firstImageFile = files.find(f => f.mimetype.startsWith('image/'));
      
      if (firstImageFile) {
        // Upload first image to get URL for classification
        const uploadResult = await s3Service.uploadFile({
          buffer: firstImageFile.buffer,
          originalName: firstImageFile.originalname,
          mimeType: firstImageFile.mimetype,
          size: firstImageFile.size,
        }, 'temp-classification');
        
        if (uploadResult.success) {
          const classification = await mlClassificationService.classifyWithImage(
            value.title,
            value.description,
            uploadResult.data!.url
          );
          category = classification.category;
          
          // Clean up temp file
          await s3Service.deleteFile(uploadResult.data!.key);
        }
      } else {
        const classification = await mlClassificationService.classifyIssue(
          value.title,
          value.description
        );
        category = classification.category;
      }
    }
    
    const report = await withTransaction(async (client) => {
      // Insert report record
      const reportResult = await client.query(
        `INSERT INTO reports 
          (user_id, department_id, title, description, category, priority, status, latitude, longitude, address)
         VALUES ($1, $2, $3, $4, $5, $6, 'SUBMITTED', $7, $8, $9)
         RETURNING id, created_at`,
        [
          userId,
          value.departmentId || null,
          value.title,
          value.description,
          category || 'OTHER',
          value.priority || 'NORMAL',
          value.latitude,
          value.longitude,
          value.address,
        ]
      );

      const reportId = reportResult.rows[0].id as string;

      // Upload files to S3 and insert media records
      for (const f of files) {
        const uploadResult = await s3Service.uploadFile({
          buffer: f.buffer,
          originalName: f.originalname,
          mimeType: f.mimetype,
          size: f.size,
        }, `reports/${reportId}`);

        if (uploadResult.success && uploadResult.data) {
          const mediaType = f.mimetype.startsWith('image/') ? 'IMAGE' : f.mimetype.startsWith('video/') ? 'VIDEO' : f.mimetype.startsWith('audio/') ? 'AUDIO' : 'IMAGE';
          await client.query(
            `INSERT INTO media_files (report_id, file_url, thumbnail_url, file_name, file_size, mime_type, media_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              reportId,
              uploadResult.data.url,
              uploadResult.data.thumbnailUrl || null,
              f.originalname,
              f.size,
              f.mimetype,
              mediaType,
            ]
          );
        }
      }

      return {
        id: reportId,
        createdAt: reportResult.rows[0].created_at,
      };
    });

    // Process the report through workflow system
    await workflowService.processNewReport(report.id);
    
    // Award gamification points
    try {
      // Check if this is user's first report
      const userReportsResult = await query(
        'SELECT COUNT(*) as count FROM reports WHERE user_id = $1',
        [userId]
      );
      const isFirstReport = parseInt(userReportsResult.rows[0].count) === 1;
      
      if (isFirstReport) {
        await gamificationService.awardPoints(userId, 'FIRST_REPORT', 1, {
          reportId: report.id,
          reportTitle: value.title
        });
      } else {
        await gamificationService.awardPoints(userId, 'REPORT_SUBMITTED', 1, {
          reportId: report.id,
          reportTitle: value.title
        });
      }
    } catch (gamificationError) {
      logger.error('Error awarding gamification points:', gamificationError);
      // Don't fail the request if gamification fails
    }
    
    // Send notification for report submission
    try {
      await notificationService.sendMultiChannelNotification({
        userId,
        content: `Your report "${value.title}" has been submitted successfully.`,
        eventType: 'report_submitted',
        eventSource: 'reports',
        referenceId: report.id,
        data: {
          reportId: report.id,
          reportTitle: value.title,
          category: category || 'OTHER'
        }
      });
    } catch (notificationError) {
      logger.error('Error sending report submission notification:', notificationError);
    }
    
    return res.status(201).json({ success: true, data: { id: report.id, createdAt: report.createdAt } });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: 'Failed to create report' });
  }
});

// GET /api/reports/:id
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  
  const result = await query(
    `SELECT r.*, u.name as reporter_name,
            (SELECT json_agg(json_build_object(
               'id', m.id,
               'fileUrl', m.file_url,
               'thumbnailUrl', m.thumbnail_url,
               'fileName', m.file_name,
               'fileSize', m.file_size,
               'mimeType', m.mime_type,
               'mediaType', m.media_type,
               'createdAt', m.created_at
            )) FROM media_files m WHERE m.report_id = r.id) AS media
     FROM reports r 
     JOIN users u ON r.user_id = u.id
     WHERE r.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  const report = result.rows[0];
  
  // Get engagement data
  let engagementData = {
    userUpvoted: false,
    commentCount: 0,
    verificationStats: { verified: 0, disputed: 0, total: 0 }
  };
  
  try {
    const [upvoteResult, commentResult, verificationResult] = await Promise.all([
      userId ? query('SELECT id FROM upvotes WHERE report_id = $1 AND user_id = $2', [id, userId]) : Promise.resolve({ rows: [] }),
      query('SELECT COUNT(*) as count FROM comments WHERE report_id = $1 AND is_internal = false', [id]),
      query(`
        SELECT 
          COUNT(*) FILTER (WHERE verified = true) as verified,
          COUNT(*) FILTER (WHERE verified = false) as disputed,
          COUNT(*) as total
        FROM report_verifications WHERE report_id = $1
      `, [id])
    ]);
    
    engagementData = {
      userUpvoted: upvoteResult.rows.length > 0,
      commentCount: parseInt(commentResult.rows[0].count) || 0,
      verificationStats: {
        verified: parseInt(verificationResult.rows[0].verified) || 0,
        disputed: parseInt(verificationResult.rows[0].disputed) || 0,
        total: parseInt(verificationResult.rows[0].total) || 0
      }
    };
  } catch (error) {
    logger.error('Error fetching engagement data:', error);
  }
  
  return res.json({ 
    success: true, 
    data: { 
      ...report, 
      engagement: engagementData 
    } 
  });
});

// POST /api/reports/:id/classify - manually classify existing report
router.post('/:id/classify', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Fetch report with first image
  const result = await query(
    `SELECT r.title, r.description, m.file_url
     FROM reports r 
     LEFT JOIN media_files m ON r.id = m.report_id AND m.media_type = 'IMAGE'
     WHERE r.id = $1
     LIMIT 1`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  const report = result.rows[0];
  
  try {
    const classification = report.file_url
      ? await mlClassificationService.classifyWithImage(report.title, report.description, report.file_url)
      : await mlClassificationService.classifyIssue(report.title, report.description);

    // Update report category
    await query(
      'UPDATE reports SET category = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [classification.category, id]
    );

    return res.json({ success: true, data: classification });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Classification failed' });
  }
});

// POST /api/reports/:id/status - update report status
router.post('/:id/status', authenticateToken, authorizeRoles('STAFF', 'ADMIN'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, comment } = req.body;
  
  if (!status || !['ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Valid status is required' });
  }
  
  const result = await workflowService.transitionStatus(id, status, req.user!.id, comment);
  return res.status(result.success ? 200 : 400).json(result);
});

// POST /api/reports/:id/assign - assign report to staff
router.post('/:id/assign', authenticateToken, authorizeRoles('STAFF', 'ADMIN'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { staffId, comment } = req.body;
  
  if (!staffId) {
    return res.status(400).json({ success: false, message: 'Staff ID is required' });
  }
  
  const result = await workflowService.assignToStaff(id, staffId, req.user!.id, comment);
  return res.status(result.success ? 200 : 400).json(result);
});

// GET /api/reports/:id/history - get status history
router.get('/:id/history', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const result = await query(
    `SELECT sh.*, u.name as changed_by_name
     FROM status_history sh
     LEFT JOIN users u ON sh.changed_by_user_id = u.id
     WHERE sh.report_id = $1
     ORDER BY sh.created_at DESC`,
    [id]
  );
  
  return res.json({ success: true, data: result.rows });
});

// GET /api/reports/staff/available - get available staff for assignment
router.get('/staff/available', authenticateToken, authorizeRoles('STAFF', 'ADMIN'), async (req: Request, res: Response) => {
  const { departmentId } = req.query;
  
  const staff = await workflowService.getAvailableStaff(departmentId as string);
  return res.json({ success: true, data: staff });
});

// POST /api/reports/escalation/check - manually trigger escalation check (admin only)
router.post('/escalation/check', authenticateToken, authorizeRoles('ADMIN'), async (req: Request, res: Response) => {
  try {
    await workflowService.checkOverdueReports();
    return res.json({ success: true, message: 'Escalation check completed' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Escalation check failed' });
  }
});

export default router;
