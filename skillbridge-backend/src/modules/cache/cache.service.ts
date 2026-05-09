import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly redisClient: Redis;
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly configService: ConfigService) {
    const redisUrl =
      this.configService.get<string>('redis.url') || 'redis://localhost:6379';
    this.redisClient = new Redis(redisUrl);
    this.redisClient.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const val = await this.redisClient.get(key);
      if (!val) return null;
      return JSON.parse(val) as T;
    } catch (err) {
      this.logger.error(`Error reading key ${key} from Redis:`, err);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    try {
      const stringified = JSON.stringify(value);
      await this.redisClient.setex(key, ttlSeconds, stringified);
    } catch (err) {
      this.logger.error(`Error writing key ${key} to Redis:`, err);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
    } catch (err) {
      this.logger.error(`Error deleting key ${key} from Redis:`, err);
    }
  }

  get client(): Redis {
    return this.redisClient;
  }
}
