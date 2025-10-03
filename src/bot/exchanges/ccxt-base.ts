import ccxt from 'ccxt';
import { ExchangeConfig, MarketType } from '../types';

export abstract class CCXTBaseExchange {
  protected exchange: ccxt.pro.Exchange;
  protected spotPrices: Map<string, number> = new Map();
  protected futuresPrices: Map<string, number> = new Map();
  protected spotTradingPairs: Set<string> = new Set();
  protected futuresTradingPairs: Set<string> = new Set();
  protected isConnected: boolean = false;
  protected watchLoops: Map<string, boolean> = new Map();
  protected priceUpdateTimestamps: Map<string, number> = new Map();
  protected readonly BATCH_SIZE = 50; // Subscribe in batches
  protected readonly STALE_THRESHOLD = 30000; // 30 seconds
  
  constructor(protected config: ExchangeConfig, protected exchangeId: string) {
    // Initialize CCXT Pro exchange
    this.exchange = new (ccxt.pro as any)[exchangeId]({
      enableRateLimit: true,
      options: {
        defaultType: 'spot',
      }
    });
  }

  /**
   * Connect to exchange (initialize)
   */
  public connect(): void {
    console.log(`   ✅ ${this.config.name} CCXT Pro initialized`);
    this.isConnected = true;
  }

  /**
   * Normalize trading pair symbol
   * Removes unwanted formats like "$SYMBOL", "SYMBOL:USDT", etc.
   */
  private normalizeSymbol(symbol: string): string | null {
    // Remove symbols starting with $
    if (symbol.startsWith('$')) {
      return null;
    }
    
    // Remove symbols with numbers at the start (like "10000WEN/USDT")
    if (/^\d/.test(symbol)) {
      return null;
    }
    
    // For futures symbols like "BTC/USDT:USDT", convert to "BTC/USDT"
    if (symbol.includes(':')) {
      const parts = symbol.split(':');
      symbol = parts[0];
    }
    
    // Only accept symbols with format "XXX/YYY"
    if (!symbol.includes('/')) {
      return null;
    }
    
    const [base, quote] = symbol.split('/');
    
    // Filter out invalid base/quote
    if (!base || !quote || base.length < 2 || quote.length < 2) {
      return null;
    }
    
    // Accept major quote currencies
    const validQuotes = ['USDT', 'USDC', 'BTC', 'ETH', 'BUSD', 'USD', 'EUR', 'FDUSD', 'DAI'];
    if (!validQuotes.includes(quote)) {
      return null;
    }
    
    return symbol;
  }

  /**
   * Fetch all trading pairs for a market type
   */
  public async fetchTradingPairs(marketType: MarketType): Promise<string[]> {
    try {
      await this.exchange.loadMarkets();
      const markets = this.exchange.markets;
      const pairs: string[] = [];

      for (const symbol in markets) {
        const market = markets[symbol];
        
        // Normalize symbol
        const normalizedSymbol = this.normalizeSymbol(market.symbol);
        if (!normalizedSymbol) {
          continue; // Skip invalid symbols
        }
        
        if (marketType === MarketType.SPOT && market.spot) {
          pairs.push(normalizedSymbol);
          this.spotTradingPairs.add(normalizedSymbol);
        } else if (marketType === MarketType.FUTURES && (market.swap || market.future)) {
          pairs.push(normalizedSymbol);
          this.futuresTradingPairs.add(normalizedSymbol);
        }
      }

      return pairs;
    } catch (error: any) {
      console.error(`   ❌ ${this.config.name} fetchTradingPairs error:`, error.message);
      return [];
    }
  }

  /**
   * Subscribe to symbols using CCXT Pro watchTicker with BATCHING
   */
  public async subscribeToSymbols(symbols: string[], marketType: MarketType): Promise<void> {
    if (!this.isConnected) {
      console.error(`   ❌ ${this.config.name} not connected`);
      return;
    }

    // Set exchange type
    this.exchange.options['defaultType'] = marketType === MarketType.SPOT ? 'spot' : 'swap';

    console.log(`   🚀 ${this.config.name} subscribing to ${symbols.length} ${marketType} symbols (BATCH MODE)...`);

    // Split into batches for faster processing
    const batches = [];
    for (let i = 0; i < symbols.length; i += this.BATCH_SIZE) {
      batches.push(symbols.slice(i, i + this.BATCH_SIZE));
    }

    console.log(`   📦 Processing ${batches.length} batches of ~${this.BATCH_SIZE} symbols each`);

    // Process batches in parallel
    await Promise.all(
      batches.map(async (batch, batchIndex) => {
        try {
          await Promise.all(
            batch.map(symbol => this.startWatchingSymbol(symbol, marketType))
          );
          console.log(`   ✅ Batch ${batchIndex + 1}/${batches.length} subscribed (${batch.length} symbols)`);
        } catch (error: any) {
          console.error(`   ⚠️  Batch ${batchIndex + 1} partial error:`, error.message);
        }
      })
    );

    console.log(`   ✅ ${this.config.name} subscribed to ${symbols.length} ${marketType} symbols`);
  }

  /**
   * Start watching a single symbol (OPTIMIZED)
   */
  private async startWatchingSymbol(symbol: string, marketType: MarketType): Promise<void> {
    const loopKey = `${symbol}-${marketType}`;
    
    if (this.watchLoops.get(loopKey)) {
      return; // Already watching
    }

    this.watchLoops.set(loopKey, true);

    // Start watching ticker in a loop
    (async () => {
      let consecutiveErrors = 0;
      const MAX_ERRORS = 5;

      while (this.watchLoops.get(loopKey)) {
        try {
          const ticker = await this.exchange.watchTicker(symbol);
          
          if (ticker && ticker.last) {
            this.updatePrice(symbol, ticker.last, marketType);
            consecutiveErrors = 0; // Reset error counter
          }
        } catch (error: any) {
          consecutiveErrors++;
          
          if (error.message.includes('closed') || !this.watchLoops.get(loopKey)) {
            break;
          }
          
          // If too many errors, stop watching this symbol
          if (consecutiveErrors >= MAX_ERRORS) {
            console.error(`   ⚠️  Too many errors for ${symbol}, stopping watch`);
            this.watchLoops.set(loopKey, false);
            break;
          }
          
          // Exponential backoff on errors
          await new Promise(resolve => setTimeout(resolve, Math.min(5000, 1000 * consecutiveErrors)));
        }
      }
    })();
  }


  /**
   * Get current price for a symbol with staleness check
   */
  public getPrice(symbol: string, marketType: MarketType): number | undefined {
    const prices = marketType === MarketType.SPOT ? this.spotPrices : this.futuresPrices;
    const timestamp = this.priceUpdateTimestamps.get(`${symbol}-${marketType}`);
    
    // Check if price is stale (older than threshold)
    if (timestamp && (Date.now() - timestamp) > this.STALE_THRESHOLD) {
      return undefined; // Price is too old
    }
    
    // CCXT uses '/' separator, but we might store without it
    const normalizedSymbol = symbol.replace('/', '');
    return prices.get(symbol) || prices.get(normalizedSymbol);
  }

  /**
   * Update price in cache with timestamp tracking
   */
  protected updatePrice(symbol: string, price: number, marketType: MarketType): void {
    const prices = marketType === MarketType.SPOT ? this.spotPrices : this.futuresPrices;
    prices.set(symbol, price);
    prices.set(symbol.replace('/', ''), price); // Store both formats
    this.priceUpdateTimestamps.set(`${symbol}-${marketType}`, Date.now());
  }



  /**
   * Disconnect from exchange
   */
  public async disconnect(): Promise<void> {
    // Stop all watch loops
    for (const key of this.watchLoops.keys()) {
      this.watchLoops.set(key, false);
    }

    try {
      await this.exchange.close();
    } catch (error) {
      // Ignore close errors
    }

    this.isConnected = false;
    console.log(`   ✅ ${this.config.name} disconnected`);
  }

  /**
   * Get trading pairs
   */
  public getTradingPairs(marketType: 'spot' | 'futures' = 'spot'): string[] {
    const pairs = marketType === 'spot' ? this.spotTradingPairs : this.futuresTradingPairs;
    return Array.from(pairs);
  }

}
