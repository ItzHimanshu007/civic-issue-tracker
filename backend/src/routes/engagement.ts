import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { authenticateToken, requireVerification } from '../middleware/auth';
import { engagementService } from '../services/engagementService';
import { gamificationService } from '../services/gamificationService';
import { notificationService } from '../services/notificationService';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const commentSchema = Joi.object({
  content: Joi.string().min(1).max(1000).required(),
  isInternal: Joi.boolean().default(false),
  parentCommentId: Joi.string().uuid().optional(),
});

const verificationSchema = Joi.object({
  verified: Joi.boolean().required(),
  reason: Joi.string().max(500).optional(),
});

const updateCommentSchema = Joi.object({
  content: Joi.string().min(1).max(1000).required(),
});

// POST /api/engagement/reports/:id/upvote - toggle upvote on a report
router.post('/reports/:id/upvote', authenticateToken, requireVerification, async (req: Request, res: Response) => {
  const { id: reportId } = req.params;
  const userId = req.user!.id;

  const result = await engagementService.toggleUpvote(reportId, userId);
  
  // Award gamification points
  if (result.success) {
    try {
      // Get report details to find report owner
      const { query: dbQuery } = await import('../utils/database');
      const reportResult = await dbQuery('SELECT user_id, title FROM reports WHERE id = $1', [reportId]);
      
      if (reportResult.rows.length > 0) {
        const reportOwnerId = reportResult.rows[0].user_id;
        const reportTitle = reportResult.rows[0].title;
        
        if (result.data?.upvoted) {
          // Award points to the upvoter
          await gamificationService.awardPoints(userId, 'GIVE_UPVOTE', 1, {
            reportId,
            reportTitle
          });
          
          // Award points to the report owner
          if (reportOwnerId !== userId) {
            await gamificationService.awardPoints(reportOwnerId, 'REPORT_UPVOTED', 1, {
              reportId,
              reportTitle,
              upvoterId: userId
            });
            
            // Send notification to report owner
            try {
              const userResult = await dbQuery('SELECT name FROM users WHERE id = $1', [userId]);
              const upvoterName = userResult.rows[0]?.name || 'Someone';
              
              await notificationService.sendNotification({
                userId: reportOwnerId,
                type: 'PUSH',
                templateName: 'report_upvoted',
                content: `${upvoterName} upvoted your report "${reportTitle}"! +2 points earned.`,
                eventType: 'upvote_received',
                eventSource: 'engagement',
                referenceId: reportId,
                triggeredByUserId: userId,
                data: {
                  reportId,
                  reportTitle,
                  upvoterName,
                  points: 2
                }
              });
            } catch (notificationError) {
              logger.error('Error sending upvote notification:', notificationError);
            }
          }
        }
      }
    } catch (gamificationError) {
      logger.error('Error awarding gamification points for upvote:', gamificationError);
    }
  }
  
  return res.status(result.success ? 200 : 400).json(result);
});

// POST /api/engagement/reports/:id/comments - add comment to a report
router.post('/reports/:id/comments', authenticateToken, requireVerification, async (req: Request, res: Response) => {
  const { id: reportId } = req.params;
  const { error, value } = commentSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.message });

  const userId = req.user!.id;
  const { content, isInternal, parentCommentId } = value;

  // Only staff/admin can add internal comments
  if (isInternal && !['STAFF', 'ADMIN'].includes(req.user!.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions for internal comments' });
  }

  const result = await engagementService.addComment(reportId, userId, content, isInternal, parentCommentId);
  
  // Award gamification points
  if (result.success) {
    try {
      // Award points to the commenter (only for public comments)
      if (!isInternal) {
        await gamificationService.awardPoints(userId, 'COMMENT_POSTED', 1, {
          reportId,
          commentId: result.data?.id
        });
        
        // Award points to report owner when they receive a comment
        const { query: dbQuery } = await import('../utils/database');
        const reportResult = await dbQuery('SELECT user_id, title FROM reports WHERE id = $1', [reportId]);
        
        if (reportResult.rows.length > 0) {
          const reportOwnerId = reportResult.rows[0].user_id;
          const reportTitle = reportResult.rows[0].title;
          
          if (reportOwnerId !== userId) {
            await gamificationService.awardPoints(reportOwnerId, 'COMMENT_RECEIVED', 1, {
              reportId,
              reportTitle,
              commenterId: userId
            });
            
            // Send notification to report owner
            try {
              const commenterResult = await dbQuery('SELECT name FROM users WHERE id = $1', [userId]);
              const commenterName = commenterResult.rows[0]?.name || 'Someone';
              
              await notificationService.sendNotification({
                userId: reportOwnerId,
                type: 'PUSH',
                templateName: 'comment_received',
                content: `${commenterName} commented on your report "${reportTitle}"`,
                eventType: 'comment_received',
                eventSource: 'engagement',
                referenceId: reportId,
                triggeredByUserId: userId,
                data: {
                  reportId,
                  reportTitle,
                  commenterName,
                  commentId: result.data?.id
                }
              });
            } catch (notificationError) {
              logger.error('Error sending comment notification:', notificationError);
            }
          }
        }
      }
    } catch (gamificationError) {
      logger.error('Error awarding gamification points for comment:', gamificationError);
    }
  }
  
  return res.status(result.success ? 201 : 400).json(result);
});

// GET /api/engagement/reports/:id/comments - get comments for a report
router.get('/reports/:id/comments', authenticateToken, async (req: Request, res: Response) => {
  const { id: reportId } = req.params;
  const userId = req.user?.id;
  const includeInternal = req.user?.role && ['STAFF', 'ADMIN'].includes(req.user.role);

  const comments = await engagementService.getComments(reportId, userId, includeInternal);
  return res.json({ success: true, data: comments });
});

// PUT /api/engagement/comments/:id - update a comment
router.put('/comments/:id', authenticateToken, async (req: Request, res: Response) => {
  const { id: commentId } = req.params;
  const { error, value } = updateCommentSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.message });

  const userId = req.user!.id;
  const { content } = value;

  const result = await engagementService.updateComment(commentId, userId, content);
  return res.status(result.success ? 200 : 400).json(result);
});

// DELETE /api/engagement/comments/:id - delete a comment
router.delete('/comments/:id', authenticateToken, async (req: Request, res: Response) => {
  const { id: commentId } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const result = await engagementService.deleteComment(commentId, userId, userRole);
  return res.status(result.success ? 200 : 400).json(result);
});

// POST /api/engagement/reports/:id/verify - verify or dispute a report
router.post('/reports/:id/verify', authenticateToken, requireVerification, async (req: Request, res: Response) => {
  const { id: reportId } = req.params;
  const { error, value } = verificationSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.message });

  const userId = req.user!.id;
  const { verified, reason } = value;

  // Users cannot verify their own reports
  const { query: dbQuery } = await import('../utils/database');
  const reportResult = await dbQuery('SELECT user_id FROM reports WHERE id = $1', [reportId]);
  if (reportResult.rows.length > 0 && reportResult.rows[0].user_id === userId) {
    return res.status(400).json({ success: false, message: 'Cannot verify your own report' });
  }

  const result = await engagementService.toggleVerification(reportId, userId, verified, reason);
  
  // Award gamification points
  if (result.success) {
    try {
      // Award points to the verifier
      await gamificationService.awardPoints(userId, 'REPORT_VERIFIED', 1, {
        reportId,
        verified,
        reason
      });
      
      // Award points to report owner when their report is verified positively
      if (verified) {
        const { query: dbQuery } = await import('../utils/database');
        const reportResult = await dbQuery('SELECT user_id, title FROM reports WHERE id = $1', [reportId]);
        
        if (reportResult.rows.length > 0) {
          const reportOwnerId = reportResult.rows[0].user_id;
          const reportTitle = reportResult.rows[0].title;
          
          await gamificationService.awardPoints(reportOwnerId, 'VERIFICATION_RECEIVED', 1, {
            reportId,
            reportTitle,
            verifierId: userId
          });
        }
      }
    } catch (gamificationError) {
      logger.error('Error awarding gamification points for verification:', gamificationError);
    }
  }
  
  return res.status(result.success ? 200 : 400).json(result);
});

// GET /api/engagement/reports/:id/verification-stats - get verification stats for a report
router.get('/reports/:id/verification-stats', authenticateToken, async (req: Request, res: Response) => {
  const { id: reportId } = req.params;
  const userId = req.user?.id;

  const stats = await engagementService.getVerificationStats(reportId, userId);
  return res.json({ success: true, data: stats });
});

// GET /api/engagement/users/:id/summary - get user engagement summary
router.get('/users/:id/summary', authenticateToken, async (req: Request, res: Response) => {
  const { id: targetUserId } = req.params;
  const requestingUserId = req.user!.id;
  const userRole = req.user!.role;

  // Users can only view their own summary unless they're staff/admin
  if (targetUserId !== requestingUserId && !['STAFF', 'ADMIN'].includes(userRole)) {
    return res.status(403).json({ success: false, message: 'Cannot view other users\' engagement summary' });
  }

  const summary = await engagementService.getUserEngagementSummary(targetUserId);
  return res.json({ success: true, data: summary });
});

// GET /api/engagement/trending - get trending reports based on engagement
router.get('/trending', async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;
  const limitNum = Math.min(parseInt(limit as string) || 10, 50);

  const trendingReports = await engagementService.getTrendingReports(limitNum);
  return res.json({ success: true, data: trendingReports });
});

// GET /api/engagement/reports/:id/engagement-data - get full engagement data for a report
router.get('/reports/:id/engagement-data', authenticateToken, async (req: Request, res: Response) => {
  const { id: reportId } = req.params;
  const userId = req.user?.id;
  const includeInternal = req.user?.role && ['STAFF', 'ADMIN'].includes(req.user.role);

  try {
    const [comments, verificationStats] = await Promise.all([
      engagementService.getComments(reportId, userId, includeInternal),
      engagementService.getVerificationStats(reportId, userId)
    ]);

    // Get upvote status for current user
    let userUpvoted = false;
    if (userId) {
      const { query: dbQuery } = await import('../utils/database');
      const upvoteResult = await dbQuery(
        'SELECT id FROM upvotes WHERE report_id = $1 AND user_id = $2',
        [reportId, userId]
      );
      userUpvoted = upvoteResult.rows.length > 0;
    }

    return res.json({
      success: true,
      data: {
        comments,
        verificationStats,
        userUpvoted
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch engagement data' });
  }
});

// POST /api/engagement/reports/:id/join-discussion - join report discussion room
router.post('/reports/:id/join-discussion', authenticateToken, async (req: Request, res: Response) => {
  const { id: reportId } = req.params;
  const userId = req.user!.id;

  // In a real implementation, you might want to track active participants
  // For now, we'll just return success to indicate the user can join
  
  return res.json({
    success: true,
    message: 'Joined discussion',
    data: {
      roomId: `report_${reportId}`,
      userId
    }
  });
});

export default router;
