import { logger } from '../utils/logger';
import { query, withTransaction } from '../utils/database';
// Import io dynamically to avoid circular dependency
let io: any;

interface PointsAction {
  action: string;
  points: number;
  description: string;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  pointsRequired: number;
  condition: string;
  isActive: boolean;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
}

interface UserLevel {
  level: number;
  title: string;
  pointsRequired: number;
  benefits: string[];
}

interface Achievement {
  id: string;
  userId: string;
  type: 'BADGE' | 'LEVEL' | 'MILESTONE';
  referenceId: string;
  pointsAwarded: number;
  achievedAt: string;
}

interface LeaderboardEntry {
  userId: string;
  userName: string;
  userAvatar?: string;
  totalPoints: number;
  level: number;
  levelTitle: string;
  badgeCount: number;
  rank: number;
  reportsSubmitted: number;
  upvotesReceived: number;
  commentsGiven: number;
  verificationsGiven: number;
}

interface UserStats {
  totalPoints: number;
  level: number;
  levelTitle: string;
  pointsToNextLevel: number;
  badges: Badge[];
  recentAchievements: Achievement[];
  stats: {
    reportsSubmitted: number;
    upvotesReceived: number;
    upvotesGiven: number;
    commentsGiven: number;
    commentsReceived: number;
    verificationsGiven: number;
    verificationsReceived: number;
  };
}

export class GamificationService {
  // Point values for different actions
  private pointsSystem: Record<string, PointsAction> = {
    REPORT_SUBMITTED: { action: 'REPORT_SUBMITTED', points: 10, description: 'Submit a civic issue report' },
    REPORT_UPVOTED: { action: 'REPORT_UPVOTED', points: 2, description: 'Receive an upvote on your report' },
    GIVE_UPVOTE: { action: 'GIVE_UPVOTE', points: 1, description: 'Upvote another user\'s report' },
    COMMENT_POSTED: { action: 'COMMENT_POSTED', points: 3, description: 'Post a helpful comment' },
    COMMENT_RECEIVED: { action: 'COMMENT_RECEIVED', points: 1, description: 'Receive a comment on your report' },
    REPORT_VERIFIED: { action: 'REPORT_VERIFIED', points: 5, description: 'Verify accuracy of a report' },
    VERIFICATION_RECEIVED: { action: 'VERIFICATION_RECEIVED', points: 5, description: 'Have your report verified by community' },
    REPORT_RESOLVED: { action: 'REPORT_RESOLVED', points: 20, description: 'Your report gets resolved by authorities' },
    FIRST_REPORT: { action: 'FIRST_REPORT', points: 25, description: 'Submit your first civic issue report' },
    STREAK_7_DAYS: { action: 'STREAK_7_DAYS', points: 50, description: 'Stay active for 7 consecutive days' },
    STREAK_30_DAYS: { action: 'STREAK_30_DAYS', points: 200, description: 'Stay active for 30 consecutive days' },
  };

  // User level system
  private levelSystem: UserLevel[] = [
    { level: 1, title: 'Civic Newbie', pointsRequired: 0, benefits: ['Basic reporting'] },
    { level: 2, title: 'Aware Citizen', pointsRequired: 50, benefits: ['Comment on reports', 'Upvote issues'] },
    { level: 3, title: 'Active Reporter', pointsRequired: 150, benefits: ['Verify reports', 'Priority support'] },
    { level: 4, title: 'Community Helper', pointsRequired: 300, benefits: ['Advanced filtering', 'Report analytics'] },
    { level: 5, title: 'Civic Champion', pointsRequired: 600, benefits: ['Featured reports', 'Early access features'] },
    { level: 6, title: 'Guardian Angel', pointsRequired: 1000, benefits: ['Moderator privileges', 'Special badge'] },
    { level: 7, title: 'City Hero', pointsRequired: 1500, benefits: ['Direct staff contact', 'Custom profile'] },
    { level: 8, title: 'Civic Legend', pointsRequired: 2500, benefits: ['Influence policy', 'Hall of fame'] },
  ];

  /**
   * Award points to a user for specific actions
   */
  async awardPoints(
    userId: string,
    action: string,
    multiplier: number = 1,
    metadata?: any
  ): Promise<{ success: boolean; pointsAwarded: number; newTotal: number; achievements?: Achievement[] }> {
    try {
      const pointsConfig = this.pointsSystem[action];
      if (!pointsConfig) {
        logger.warn(`Unknown points action: ${action}`);
        return { success: false, pointsAwarded: 0, newTotal: 0 };
      }

      const pointsAwarded = pointsConfig.points * multiplier;

      return await withTransaction(async (client) => {
        // Update user points
        const userResult = await client.query(
          'UPDATE users SET points = points + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING points',
          [pointsAwarded, userId]
        );

        if (userResult.rows.length === 0) {
          throw new Error('User not found');
        }

        const newTotal = parseInt(userResult.rows[0].points);

        // Log the points transaction
        await client.query(
          `INSERT INTO points_history (user_id, action, points_awarded, multiplier, metadata, total_points_after)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, action, pointsAwarded, multiplier, JSON.stringify(metadata || {}), newTotal]
        );

        // Check for achievements
        const achievements = await this.checkForAchievements(userId, newTotal, action, client);

        // Real-time notification
        try {
          if (!io) {
            const serverModule = await import('../server');
            io = serverModule.io;
          }
          io?.to(`user_${userId}`).emit('points_awarded', {
            action: pointsConfig.description,
            pointsAwarded,
            newTotal,
            achievements
          });
        } catch (ioError) {
          logger.warn('Could not send real-time notification:', ioError);
        }
        
        // Send achievement notifications
        if (achievements.length > 0) {
          try {
            const { notificationService } = await import('./notificationService');
            
            for (const achievement of achievements) {
              if (achievement.type === 'BADGE') {
                // Get badge details
                const badgeResult = await client.query(
                  'SELECT name, description FROM badges WHERE id = $1',
                  [achievement.referenceId]
                );
                
                if (badgeResult.rows.length > 0) {
                  const badge = badgeResult.rows[0];
                  
                  await notificationService.sendNotification({
                    userId,
                    type: 'PUSH',
                    templateName: 'achievement_unlocked',
                    content: `Congratulations! You unlocked the "${badge.name}" badge!`,
                    eventType: 'achievement_unlocked',
                    eventSource: 'gamification',
                    referenceId: achievement.referenceId,
                    data: {
                      badgeName: badge.name,
                      badgeDescription: badge.description,
                      pointsAwarded: achievement.pointsAwarded
                    }
                  });
                }
              } else if (achievement.type === 'LEVEL') {
                const level = parseInt(achievement.referenceId);
                const levelInfo = this.levelSystem.find(l => l.level === level);
                
                if (levelInfo) {
                  await notificationService.sendNotification({
                    userId,
                    type: 'PUSH',
                    templateName: 'level_up',
                    content: `Congratulations! You reached level ${level}: ${levelInfo.title}!`,
                    eventType: 'level_up',
                    eventSource: 'gamification',
                    referenceId: achievement.referenceId,
                    data: {
                      level,
                      levelTitle: levelInfo.title,
                      benefits: levelInfo.benefits
                    }
                  });
                }
              }
            }
          } catch (notificationError) {
            logger.error('Error sending achievement notifications:', notificationError);
          }
        }

        logger.info(`Awarded ${pointsAwarded} points to user ${userId} for ${action}`);

        return {
          success: true,
          pointsAwarded,
          newTotal,
          achievements
        };
      });
    } catch (error) {
      logger.error('Error awarding points:', error);
      return { success: false, pointsAwarded: 0, newTotal: 0 };
    }
  }

  /**
   * Check for and award new achievements
   */
  private async checkForAchievements(
    userId: string,
    currentPoints: number,
    lastAction: string,
    client: any
  ): Promise<Achievement[]> {
    const achievements: Achievement[] = [];

    try {
      // Check for level achievements
      const newLevel = this.calculateLevel(currentPoints);
      const currentLevelResult = await client.query(
        'SELECT level FROM user_levels WHERE user_id = $1 ORDER BY level DESC LIMIT 1',
        [userId]
      );

      const currentLevel = currentLevelResult.rows[0]?.level || 1;

      if (newLevel > currentLevel) {
        // Award level achievement
        const levelInfo = this.levelSystem.find(l => l.level === newLevel);
        if (levelInfo) {
          await client.query(
            'INSERT INTO user_levels (user_id, level, achieved_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
            [userId, newLevel]
          );

          const achievement: Achievement = {
            id: `level_${newLevel}`,
            userId,
            type: 'LEVEL',
            referenceId: newLevel.toString(),
            pointsAwarded: 0,
            achievedAt: new Date().toISOString()
          };

          achievements.push(achievement);

          await client.query(
            `INSERT INTO achievements (user_id, type, reference_id, points_awarded)
             VALUES ($1, 'LEVEL', $2, 0)`,
            [userId, newLevel.toString()]
          );
        }
      }

      // Check for badge achievements
      const availableBadges = await this.getAvailableBadges(userId);
      for (const badge of availableBadges) {
        if (await this.checkBadgeCondition(userId, badge, client)) {
          // Award badge
          await client.query(
            'INSERT INTO user_badges (user_id, badge_id, earned_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
            [userId, badge.id]
          );

          const achievement: Achievement = {
            id: badge.id,
            userId,
            type: 'BADGE',
            referenceId: badge.id,
            pointsAwarded: badge.pointsRequired * 0.1, // Bonus points for earning badge
            achievedAt: new Date().toISOString()
          };

          achievements.push(achievement);

          await client.query(
            `INSERT INTO achievements (user_id, type, reference_id, points_awarded)
             VALUES ($1, 'BADGE', $2, $3)`,
            [userId, badge.id, achievement.pointsAwarded]
          );

          // Award bonus points
          await client.query(
            'UPDATE users SET points = points + $1 WHERE id = $2',
            [achievement.pointsAwarded, userId]
          );
        }
      }

      // Check for milestone achievements
      await this.checkMilestoneAchievements(userId, lastAction, client, achievements);

    } catch (error) {
      logger.error('Error checking achievements:', error);
    }

    return achievements;
  }

  /**
   * Check milestone achievements
   */
  private async checkMilestoneAchievements(
    userId: string,
    action: string,
    client: any,
    achievements: Achievement[]
  ): Promise<void> {
    const milestones = [
      { action: 'REPORT_SUBMITTED', counts: [1, 5, 10, 25, 50, 100], name: 'Reporter' },
      { action: 'GIVE_UPVOTE', counts: [10, 50, 100, 500, 1000], name: 'Supporter' },
      { action: 'COMMENT_POSTED', counts: [5, 25, 50, 100, 250], name: 'Commenter' },
      { action: 'REPORT_VERIFIED', counts: [5, 25, 50, 100, 200], name: 'Verifier' }
    ];

    for (const milestone of milestones) {
      if (action === milestone.action) {
        // Get user's count for this action
        const countResult = await client.query(
          'SELECT COUNT(*) as count FROM points_history WHERE user_id = $1 AND action = $2',
          [userId, action]
        );

        const count = parseInt(countResult.rows[0].count);

        // Check if this count hits a milestone
        if (milestone.counts.includes(count)) {
          const milestoneId = `${milestone.name.toLowerCase()}_${count}`;
          
          // Check if already awarded
          const existingResult = await client.query(
            'SELECT id FROM achievements WHERE user_id = $1 AND reference_id = $2',
            [userId, milestoneId]
          );

          if (existingResult.rows.length === 0) {
            const bonusPoints = count * 5; // Bonus points based on milestone

            const achievement: Achievement = {
              id: milestoneId,
              userId,
              type: 'MILESTONE',
              referenceId: milestoneId,
              pointsAwarded: bonusPoints,
              achievedAt: new Date().toISOString()
            };

            achievements.push(achievement);

            await client.query(
              `INSERT INTO achievements (user_id, type, reference_id, points_awarded)
               VALUES ($1, 'MILESTONE', $2, $3)`,
              [userId, milestoneId, bonusPoints]
            );

            // Award bonus points
            await client.query(
              'UPDATE users SET points = points + $1 WHERE id = $2',
              [bonusPoints, userId]
            );
          }
        }
      }
    }
  }

  /**
   * Get available badges for a user
   */
  private async getAvailableBadges(userId: string): Promise<Badge[]> {
    const result = await query(`
      SELECT b.* FROM badges b
      WHERE b.is_active = true
      AND b.id NOT IN (
        SELECT badge_id FROM user_badges WHERE user_id = $1
      )
    `, [userId]);

    return result.rows;
  }

  /**
   * Check if user meets badge condition
   */
  private async checkBadgeCondition(userId: string, badge: Badge, client: any): Promise<boolean> {
    // Get user stats
    const userStats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM reports WHERE user_id = $1) as reports_count,
        (SELECT COUNT(*) FROM upvotes u JOIN reports r ON u.report_id = r.id WHERE r.user_id = $1) as upvotes_received,
        (SELECT COUNT(*) FROM upvotes WHERE user_id = $1) as upvotes_given,
        (SELECT COUNT(*) FROM comments WHERE user_id = $1 AND is_internal = false) as comments_given,
        (SELECT COUNT(*) FROM report_verifications WHERE user_id = $1) as verifications_given,
        u.points, u.created_at
      FROM users u WHERE u.id = $1
    `, [userId]);

    const stats = userStats.rows[0];

    // Evaluate badge conditions (simplified - in production you'd have a more robust system)
    switch (badge.condition) {
      case 'FIRST_REPORT':
        return stats.reports_count >= 1;
      case 'REPORTER_5':
        return stats.reports_count >= 5;
      case 'REPORTER_25':
        return stats.reports_count >= 25;
      case 'POPULAR_10':
        return stats.upvotes_received >= 10;
      case 'POPULAR_50':
        return stats.upvotes_received >= 50;
      case 'SUPPORTIVE_50':
        return stats.upvotes_given >= 50;
      case 'COMMENTATOR_25':
        return stats.comments_given >= 25;
      case 'VERIFIER_10':
        return stats.verifications_given >= 10;
      case 'POINTS_500':
        return stats.points >= 500;
      case 'POINTS_1000':
        return stats.points >= 1000;
      case 'VETERAN_30_DAYS':
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return new Date(stats.created_at) <= thirtyDaysAgo;
      default:
        return false;
    }
  }

  /**
   * Calculate user level based on points
   */
  private calculateLevel(points: number): number {
    for (let i = this.levelSystem.length - 1; i >= 0; i--) {
      if (points >= this.levelSystem[i].pointsRequired) {
        return this.levelSystem[i].level;
      }
    }
    return 1;
  }

  /**
   * Get user's complete gamification stats
   */
  async getUserStats(userId: string): Promise<UserStats> {
    try {
      const result = await query(`
        SELECT 
          u.points, u.name, u.created_at,
          (SELECT COUNT(*) FROM reports WHERE user_id = $1) as reports_submitted,
          (SELECT COUNT(*) FROM upvotes up JOIN reports r ON up.report_id = r.id WHERE r.user_id = $1) as upvotes_received,
          (SELECT COUNT(*) FROM upvotes WHERE user_id = $1) as upvotes_given,
          (SELECT COUNT(*) FROM comments WHERE user_id = $1 AND is_internal = false) as comments_given,
          (SELECT COUNT(*) FROM comments c JOIN reports r ON c.report_id = r.id WHERE r.user_id = $1 AND c.user_id != $1 AND c.is_internal = false) as comments_received,
          (SELECT COUNT(*) FROM report_verifications WHERE user_id = $1) as verifications_given,
          (SELECT COUNT(*) FROM report_verifications rv JOIN reports r ON rv.report_id = r.id WHERE r.user_id = $1) as verifications_received
        FROM users u WHERE u.id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const userResult = result.rows[0];
      const totalPoints = parseInt(userResult.points) || 0;
      const level = this.calculateLevel(totalPoints);
      const levelInfo = this.levelSystem.find(l => l.level === level);
      const nextLevelInfo = this.levelSystem.find(l => l.level === level + 1);

      // Get user badges
      const badgesResult = await query(`
        SELECT b.* FROM badges b
        JOIN user_badges ub ON b.id = ub.badge_id
        WHERE ub.user_id = $1
        ORDER BY ub.earned_at DESC
      `, [userId]);

      // Get recent achievements
      const achievementsResult = await query(`
        SELECT * FROM achievements
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 5
      `, [userId]);

      return {
        totalPoints,
        level,
        levelTitle: levelInfo?.title || 'Unknown',
        pointsToNextLevel: nextLevelInfo ? nextLevelInfo.pointsRequired - totalPoints : 0,
        badges: badgesResult.rows,
        recentAchievements: achievementsResult.rows,
        stats: {
          reportsSubmitted: parseInt(userResult.reports_submitted) || 0,
          upvotesReceived: parseInt(userResult.upvotes_received) || 0,
          upvotesGiven: parseInt(userResult.upvotes_given) || 0,
          commentsGiven: parseInt(userResult.comments_given) || 0,
          commentsReceived: parseInt(userResult.comments_received) || 0,
          verificationsGiven: parseInt(userResult.verifications_given) || 0,
          verificationsReceived: parseInt(userResult.verifications_received) || 0,
        }
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    timeframe: 'all' | 'month' | 'week' = 'all',
    limit: number = 50
  ): Promise<LeaderboardEntry[]> {
    try {
      let timeFilter = '';
      if (timeframe === 'month') {
        timeFilter = "AND u.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'";
      } else if (timeframe === 'week') {
        timeFilter = "AND u.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'";
      }

      const result = await query(`
        SELECT 
          u.id as user_id, u.name as user_name, u.avatar_url as user_avatar, u.points as total_points,
          (SELECT COUNT(*) FROM reports WHERE user_id = u.id) as reports_submitted,
          (SELECT COUNT(*) FROM upvotes up JOIN reports r ON up.report_id = r.id WHERE r.user_id = u.id) as upvotes_received,
          (SELECT COUNT(*) FROM comments WHERE user_id = u.id AND is_internal = false) as comments_given,
          (SELECT COUNT(*) FROM report_verifications WHERE user_id = u.id) as verifications_given,
          (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id) as badge_count,
          ROW_NUMBER() OVER (ORDER BY u.points DESC) as rank
        FROM users u
        WHERE u.is_active = true ${timeFilter}
        ORDER BY u.points DESC, u.created_at ASC
        LIMIT $1
      `, [limit]);

      return result.rows.map((row: any) => {
        const points = parseInt(row.total_points) || 0;
        const level = this.calculateLevel(points);
        const levelInfo = this.levelSystem.find(l => l.level === level);

        return {
          userId: row.user_id,
          userName: row.user_name,
          userAvatar: row.user_avatar,
          totalPoints: points,
          level,
          levelTitle: levelInfo?.title || 'Unknown',
          badgeCount: parseInt(row.badge_count) || 0,
          rank: parseInt(row.rank),
          reportsSubmitted: parseInt(row.reports_submitted) || 0,
          upvotesReceived: parseInt(row.upvotes_received) || 0,
          commentsGiven: parseInt(row.comments_given) || 0,
          verificationsGiven: parseInt(row.verifications_given) || 0,
        };
      });
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      return [];
    }
  }

  /**
   * Get all available badges
   */
  async getAllBadges(): Promise<Badge[]> {
    try {
      const result = await query('SELECT * FROM badges WHERE is_active = true ORDER BY points_required ASC');
      return result.rows;
    } catch (error) {
      logger.error('Error getting badges:', error);
      return [];
    }
  }

  /**
   * Initialize default badges
   */
  async initializeDefaultBadges(): Promise<void> {
    const defaultBadges = [
      { name: 'First Reporter', description: 'Submit your first civic issue report', iconUrl: '🎯', pointsRequired: 0, condition: 'FIRST_REPORT', rarity: 'COMMON' },
      { name: 'Active Reporter', description: 'Submit 5 civic issue reports', iconUrl: '📝', pointsRequired: 50, condition: 'REPORTER_5', rarity: 'COMMON' },
      { name: 'Super Reporter', description: 'Submit 25 civic issue reports', iconUrl: '⭐', pointsRequired: 250, condition: 'REPORTER_25', rarity: 'RARE' },
      { name: 'Popular Reporter', description: 'Receive 10 upvotes on your reports', iconUrl: '👍', pointsRequired: 100, condition: 'POPULAR_10', rarity: 'COMMON' },
      { name: 'Viral Reporter', description: 'Receive 50 upvotes on your reports', iconUrl: '🔥', pointsRequired: 500, condition: 'POPULAR_50', rarity: 'EPIC' },
      { name: 'Supportive Citizen', description: 'Give 50 upvotes to other reports', iconUrl: '🤝', pointsRequired: 100, condition: 'SUPPORTIVE_50', rarity: 'COMMON' },
      { name: 'Great Commentator', description: 'Post 25 helpful comments', iconUrl: '💬', pointsRequired: 150, condition: 'COMMENTATOR_25', rarity: 'RARE' },
      { name: 'Truth Seeker', description: 'Verify 10 reports', iconUrl: '✅', pointsRequired: 200, condition: 'VERIFIER_10', rarity: 'RARE' },
      { name: 'Point Collector', description: 'Earn 500 points', iconUrl: '💎', pointsRequired: 500, condition: 'POINTS_500', rarity: 'EPIC' },
      { name: 'Point Master', description: 'Earn 1000 points', iconUrl: '👑', pointsRequired: 1000, condition: 'POINTS_1000', rarity: 'LEGENDARY' },
      { name: 'Veteran', description: 'Active for 30 days', iconUrl: '🏆', pointsRequired: 300, condition: 'VETERAN_30_DAYS', rarity: 'RARE' }
    ];

    try {
      for (const badge of defaultBadges) {
        await query(
          `INSERT INTO badges (name, description, icon_url, points_required, condition_type, rarity, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, true)
           ON CONFLICT (name) DO NOTHING`,
          [badge.name, badge.description, badge.iconUrl, badge.pointsRequired, badge.condition, badge.rarity]
        );
      }
      logger.info('Default badges initialized');
    } catch (error) {
      logger.error('Error initializing default badges:', error);
    }
  }
}

export const gamificationService = new GamificationService();
