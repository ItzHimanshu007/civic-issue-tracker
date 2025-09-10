import jwt from 'jsonwebtoken';
import { logger } from './logger';
import { getRedisClient, isRedisAvailable } from './redis';

export interface JWTPayload {
  userId: string;
  username?: string;
  phoneNumber?: string;
  role: 'CITIZEN' | 'STAFF' | 'ADMIN';
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Generate access and refresh token pair
 */
export const generateTokenPair = async (payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<TokenPair> => {
  try {
    const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    // Store refresh token in Redis with expiration (if Redis is available)
    if (isRedisAvailable()) {
      const redis = getRedisClient();
      const refreshTokenKey = `refresh_token:${payload.userId}`;
      await redis!.setEx(refreshTokenKey, 7 * 24 * 60 * 60, refreshToken); // 7 days
    }

    return { accessToken, refreshToken };
  } catch (error) {
    logger.error('Token generation error:', error);
    throw new Error('Failed to generate tokens');
  }
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as JWTPayload;
  } catch (error) {
    logger.error('Access token verification error:', error);
    throw new Error('Invalid or expired access token');
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = async (token: string): Promise<JWTPayload> => {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as JWTPayload;
    
    // Check if refresh token exists in Redis (if Redis is available)
    if (isRedisAvailable()) {
      const redis = getRedisClient();
      const refreshTokenKey = `refresh_token:${decoded.userId}`;
      const storedToken = await redis!.get(refreshTokenKey);
      
      if (storedToken !== token) {
        throw new Error('Invalid refresh token');
      }
    }
    // If Redis is not available, we just verify the JWT signature
    
    return decoded;
  } catch (error) {
    logger.error('Refresh token verification error:', error);
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (refreshToken: string): Promise<TokenPair> => {
  try {
    const decoded = await verifyRefreshToken(refreshToken);
    
    // Generate new token pair
    const newTokenPair = await generateTokenPair({
      userId: decoded.userId,
      ...(decoded.username && { username: decoded.username }),
      ...(decoded.phoneNumber && { phoneNumber: decoded.phoneNumber }),
      role: decoded.role,
    });
    
    return newTokenPair;
  } catch (error) {
    logger.error('Token refresh error:', error);
    throw new Error('Failed to refresh token');
  }
};

/**
 * Revoke refresh token (logout)
 */
export const revokeRefreshToken = async (userId: string): Promise<void> => {
  try {
    if (isRedisAvailable()) {
      const redis = getRedisClient();
      const refreshTokenKey = `refresh_token:${userId}`;
      await redis!.del(refreshTokenKey);
    }
    // If Redis is not available, tokens will expire naturally
  } catch (error) {
    logger.error('Token revocation error:', error);
    throw new Error('Failed to revoke token');
  }
};

/**
 * Revoke all refresh tokens for user (logout from all devices)
 */
export const revokeAllRefreshTokens = async (userId: string): Promise<void> => {
  try {
    if (isRedisAvailable()) {
      const redis = getRedisClient();
      const pattern = `refresh_token:${userId}*`;
      const keys = await redis!.keys(pattern);
      
      if (keys.length > 0) {
        await redis!.del(keys);
      }
    }
    // If Redis is not available, tokens will expire naturally
  } catch (error) {
    logger.error('All tokens revocation error:', error);
    throw new Error('Failed to revoke all tokens');
  }
};

/**
 * Extract token from Authorization header
 */
export const extractToken = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove "Bearer " prefix
};
