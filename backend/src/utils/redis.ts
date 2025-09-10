import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

let redisClient: RedisClientType | null = null;
let isRedisEnabled = false;

export const connectRedis = async (): Promise<void> => {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl || redisUrl.trim() === '') {
    logger.info('Redis URL not configured, skipping Redis initialization');
    isRedisEnabled = false;
    return;
  }

  try {
    redisClient = createClient({
      url: redisUrl,
    });

    redisClient.on('error', (error) => {
      logger.error('Redis error:', error);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis ready');
    });

    redisClient.on('end', () => {
      logger.info('Redis connection ended');
    });

    await redisClient.connect();
    isRedisEnabled = true;
    logger.info('Redis initialization completed');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    isRedisEnabled = false;
    // Don't throw error - allow server to continue without Redis
    logger.warn('Server will continue without Redis caching');
  }
};

export const getRedisClient = (): RedisClientType | null => {
  return redisClient;
};

export const isRedisAvailable = (): boolean => {
  return isRedisEnabled && redisClient !== null;
};

// Cache helper functions
export const setCache = async (key: string, value: string, expireInSeconds?: number): Promise<void> => {
  if (!isRedisAvailable()) {
    return; // Silently skip if Redis is not available
  }
  
  try {
    if (expireInSeconds) {
      await redisClient!.setEx(key, expireInSeconds, value);
    } else {
      await redisClient!.set(key, value);
    }
  } catch (error) {
    logger.error('Redis set error:', error);
    // Don't throw error - just log it
  }
};

export const getCache = async (key: string): Promise<string | null> => {
  if (!isRedisAvailable()) {
    return null; // Return null if Redis is not available
  }
  
  try {
    return await redisClient!.get(key);
  } catch (error) {
    logger.error('Redis get error:', error);
    return null; // Return null on error instead of throwing
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  if (!isRedisAvailable()) {
    return; // Silently skip if Redis is not available
  }
  
  try {
    await redisClient!.del(key);
  } catch (error) {
    logger.error('Redis delete error:', error);
    // Don't throw error - just log it
  }
};

export const setCacheJSON = async <T>(key: string, value: T, expireInSeconds?: number): Promise<void> => {
  const jsonValue = JSON.stringify(value);
  await setCache(key, jsonValue, expireInSeconds);
};

export const getCacheJSON = async <T>(key: string): Promise<T | null> => {
  const value = await getCache(key);
  return value ? JSON.parse(value) : null;
};
