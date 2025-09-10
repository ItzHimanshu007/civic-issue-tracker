import twilio from 'twilio';
import { logger } from '../utils/logger';
import { setCacheJSON, getCacheJSON, deleteCache, isRedisAvailable } from '../utils/redis';

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
  
  // In-memory storage for development when Redis is not available
  private memoryCache = new Map<string, { data: any; expiresAt: number }>();
  private rateLimitCache = new Map<string, { attempts: number; expiresAt: number }>();

  constructor() {
    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
      logger.info('Twilio client initialized');
    } else {
      logger.warn('Twilio credentials not provided, using mock OTP');
    }
  }
  
  /**
   * Clean expired entries from memory cache
   */
  private cleanExpiredEntries(): void {
    const now = Date.now();
    for (const [key, value] of this.memoryCache.entries()) {
      if (value.expiresAt < now) {
        this.memoryCache.delete(key);
      }
    }
    for (const [key, value] of this.rateLimitCache.entries()) {
      if (value.expiresAt < now) {
        this.rateLimitCache.delete(key);
      }
    }
  }
  
  /**
   * Set data in cache (Redis or memory fallback)
   */
  private async setCacheData(key: string, data: any, expireInSeconds: number): Promise<void> {
    if (isRedisAvailable()) {
      await setCacheJSON(key, data, expireInSeconds);
    } else {
      this.cleanExpiredEntries();
      this.memoryCache.set(key, {
        data,
        expiresAt: Date.now() + (expireInSeconds * 1000)
      });
    }
  }
  
  /**
   * Get data from cache (Redis or memory fallback)
   */
  private async getCacheData<T>(key: string): Promise<T | null> {
    if (isRedisAvailable()) {
      return await getCacheJSON<T>(key);
    } else {
      this.cleanExpiredEntries();
      const entry = this.memoryCache.get(key);
      return entry && entry.expiresAt > Date.now() ? entry.data as T : null;
    }
  }
  
  /**
   * Delete data from cache (Redis or memory fallback)
   */
  private async deleteCacheData(key: string): Promise<void> {
    if (isRedisAvailable()) {
      await deleteCache(key);
    } else {
      this.memoryCache.delete(key);
    }
  }
  
  /**
   * Set rate limit data
   */
  private async setRateLimitData(key: string, attempts: number, expireInSeconds: number): Promise<void> {
    if (isRedisAvailable()) {
      await setCacheJSON(key, attempts, expireInSeconds);
    } else {
      this.cleanExpiredEntries();
      this.rateLimitCache.set(key, {
        attempts,
        expiresAt: Date.now() + (expireInSeconds * 1000)
      });
    }
  }
  
  /**
   * Get rate limit data
   */
  private async getRateLimitData(key: string): Promise<number | null> {
    if (isRedisAvailable()) {
      return await getCacheJSON<number>(key);
    } else {
      this.cleanExpiredEntries();
      const entry = this.rateLimitCache.get(key);
      return entry && entry.expiresAt > Date.now() ? entry.attempts : null;
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
    const attempts = await this.getRateLimitData(rateLimitKey);
    
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
    const attempts = await this.getRateLimitData(rateLimitKey) || 0;
    await this.setRateLimitData(rateLimitKey, attempts + 1, this.RATE_LIMIT_WINDOW);
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

      // Store OTP data in cache
      const otpData: OTPData = {
        code: otpCode,
        phoneNumber,
        attempts: 0,
        createdAt: Date.now(),
        type
      };

      await this.setCacheData(otpKey, otpData, this.OTP_EXPIRY);

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

      await this.setCacheData(otpKey, otpData, this.OTP_EXPIRY);

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
      const otpData = await this.getCacheData<OTPData>(otpKey);

      if (!otpData) {
        return {
          success: false,
          message: 'OTP expired or not found. Please request a new one.'
        };
      }

      // Check attempts
      if (otpData.attempts >= this.MAX_ATTEMPTS) {
        await this.deleteCacheData(otpKey);
        return {
          success: false,
          message: 'Too many failed attempts. Please request a new OTP.'
        };
      }

      // Verify code
      if (otpData.code !== code) {
        otpData.attempts += 1;
        await this.setCacheData(otpKey, otpData, this.OTP_EXPIRY);
        
        return {
          success: false,
          message: `Invalid OTP code. ${this.MAX_ATTEMPTS - otpData.attempts} attempts remaining.`
        };
      }

      // OTP verified successfully
      await this.deleteCacheData(otpKey);
      
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
