import express, { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { auth } from '../middleware/auth';
import { notificationService } from '../services/notificationService';
import { emailService } from '../services/emailService';
import { pushNotificationService } from '../services/pushNotificationService';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * GET /api/notifications/preferences - Get user notification preferences
 */
router.get('/preferences', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const preferences = await notificationService.getUserPreferences(userId);
    
    if (!preferences) {
      return res.status(404).json({
        success: false,
        message: 'Preferences not found'
      });
    }

    return res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    logger.error('Error getting notification preferences:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get notification preferences'
    });
  }
});

/**
 * PUT /api/notifications/preferences - Update user notification preferences
 */
router.put('/preferences', auth, [
  body('emailEnabled').optional().isBoolean(),
  body('emailReportUpdates').optional().isBoolean(),
  body('emailEngagement').optional().isBoolean(),
  body('emailGamification').optional().isBoolean(),
  body('emailSystemAlerts').optional().isBoolean(),
  body('emailWeeklyDigest').optional().isBoolean(),
  body('pushEnabled').optional().isBoolean(),
  body('pushReportUpdates').optional().isBoolean(),
  body('pushEngagement').optional().isBoolean(),
  body('pushGamification').optional().isBoolean(),
  body('pushSystemAlerts').optional().isBoolean(),
  body('smsEnabled').optional().isBoolean(),
  body('smsCriticalUpdates').optional().isBoolean(),
  body('inAppEnabled').optional().isBoolean(),
  body('inAppAll').optional().isBoolean(),
  body('quietHoursStart').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('quietHoursEnd').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('timezone').optional().isString().isLength({ min: 1, max: 50 })
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
    const result = await notificationService.updateUserPreferences(userId, req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    return res.json({
      success: true,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    logger.error('Error updating notification preferences:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences'
    });
  }
});

/**
 * GET /api/notifications/history - Get user notification history
 */
router.get('/history', auth, [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 })
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

    const history = await notificationService.getUserNotificationHistory(userId, limit, offset);

    return res.json({
      success: true,
      data: {
        notifications: history.notifications,
        pagination: {
          total: history.total,
          limit,
          offset,
          hasMore: history.notifications.length === limit
        }
      }
    });
  } catch (error) {
    logger.error('Error getting notification history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get notification history'
    });
  }
});

/**
 * POST /api/notifications/:id/read - Mark notification as read
 */
router.post('/:id/read', auth, async (req: Request, res: Response) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user!.id;

    const result = await notificationService.markAsRead(notificationId, userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    return res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

/**
 * POST /api/notifications/devices/register - Register device for push notifications
 */
router.post('/devices/register', auth, [
  body('deviceToken').notEmpty().withMessage('Device token is required'),
  body('deviceType').isIn(['IOS', 'ANDROID', 'WEB']).withMessage('Valid device type is required'),
  body('deviceName').optional().isString().isLength({ max: 255 }),
  body('appVersion').optional().isString().isLength({ max: 50 }),
  body('osVersion').optional().isString().isLength({ max: 50 })
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
    const { deviceToken, deviceType, deviceName, appVersion, osVersion } = req.body;

    const result = await pushNotificationService.registerDevice({
      userId,
      deviceToken,
      deviceType,
      deviceName,
      appVersion,
      osVersion
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    return res.json({
      success: true,
      message: 'Device registered successfully'
    });
  } catch (error) {
    logger.error('Error registering device:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register device'
    });
  }
});

/**
 * DELETE /api/notifications/devices/:token - Unregister device from push notifications
 */
router.delete('/devices/:token', auth, async (req: Request, res: Response) => {
  try {
    const deviceToken = req.params.token;

    const result = await pushNotificationService.unregisterDevice(deviceToken);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    return res.json({
      success: true,
      message: 'Device unregistered successfully'
    });
  } catch (error) {
    logger.error('Error unregistering device:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to unregister device'
    });
  }
});

/**
 * POST /api/notifications/devices/test - Test push notification
 */
router.post('/devices/test', auth, async (req, res) => {
  try {
    const userId = req.user!.id;

    const result = await pushNotificationService.testConfiguration(userId);

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error testing push notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to test push notification'
    });
  }
});

/**
 * POST /api/notifications/topics/subscribe - Subscribe to notification topic
 */
router.post('/topics/subscribe', auth, [
  body('topic').notEmpty().withMessage('Topic is required')
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
    const { topic } = req.body;

    const result = await pushNotificationService.subscribeToTopic(userId, topic);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    return res.json({
      success: true,
      message: `Subscribed to topic: ${topic}`
    });
  } catch (error) {
    logger.error('Error subscribing to topic:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to subscribe to topic'
    });
  }
});

/**
 * POST /api/notifications/topics/unsubscribe - Unsubscribe from notification topic
 */
router.post('/topics/unsubscribe', auth, [
  body('topic').notEmpty().withMessage('Topic is required')
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
    const { topic } = req.body;

    const result = await pushNotificationService.unsubscribeFromTopic(userId, topic);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    return res.json({
      success: true,
      message: `Unsubscribed from topic: ${topic}`
    });
  } catch (error) {
    logger.error('Error unsubscribing from topic:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to unsubscribe from topic'
    });
  }
});

/**
 * POST /api/notifications/send - Send notification (admin only)
 */
router.post('/send', auth, [
  body('userId').optional().isUUID(),
  body('userIds').optional().isArray().custom((value) => {
    return value.every((id: any) => typeof id === 'string');
  }),
  body('type').isIn(['EMAIL', 'PUSH', 'SMS', 'IN_APP']),
  body('templateName').optional().isString(),
  body('subject').optional().isString().isLength({ max: 255 }),
  body('content').notEmpty().withMessage('Content is required'),
  body('data').optional().isObject(),
  body('priority').optional().isIn(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  body('scheduledAt').optional().isISO8601()
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

    // Check if user is admin
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { userId, userIds, type, templateName, subject, content, data, priority, scheduledAt } = req.body;

    if (!userId && !userIds) {
      return res.status(400).json({
        success: false,
        message: 'Either userId or userIds must be provided'
      });
    }

    const targetUserIds = userId ? [userId] : userIds;
    const notifications = targetUserIds.map((targetUserId: string) => ({
      userId: targetUserId,
      type,
      templateName,
      subject,
      content,
      data,
      priority: priority || 'NORMAL',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      eventType: 'admin_notification',
      eventSource: 'admin',
      triggeredByUserId: req.user!.id
    }));

    const result = await notificationService.sendBulkNotifications(notifications);

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error sending notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send notification'
    });
  }
});

/**
 * GET /api/notifications/stats - Get notification statistics (admin only)
 */
router.get('/stats', auth, [
  query('days').optional().isInt({ min: 1, max: 365 })
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

    // Check if user is admin
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const days = parseInt(req.query.days as string) || 7;
    const stats = await notificationService.getNotificationStats(days);

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting notification stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get notification statistics'
    });
  }
});

/**
 * POST /api/notifications/email/test - Test email configuration (admin only)
 */
router.post('/email/test', auth, [
  body('email').isEmail().withMessage('Valid email is required')
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

    // Check if user is admin
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { email } = req.body;
    const result = await emailService.testConfiguration(email);

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error testing email configuration:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to test email configuration'
    });
  }
});

/**
 * POST /api/notifications/webhooks/sendgrid - SendGrid webhook
 */
router.post('/webhooks/sendgrid', async (req: Request, res: Response) => {
  try {
    await emailService.processDeliveryWebhook('SendGrid', req.body);
    return res.status(200).send('OK');
  } catch (error) {
    logger.error('Error processing SendGrid webhook:', error);
    return res.status(500).send('Error');
  }
});

/**
 * POST /api/notifications/webhooks/aws-ses - AWS SES webhook
 */
router.post('/webhooks/aws-ses', async (req: Request, res: Response) => {
  try {
    await emailService.processDeliveryWebhook('AWS SES', req.body);
    return res.status(200).send('OK');
  } catch (error) {
    logger.error('Error processing AWS SES webhook:', error);
    return res.status(500).send('Error');
  }
});

export default router;
