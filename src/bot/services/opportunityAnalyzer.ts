import ccxt from 'ccxt';

interface MarketData {
  volume24h: number;
  high24h: number;
  low24h: number;
  priceChange24h: number;
  lastUpdate: number;
  orderbook?: {
    bids: [number, number][];
    asks: [number, number][];
  };
}

interface AIAnalysis {
  recommendation: 'buy' | 'hold' | 'avoid';
  confidence: number;
  suggestedAmount: number;
  risks: string[];
  opportunities: string[];
  marketSentiment: string;
  optimalEntryPrice: number;
  optimalExitPrice: number;
}

export class OpportunityAnalyzer {
  private exchanges: Map<string, ccxt.Exchange> = new Map();

  constructor() {
    this.initializeExchanges();
  }

  private initializeExchanges() {
    const exchangeClasses = {
      'bybit': ccxt.bybit,
      'htx': ccxt.htx,
      'kucoin': ccxt.kucoin,
      'okx': ccxt.okx,
      'bingx': ccxt.bingx,
    };

    for (const [name, ExchangeClass] of Object.entries(exchangeClasses)) {
      try {
        this.exchanges.set(name, new ExchangeClass({
          enableRateLimit: true,
          timeout: 10000,
        }));
      } catch (error) {
        console.error(`Failed to initialize ${name}:`, error);
      }
    }
  }

  async getMarketData(symbol: string, exchange: string): Promise<MarketData | null> {
    try {
      const exchangeInstance = this.exchanges.get(exchange.toLowerCase());
      if (!exchangeInstance) {
        console.error(`Exchange ${exchange} not found`);
        return null;
      }

      // Load markets if not loaded
      if (!exchangeInstance.markets) {
        await exchangeInstance.loadMarkets();
      }

      // Get ticker data
      const ticker = await exchangeInstance.fetchTicker(symbol);
      
      // Get orderbook
      let orderbook = null;
      try {
        const orderbookData = await exchangeInstance.fetchOrderBook(symbol, 10);
        orderbook = {
          bids: orderbookData.bids.slice(0, 5) as [number, number][],
          asks: orderbookData.asks.slice(0, 5) as [number, number][],
        };
      } catch (error) {
        console.error(`Failed to fetch orderbook for ${symbol} on ${exchange}:`, error);
      }

      return {
        volume24h: ticker.quoteVolume || 0,
        high24h: ticker.high || 0,
        low24h: ticker.low || 0,
        priceChange24h: ticker.percentage || 0,
        lastUpdate: ticker.timestamp || Date.now(),
        orderbook,
      };
    } catch (error) {
      console.error(`Error fetching market data for ${symbol} on ${exchange}:`, error);
      return null;
    }
  }

  async analyzeOpportunity(
    symbol: string,
    buyExchange: string,
    sellExchange: string,
    buyPrice: number,
    sellPrice: number,
    profitPercentage: number,
    marketData: MarketData | null
  ): Promise<AIAnalysis> {
    // Simple AI-like analysis based on market conditions
    const risks: string[] = [];
    const opportunities: string[] = [];
    let recommendation: 'buy' | 'hold' | 'avoid' = 'hold';
    let confidence = 50;
    let suggestedAmount = 100;
    let marketSentiment = 'Нейтральный';

    // Analyze profit percentage
    if (profitPercentage > 2) {
      opportunities.push('Высокий процент прибыли (>2%)');
      confidence += 20;
      recommendation = 'buy';
    } else if (profitPercentage > 1) {
      opportunities.push('Хороший процент прибыли (>1%)');
      confidence += 10;
      recommendation = 'buy';
    } else if (profitPercentage < 0.5) {
      risks.push('Низкий процент прибыли (<0.5%)');
      confidence -= 20;
      recommendation = 'avoid';
    }

    if (marketData) {
      // Analyze volume
      if (marketData.volume24h > 1000000) {
        opportunities.push('Высокая ликвидность (объем >$1M)');
        confidence += 15;
        suggestedAmount = 500;
      } else if (marketData.volume24h > 100000) {
        opportunities.push('Средняя ликвидность (объем >$100K)');
        confidence += 5;
        suggestedAmount = 200;
      } else {
        risks.push('Низкая ликвидность (объем <$100K)');
        confidence -= 15;
        suggestedAmount = 50;
        if (recommendation === 'buy') recommendation = 'hold';
      }

      // Analyze price volatility
      const volatility = ((marketData.high24h - marketData.low24h) / marketData.low24h) * 100;
      if (volatility > 10) {
        risks.push(`Высокая волатильность (${volatility.toFixed(1)}%)`);
        confidence -= 10;
      } else if (volatility > 5) {
        opportunities.push(`Умеренная волатильность (${volatility.toFixed(1)}%)`);
      } else {
        opportunities.push(`Низкая волатильность (${volatility.toFixed(1)}%)`);
        confidence += 5;
      }

      // Analyze price trend
      if (marketData.priceChange24h > 5) {
        marketSentiment = 'Сильный бычий тренд';
        opportunities.push('Положительный тренд (+' + marketData.priceChange24h.toFixed(2) + '%)');
        confidence += 10;
      } else if (marketData.priceChange24h > 0) {
        marketSentiment = 'Слабый бычий тренд';
        opportunities.push('Небольшой рост цены');
      } else if (marketData.priceChange24h < -5) {
        marketSentiment = 'Сильный медвежий тренд';
        risks.push('Сильное падение цены (' + marketData.priceChange24h.toFixed(2) + '%)');
        confidence -= 15;
        if (recommendation === 'buy') recommendation = 'hold';
      } else if (marketData.priceChange24h < 0) {
        marketSentiment = 'Слабый медвежий тренд';
        risks.push('Небольшое падение цены');
        confidence -= 5;
      }

      // Analyze orderbook depth
      if (marketData.orderbook) {
        const bidDepth = marketData.orderbook.bids.reduce((sum, [_, amount]) => sum + amount, 0);
        const askDepth = marketData.orderbook.asks.reduce((sum, [_, amount]) => sum + amount, 0);
        
        if (bidDepth > askDepth * 1.5) {
          opportunities.push('Сильное давление покупателей в стакане');
          confidence += 5;
        } else if (askDepth > bidDepth * 1.5) {
          risks.push('Сильное давление продавцов в стакане');
          confidence -= 5;
        }
      }
    } else {
      risks.push('Недостаточно рыночных данных для полного анализа');
      confidence -= 10;
    }

    // Additional risk factors
    risks.push('Комиссии биржи могут снизить прибыль');
    risks.push('Время перевода между биржами может привести к изменению цен');
    risks.push('Проскальзывание при исполнении ордеров');

    // Additional opportunities
    if (profitPercentage > 1.5) {
      opportunities.push('Прибыль покрывает типичные комиссии и риски');
    }

    // Calculate optimal prices
    const spread = sellPrice - buyPrice;
    const optimalEntryPrice = buyPrice + (spread * 0.1); // 10% into the spread
    const optimalExitPrice = sellPrice - (spread * 0.1); // 10% before the top

    // Ensure confidence is within bounds
    confidence = Math.max(0, Math.min(100, confidence));

    // Adjust recommendation based on final confidence
    if (confidence < 40) {
      recommendation = 'avoid';
    } else if (confidence < 60) {
      recommendation = 'hold';
    } else {
      recommendation = 'buy';
    }

    return {
      recommendation,
      confidence,
      suggestedAmount,
      risks,
      opportunities,
      marketSentiment,
      optimalEntryPrice,
      optimalExitPrice,
    };
  }

  async getDetailedAnalysis(
    symbol: string,
    buyExchange: string,
    sellExchange: string,
    buyPrice: number,
    sellPrice: number,
    profitPercentage: number
  ) {
    // Get market data from buy exchange (primary source)
    const marketData = await this.getMarketData(symbol, buyExchange);

    // Get AI analysis
    const aiAnalysis = await this.analyzeOpportunity(
      symbol,
      buyExchange,
      sellExchange,
      buyPrice,
      sellPrice,
      profitPercentage,
      marketData
    );

    return {
      marketData,
      aiAnalysis,
    };
  }

  async close() {
    for (const exchange of this.exchanges.values()) {
      try {
        await exchange.close();
      } catch (error) {
        console.error('Error closing exchange:', error);
      }
    }
  }
}

// Singleton instance
let analyzerInstance: OpportunityAnalyzer | null = null;

export function getAnalyzer(): OpportunityAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new OpportunityAnalyzer();
  }
  return analyzerInstance;
}
