import { logger } from '../utils/logger';
import { generateTokenPair } from '../utils/jwt';
import { query } from '../utils/database';

interface GoogleTokenInfo {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
}

interface FacebookTokenInfo {
  id: string;
  email: string;
  name: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

interface AppleTokenInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
}

export interface OAuthUser {
  id: string;
  name: string;
  phoneNumber?: string;
  email: string;
  role: 'CITIZEN' | 'STAFF' | 'ADMIN';
  isVerified: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export class OAuthService {
  /**
   * Verify Google OAuth token
   */
  async verifyGoogleToken(token: string): Promise<GoogleTokenInfo | null> {
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
      
      if (!response.ok) {
        logger.error('Google token verification failed', { status: response.status });
        return null;
      }

      const tokenInfo = await response.json() as GoogleTokenInfo;
      return tokenInfo;
    } catch (error) {
      logger.error('Google token verification error:', error);
      return null;
    }
  }

  /**
   * Verify Facebook OAuth token
   */
  async verifyFacebookToken(token: string): Promise<FacebookTokenInfo | null> {
    try {
      const response = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${token}`);
      
      if (!response.ok) {
        logger.error('Facebook token verification failed', { status: response.status });
        return null;
      }

      const tokenInfo = await response.json() as FacebookTokenInfo;
      return tokenInfo;
    } catch (error) {
      logger.error('Facebook token verification error:', error);
      return null;
    }
  }

  /**
   * Verify Apple OAuth token (simplified - in production you'd verify the JWT properly)
   */
  async verifyAppleToken(identityToken: string, authorizationCode: string): Promise<AppleTokenInfo | null> {
    try {
      // In a real implementation, you would:
      // 1. Verify the identity token against Apple's public keys
      // 2. Extract user information from the token
      // For now, we'll return a mock response
      
      logger.warn('Apple OAuth not fully implemented - using mock data');
      return {
        sub: 'apple-user-' + Date.now(),
        email: 'apple.user@example.com',
        email_verified: true,
      };
    } catch (error) {
      logger.error('Apple token verification error:', error);
      return null;
    }
  }

  /**
   * Process Google OAuth authentication
   */
  async authenticateGoogle(token: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const tokenInfo = await this.verifyGoogleToken(token);
      
      if (!tokenInfo) {
        return { success: false, message: 'Invalid Google token' };
      }

      const user = await this.upsertOAuthUser({
        providerId: tokenInfo.sub,
        provider: 'google',
        email: tokenInfo.email,
        name: tokenInfo.name,
        avatarUrl: tokenInfo.picture,
        isEmailVerified: tokenInfo.email_verified || false,
      });

      const tokens = await generateTokenPair({
        userId: user.id,
        phoneNumber: user.phoneNumber || '',
        role: user.role,
      });

      return {
        success: true,
        data: {
          user,
          tokens,
        },
      };
    } catch (error) {
      logger.error('Google OAuth error:', error);
      return { success: false, message: 'Google authentication failed' };
    }
  }

  /**
   * Process Facebook OAuth authentication
   */
  async authenticateFacebook(token: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const tokenInfo = await this.verifyFacebookToken(token);
      
      if (!tokenInfo) {
        return { success: false, message: 'Invalid Facebook token' };
      }

      const user = await this.upsertOAuthUser({
        providerId: tokenInfo.id,
        provider: 'facebook',
        email: tokenInfo.email,
        name: tokenInfo.name,
        avatarUrl: tokenInfo.picture?.data?.url,
        isEmailVerified: true, // Facebook emails are generally verified
      });

      const tokens = await generateTokenPair({
        userId: user.id,
        phoneNumber: user.phoneNumber || '',
        role: user.role,
      });

      return {
        success: true,
        data: {
          user,
          tokens,
        },
      };
    } catch (error) {
      logger.error('Facebook OAuth error:', error);
      return { success: false, message: 'Facebook authentication failed' };
    }
  }

  /**
   * Process Apple OAuth authentication
   */
  async authenticateApple(identityToken: string, authorizationCode: string, userData?: { name?: string }): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const tokenInfo = await this.verifyAppleToken(identityToken, authorizationCode);
      
      if (!tokenInfo) {
        return { success: false, message: 'Invalid Apple token' };
      }

      const user = await this.upsertOAuthUser({
        providerId: tokenInfo.sub,
        provider: 'apple',
        email: tokenInfo.email || '',
        name: userData?.name || 'Apple User',
        isEmailVerified: tokenInfo.email_verified || false,
      });

      const tokens = await generateTokenPair({
        userId: user.id,
        phoneNumber: user.phoneNumber || '',
        role: user.role,
      });

      return {
        success: true,
        data: {
          user,
          tokens,
        },
      };
    } catch (error) {
      logger.error('Apple OAuth error:', error);
      return { success: false, message: 'Apple authentication failed' };
    }
  }

  /**
   * Upsert user from OAuth provider
   */
  private async upsertOAuthUser(data: {
    providerId: string;
    provider: 'google' | 'facebook' | 'apple';
    email: string;
    name: string;
    avatarUrl?: string;
    isEmailVerified: boolean;
  }): Promise<OAuthUser> {
    const { providerId, provider, email, name, avatarUrl, isEmailVerified } = data;

    // First, try to find existing user by email
    let userResult = await query(
      'SELECT id, name, phone_number, email, role, is_verified, is_active, avatar_url, created_at FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Create new user
      userResult = await query(
        `INSERT INTO users (email, name, avatar_url, is_verified, role) 
         VALUES ($1, $2, $3, $4, 'CITIZEN') 
         RETURNING id, name, phone_number, email, role, is_verified, is_active, avatar_url, created_at`,
        [email, name, avatarUrl || null, isEmailVerified]
      );
    } else {
      // Update existing user
      userResult = await query(
        `UPDATE users 
         SET name = COALESCE($2, name), 
             avatar_url = COALESCE($3, avatar_url),
             is_verified = CASE WHEN $4 = true THEN true ELSE is_verified END,
             updated_at = CURRENT_TIMESTAMP
         WHERE email = $1 
         RETURNING id, name, phone_number, email, role, is_verified, is_active, avatar_url, created_at`,
        [email, name, avatarUrl || null, isEmailVerified]
      );
    }

    const user = userResult.rows[0];

    // Store OAuth provider information
    await query(
      `INSERT INTO oauth_providers (user_id, provider, provider_id, access_token) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (user_id, provider) DO UPDATE SET 
         provider_id = EXCLUDED.provider_id,
         access_token = EXCLUDED.access_token,
         updated_at = CURRENT_TIMESTAMP`,
      [user.id, provider, providerId, ''] // We don't store the actual access token for security
    );

    return {
      id: user.id,
      name: user.name,
      phoneNumber: user.phone_number,
      email: user.email,
      role: user.role,
      isVerified: user.is_verified,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
    };
  }
}

export const oauthService = new OAuthService();
