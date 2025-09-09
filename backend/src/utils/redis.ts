import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

let redisClient: RedisClientType;

export const connectRedis = async (): Promise<void> => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
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
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis first.');
  }
  return redisClient;
};

// Cache helper functions
export const setCache = async (key: string, value: string, expireInSeconds?: number): Promise<void> => {
  try {
    if (expireInSeconds) {
      await redisClient.setEx(key, expireInSeconds, value);
    } else {
      await redisClient.set(key, value);
    }
  } catch (error) {
    logger.error('Redis set error:', error);
    throw error;
  }
};

export const getCache = async (key: string): Promise<string | null> => {
  try {
    return await redisClient.get(key);
  } catch (error) {
    logger.error('Redis get error:', error);
    throw error;
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.error('Redis delete error:', error);
    throw error;
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
