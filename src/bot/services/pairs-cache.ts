import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CachedPairs {
  spot: string[];
  futures: string[];
  timestamp: number;
  exchange: string;
}

interface PairsCache {
  [exchange: string]: CachedPairs;
}

export class PairsCacheService {
  private cacheFile: string;
  private cache: PairsCache = {};
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.cacheFile = path.join(__dirname, '..', '..', '..', 'cache', 'trading-pairs.json');
    this.loadCache();
  }

  /**
   * Load cache from file
   */
  private loadCache(): void {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const data = fs.readFileSync(this.cacheFile, 'utf-8');
        this.cache = JSON.parse(data);
        console.log('   ✅ Trading pairs cache loaded');
      }
    } catch (error) {
      console.log('   ⚠️  Failed to load cache, starting fresh');
      this.cache = {};
    }
  }

  /**
   * Save cache to file
   */
  private saveCache(): void {
    try {
      const cacheDir = path.dirname(this.cacheFile);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2));
      console.log('   ✅ Trading pairs cache saved');
    } catch (error) {
      console.error('   ⚠️  Failed to save cache:', error);
    }
  }

  /**
   * Get cached pairs for an exchange
   */
  public getCachedPairs(exchange: string): CachedPairs | null {
    const cached = this.cache[exchange];
    
    if (!cached) {
      return null;
    }

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      console.log(`   ⏰ Cache expired for ${exchange}`);
      return null;
    }

    console.log(`   ✅ Using cached pairs for ${exchange} (${cached.spot.length} spot, ${cached.futures.length} futures)`);
    return cached;
  }

  /**
   * Store pairs in cache
   */
  public storePairs(exchange: string, spotPairs: string[], futuresPairs: string[]): void {
    this.cache[exchange] = {
      exchange,
      spot: spotPairs,
      futures: futuresPairs,
      timestamp: Date.now()
    };
    this.saveCache();
  }

  /**
   * Clear cache for an exchange
   */
  public clearCache(exchange?: string): void {
    if (exchange) {
      delete this.cache[exchange];
    } else {
      this.cache = {};
    }
    this.saveCache();
  }

  /**
   * Get cache statistics
   */
  public getStats(): { exchanges: number; totalSpotPairs: number; totalFuturesPairs: number } {
    let totalSpot = 0;
    let totalFutures = 0;

    for (const cached of Object.values(this.cache)) {
      totalSpot += cached.spot.length;
      totalFutures += cached.futures.length;
    }

    return {
      exchanges: Object.keys(this.cache).length,
      totalSpotPairs: totalSpot,
      totalFuturesPairs: totalFutures
    };
  }
}
