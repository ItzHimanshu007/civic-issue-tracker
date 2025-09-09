import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractToken, JWTPayload } from '../utils/jwt';
import { logger } from '../utils/logger';
import { query } from '../utils/database';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload & {
        id: string;
        name: string;
        email?: string;
        isVerified: boolean;
        isActive: boolean;
      };
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required'
      });
      return;
    }

    // Verify the token
    const payload = verifyAccessToken(token);
    
    // Fetch user details from database
    const userResult = await query(
      'SELECT id, name, phone_number, email, role, is_verified, is_active FROM users WHERE id = $1',
      [payload.userId]
    );
    
    if (userResult.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: 'User not found'
      });
      return;
    }
    
    const user = userResult.rows[0];
    
    // Check if user is active
    if (!user.is_active) {
      res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
      return;
    }
    
    // Attach user to request
    req.user = {
      userId: user.id,
      phoneNumber: user.phone_number,
      role: user.role,
      id: user.id,
      name: user.name,
      email: user.email,
      isVerified: user.is_verified,
      isActive: user.is_active,
    };
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Middleware to authorize based on user roles
 */
export const authorizeRoles = (...roles: ('CITIZEN' | 'STAFF' | 'ADMIN')[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }
    
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }
    
    next();
  };
};

/**
 * Middleware to require verified users
 */
export const requireVerification = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }
  
  if (!req.user.isVerified) {
    res.status(403).json({
      success: false,
      message: 'Account verification required'
    });
    return;
  }
  
  next();
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (token) {
      const payload = verifyAccessToken(token);
      
      const userResult = await query(
        'SELECT id, name, phone_number, email, role, is_verified, is_active FROM users WHERE id = $1',
        [payload.userId]
      );
      
      if (userResult.rows.length > 0 && userResult.rows[0].is_active) {
        const user = userResult.rows[0];
        req.user = {
          userId: user.id,
          phoneNumber: user.phone_number,
          role: user.role,
          id: user.id,
          name: user.name,
          email: user.email,
          isVerified: user.is_verified,
          isActive: user.is_active,
        };
      }
    }
    
    next();
  } catch (error) {
    // If token is invalid, just continue without user context
    logger.warn('Optional auth failed:', error);
    next();
  }
};
