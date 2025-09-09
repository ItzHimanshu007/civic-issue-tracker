import twilio from 'twilio';
import { logger } from '../utils/logger';
import { setCacheJSON, getCacheJSON, deleteCache } from '../utils/redis';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER || '+1234567890';

interface OTPData {
  code: string;
  phoneNumber: string;
  attempts: number;
  createdAt: number;
  type: 'registration' | 'login' | 'reset';
}

interface OTPResult {
  success: boolean;
  message: string;
  data?: any;
}

export class OTPService {
  private twilioClient: twilio.Twilio | null = null;
  private readonly MAX_ATTEMPTS = 3;
  private readonly OTP_EXPIRY = 10 * 60; // 10 minutes in seconds
  private readonly RATE_LIMIT_WINDOW = 60; // 1 minute

  constructor() {
    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
      logger.info('Twilio client initialized');
    } else {
      logger.warn('Twilio credentials not provided, using mock OTP');
    }
  }

  /**
   * Generate a 6-digit OTP code
   */
  private generateOTPCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Check rate limit for phone number
   */
  private async checkRateLimit(phoneNumber: string): Promise<boolean> {
    const rateLimitKey = `otp_rate_limit:${phoneNumber}`;
    const attempts = await getCacheJSON<number>(rateLimitKey);
    
    if (attempts && attempts >= 5) {
      return false; // Rate limited
    }
    
    return true;
  }

  /**
   * Update rate limit counter
   */
  private async updateRateLimit(phoneNumber: string): Promise<void> {
    const rateLimitKey = `otp_rate_limit:${phoneNumber}`;
    const attempts = await getCacheJSON<number>(rateLimitKey) || 0;
    await setCacheJSON(rateLimitKey, attempts + 1, this.RATE_LIMIT_WINDOW);
  }

  /**
   * Send OTP via SMS
   */
  async sendOTP(
    phoneNumber: string, 
    type: 'registration' | 'login' | 'reset' = 'login'
  ): Promise<OTPResult> {
    try {
      // Check rate limit
      const canSend = await this.checkRateLimit(phoneNumber);
      if (!canSend) {
        return {
          success: false,
          message: 'Too many OTP requests. Please try again later.'
        };
      }

      // Generate OTP
      const otpCode = this.generateOTPCode();
      const otpKey = `otp:${phoneNumber}`;

      // Store OTP data in Redis
      const otpData: OTPData = {
        code: otpCode,
        phoneNumber,
        attempts: 0,
        createdAt: Date.now(),
        type
      };

      await setCacheJSON(otpKey, otpData, this.OTP_EXPIRY);

      // Send SMS
      if (this.twilioClient) {
        const message = `Your Civic Tracker verification code is: ${otpCode}. Valid for 10 minutes.`;
        
        await this.twilioClient.messages.create({
          body: message,
          from: fromNumber,
          to: phoneNumber
        });

        logger.info(`OTP sent to ${phoneNumber}`);
      } else {
        // Mock mode for development
        logger.info(`Mock OTP for ${phoneNumber}: ${otpCode}`);
      }

      // Update rate limit
      await this.updateRateLimit(phoneNumber);

      return {
        success: true,
        message: 'OTP sent successfully',
        data: process.env.NODE_ENV === 'development' ? { otp: otpCode } : undefined
      };

    } catch (error) {
      logger.error('Failed to send OTP:', error);
      return {
        success: false,
        message: 'Failed to send OTP. Please try again.'
      };
    }
  }

  /**
   * Send OTP via voice call
   */
  async sendOTPVoice(phoneNumber: string): Promise<OTPResult> {
    try {
      if (!this.twilioClient) {
        return {
          success: false,
          message: 'Voice OTP not available'
        };
      }

      // Check rate limit
      const canSend = await this.checkRateLimit(phoneNumber);
      if (!canSend) {
        return {
          success: false,
          message: 'Too many OTP requests. Please try again later.'
        };
      }

      const otpCode = this.generateOTPCode();
      const otpKey = `otp:${phoneNumber}`;

      // Store OTP data
      const otpData: OTPData = {
        code: otpCode,
        phoneNumber,
        attempts: 0,
        createdAt: Date.now(),
        type: 'login'
      };

      await setCacheJSON(otpKey, otpData, this.OTP_EXPIRY);

      // Create TwiML for voice message
      const twiml = `
        <Response>
          <Say voice="alice">Your Civic Tracker verification code is: ${otpCode.split('').join(', ')}. I repeat: ${otpCode.split('').join(', ')}</Say>
        </Response>
      `;

      await this.twilioClient.calls.create({
        twiml: twiml,
        from: fromNumber,
        to: phoneNumber
      });

      await this.updateRateLimit(phoneNumber);
      logger.info(`Voice OTP sent to ${phoneNumber}`);

      return {
        success: true,
        message: 'Voice OTP sent successfully'
      };

    } catch (error) {
      logger.error('Failed to send voice OTP:', error);
      return {
        success: false,
        message: 'Failed to send voice OTP. Please try again.'
      };
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(phoneNumber: string, code: string): Promise<OTPResult> {
    try {
      const otpKey = `otp:${phoneNumber}`;
      const otpData = await getCacheJSON<OTPData>(otpKey);

      if (!otpData) {
        return {
          success: false,
          message: 'OTP expired or not found. Please request a new one.'
        };
      }

      // Check attempts
      if (otpData.attempts >= this.MAX_ATTEMPTS) {
        await deleteCache(otpKey);
        return {
          success: false,
          message: 'Too many failed attempts. Please request a new OTP.'
        };
      }

      // Verify code
      if (otpData.code !== code) {
        otpData.attempts += 1;
        await setCacheJSON(otpKey, otpData, this.OTP_EXPIRY);
        
        return {
          success: false,
          message: `Invalid OTP code. ${this.MAX_ATTEMPTS - otpData.attempts} attempts remaining.`
        };
      }

      // OTP verified successfully
      await deleteCache(otpKey);
      
      return {
        success: true,
        message: 'OTP verified successfully',
        data: {
          type: otpData.type,
          phoneNumber: otpData.phoneNumber
        }
      };

    } catch (error) {
      logger.error('OTP verification error:', error);
      return {
        success: false,
        message: 'OTP verification failed. Please try again.'
      };
    }
  }

  /**
   * Resend OTP (same as sendOTP but with different messaging)
   */
  async resendOTP(phoneNumber: string): Promise<OTPResult> {
    return this.sendOTP(phoneNumber, 'login');
  }
}

export const otpService = new OTPService();
