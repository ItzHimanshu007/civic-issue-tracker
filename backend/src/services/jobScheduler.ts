import { logger } from '../utils/logger';
import { workflowService } from './workflowService';
import { notificationService } from './notificationService';
import { emailService } from './emailService';
import { pushNotificationService } from './pushNotificationService';

export class JobScheduler {
  private escalationIntervalId: NodeJS.Timeout | null = null;
  private notificationIntervalId: NodeJS.Timeout | null = null;
  private readonly ESCALATION_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
  private readonly NOTIFICATION_PROCESS_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

  /**
   * Start the job scheduler
   */
  start(): void {
    if (this.escalationIntervalId || this.notificationIntervalId) {
      logger.warn('Job scheduler is already running');
      return;
    }

    logger.info('Starting job scheduler');

    // Initialize email and push services
    this.initializeServices();

    // Run jobs immediately
    this.runEscalationCheck();
    this.runNotificationProcessing();
    
    // Schedule recurring jobs
    this.escalationIntervalId = setInterval(() => {
      this.runEscalationCheck();
    }, this.ESCALATION_CHECK_INTERVAL);
    
    this.notificationIntervalId = setInterval(() => {
      this.runNotificationProcessing();
    }, this.NOTIFICATION_PROCESS_INTERVAL);

    logger.info(`Job scheduler started:`);
    logger.info(`- Escalation checks every ${this.ESCALATION_CHECK_INTERVAL / 1000 / 60} minutes`);
    logger.info(`- Notification processing every ${this.NOTIFICATION_PROCESS_INTERVAL / 1000 / 60} minutes`);
  }

  /**
   * Stop the job scheduler
   */
  stop(): void {
    if (this.escalationIntervalId) {
      clearInterval(this.escalationIntervalId);
      this.escalationIntervalId = null;
    }
    
    if (this.notificationIntervalId) {
      clearInterval(this.notificationIntervalId);
      this.notificationIntervalId = null;
    }
    
    logger.info('Job scheduler stopped');
  }

  /**
   * Run escalation check for overdue reports
   */
  private async runEscalationCheck(): Promise<void> {
    try {
      logger.info('Running escalation check...');
      await workflowService.checkOverdueReports();
      logger.info('Escalation check completed');
    } catch (error) {
      logger.error('Error during escalation check:', error);
    }
  }

  /**
   * Initialize notification services
   */
  private async initializeServices(): Promise<void> {
    try {
      await emailService.initialize();
      await pushNotificationService.initialize();
      logger.info('Notification services initialized');
    } catch (error) {
      logger.error('Error initializing notification services:', error);
    }
  }

  /**
   * Run scheduled notification processing
   */
  private async runNotificationProcessing(): Promise<void> {
    try {
      logger.debug('Processing scheduled notifications...');
      await notificationService.processScheduledNotifications();
      logger.debug('Scheduled notification processing completed');
    } catch (error) {
      logger.error('Error during notification processing:', error);
    }
  }

  /**
   * Manual trigger for escalation check (for testing/admin purposes)
   */
  async triggerEscalationCheck(): Promise<void> {
    await this.runEscalationCheck();
  }

  /**
   * Manual trigger for notification processing (for testing/admin purposes)
   */
  async triggerNotificationProcessing(): Promise<void> {
    await this.runNotificationProcessing();
  }
}

export const jobScheduler = new JobScheduler();
