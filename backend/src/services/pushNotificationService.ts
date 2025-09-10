import admin from 'firebase-admin';
import { logger } from '../utils/logger';
import { query } from '../utils/database';

interface PushNotificationOptions {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  clickAction?: string;
  sound?: string;
  badge?: number;
  priority?: 'normal' | 'high';
  ttl?: number; // Time to live in seconds
  topic?: string;
  condition?: string;
}

interface SendPushResult {
  success: boolean;
  messageId?: string;
  failureCount?: number;
  successCount?: number;
  results?: Array<{
    messageId?: string;
    error?: string;
  }>;
  error?: string;
}

interface DeviceRegistration {
  userId: string;
  deviceToken: string;
  deviceType: 'IOS' | 'ANDROID' | 'WEB';
  deviceName?: string;
  appVersion?: string;
  osVersion?: string;
}

export class PushNotificationService {
  private isInitialized = false;
  private fcmApp: admin.app.App | null = null;

  /**
   * Initialize Firebase Admin SDK
   */
  async initialize(): Promise<void> {
    try {
      if (!process.env.FIREBASE_PROJECT_ID) {
        logger.warn('Firebase project ID not configured. Push notifications will be disabled.');
        return;
      }

      // Initialize Firebase Admin SDK
      const firebaseConfig = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      };

      // Initialize with service account credentials
      if (firebaseConfig.clientEmail && firebaseConfig.privateKey) {
        this.fcmApp = admin.initializeApp({
          credential: admin.credential.cert(firebaseConfig),
          projectId: firebaseConfig.projectId,
        }, 'push-notifications');
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        // Use service account file
        this.fcmApp = admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: firebaseConfig.projectId,
        }, 'push-notifications');
      } else {
        throw new Error('Firebase credentials not configured properly');
      }

      this.isInitialized = true;
      logger.info('Push notification service initialized with Firebase FCM');
    } catch (error) {
      logger.error('Failed to initialize push notification service:', error);
      throw error;
    }
  }

  /**
   * Register device for push notifications
   */
  async registerDevice(registration: DeviceRegistration): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate the FCM token
      if (!await this.validateToken(registration.deviceToken)) {
        return {
          success: false,
          error: 'Invalid FCM token'
        };
      }

      // Check if device already exists and update it
      const existingDevice = await query(
        'SELECT id FROM user_devices WHERE device_token = $1',
        [registration.deviceToken]
      );

      if (existingDevice.rows.length > 0) {
        // Update existing device
        await query(
          `UPDATE user_devices 
           SET user_id = $1, device_name = $2, app_version = $3, os_version = $4, 
               is_active = true, last_used_at = CURRENT_TIMESTAMP
           WHERE device_token = $5`,
          [
            registration.userId,
            registration.deviceName,
            registration.appVersion,
            registration.osVersion,
            registration.deviceToken
          ]
        );
      } else {
        // Insert new device
        await query(
          `INSERT INTO user_devices 
           (user_id, device_token, device_type, device_name, app_version, os_version)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            registration.userId,
            registration.deviceToken,
            registration.deviceType,
            registration.deviceName,
            registration.appVersion,
            registration.osVersion
          ]
        );
      }

      logger.info(`Device registered for push notifications: ${registration.deviceType} - ${registration.deviceName}`);
      
      return { success: true };
    } catch (error) {
      logger.error('Error registering device:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Unregister device from push notifications
   */
  async unregisterDevice(deviceToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      await query(
        'UPDATE user_devices SET is_active = false WHERE device_token = $1',
        [deviceToken]
      );

      logger.info(`Device unregistered from push notifications: ${deviceToken.substring(0, 20)}...`);
      
      return { success: true };
    } catch (error) {
      logger.error('Error unregistering device:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send push notification to specific user
   */
  async sendToUser(
    userId: string,
    notification: PushNotificationOptions,
    notificationId?: string
  ): Promise<SendPushResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.fcmApp) {
      return {
        success: false,
        error: 'Push notification service not initialized'
      };
    }

    try {
      // Get user's active devices
      const devicesResult = await query(
        'SELECT device_token, device_type FROM user_devices WHERE user_id = $1 AND is_active = true',
        [userId]
      );

      if (devicesResult.rows.length === 0) {
        return {
          success: false,
          error: 'No active devices found for user'
        };
      }

      const deviceTokens = devicesResult.rows.map((row: any) => row.device_token);
      
      return await this.sendToTokens(deviceTokens, notification, notificationId);
    } catch (error) {
      logger.error('Error sending push notification to user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send push notification to multiple device tokens
   */
  async sendToTokens(
    tokens: string[],
    notification: PushNotificationOptions,
    notificationId?: string
  ): Promise<SendPushResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.fcmApp) {
      return {
        success: false,
        error: 'Push notification service not initialized'
      };
    }

    try {
      const messaging = admin.messaging(this.fcmApp);

      // Prepare the message payload
      const message: admin.messaging.MulticastMessage = {
        tokens: tokens,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: {
          ...notification.data,
          notificationId: notificationId || '',
          clickAction: notification.clickAction || '',
        },
        android: {
          priority: notification.priority === 'high' ? 'high' : 'normal',
          ttl: notification.ttl ? notification.ttl * 1000 : 3600000, // Default 1 hour
          notification: {
            sound: notification.sound || 'default',
            clickAction: notification.clickAction,
            channelId: 'civic_notifications',
          },
        },
        apns: {
          payload: {
            aps: {
              badge: notification.badge,
              sound: notification.sound || 'default',
              category: notification.clickAction,
            },
          },
        },
        webpush: {
          notification: {
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            requireInteraction: notification.priority === 'high',
            actions: notification.clickAction ? [
              {
                action: 'view',
                title: 'View',
              }
            ] : undefined,
          },
        },
      };

      const response = await messaging.sendEachForMulticast(message);

      // Log delivery results
      if (notificationId) {
        await this.logPushDeliveries(notificationId, tokens, response);
      }

      // Clean up invalid tokens
      if (response.failureCount > 0) {
        await this.cleanupInvalidTokens(tokens, response.responses);
      }

      logger.info(`Push notifications sent: ${response.successCount} successful, ${response.failureCount} failed`);

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        results: response.responses.map((result: any) => ({
          messageId: result.messageId,
          error: result.error?.message,
        })),
      };
    } catch (error) {
      logger.error('Error sending push notifications:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send push notification to a topic
   */
  async sendToTopic(
    topic: string,
    notification: PushNotificationOptions,
    notificationId?: string
  ): Promise<SendPushResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.fcmApp) {
      return {
        success: false,
        error: 'Push notification service not initialized'
      };
    }

    try {
      const messaging = admin.messaging(this.fcmApp);

      const message: admin.messaging.Message = {
        topic: topic,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: {
          ...notification.data,
          notificationId: notificationId || '',
        },
        android: {
          priority: notification.priority === 'high' ? 'high' : 'normal',
          ttl: notification.ttl ? notification.ttl * 1000 : 3600000,
          notification: {
            sound: notification.sound || 'default',
            clickAction: notification.clickAction,
          },
        },
        apns: {
          payload: {
            aps: {
              badge: notification.badge,
              sound: notification.sound || 'default',
            },
          },
        },
      };

      const messageId = await messaging.send(message);

      logger.info(`Push notification sent to topic ${topic}. Message ID: ${messageId}`);

      return {
        success: true,
        messageId: messageId,
      };
    } catch (error) {
      logger.error(`Error sending push notification to topic ${topic}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send templated push notification
   */
  async sendTemplatedPush(
    userId: string,
    templateName: string,
    variables: Record<string, any>,
    notificationId?: string
  ): Promise<SendPushResult> {
    try {
      // Get template from database
      const templateResult = await query(
        'SELECT subject, content FROM notification_templates WHERE name = $1 AND type = $2',
        [templateName, 'PUSH']
      );

      if (templateResult.rows.length === 0) {
        return {
          success: false,
          error: `Push template '${templateName}' not found`
        };
      }

      const template = templateResult.rows[0];
      
      // Process template with variables
      const title = this.processTemplate(template.subject || 'Notification', variables);
      const body = this.processTemplate(template.content, variables);

      return await this.sendToUser(userId, {
        title,
        body,
        data: {
          template: templateName,
          ...Object.fromEntries(
            Object.entries(variables).map(([key, value]) => [key, String(value)])
          )
        }
      }, notificationId);
    } catch (error) {
      logger.error('Error sending templated push notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Subscribe user to topic
   */
  async subscribeToTopic(userId: string, topic: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.fcmApp) {
        return { success: false, error: 'Service not initialized' };
      }

      // Get user's device tokens
      const devicesResult = await query(
        'SELECT device_token FROM user_devices WHERE user_id = $1 AND is_active = true',
        [userId]
      );

      if (devicesResult.rows.length === 0) {
        return { success: false, error: 'No active devices found' };
      }

      const tokens = devicesResult.rows.map((row: any) => row.device_token);
      const messaging = admin.messaging(this.fcmApp);

      await messaging.subscribeToTopic(tokens, topic);

      // Record subscription in database
      await query(
        `INSERT INTO notification_subscriptions (user_id, topic)
         VALUES ($1, $2)
         ON CONFLICT (user_id, topic) DO UPDATE SET is_active = true`,
        [userId, topic]
      );

      logger.info(`User ${userId} subscribed to topic: ${topic}`);
      
      return { success: true };
    } catch (error) {
      logger.error('Error subscribing to topic:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  /**
   * Unsubscribe user from topic
   */
  async unsubscribeFromTopic(userId: string, topic: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.fcmApp) {
        return { success: false, error: 'Service not initialized' };
      }

      // Get user's device tokens
      const devicesResult = await query(
        'SELECT device_token FROM user_devices WHERE user_id = $1 AND is_active = true',
        [userId]
      );

      if (devicesResult.rows.length > 0) {
        const tokens = devicesResult.rows.map((row: any) => row.device_token);
        const messaging = admin.messaging(this.fcmApp);

        await messaging.unsubscribeFromTopic(tokens, topic);
      }

      // Update subscription in database
      await query(
        'UPDATE notification_subscriptions SET is_active = false WHERE user_id = $1 AND topic = $2',
        [userId, topic]
      );

      logger.info(`User ${userId} unsubscribed from topic: ${topic}`);
      
      return { success: true };
    } catch (error) {
      logger.error('Error unsubscribing from topic:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  /**
   * Validate FCM token
   */
  private async validateToken(token: string): Promise<boolean> {
    try {
      if (!this.fcmApp) return false;
      
      const messaging = admin.messaging(this.fcmApp);
      
      // Try to send a dry-run message to validate the token
      await messaging.send({
        token: token,
        notification: {
          title: 'Test',
          body: 'Test'
        }
      }, true); // dry-run mode
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Process template with variables
   */
  private processTemplate(template: string, variables: Record<string, any>): string {
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
   * Log push notification deliveries
   */
  private async logPushDeliveries(
    notificationId: string,
    tokens: string[],
    response: admin.messaging.BatchResponse
  ): Promise<void> {
    try {
      const deliveries = tokens.map((token, index) => {
        const result = response.responses[index];
        return {
          notificationId,
          deviceToken: token,
          fcmMessageId: result.messageId,
          success: result.success,
          error: result.error?.message
        };
      });

      for (const delivery of deliveries) {
        if (delivery.success) {
          await query(
            `INSERT INTO push_deliveries (notification_id, device_token, fcm_message_id, sent_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
            [delivery.notificationId, delivery.deviceToken, delivery.fcmMessageId]
          );
        } else {
          await query(
            `INSERT INTO push_deliveries (notification_id, device_token, failed_at, failure_reason)
             VALUES ($1, $2, CURRENT_TIMESTAMP, $3)`,
            [delivery.notificationId, delivery.deviceToken, delivery.error]
          );
        }
      }
    } catch (error) {
      logger.error('Error logging push deliveries:', error);
    }
  }

  /**
   * Clean up invalid tokens
   */
  private async cleanupInvalidTokens(
    tokens: string[],
    responses: admin.messaging.SendResponse[]
  ): Promise<void> {
    try {
      const invalidTokens: string[] = [];
      
      responses.forEach((response, index) => {
        if (response.error) {
          const errorCode = response.error.code;
          
          // Mark tokens as inactive for unrecoverable errors
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(tokens[index]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        await query(
          'UPDATE user_devices SET is_active = false WHERE device_token = ANY($1)',
          [invalidTokens]
        );
        
        logger.info(`Cleaned up ${invalidTokens.length} invalid push tokens`);
      }
    } catch (error) {
      logger.error('Error cleaning up invalid tokens:', error);
    }
  }

  /**
   * Get push notification statistics
   */
  async getPushStats(days: number = 7): Promise<{
    sent: number;
    delivered: number;
    failed: number;
    activeDevices: number;
  }> {
    const [deliveryStats, deviceStats] = await Promise.all([
      query(
        `SELECT 
          COUNT(*) as sent,
          COUNT(sent_at) as delivered,
          COUNT(failed_at) as failed
         FROM push_deliveries 
         WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '${days} days'`
      ),
      query('SELECT COUNT(*) as active_devices FROM user_devices WHERE is_active = true')
    ]);

    return {
      sent: parseInt(deliveryStats.rows[0].sent) || 0,
      delivered: parseInt(deliveryStats.rows[0].delivered) || 0,
      failed: parseInt(deliveryStats.rows[0].failed) || 0,
      activeDevices: parseInt(deviceStats.rows[0].active_devices) || 0,
    };
  }

  /**
   * Test push notification configuration
   */
  async testConfiguration(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.sendToUser(userId, {
        title: 'Test Notification',
        body: 'This is a test push notification from the Civic Issue Tracker.',
        data: {
          test: 'true'
        }
      });

      return {
        success: result.success,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

export const pushNotificationService = new PushNotificationService();
