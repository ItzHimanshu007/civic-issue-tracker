import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { query } from '../utils/database';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  providerId?: string;
  error?: string;
}

interface EmailProvider {
  name: string;
  transporter: nodemailer.Transporter;
  isDefault: boolean;
}

export class EmailService {
  private providers: EmailProvider[] = [];
  private defaultProvider: EmailProvider | null = null;
  private isInitialized = false;

  /**
   * Initialize email service with configured providers
   */
  async initialize(): Promise<void> {
    try {
      // SMTP Provider (Generic)
      if (process.env.SMTP_HOST) {
        const smtpTransporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
          tls: {
            rejectUnauthorized: process.env.NODE_ENV === 'production'
          }
        });

        await this.verifyTransporter(smtpTransporter, 'SMTP');
        this.providers.push({
          name: 'SMTP',
          transporter: smtpTransporter,
          isDefault: true
        });
      }

      // SendGrid Provider
      if (process.env.SENDGRID_API_KEY) {
        const sendgridTransporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY,
          },
        });

        await this.verifyTransporter(sendgridTransporter, 'SendGrid');
        this.providers.push({
          name: 'SendGrid',
          transporter: sendgridTransporter,
          isDefault: !this.providers.length // Use as default if no SMTP
        });
      }

      // AWS SES Provider
      if (process.env.AWS_SES_REGION) {
        const sesTransporter = nodemailer.createTransport({
          host: `email-smtp.${process.env.AWS_SES_REGION}.amazonaws.com`,
          port: 587,
          secure: false,
          auth: {
            user: process.env.AWS_ACCESS_KEY_ID,
            pass: process.env.AWS_SECRET_ACCESS_KEY,
          },
        });

        await this.verifyTransporter(sesTransporter, 'AWS SES');
        this.providers.push({
          name: 'AWS SES',
          transporter: sesTransporter,
          isDefault: !this.providers.length
        });
      }

      // Gmail Provider (for development)
      if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        const gmailTransporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });

        await this.verifyTransporter(gmailTransporter, 'Gmail');
        this.providers.push({
          name: 'Gmail',
          transporter: gmailTransporter,
          isDefault: !this.providers.length
        });
      }

      // Set default provider
      this.defaultProvider = this.providers.find(p => p.isDefault) || this.providers[0] || null;

      if (!this.defaultProvider) {
        logger.warn('No email providers configured. Email notifications will be disabled.');
      } else {
        logger.info(`Email service initialized with ${this.providers.length} provider(s). Default: ${this.defaultProvider.name}`);
      }

      this.isInitialized = true;
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      throw error;
    }
  }

  /**
   * Verify transporter connection
   */
  private async verifyTransporter(transporter: nodemailer.Transporter, providerName: string): Promise<void> {
    try {
      await transporter.verify();
      logger.info(`${providerName} email provider verified successfully`);
    } catch (error) {
      logger.error(`Failed to verify ${providerName} email provider:`, error);
      throw new Error(`${providerName} email provider verification failed`);
    }
  }

  /**
   * Send email with automatic provider fallback
   */
  async sendEmail(options: EmailOptions, notificationId?: string): Promise<SendEmailResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.defaultProvider) {
      return {
        success: false,
        error: 'No email providers configured'
      };
    }

    const fromAddress = options.from || process.env.DEFAULT_FROM_EMAIL || 'noreply@civictracker.com';
    const fromName = process.env.DEFAULT_FROM_NAME || 'Civic Issue Tracker';

    const mailOptions = {
      from: `${fromName} <${fromAddress}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
      attachments: options.attachments,
      headers: {
        'X-Notification-ID': notificationId || '',
        'X-Mailer': 'Civic Issue Tracker'
      }
    };

    // Try providers in order with fallback
    for (const provider of this.providers) {
      try {
        logger.info(`Sending email via ${provider.name} to ${options.to}`);
        
        const result = await provider.transporter.sendMail(mailOptions);
        
        // Log successful delivery
        if (notificationId) {
          await this.logEmailDelivery(notificationId, provider.name, result.messageId, 'sent');
        }

        logger.info(`Email sent successfully via ${provider.name}. Message ID: ${result.messageId}`);
        
        return {
          success: true,
          messageId: result.messageId,
          providerId: provider.name
        };
      } catch (error) {
        logger.error(`Failed to send email via ${provider.name}:`, error);
        
        // Log failed delivery
        if (notificationId) {
          await this.logEmailDelivery(notificationId, provider.name, null, 'failed', error instanceof Error ? error.message : 'Unknown error occurred');
        }

        // Continue to next provider if available
        if (provider === this.providers[this.providers.length - 1]) {
          // This was the last provider
          return {
            success: false,
            error: `All email providers failed. Last error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
          };
        }
      }
    }

    return {
      success: false,
      error: 'No email providers available'
    };
  }

  /**
   * Send bulk emails (for newsletters, digests, etc.)
   */
  async sendBulkEmails(emails: EmailOptions[]): Promise<{ sent: number; failed: number; results: SendEmailResult[] }> {
    const results: SendEmailResult[] = [];
    let sent = 0;
    let failed = 0;

    // Process emails in batches to avoid overwhelming the provider
    const batchSize = parseInt(process.env.EMAIL_BATCH_SIZE || '50');
    
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (email) => {
        const result = await this.sendEmail(email);
        results.push(result);
        
        if (result.success) {
          sent++;
        } else {
          failed++;
        }
        
        return result;
      });

      await Promise.all(batchPromises);

      // Add delay between batches to respect rate limits
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.info(`Bulk email completed: ${sent} sent, ${failed} failed out of ${emails.length} total`);

    return { sent, failed, results };
  }

  /**
   * Send templated email
   */
  async sendTemplatedEmail(
    to: string,
    templateName: string,
    variables: Record<string, any>,
    notificationId?: string
  ): Promise<SendEmailResult> {
    try {
      // Get template from database
      const templateResult = await query(
        'SELECT subject, content, html_content FROM notification_templates WHERE name = $1 AND type = $2',
        [templateName, 'EMAIL']
      );

      if (templateResult.rows.length === 0) {
        return {
          success: false,
          error: `Email template '${templateName}' not found`
        };
      }

      const template = templateResult.rows[0];
      
      // Process template with variables
      const subject = this.processTemplate(template.subject, variables);
      const text = this.processTemplate(template.content, variables);
      const html = template.html_content ? this.processTemplate(template.html_content, variables) : undefined;

      return await this.sendEmail({
        to,
        subject,
        text,
        html
      }, notificationId);
    } catch (error) {
      logger.error('Error sending templated email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Simple template processing (supports {{variable}} syntax)
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
   * Log email delivery for tracking
   */
  private async logEmailDelivery(
    notificationId: string,
    provider: string,
    messageId: string | null,
    status: string,
    error?: string
  ): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      
      if (status === 'sent') {
        await query(
          `INSERT INTO email_deliveries (notification_id, email_provider, provider_message_id, accepted_at)
           VALUES ($1, $2, $3, $4)`,
          [notificationId, provider, messageId, timestamp]
        );
      } else {
        await query(
          `INSERT INTO email_deliveries (notification_id, email_provider, bounce_reason)
           VALUES ($1, $2, $3)`,
          [notificationId, provider, error || 'Unknown error']
        );
      }
    } catch (dbError) {
      logger.error('Error logging email delivery:', dbError);
    }
  }

  /**
   * Process webhook for delivery tracking (SendGrid, etc.)
   */
  async processDeliveryWebhook(provider: string, payload: any): Promise<void> {
    try {
      if (provider === 'SendGrid') {
        await this.processSendGridWebhook(payload);
      } else if (provider === 'AWS SES') {
        await this.processAWSWebhook(payload);
      }
    } catch (error) {
      logger.error(`Error processing ${provider} webhook:`, error);
    }
  }

  /**
   * Process SendGrid delivery webhook
   */
  private async processSendGridWebhook(events: any[]): Promise<void> {
    for (const event of events) {
      const messageId = event.smtp_id || event.sg_message_id;
      if (!messageId) continue;

      const timestamp = new Date(event.timestamp * 1000).toISOString();
      
      try {
        switch (event.event) {
          case 'delivered':
            await query(
              'UPDATE email_deliveries SET delivered_at = $1 WHERE provider_message_id = $2',
              [timestamp, messageId]
            );
            break;
            
          case 'bounce':
            await query(
              `UPDATE email_deliveries 
               SET bounced_at = $1, bounce_reason = $2 
               WHERE provider_message_id = $3`,
              [timestamp, event.reason, messageId]
            );
            break;
            
          case 'open':
            await query(
              'UPDATE email_deliveries SET opened_at = $1 WHERE provider_message_id = $2',
              [timestamp, messageId]
            );
            break;
            
          case 'click':
            await query(
              'UPDATE email_deliveries SET clicked_at = $1 WHERE provider_message_id = $2',
              [timestamp, messageId]
            );
            break;
            
          case 'spam_report':
            await query(
              `UPDATE email_deliveries 
               SET complained_at = $1, complaint_reason = 'spam' 
               WHERE provider_message_id = $2`,
              [timestamp, messageId]
            );
            break;
            
          case 'unsubscribe':
            await query(
              'UPDATE email_deliveries SET unsubscribed_at = $1 WHERE provider_message_id = $2',
              [timestamp, messageId]
            );
            break;
        }
      } catch (error) {
        logger.error(`Error updating delivery status for message ${messageId}:`, error);
      }
    }
  }

  /**
   * Process AWS SES webhook (SNS notification)
   */
  private async processAWSWebhook(payload: any): Promise<void> {
    const message = JSON.parse(payload.Message);
    const messageId = message.mail?.messageId;
    
    if (!messageId) return;

    const timestamp = new Date(message.timestamp).toISOString();
    
    try {
      switch (message.eventType) {
        case 'delivery':
          await query(
            'UPDATE email_deliveries SET delivered_at = $1 WHERE provider_message_id = $2',
            [timestamp, messageId]
          );
          break;
          
        case 'bounce':
          await query(
            `UPDATE email_deliveries 
             SET bounced_at = $1, bounce_reason = $2 
             WHERE provider_message_id = $3`,
            [timestamp, message.bounce?.bouncedRecipients?.[0]?.diagnosticCode, messageId]
          );
          break;
          
        case 'complaint':
          await query(
            `UPDATE email_deliveries 
             SET complained_at = $1, complaint_reason = $2 
             WHERE provider_message_id = $3`,
            [timestamp, message.complaint?.complaintFeedbackType, messageId]
          );
          break;
      }
    } catch (error) {
      logger.error(`Error updating AWS SES delivery status for message ${messageId}:`, error);
    }
  }

  /**
   * Get email delivery statistics
   */
  async getDeliveryStats(days: number = 7): Promise<{
    sent: number;
    delivered: number;
    bounced: number;
    opened: number;
    clicked: number;
    complained: number;
  }> {
    const result = await query(
      `SELECT 
        COUNT(*) as sent,
        COUNT(delivered_at) as delivered,
        COUNT(bounced_at) as bounced,
        COUNT(opened_at) as opened,
        COUNT(clicked_at) as clicked,
        COUNT(complained_at) as complained
       FROM email_deliveries 
       WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '${days} days'`
    );

    const stats = result.rows[0];
    return {
      sent: parseInt(stats.sent) || 0,
      delivered: parseInt(stats.delivered) || 0,
      bounced: parseInt(stats.bounced) || 0,
      opened: parseInt(stats.opened) || 0,
      clicked: parseInt(stats.clicked) || 0,
      complained: parseInt(stats.complained) || 0,
    };
  }

  /**
   * Test email configuration
   */
  async testConfiguration(testEmail: string): Promise<{ success: boolean; results: any[] }> {
    const results = [];
    
    for (const provider of this.providers) {
      try {
        const result = await provider.transporter.sendMail({
          from: process.env.DEFAULT_FROM_EMAIL || 'test@civictracker.com',
          to: testEmail,
          subject: `Test Email from ${provider.name}`,
          text: `This is a test email sent via ${provider.name} provider.`,
          html: `<p>This is a test email sent via <strong>${provider.name}</strong> provider.</p>`
        });
        
        results.push({
          provider: provider.name,
          success: true,
          messageId: result.messageId
        });
      } catch (error) {
        results.push({
          provider: provider.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    }
    
    const success = results.some(r => r.success);
    return { success, results };
  }
}

export const emailService = new EmailService();

