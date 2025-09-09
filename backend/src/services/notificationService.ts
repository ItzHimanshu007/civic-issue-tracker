import { logger } from '../utils/logger';
import { query, withTransaction } from '../utils/database';
import { emailService } from './emailService';
import { pushNotificationService } from './pushNotificationService';
import { io } from '../server';

interface NotificationOptions {
  userId: string;
  type: 'EMAIL' | 'PUSH' | 'SMS' | 'IN_APP';
  templateName?: string;
  subject?: string;
  content: string;
  htmlContent?: string;
  data?: Record<string, any>;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  scheduledAt?: Date;
  eventType?: string;
  eventSource?: string;
  referenceId?: string;
  triggeredByUserId?: string;
}

interface NotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  emailReportUpdates: boolean;
  emailEngagement: boolean;
  emailGamification: boolean;
  emailSystemAlerts: boolean;
  emailWeeklyDigest: boolean;
  pushEnabled: boolean;
  pushReportUpdates: boolean;
  pushEngagement: boolean;
  pushGamification: boolean;
  pushSystemAlerts: boolean;
  smsEnabled: boolean;
  smsCriticalUpdates: boolean;
  inAppEnabled: boolean;
  inAppAll: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
}

interface SendNotificationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

export class NotificationService {
  /**
   * Send notification with automatic channel selection based on user preferences
   */
  async sendNotification(options: NotificationOptions): Promise<SendNotificationResult> {
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(options.userId);
      if (!preferences) {
        return {
          success: false,
          error: 'User preferences not found'
        };
      }

      // Check if notification should be sent based on preferences
      const shouldSend = this.shouldSendNotification(options, preferences);
      if (!shouldSend.allowed) {
        return {
          success: true,
          skipped: true,
          reason: shouldSend.reason
        };
      }

      // Check quiet hours
      if (this.isQuietHours(preferences)) {
        // Reschedule for after quiet hours unless urgent
        if (options.priority !== 'URGENT') {
          const scheduledAt = this.calculateNextSendTime(preferences);
          return await this.scheduleNotification({ ...options, scheduledAt });
        }
      }

      // Create notification record
      const notificationId = await this.createNotificationRecord(options);

      // Log the notification event
      if (options.eventType) {
        await this.logNotificationEvent({
          eventType: options.eventType,
          eventSource: options.eventSource || 'unknown',
          referenceId: options.referenceId,
          userId: options.userId,
          triggeredByUserId: options.triggeredByUserId
        });
      }

      // Send through the specified channel or determine best channel
      let result: SendNotificationResult;

      switch (options.type) {
        case 'EMAIL':
          result = await this.sendEmailNotification(options, notificationId, preferences);
          break;
        case 'PUSH':
          result = await this.sendPushNotification(options, notificationId, preferences);
          break;
        case 'IN_APP':
          result = await this.sendInAppNotification(options, notificationId);
          break;
        case 'SMS':
          result = await this.sendSMSNotification(options, notificationId, preferences);
          break;
        default:
          result = { success: false, error: 'Invalid notification type' };
      }

      // Update notification status
      await this.updateNotificationStatus(notificationId, result.success ? 'SENT' : 'FAILED', result.error);

      return {
        ...result,
        notificationId
      };
    } catch (error) {
      logger.error('Error sending notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send multi-channel notification (email + push)
   */
  async sendMultiChannelNotification(options: Omit<NotificationOptions, 'type'>): Promise<{
    email: SendNotificationResult;
    push: SendNotificationResult;
    inApp: SendNotificationResult;
  }> {
    const [email, push, inApp] = await Promise.all([
      this.sendNotification({ ...options, type: 'EMAIL' }),
      this.sendNotification({ ...options, type: 'PUSH' }),
      this.sendNotification({ ...options, type: 'IN_APP' })
    ]);

    return { email, push, inApp };
  }

  /**
   * Send templated notification
   */
  async sendTemplatedNotification(
    userId: string,
    templateName: string,
    variables: Record<string, any>,
    options?: {
      type?: 'EMAIL' | 'PUSH' | 'SMS' | 'IN_APP';
      priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
      eventType?: string;
      eventSource?: string;
      referenceId?: string;
      triggeredByUserId?: string;
    }
  ): Promise<SendNotificationResult> {
    try {
      // Get template from database
      const templateResult = await query(
        'SELECT type, subject, content, html_content FROM notification_templates WHERE name = $1 AND is_active = true',
        [templateName]
      );

      if (templateResult.rows.length === 0) {
        return {
          success: false,
          error: `Template '${templateName}' not found`
        };
      }

      const template = templateResult.rows[0];
      
      // Process template with variables
      const subject = this.processTemplate(template.subject, variables);
      const content = this.processTemplate(template.content, variables);
      const htmlContent = template.html_content ? this.processTemplate(template.html_content, variables) : undefined;

      return await this.sendNotification({
        userId,
        type: options?.type || template.type,
        templateName,
        subject,
        content,
        htmlContent,
        data: variables,
        priority: options?.priority || 'NORMAL',
        eventType: options?.eventType,
        eventSource: options?.eventSource,
        referenceId: options?.referenceId,
        triggeredByUserId: options?.triggeredByUserId
      });
    } catch (error) {
      logger.error('Error sending templated notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(
    notifications: Array<Omit<NotificationOptions, 'scheduledAt'>>
  ): Promise<{ sent: number; failed: number; results: SendNotificationResult[] }> {
    const results: SendNotificationResult[] = [];
    let sent = 0;
    let failed = 0;

    // Process notifications in batches to avoid overwhelming the system
    const batchSize = parseInt(process.env.NOTIFICATION_BATCH_SIZE || '100');
    
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (notification) => {
        const result = await this.sendNotification(notification);
        results.push(result);
        
        if (result.success && !result.skipped) {
          sent++;
        } else if (!result.success) {
          failed++;
        }
        
        return result;
      });

      await Promise.all(batchPromises);

      // Add delay between batches to prevent overwhelming
      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.info(`Bulk notifications completed: ${sent} sent, ${failed} failed, ${results.length - sent - failed} skipped`);

    return { sent, failed, results };
  }

  /**
   * Schedule notification for later delivery
   */
  async scheduleNotification(options: NotificationOptions): Promise<SendNotificationResult> {
    try {
      const notificationId = await this.createNotificationRecord(options);
      
      logger.info(`Notification scheduled for ${options.scheduledAt}: ${notificationId}`);
      
      return {
        success: true,
        notificationId,
        reason: 'Scheduled for later delivery'
      };
    } catch (error) {
      logger.error('Error scheduling notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process scheduled notifications
   */
  async processScheduledNotifications(): Promise<void> {
    try {
      // Get notifications ready to be sent
      const scheduledResult = await query(
        `SELECT id, user_id, type, template_name, subject, content, html_content, 
                recipient_email, recipient_phone, device_tokens, priority, metadata
         FROM notifications 
         WHERE status = 'PENDING' 
         AND scheduled_at <= CURRENT_TIMESTAMP 
         ORDER BY priority DESC, scheduled_at ASC 
         LIMIT 100`
      );

      if (scheduledResult.rows.length === 0) {
        return;
      }

      logger.info(`Processing ${scheduledResult.rows.length} scheduled notifications`);

      for (const notification of scheduledResult.rows) {
        try {
          const options: NotificationOptions = {
            userId: notification.user_id,
            type: notification.type,
            templateName: notification.template_name,
            subject: notification.subject,
            content: notification.content,
            htmlContent: notification.html_content,
            data: notification.metadata,
            priority: notification.priority
          };

          await this.sendNotification(options);
        } catch (error) {
          logger.error(`Error processing scheduled notification ${notification.id}:`, error);
          await this.updateNotificationStatus(notification.id, 'FAILED', error.message);
        }
      }
    } catch (error) {
      logger.error('Error processing scheduled notifications:', error);
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const result = await query(
        'SELECT * FROM user_notification_preferences WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        // Create default preferences
        await this.createDefaultPreferences(userId);
        return await this.getUserPreferences(userId);
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting user preferences:', error);
      return null;
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const setClause = Object.keys(preferences)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');
      
      const values = [userId, ...Object.values(preferences)];

      await query(
        `UPDATE user_notification_preferences 
         SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $1`,
        values
      );

      return { success: true };
    } catch (error) {
      logger.error('Error updating user preferences:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's notification history
   */
  async getUserNotificationHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    notifications: any[];
    total: number;
  }> {
    try {
      const [notificationsResult, countResult] = await Promise.all([
        query(
          `SELECT id, type, subject, content, status, priority, created_at, sent_at, opened_at
           FROM notifications 
           WHERE user_id = $1 
           ORDER BY created_at DESC 
           LIMIT $2 OFFSET $3`,
          [userId, limit, offset]
        ),
        query(
          'SELECT COUNT(*) as total FROM notifications WHERE user_id = $1',
          [userId]
        )
      ]);

      return {
        notifications: notificationsResult.rows,
        total: parseInt(countResult.rows[0].total)
      };
    } catch (error) {
      logger.error('Error getting user notification history:', error);
      return { notifications: [], total: 0 };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await query(
        'UPDATE notifications SET opened_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
        [notificationId, userId]
      );

      if (result.rowCount === 0) {
        return { success: false, error: 'Notification not found or unauthorized' };
      }

      return { success: true };
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(days: number = 7): Promise<{
    totalSent: number;
    emailStats: any;
    pushStats: any;
    deliveryRate: number;
    openRate: number;
  }> {
    try {
      const [totalResult, emailStats, pushStats, deliveryResult, openResult] = await Promise.all([
        query(
          `SELECT COUNT(*) as total FROM notifications 
           WHERE status = 'SENT' AND created_at > CURRENT_TIMESTAMP - INTERVAL '${days} days'`
        ),
        emailService.getDeliveryStats(days),
        pushNotificationService.getPushStats(days),
        query(
          `SELECT COUNT(*) as delivered FROM notifications 
           WHERE status = 'DELIVERED' AND created_at > CURRENT_TIMESTAMP - INTERVAL '${days} days'`
        ),
        query(
          `SELECT COUNT(*) as opened FROM notifications 
           WHERE opened_at IS NOT NULL AND created_at > CURRENT_TIMESTAMP - INTERVAL '${days} days'`
        )
      ]);

      const totalSent = parseInt(totalResult.rows[0].total);
      const delivered = parseInt(deliveryResult.rows[0].delivered);
      const opened = parseInt(openResult.rows[0].opened);

      return {
        totalSent,
        emailStats,
        pushStats,
        deliveryRate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
        openRate: totalSent > 0 ? (opened / totalSent) * 100 : 0,
      };
    } catch (error) {
      logger.error('Error getting notification stats:', error);
      return {
        totalSent: 0,
        emailStats: { sent: 0, delivered: 0, bounced: 0, opened: 0, clicked: 0, complained: 0 },
        pushStats: { sent: 0, delivered: 0, failed: 0, activeDevices: 0 },
        deliveryRate: 0,
        openRate: 0,
      };
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    options: NotificationOptions,
    notificationId: string,
    preferences: NotificationPreferences
  ): Promise<SendNotificationResult> {
    if (!preferences.emailEnabled) {
      return { success: true, skipped: true, reason: 'Email notifications disabled' };
    }

    try {
      // Get user email
      const userResult = await query('SELECT email FROM users WHERE id = $1', [options.userId]);
      if (userResult.rows.length === 0) {
        return { success: false, error: 'User not found' };
      }

      const email = userResult.rows[0].email;
      
      const result = options.templateName
        ? await emailService.sendTemplatedEmail(email, options.templateName, options.data || {}, notificationId)
        : await emailService.sendEmail({
            to: email,
            subject: options.subject || 'Notification',
            text: options.content,
            html: options.htmlContent
          }, notificationId);

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    options: NotificationOptions,
    notificationId: string,
    preferences: NotificationPreferences
  ): Promise<SendNotificationResult> {
    if (!preferences.pushEnabled) {
      return { success: true, skipped: true, reason: 'Push notifications disabled' };
    }

    try {
      const result = options.templateName
        ? await pushNotificationService.sendTemplatedPush(options.userId, options.templateName, options.data || {}, notificationId)
        : await pushNotificationService.sendToUser(options.userId, {
            title: options.subject || 'Notification',
            body: options.content,
            data: options.data,
            priority: options.priority === 'URGENT' ? 'high' : 'normal'
          }, notificationId);

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(
    options: NotificationOptions,
    notificationId: string
  ): Promise<SendNotificationResult> {
    try {
      // Send real-time notification via Socket.io
      io.to(`user_${options.userId}`).emit('notification', {
        id: notificationId,
        type: 'IN_APP',
        subject: options.subject,
        content: options.content,
        data: options.data,
        createdAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SMS notification (placeholder for future implementation)
   */
  private async sendSMSNotification(
    options: NotificationOptions,
    notificationId: string,
    preferences: NotificationPreferences
  ): Promise<SendNotificationResult> {
    // SMS implementation would go here (using Twilio, AWS SNS, etc.)
    return { success: true, skipped: true, reason: 'SMS not implemented yet' };
  }

  /**
   * Check if notification should be sent based on preferences
   */
  private shouldSendNotification(
    options: NotificationOptions,
    preferences: NotificationPreferences
  ): { allowed: boolean; reason?: string } {
    // Check type-specific preferences
    switch (options.type) {
      case 'EMAIL':
        if (!preferences.emailEnabled) {
          return { allowed: false, reason: 'Email disabled' };
        }
        
        // Check category-specific preferences
        if (options.eventSource === 'reports' && !preferences.emailReportUpdates) {
          return { allowed: false, reason: 'Report email updates disabled' };
        }
        if (options.eventSource === 'engagement' && !preferences.emailEngagement) {
          return { allowed: false, reason: 'Engagement email notifications disabled' };
        }
        if (options.eventSource === 'gamification' && !preferences.emailGamification) {
          return { allowed: false, reason: 'Gamification email notifications disabled' };
        }
        break;

      case 'PUSH':
        if (!preferences.pushEnabled) {
          return { allowed: false, reason: 'Push notifications disabled' };
        }
        
        // Check category-specific preferences
        if (options.eventSource === 'reports' && !preferences.pushReportUpdates) {
          return { allowed: false, reason: 'Report push notifications disabled' };
        }
        if (options.eventSource === 'engagement' && !preferences.pushEngagement) {
          return { allowed: false, reason: 'Engagement push notifications disabled' };
        }
        if (options.eventSource === 'gamification' && !preferences.pushGamification) {
          return { allowed: false, reason: 'Gamification push notifications disabled' };
        }
        break;

      case 'IN_APP':
        if (!preferences.inAppEnabled) {
          return { allowed: false, reason: 'In-app notifications disabled' };
        }
        break;

      case 'SMS':
        if (!preferences.smsEnabled) {
          return { allowed: false, reason: 'SMS notifications disabled' };
        }
        break;
    }

    return { allowed: true };
  }

  /**
   * Check if current time is within user's quiet hours
   */
  private isQuietHours(preferences: NotificationPreferences): boolean {
    const now = new Date();
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: preferences.timezone }));
    const currentTime = userTime.getHours() * 100 + userTime.getMinutes();
    
    const quietStart = this.timeStringToMinutes(preferences.quietHoursStart);
    const quietEnd = this.timeStringToMinutes(preferences.quietHoursEnd);
    
    if (quietStart < quietEnd) {
      return currentTime >= quietStart && currentTime <= quietEnd;
    } else {
      // Quiet hours span midnight
      return currentTime >= quietStart || currentTime <= quietEnd;
    }
  }

  /**
   * Calculate next send time after quiet hours
   */
  private calculateNextSendTime(preferences: NotificationPreferences): Date {
    const now = new Date();
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: preferences.timezone }));
    
    const quietEnd = this.timeStringToMinutes(preferences.quietHoursEnd);
    const quietEndHour = Math.floor(quietEnd / 100);
    const quietEndMinute = quietEnd % 100;
    
    const nextSendTime = new Date(userTime);
    nextSendTime.setHours(quietEndHour, quietEndMinute, 0, 0);
    
    // If the quiet end time is earlier today, schedule for tomorrow
    if (nextSendTime <= userTime) {
      nextSendTime.setDate(nextSendTime.getDate() + 1);
    }
    
    return nextSendTime;
  }

  /**
   * Convert time string (HH:MM) to minutes since midnight
   */
  private timeStringToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 100 + minutes;
  }

  /**
   * Process template with variables
   */
  private processTemplate(template: string, variables: Record<string, any>): string {
    if (!template) return '';
    
    let processed = template;
    
    // Replace {{variable}} with values
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      processed = processed.replace(new RegExp(placeholder, 'g'), String(value || ''));
    });

    // Handle conditional blocks {{#variable}}content{{/variable}}
    processed = processed.replace(/\{\{#(\w+)\}\}(.*?)\{\{\/\1\}\}/gs, (match, key, content) => {
      return variables[key] ? content : '';
    });

    return processed;
  }

  /**
   * Create notification record in database
   */
  private async createNotificationRecord(options: NotificationOptions): Promise<string> {
    const result = await query(
      `INSERT INTO notifications 
       (user_id, template_name, type, subject, content, html_content, priority, scheduled_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        options.userId,
        options.templateName || null,
        options.type,
        options.subject || null,
        options.content,
        options.htmlContent || null,
        options.priority || 'NORMAL',
        options.scheduledAt || new Date(),
        JSON.stringify(options.data || {})
      ]
    );

    return result.rows[0].id;
  }

  /**
   * Update notification status
   */
  private async updateNotificationStatus(
    notificationId: string,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    await query(
      `UPDATE notifications 
       SET status = $1, sent_at = CASE WHEN $1 = 'SENT' THEN CURRENT_TIMESTAMP ELSE sent_at END,
           error_message = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [status, errorMessage || null, notificationId]
    );
  }

  /**
   * Log notification event
   */
  private async logNotificationEvent(event: {
    eventType: string;
    eventSource: string;
    referenceId?: string;
    userId: string;
    triggeredByUserId?: string;
  }): Promise<void> {
    try {
      await query(
        `INSERT INTO notification_events 
         (event_type, event_source, reference_id, user_id, triggered_by_user_id, notifications_generated)
         VALUES ($1, $2, $3, $4, $5, 1)`,
        [
          event.eventType,
          event.eventSource,
          event.referenceId || null,
          event.userId,
          event.triggeredByUserId || null
        ]
      );
    } catch (error) {
      logger.error('Error logging notification event:', error);
    }
  }

  /**
   * Create default notification preferences for user
   */
  private async createDefaultPreferences(userId: string): Promise<void> {
    await query(
      `INSERT INTO user_notification_preferences (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );
  }
}

export const notificationService = new NotificationService();
