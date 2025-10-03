import { HTXExchangeCCXT } from './exchanges/htx-ccxt';
import { BybitExchangeCCXT } from './exchanges/bybit-ccxt';
import { KuCoinExchangeCCXT } from './exchanges/kucoin-ccxt';
import { OKXExchangeCCXT } from './exchanges/okx-ccxt';
import { BingXExchangeCCXT } from './exchanges/bingx-ccxt';
import { CCXTBaseExchange } from './exchanges/ccxt-base';
import { ArbitrageAnalyzer } from './arbitrage';
import { TelegramServiceEnhanced } from './services/telegram-enhanced';
import { RedisService } from './services/redis';
import { PairsCacheService } from './services/pairs-cache';
import { EXCHANGES, PRICE_UPDATE_INTERVAL } from './config';
import { MarketType, PriceData } from './types';
import express from 'express';
import cors from 'cors';

class ArbitrageBot {
  private exchanges: Map<string, CCXTBaseExchange> = new Map();
  private analyzer: ArbitrageAnalyzer;
  private telegramService: TelegramServiceEnhanced;
  private redisService: RedisService;
  private pairsCache: PairsCacheService;
  private commonTradingPairs: Set<string> = new Set();
  private commonFuturesPairs: Set<string> = new Set();
  private readonly SPOT_LOG_COOLDOWN = 5 * 60 * 1000; // 5 minutes in milliseconds
  private readonly FUTURES_LOG_COOLDOWN = 2 * 60 * 1000; // 2 minutes in milliseconds
  private latestOpportunities: Map<string, any> = new Map();
  private opportunityCounter: number = 0;
  private lastLogTime: number = 0;
  private readonly LOG_INTERVAL = 10000; // Log every 10 seconds
  private stats = {
    totalOpportunitiesFound: 0,
    uniqueSymbolsWithOpportunities: new Set<string>(),
    opportunitiesByExchange: new Map<string, number>(),
    startTime: Date.now()
  };

  constructor() {
    this.analyzer = new ArbitrageAnalyzer();
    this.telegramService = new TelegramServiceEnhanced();
    this.redisService = new RedisService();
    this.pairsCache = new PairsCacheService();
    this.initializeExchanges();
    this.startHttpServer();
  }

  private startHttpServer() {
    const app = express();
    
    app.use(cors());
    app.use(express.json());
    
    app.get('/opportunities', (req: any, res: any) => {
      const opportunities = Array.from(this.latestOpportunities.values())
        .filter((opp: any) => Date.now() - opp.timestamp < 120000) // Last 2 minutes
        .sort((a: any, b: any) => b.profitPercentage - a.profitPercentage);
      
      res.json({ opportunities });
    });

    app.get('/stats', (req: any, res: any) => {
      const uptime = Date.now() - this.stats.startTime;
      res.json({
        uptime,
        totalOpportunities: this.stats.totalOpportunitiesFound,
        activeOpportunities: this.latestOpportunities.size,
        uniqueSymbols: this.stats.uniqueSymbolsWithOpportunities.size,
        opportunitiesByExchange: Object.fromEntries(this.stats.opportunitiesByExchange),
        monitoredPairs: {
          spot: this.commonTradingPairs.size,
          futures: this.commonFuturesPairs.size
        }
      });
    });


    app.post('/telegram/link', (req: any, res: any) => {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const code = this.telegramService.generateLinkingCode(userId);
      res.json({ code });
    });

    app.get('/available-pairs', (req: any, res: any) => {
      const allPairs = new Set<string>();
      
      // Return common trading pairs (both spot and futures)
      this.commonTradingPairs.forEach(pair => allPairs.add(pair));
      this.commonFuturesPairs.forEach(pair => allPairs.add(pair));
      
      const sortedPairs = Array.from(allPairs).sort();
      console.log(`📊 Returning ${sortedPairs.length} available pairs to frontend`);
      
      res.json({ pairs: sortedPairs });
    });

    
    app.listen(3002, () => {
      console.log('🌐 Bot HTTP server running on http://localhost:3002');
    });
  }

  private initializeExchanges() {
    console.log('\n🔧 Initializing exchanges with CCXT Pro...');
    for (const config of EXCHANGES) {
      let exchange;
      try {
        switch (config.name) {
          case 'HTX':
            exchange = new HTXExchangeCCXT(config);
            break;
          case 'Bybit':
            exchange = new BybitExchangeCCXT(config);
            break;
          case 'KuCoin':
            exchange = new KuCoinExchangeCCXT(config);
            break;
          case 'OKX':
            exchange = new OKXExchangeCCXT(config);
            break;
          case 'BingX':
            exchange = new BingXExchangeCCXT(config);
            break;
          default:
            console.log(`⚠️  Unknown exchange: ${config.name}`);
            continue;
        }
        this.exchanges.set(config.name, exchange);
        console.log(`   ✅ ${config.name} CCXT class initialized`);
      } catch (error) {
        console.error(`   ❌ Failed to initialize ${config.name}:`, error);
      }
    }
    console.log(`\n📊 Total exchanges initialized: ${this.exchanges.size}/${EXCHANGES.length}`);
  }

  private async fetchAllTradingPairs() {
    console.log('\n📡 Fetching trading pairs from all exchanges (PARALLEL MODE)...');
    const allPairsMap = new Map<string, { spot: number, futures: number }>();

    // Fetch trading pairs from ALL exchanges in parallel with caching
    const fetchPromises = Array.from(this.exchanges.entries()).map(async ([exchangeName, exchange]) => {
      try {
        // Try to get from cache first
        const cached = this.pairsCache.getCachedPairs(exchangeName);
        if (cached) {
          return { exchangeName, spotPairs: cached.spot, futuresPairs: cached.futures };
        }

        console.log(`   🔍 ${exchangeName} - Starting parallel fetch...`);
        
        // Fetch BOTH spot and futures in parallel for this exchange
        const [spotPairs, futuresPairs] = await Promise.all([
          Promise.race([
            exchange.fetchTradingPairs(MarketType.SPOT),
            new Promise<string[]>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 15000)
            )
          ]).catch(() => []),
          Promise.race([
            exchange.fetchTradingPairs(MarketType.FUTURES),
            new Promise<string[]>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 15000)
            )
          ]).catch(() => [])
        ]);

        console.log(`      ✅ ${exchangeName}: ${spotPairs.length} spot, ${futuresPairs.length} futures`);
        
        // Store in cache
        this.pairsCache.storePairs(exchangeName, spotPairs, futuresPairs);
        
        return { exchangeName, spotPairs, futuresPairs };
      } catch (error: any) {
        console.error(`   ❌ ${exchangeName} failed: ${error.message || 'Unknown error'}`);
        return { exchangeName, spotPairs: [], futuresPairs: [] };
      }
    });

    // Wait for all exchanges to finish (with timeout)
    const results = await Promise.race([
      Promise.all(fetchPromises),
      new Promise<any[]>((resolve) => 
        setTimeout(() => {
          console.log('   ⚠️  Global timeout reached, using partial results');
          resolve([]);
        }, 30000)
      )
    ]);

    // Process results
    for (const result of results) {
      if (result && result.spotPairs && result.futuresPairs) {
        result.spotPairs.forEach((pair: string) => {
          const counts = allPairsMap.get(pair) || { spot: 0, futures: 0 };
          counts.spot++;
          allPairsMap.set(pair, counts);
        });
        result.futuresPairs.forEach((pair: string) => {
          const counts = allPairsMap.get(pair) || { spot: 0, futures: 0 };
          counts.futures++;
          allPairsMap.set(pair, counts);
        });
      }
    }

    // Find common pairs (available on at least 2 exchanges for each market type)
    // Also include high-volume pairs even if only on one exchange
    const popularPairs = new Set([
      // Top 20 cryptocurrencies - USDT pairs (HIGHEST PRIORITY)
      'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT',
      'SOL/USDT', 'DOT/USDT', 'DOGE/USDT', 'MATIC/USDT', 'LTC/USDT',
      'AVAX/USDT', 'LINK/USDT', 'UNI/USDT', 'ATOM/USDT', 'ETC/USDT',
      'XLM/USDT', 'FIL/USDT', 'TRX/USDT', 'NEAR/USDT', 'ALGO/USDT',
      
      // Top 50 altcoins
      'VET/USDT', 'ICP/USDT', 'APT/USDT', 'ARB/USDT', 'OP/USDT',
      'INJ/USDT', 'SUI/USDT', 'SEI/USDT', 'PEPE/USDT', 'SHIB/USDT',
      'BCH/USDT', 'HBAR/USDT', 'IMX/USDT', 'STX/USDT', 'TIA/USDT',
      'RUNE/USDT', 'FTM/USDT', 'AAVE/USDT', 'GRT/USDT', 'SAND/USDT',
      'MANA/USDT', 'AXS/USDT', 'THETA/USDT', 'EOS/USDT', 'FLOW/USDT',
      'XTZ/USDT', 'EGLD/USDT', 'BSV/USDT', 'KAVA/USDT', 'ZEC/USDT',
      
      // Additional altcoins (50-100)
      'DASH/USDT', 'COMP/USDT', 'YFI/USDT', 'SNX/USDT', 'MKR/USDT',
      'SUSHI/USDT', 'CRV/USDT', 'BAT/USDT', 'ENJ/USDT', 'CHZ/USDT',
      'ZIL/USDT', 'QTUM/USDT', 'ONT/USDT', 'ZRX/USDT', 'ICX/USDT',
      'OMG/USDT', 'LRC/USDT', 'WAVES/USDT', 'CELO/USDT', '1INCH/USDT',
      'BAND/USDT', 'STORJ/USDT', 'KNC/USDT', 'REN/USDT', 'BNT/USDT',
      
      // Meme coins and trending (100-150)
      'BONK/USDT', 'FLOKI/USDT', 'WIF/USDT', 'ORDI/USDT', 'SATS/USDT',
      'RATS/USDT', 'MEME/USDT', 'BLUR/USDT', 'PENDLE/USDT', 'JTO/USDT',
      'PYTH/USDT', 'WLD/USDT', 'RNDR/USDT', 'FET/USDT', 'AGIX/USDT',
      'OCEAN/USDT', 'ROSE/USDT', 'GAL/USDT', 'GMT/USDT', 'APE/USDT',
      'GALA/USDT', 'LDO/USDT', 'MASK/USDT', 'DYDX/USDT', 'PEOPLE/USDT',
      'LOOKS/USDT', 'MAGIC/USDT', 'HIGH/USDT', 'VOXEL/USDT', 'ILV/USDT',
      
      // DeFi tokens (150-200)
      'CAKE/USDT', 'ALPHA/USDT', 'BEL/USDT', 'WING/USDT',
      'CREAM/USDT', 'BURGER/USDT', 'SPARTA/USDT', 'UNIBOT/USDT',
      'CVX/USDT', 'FXS/USDT', 'SPELL/USDT', 'OHM/USDT', 'ALCX/USDT',
      'BADGER/USDT', 'FARM/USDT', 'PERP/USDT', 'RARI/USDT', 'TORN/USDT',
      
      // Layer 2 and scaling (200-250)
      'METIS/USDT', 'BOBA/USDT', 'STRK/USDT', 'MANTA/USDT', 'BLAST/USDT',
      'MATIC/USDT', 'CELR/USDT', 'SKL/USDT', 'CTSI/USDT', 'MOVR/USDT',
      
      // Gaming and Metaverse (250-300)
      'IMX/USDT', 'GODS/USDT', 'SUPER/USDT', 'ALICE/USDT', 'TLM/USDT',
      'SLP/USDT', 'PYR/USDT', 'GHST/USDT', 'NAKA/USDT', 'UFO/USDT',
      
      // New listings and trending (300-350)
      'JUP/USDT', 'PIXEL/USDT', 'PORTAL/USDT', 'AEVO/USDT', 'DYM/USDT',
      'ALT/USDT', 'MANTA/USDT', 'RONIN/USDT', 'SAGA/USDT', 'OMNI/USDT',
      'W/USDT', 'ENA/USDT', 'REZ/USDT', 'BB/USDT', 'NOT/USDT',
      'IO/USDT', 'ZK/USDT', 'ZRO/USDT', 'G/USDT', 'LISTA/USDT',
      
      // USDC pairs (major)
      'BTC/USDC', 'ETH/USDC', 'SOL/USDC', 'AVAX/USDC', 'MATIC/USDC',
      'BNB/USDC', 'XRP/USDC', 'ADA/USDC', 'DOGE/USDC', 'DOT/USDC',
      
      // BTC pairs (cross-trading)
      'ETH/BTC', 'BNB/BTC', 'XRP/BTC', 'ADA/BTC', 'SOL/BTC', 'DOT/BTC',
      'LINK/BTC', 'LTC/BTC', 'AVAX/BTC', 'UNI/BTC', 'ATOM/BTC', 'MATIC/BTC',
      
      // ETH pairs (cross-trading)
      'BTC/ETH', 'BNB/ETH', 'LINK/ETH', 'UNI/ETH', 'AAVE/ETH', 'MATIC/ETH',
      
      // Stablecoins arbitrage
      'USDT/USDC', 'USDC/USDT', 'DAI/USDT', 'USDT/DAI', 'BUSD/USDT',
      
      // Additional high-volume pairs
      'TON/USDT', 'JASMY/USDT', 'KAVA/USDT', 'ONE/USDT', 'HBAR/USDT',
      'MINA/USDT', 'ROSE/USDT', 'AR/USDT', 'CFX/USDT', 'HOOK/USDT'
    ]);

    // Prioritize pairs - separate into priority and regular
    const priorityPairs = new Set<string>();
    const regularPairs = new Set<string>();

    for (const [pair, counts] of allPairsMap.entries()) {
      // Include ALL pairs that are available on at least one exchange
      const isPriority = popularPairs.has(pair);
      
      if (counts.spot >= 1) {
        this.commonTradingPairs.add(pair);
        if (isPriority) {
          priorityPairs.add(pair);
        } else {
          regularPairs.add(pair);
        }
      }
      if (counts.futures >= 1) {
        this.commonFuturesPairs.add(pair);
      }
    }

    console.log(`   🎯 Priority pairs: ${priorityPairs.size}`);
    console.log(`   📊 Regular pairs: ${regularPairs.size}`);

    console.log(`\n📊 Results:`);
    console.log(`   ✅ ${this.commonTradingPairs.size} common spot trading pairs`);
    console.log(`   ✅ ${this.commonFuturesPairs.size} common futures trading pairs`);

    if (this.commonTradingPairs.size === 0 && this.commonFuturesPairs.size === 0) {
      console.log(`\n⚠️  WARNING: No common pairs found!`);
      console.log(`   This usually means exchanges are not responding.`);
      console.log(`   The bot will continue but may not find opportunities.`);
    } else if (this.commonTradingPairs.size > 0) {
      const samplePairs = Array.from(this.commonTradingPairs).slice(0, 5);
      console.log(`   📝 Sample pairs: ${samplePairs.join(', ')}`);
    }
  }

  public async start() {
    console.log('\n🚀 Starting Arbitrage Bot...');
    console.log('='.repeat(60));
    await this.fetchAllTradingPairs();

    // Connect to all exchanges
    console.log('\n🔌 Connecting to exchanges...');
    for (const [exchangeName, exchange] of this.exchanges) {
      try {
        console.log(`\n   📡 ${exchangeName}:`);
        exchange.connect();
        
        // Wait a bit for connection
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Subscribe to ALL spot pairs
        const spotPairs = Array.from(this.commonTradingPairs);
        console.log(`      🔔 Subscribing to ${spotPairs.length} spot pairs`);
        await exchange.subscribeToSymbols(spotPairs, MarketType.SPOT);
        
        // Subscribe to ALL futures pairs
        const futuresPairs = Array.from(this.commonFuturesPairs);
        console.log(`      🔔 Subscribing to ${futuresPairs.length} futures pairs`);
        await exchange.subscribeToSymbols(futuresPairs, MarketType.FUTURES);
        
        console.log(`      ✅ ${exchangeName} ready`);
      } catch (error) {
        console.error(`      ❌ Error with ${exchangeName}:`, error);
      }
    }

    // Start monitoring prices with FASTER intervals
    setInterval(() => {
      this.checkArbitrageOpportunities(MarketType.SPOT);
      this.checkArbitrageOpportunities(MarketType.FUTURES);
    }, 1000); // 1 second for faster detection


    console.log('\n' + '='.repeat(60));
    console.log('✅ Arbitrage bot started successfully with CCXT Pro!');
    console.log('📊 Monitoring for arbitrage opportunities...');
    console.log('='.repeat(60) + '\n');
  }

  private async isOnCooldown(symbol: string, marketType: MarketType): Promise<boolean> {
    return await this.redisService.isOnCooldown(symbol, marketType);
  }

  private async setCooldown(symbol: string, marketType: MarketType): Promise<void> {
    const cooldownMs = marketType === MarketType.SPOT ? this.SPOT_LOG_COOLDOWN : this.FUTURES_LOG_COOLDOWN;
    await this.redisService.setCooldown(symbol, marketType, cooldownMs);
  }

  private async checkArbitrageOpportunities(marketType: MarketType) {
    const prices: PriceData[] = [];
    const exchangePrices = new Map<string, number>();
    const now = Date.now();

    // Collect prices from all exchanges
    for (const [exchangeName, exchange] of this.exchanges) {
      let exchangePriceCount = 0;
      const pairs = marketType === MarketType.SPOT ? this.commonTradingPairs : this.commonFuturesPairs;

      for (const symbol of pairs) {
        const price = exchange.getPrice(symbol, marketType);
        if (price) {
          prices.push({
            symbol,
            price,
            exchange: exchangeName,
            marketType,
            timestamp: now,
          });
          exchangePriceCount++;
        }
      }
      exchangePrices.set(exchangeName, exchangePriceCount);
    }

    // Log price update status periodically (not every second!)
    const shouldLog = (now - this.lastLogTime) > this.LOG_INTERVAL;
    if (shouldLog && prices.length > 0) {
      this.lastLogTime = now;
      console.log(`\n📊 ${marketType} Price update (${new Date().toLocaleTimeString('ru-RU')}):`);
      for (const [exchangeName, count] of exchangePrices) {
        const icon = count > 0 ? '✅' : '⚠️';
        console.log(`   ${icon} ${exchangeName}: ${count} pairs`);
      }
      console.log(`   📊 Total prices collected: ${prices.length}`);
      console.log(`   💼 Active opportunities: ${this.latestOpportunities.size}`);
    }

    // Find ALL opportunities
    const opportunities = this.analyzer.findOpportunities(prices, marketType);

    // Clean up old opportunities (older than 2 minutes)
    const OPPORTUNITY_TTL = 120000; // 2 minutes
    for (const [key, opp] of this.latestOpportunities.entries()) {
      if (now - opp.timestamp > OPPORTUNITY_TTL) {
        this.latestOpportunities.delete(key);
      }
    }

    // Store ALL opportunities with UNIQUE IDs
    let newOpportunitiesCount = 0;
    for (const opportunity of opportunities) {
      // Create UNIQUE ID for each opportunity
      const uniqueId = `${opportunity.symbol}-${opportunity.buyExchange}-${opportunity.sellExchange}-${marketType}-${this.opportunityCounter++}`;
      
      // Check if similar opportunity already exists (same symbol, exchanges, market)
      const existingKey = Array.from(this.latestOpportunities.keys()).find(key => {
        const opp = this.latestOpportunities.get(key);
        return opp.symbol === opportunity.symbol &&
               opp.buyExchange === opportunity.buyExchange &&
               opp.sellExchange === opportunity.sellExchange &&
               opp.marketType === marketType;
      });

      if (existingKey) {
        // Update existing opportunity
        this.latestOpportunities.set(existingKey, {
          ...opportunity,
          id: existingKey,
          timestamp: now,
          marketType
        });
      } else {
        // Add new opportunity
        this.latestOpportunities.set(uniqueId, {
          ...opportunity,
          id: uniqueId,
          timestamp: now,
          marketType
        });
        newOpportunitiesCount++;
        
        // Update statistics
        this.stats.totalOpportunitiesFound++;
        this.stats.uniqueSymbolsWithOpportunities.add(opportunity.symbol);
        
        const buyCount = this.stats.opportunitiesByExchange.get(opportunity.buyExchange) || 0;
        this.stats.opportunitiesByExchange.set(opportunity.buyExchange, buyCount + 1);
        
        const sellCount = this.stats.opportunitiesByExchange.get(opportunity.sellExchange) || 0;
        this.stats.opportunitiesByExchange.set(opportunity.sellExchange, sellCount + 1);
      }
    }

    // Log only if there are new opportunities or periodically
    if (shouldLog && opportunities.length > 0) {
      console.log(`\n🎯 Found ${opportunities.length} ${marketType} opportunities (${newOpportunitiesCount} new)`);
      
      // Show top 5 by profit
      const topOpportunities = opportunities
        .sort((a, b) => b.profitPercentage - a.profitPercentage)
        .slice(0, 5);
      
      console.log(`   🏆 Top 5 by profit:`);
      topOpportunities.forEach((opp, idx) => {
        console.log(`   ${idx + 1}. ${opp.symbol}: ${opp.profitPercentage.toFixed(3)}% (${opp.buyExchange} → ${opp.sellExchange})`);
      });
    }

    // Send significant opportunities to Telegram
    for (const opportunity of opportunities) {
      if (opportunity.profitPercentage >= 0.5 && !(await this.isOnCooldown(opportunity.symbol, marketType))) {
        await this.telegramService.sendOpportunityAlert(opportunity);
        await this.setCooldown(opportunity.symbol, marketType);
      }
    }
  }


  public async stop() {
    console.log('\n🛑 Stopping bot...');
    
    for (const exchange of this.exchanges.values()) {
      await exchange.disconnect();
    }
    
    await this.redisService.disconnect();
    
    console.log('✅ Bot stopped successfully');
  }
}

// Start the bot
const bot = new ArbitrageBot();
bot.start();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down bot...');
  await bot.stop();
  process.exit(0);
});