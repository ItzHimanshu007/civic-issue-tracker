import express, { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { auth } from '../middleware/auth';
import { gamificationService } from '../services/gamificationService';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * Get user's gamification stats and profile
 */
router.get('/profile', auth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const stats = await gamificationService.getUserStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting user gamification profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
});

/**
 * Get leaderboard
 */
router.get('/leaderboard', [
  query('timeframe').optional().isIn(['all', 'month', 'week']).withMessage('Invalid timeframe'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const timeframe = req.query.timeframe as 'all' | 'month' | 'week' || 'all';
    const limit = parseInt(req.query.limit as string) || 50;

    const leaderboard = await gamificationService.getLeaderboard(timeframe, limit);

    return res.json({
      success: true,
      data: {
        timeframe,
        entries: leaderboard
      }
    });
  } catch (error) {
    logger.error('Error getting leaderboard:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get leaderboard'
    });
  }
});

/**
 * Get all available badges
 */
router.get('/badges', async (req, res) => {
  try {
    const badges = await gamificationService.getAllBadges();

    return res.json({
      success: true,
      data: badges
    });
  } catch (error) {
    logger.error('Error getting badges:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get badges'
    });
  }
});

/**
 * Manually award points (admin only)
 */
router.post('/award-points', auth, [
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('action').notEmpty().withMessage('Action is required'),
  body('multiplier').optional().isFloat({ min: 0.1, max: 10 }).withMessage('Multiplier must be between 0.1 and 10'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if user is admin or has appropriate permissions
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { userId, action, multiplier = 1, metadata } = req.body;

    const result = await gamificationService.awardPoints(userId, action, multiplier, {
      ...metadata,
      awardedBy: req.user!.id,
      awardedByRole: req.user!.role
    });

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error manually awarding points:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to award points'
    });
  }
});

/**
 * Get user's points history
 */
router.get('/points-history', auth, [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get points history from database
    const { query } = await import('../utils/database');
    const result = await query(
      `SELECT 
        action, points_awarded, multiplier, metadata, 
        total_points_after, created_at
       FROM points_history 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) as total FROM points_history WHERE user_id = $1',
      [userId]
    );

    return res.json({
      success: true,
      data: {
        history: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit,
          offset,
          hasMore: result.rows.length === limit
        }
      }
    });
  } catch (error) {
    logger.error('Error getting points history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get points history'
    });
  }
});

/**
 * Get user's achievements
 */
router.get('/achievements', auth, [
  query('type').optional().isIn(['BADGE', 'LEVEL', 'MILESTONE']).withMessage('Invalid achievement type'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user!.id;
    const type = req.query.type as string;
    const limit = parseInt(req.query.limit as string) || 50;

    let whereClause = 'WHERE user_id = $1';
    const params = [userId];

    if (type) {
      whereClause += ' AND type = $2';
      params.push(type);
    }

    const { query } = await import('../utils/database');
    const result = await query(
      `SELECT * FROM achievements 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${params.length + 1}`,
      [...params, limit]
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error getting achievements:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get achievements'
    });
  }
});

/**
 * Get user's activity streaks
 */
router.get('/streaks', auth, async (req, res) => {
  try {
    const userId = req.user!.id;

    const { query } = await import('../utils/database');
    const result = await query(
      `SELECT current_streak, longest_streak, last_activity_date, streak_start_date
       FROM user_streaks 
       WHERE user_id = $1`,
      [userId]
    );

    const streaks = result.rows[0] || {
      current_streak: 0,
      longest_streak: 0,
      last_activity_date: null,
      streak_start_date: null
    };

    return res.json({
      success: true,
      data: streaks
    });
  } catch (error) {
    logger.error('Error getting user streaks:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get user streaks'
    });
  }
});

/**
 * Get gamification statistics (admin only)
 */
router.get('/stats', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { query } = await import('../utils/database');
    
    // Get various statistics
    const stats = await Promise.all([
      query('SELECT COUNT(*) as total_users_with_points FROM users WHERE points > 0'),
      query('SELECT AVG(points) as avg_points, MAX(points) as max_points FROM users'),
      query('SELECT COUNT(*) as total_badges_earned FROM user_badges'),
      query('SELECT COUNT(*) as total_achievements FROM achievements'),
      query(`SELECT action, COUNT(*) as count, SUM(points_awarded) as total_points 
             FROM points_history 
             GROUP BY action 
             ORDER BY total_points DESC 
             LIMIT 10`),
      query(`SELECT b.name, b.rarity, COUNT(ub.id) as earned_count 
             FROM badges b 
             LEFT JOIN user_badges ub ON b.id = ub.badge_id 
             GROUP BY b.id, b.name, b.rarity 
             ORDER BY earned_count DESC`)
    ]);

    return res.json({
      success: true,
      data: {
        userStats: {
          totalUsersWithPoints: parseInt(stats[0].rows[0].total_users_with_points),
          averagePoints: parseFloat(stats[1].rows[0].avg_points) || 0,
          maxPoints: parseInt(stats[1].rows[0].max_points) || 0
        },
        engagement: {
          totalBadgesEarned: parseInt(stats[2].rows[0].total_badges_earned),
          totalAchievements: parseInt(stats[3].rows[0].total_achievements)
        },
        topActions: stats[4].rows,
        badgePopularity: stats[5].rows
      }
    });
  } catch (error) {
    logger.error('Error getting gamification stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get gamification statistics'
    });
  }
});

export default router;
