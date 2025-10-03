import Redis from 'ioredis';
import { config } from '../config';
import { MarketType } from '../types';

export class RedisService {
  private redis: Redis | null = null;
  private enabled: boolean = false;

  constructor() {
    try {
      this.redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        lazyConnect: true,
        retryStrategy: () => null, // Don't retry
      });

      this.redis.on('error', (error) => {
        if (!this.enabled) return; // Suppress errors if not enabled
        console.error('Redis error:', error);
      });

      this.redis.on('connect', () => {
        this.enabled = true;
        console.log('✅ Connected to Redis');
      });

      // Try to connect, but don't fail if it doesn't work
      this.redis.connect().catch(() => {
        console.log('⚠️  Redis not available - running without cooldown system');
        this.enabled = false;
      });
    } catch (error) {
      console.log('⚠️  Redis not available - running without cooldown system');
      this.enabled = false;
    }
  }

  async setCooldown(symbol: string, marketType: MarketType, cooldownMs: number): Promise<void> {
    if (!this.enabled || !this.redis) return;
    try {
      const key = `cooldown:${marketType}:${symbol}`;
      await this.redis.set(key, '1', 'PX', cooldownMs);
    } catch (error) {
      // Ignore errors
    }
  }

  async isOnCooldown(symbol: string, marketType: MarketType): Promise<boolean> {
    if (!this.enabled || !this.redis) return false;
    try {
      const key = `cooldown:${marketType}:${symbol}`;
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
} 