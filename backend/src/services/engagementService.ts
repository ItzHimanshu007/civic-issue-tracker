import { logger } from '../utils/logger';
import { query, withTransaction } from '../utils/database';
import { io } from '../server';

interface UpvoteResult {
  success: boolean;
  message: string;
  data?: {
    upvoted: boolean;
    totalUpvotes: number;
  };
}

interface CommentData {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
  replies?: CommentData[];
}

interface VerificationData {
  reportId: string;
  userId: string;
  verified: boolean;
  reason?: string;
  totalVerifications: number;
  userVerification?: boolean;
}

export class EngagementService {
  /**
   * Toggle upvote for a report
   */
  async toggleUpvote(reportId: string, userId: string): Promise<UpvoteResult> {
    try {
      return await withTransaction(async (client) => {
        // Check if user has already upvoted
        const existingUpvote = await client.query(
          'SELECT id FROM upvotes WHERE report_id = $1 AND user_id = $2',
          [reportId, userId]
        );

        let upvoted = false;
        
        if (existingUpvote.rows.length > 0) {
          // Remove upvote
          await client.query(
            'DELETE FROM upvotes WHERE report_id = $1 AND user_id = $2',
            [reportId, userId]
          );
          
          // Decrement upvote count
          await client.query(
            'UPDATE reports SET upvotes = upvotes - 1 WHERE id = $1',
            [reportId]
          );
          
          upvoted = false;
        } else {
          // Add upvote
          await client.query(
            'INSERT INTO upvotes (report_id, user_id) VALUES ($1, $2)',
            [reportId, userId]
          );
          
          // Increment upvote count
          await client.query(
            'UPDATE reports SET upvotes = upvotes + 1 WHERE id = $1',
            [reportId]
          );
          
          upvoted = true;
        }

        // Get updated upvote count
        const reportResult = await client.query(
          'SELECT upvotes, title, user_id FROM reports WHERE id = $1',
          [reportId]
        );

        if (reportResult.rows.length === 0) {
          return { success: false, message: 'Report not found' };
        }

        const report = reportResult.rows[0];
        const totalUpvotes = parseInt(report.upvotes) || 0;

        // Notify report owner if upvoted by someone else
        if (upvoted && report.user_id !== userId) {
          await this.notifyReportInteraction(
            reportId,
            report.user_id,
            userId,
            'upvote',
            report.title
          );
        }

        // Broadcast upvote update via socket
        io.to(`report_${reportId}`).emit('upvote_updated', {
          reportId,
          totalUpvotes,
          upvoted,
          userId
        });

        return {
          success: true,
          message: upvoted ? 'Report upvoted' : 'Upvote removed',
          data: {
            upvoted,
            totalUpvotes
          }
        };
      });
    } catch (error) {
      logger.error('Error toggling upvote:', error);
      return { success: false, message: 'Failed to update upvote' };
    }
  }

  /**
   * Add a comment to a report
   */
  async addComment(
    reportId: string,
    userId: string,
    content: string,
    isInternal: boolean = false,
    parentCommentId?: string
  ): Promise<{ success: boolean; message: string; data?: CommentData }> {
    try {
      return await withTransaction(async (client) => {
        // Verify report exists
        const reportResult = await client.query(
          'SELECT title, user_id FROM reports WHERE id = $1',
          [reportId]
        );

        if (reportResult.rows.length === 0) {
          return { success: false, message: 'Report not found' };
        }

        const report = reportResult.rows[0];

        // Insert comment
        const commentResult = await client.query(
          `INSERT INTO comments (report_id, user_id, content, is_internal, parent_id)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, created_at, updated_at`,
          [reportId, userId, content, isInternal, parentCommentId || null]
        );

        const comment = commentResult.rows[0];

        // Get user details
        const userResult = await client.query(
          'SELECT name, avatar_url FROM users WHERE id = $1',
          [userId]
        );

        const user = userResult.rows[0];

        const commentData: CommentData = {
          id: comment.id,
          content,
          userId,
          userName: user.name,
          userAvatar: user.avatar_url,
          isInternal,
          createdAt: comment.created_at,
          updatedAt: comment.updated_at
        };

        // Notify report owner if comment is from someone else
        if (!isInternal && report.user_id !== userId) {
          await this.notifyReportInteraction(
            reportId,
            report.user_id,
            userId,
            'comment',
            report.title,
            content.substring(0, 100) + (content.length > 100 ? '...' : '')
          );
        }

        // Broadcast comment via socket
        io.to(`report_${reportId}`).emit('comment_added', {
          reportId,
          comment: commentData
        });

        logger.info(`Comment added to report ${reportId} by user ${userId}`);
        
        return {
          success: true,
          message: 'Comment added successfully',
          data: commentData
        };
      });
    } catch (error) {
      logger.error('Error adding comment:', error);
      return { success: false, message: 'Failed to add comment' };
    }
  }

  /**
   * Get comments for a report
   */
  async getComments(
    reportId: string,
    userId?: string,
    includeInternal: boolean = false
  ): Promise<CommentData[]> {
    try {
      let whereClause = 'WHERE c.report_id = $1';
      const params = [reportId];

      if (!includeInternal) {
        whereClause += ' AND c.is_internal = false';
      }

      const result = await query(`
        SELECT 
          c.id, c.content, c.is_internal, c.created_at, c.updated_at, c.parent_id,
          u.id as user_id, u.name as user_name, u.avatar_url as user_avatar
        FROM comments c
        JOIN users u ON c.user_id = u.id
        ${whereClause}
        ORDER BY c.created_at ASC
      `, params);

      // Organize comments with replies
      const commentMap = new Map<string, CommentData>();
      const rootComments: CommentData[] = [];

      result.rows.forEach(row => {
        const comment: CommentData = {
          id: row.id,
          content: row.content,
          userId: row.user_id,
          userName: row.user_name,
          userAvatar: row.user_avatar,
          isInternal: row.is_internal,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          replies: []
        };

        commentMap.set(comment.id, comment);

        if (row.parent_id) {
          // This is a reply
          const parent = commentMap.get(row.parent_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(comment);
          }
        } else {
          // This is a root comment
          rootComments.push(comment);
        }
      });

      return rootComments;
    } catch (error) {
      logger.error('Error getting comments:', error);
      return [];
    }
  }

  /**
   * Update a comment
   */
  async updateComment(
    commentId: string,
    userId: string,
    content: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const result = await query(
        `UPDATE comments 
         SET content = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 AND user_id = $3
         RETURNING report_id`,
        [content, commentId, userId]
      );

      if (result.rows.length === 0) {
        return { success: false, message: 'Comment not found or unauthorized' };
      }

      const reportId = result.rows[0].report_id;

      // Broadcast update via socket
      io.to(`report_${reportId}`).emit('comment_updated', {
        reportId,
        commentId,
        content
      });

      return { success: true, message: 'Comment updated successfully' };
    } catch (error) {
      logger.error('Error updating comment:', error);
      return { success: false, message: 'Failed to update comment' };
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(
    commentId: string,
    userId: string,
    userRole: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Check if user owns the comment or is staff/admin
      let whereClause = 'WHERE id = $1';
      const params = [commentId];

      if (userRole !== 'STAFF' && userRole !== 'ADMIN') {
        whereClause += ' AND user_id = $2';
        params.push(userId);
      }

      const result = await query(
        `DELETE FROM comments ${whereClause} RETURNING report_id`,
        params
      );

      if (result.rows.length === 0) {
        return { success: false, message: 'Comment not found or unauthorized' };
      }

      const reportId = result.rows[0].report_id;

      // Broadcast deletion via socket
      io.to(`report_${reportId}`).emit('comment_deleted', {
        reportId,
        commentId
      });

      return { success: true, message: 'Comment deleted successfully' };
    } catch (error) {
      logger.error('Error deleting comment:', error);
      return { success: false, message: 'Failed to delete comment' };
    }
  }

  /**
   * Verify or unverify a report
   */
  async toggleVerification(
    reportId: string,
    userId: string,
    verified: boolean,
    reason?: string
  ): Promise<{ success: boolean; message: string; data?: VerificationData }> {
    try {
      return await withTransaction(async (client) => {
        // Check if user has already verified this report
        const existingVerification = await client.query(
          'SELECT id, verified FROM report_verifications WHERE report_id = $1 AND user_id = $2',
          [reportId, userId]
        );

        if (existingVerification.rows.length > 0) {
          // Update existing verification
          await client.query(
            'UPDATE report_verifications SET verified = $1, reason = $2, updated_at = CURRENT_TIMESTAMP WHERE report_id = $3 AND user_id = $4',
            [verified, reason || null, reportId, userId]
          );
        } else {
          // Create new verification
          await client.query(
            'INSERT INTO report_verifications (report_id, user_id, verified, reason) VALUES ($1, $2, $3, $4)',
            [reportId, userId, verified, reason || null]
          );
        }

        // Get updated verification stats
        const statsResult = await client.query(`
          SELECT 
            COUNT(*) FILTER (WHERE verified = true) as verified_count,
            COUNT(*) FILTER (WHERE verified = false) as unverified_count,
            COUNT(*) as total_verifications
          FROM report_verifications 
          WHERE report_id = $1
        `, [reportId]);

        const stats = statsResult.rows[0];

        // Get report details for notification
        const reportResult = await client.query(
          'SELECT title, user_id FROM reports WHERE id = $1',
          [reportId]
        );

        if (reportResult.rows.length > 0) {
          const report = reportResult.rows[0];
          
          // Notify report owner about verification
          if (report.user_id !== userId) {
            await this.notifyReportInteraction(
              reportId,
              report.user_id,
              userId,
              verified ? 'verify' : 'dispute',
              report.title,
              reason
            );
          }
        }

        const verificationData: VerificationData = {
          reportId,
          userId,
          verified,
          reason,
          totalVerifications: parseInt(stats.total_verifications),
          userVerification: verified
        };

        // Broadcast verification update
        io.to(`report_${reportId}`).emit('verification_updated', {
          reportId,
          verificationData,
          stats: {
            verified: parseInt(stats.verified_count),
            disputed: parseInt(stats.unverified_count),
            total: parseInt(stats.total_verifications)
          }
        });

        return {
          success: true,
          message: `Report ${verified ? 'verified' : 'disputed'} successfully`,
          data: verificationData
        };
      });
    } catch (error) {
      logger.error('Error toggling verification:', error);
      return { success: false, message: 'Failed to update verification' };
    }
  }

  /**
   * Get verification stats for a report
   */
  async getVerificationStats(reportId: string, userId?: string): Promise<{
    verified: number;
    disputed: number;
    total: number;
    userVerification?: boolean;
  }> {
    try {
      const statsResult = await query(`
        SELECT 
          COUNT(*) FILTER (WHERE verified = true) as verified_count,
          COUNT(*) FILTER (WHERE verified = false) as disputed_count,
          COUNT(*) as total_verifications
        FROM report_verifications 
        WHERE report_id = $1
      `, [reportId]);

      const stats = statsResult.rows[0];
      let userVerification;

      if (userId) {
        const userVerificationResult = await query(
          'SELECT verified FROM report_verifications WHERE report_id = $1 AND user_id = $2',
          [reportId, userId]
        );
        
        if (userVerificationResult.rows.length > 0) {
          userVerification = userVerificationResult.rows[0].verified;
        }
      }

      return {
        verified: parseInt(stats.verified_count) || 0,
        disputed: parseInt(stats.disputed_count) || 0,
        total: parseInt(stats.total_verifications) || 0,
        userVerification
      };
    } catch (error) {
      logger.error('Error getting verification stats:', error);
      return { verified: 0, disputed: 0, total: 0 };
    }
  }

  /**
   * Get user's engagement summary
   */
  async getUserEngagementSummary(userId: string): Promise<{
    upvotesGiven: number;
    upvotesReceived: number;
    commentsGiven: number;
    commentsReceived: number;
    verificationsGiven: number;
    verificationsReceived: number;
  }> {
    try {
      const [upvotesGiven, upvotesReceived, commentsGiven, commentsReceived, verificationsGiven, verificationsReceived] = await Promise.all([
        query('SELECT COUNT(*) as count FROM upvotes WHERE user_id = $1', [userId]),
        query('SELECT COUNT(*) as count FROM upvotes u JOIN reports r ON u.report_id = r.id WHERE r.user_id = $1', [userId]),
        query('SELECT COUNT(*) as count FROM comments WHERE user_id = $1 AND is_internal = false', [userId]),
        query('SELECT COUNT(*) as count FROM comments c JOIN reports r ON c.report_id = r.id WHERE r.user_id = $1 AND c.user_id != $1 AND c.is_internal = false', [userId]),
        query('SELECT COUNT(*) as count FROM report_verifications WHERE user_id = $1', [userId]),
        query('SELECT COUNT(*) as count FROM report_verifications rv JOIN reports r ON rv.report_id = r.id WHERE r.user_id = $1', [userId])
      ]);

      return {
        upvotesGiven: parseInt(upvotesGiven.rows[0].count) || 0,
        upvotesReceived: parseInt(upvotesReceived.rows[0].count) || 0,
        commentsGiven: parseInt(commentsGiven.rows[0].count) || 0,
        commentsReceived: parseInt(commentsReceived.rows[0].count) || 0,
        verificationsGiven: parseInt(verificationsGiven.rows[0].count) || 0,
        verificationsReceived: parseInt(verificationsReceived.rows[0].count) || 0
      };
    } catch (error) {
      logger.error('Error getting user engagement summary:', error);
      return {
        upvotesGiven: 0,
        upvotesReceived: 0,
        commentsGiven: 0,
        commentsReceived: 0,
        verificationsGiven: 0,
        verificationsReceived: 0
      };
    }
  }

  /**
   * Get trending reports based on engagement
   */
  async getTrendingReports(limit: number = 10): Promise<any[]> {
    try {
      const result = await query(`
        SELECT 
          r.*,
          (SELECT COUNT(*) FROM upvotes WHERE report_id = r.id) as upvote_count,
          (SELECT COUNT(*) FROM comments WHERE report_id = r.id AND is_internal = false) as comment_count,
          (SELECT COUNT(*) FROM report_verifications WHERE report_id = r.id AND verified = true) as verification_count,
          -- Calculate engagement score (weighted sum)
          (
            (SELECT COUNT(*) FROM upvotes WHERE report_id = r.id) * 1 +
            (SELECT COUNT(*) FROM comments WHERE report_id = r.id AND is_internal = false) * 2 +
            (SELECT COUNT(*) FROM report_verifications WHERE report_id = r.id AND verified = true) * 3
          ) as engagement_score
        FROM reports r
        WHERE r.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
        ORDER BY engagement_score DESC, r.created_at DESC
        LIMIT $1
      `, [limit]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting trending reports:', error);
      return [];
    }
  }

  /**
   * Send notification for report interaction
   */
  private async notifyReportInteraction(
    reportId: string,
    recipientId: string,
    actorId: string,
    action: 'upvote' | 'comment' | 'verify' | 'dispute',
    reportTitle: string,
    content?: string
  ): Promise<void> {
    try {
      const actorResult = await query('SELECT name FROM users WHERE id = $1', [actorId]);
      const actorName = actorResult.rows[0]?.name || 'Someone';

      const actionMessages = {
        upvote: `${actorName} upvoted your report "${reportTitle}"`,
        comment: `${actorName} commented on your report "${reportTitle}"`,
        verify: `${actorName} verified your report "${reportTitle}"`,
        dispute: `${actorName} disputed your report "${reportTitle}"`
      };

      let notificationContent = actionMessages[action];
      if (content && action === 'comment') {
        notificationContent += `: "${content}"`;
      } else if (content && (action === 'verify' || action === 'dispute')) {
        notificationContent += ` with reason: "${content}"`;
      }

      await query(
        `INSERT INTO notifications (user_id, title, content, type, related_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          recipientId,
          'Report Interaction',
          notificationContent,
          `report_${action}`,
          reportId
        ]
      );

      // Send real-time notification
      io.to(`user_${recipientId}`).emit('notification', {
        type: `report_${action}`,
        title: 'Report Interaction',
        content: notificationContent,
        reportId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error sending interaction notification:', error);
    }
  }
}

export const engagementService = new EngagementService();
