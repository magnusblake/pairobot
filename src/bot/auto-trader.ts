import { getDatabase, TradingStrategy, ExchangeApiKey } from '../database/schema';
import { ArbitrageOpportunity } from './types';
import axios from 'axios';
import crypto from 'crypto';

interface OrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

export class AutoTrader {
  private db = getDatabase();
  private activeStrategies: Map<number, TradingStrategy> = new Map();
  private executingTrades: Set<string> = new Set();

  constructor() {
    this.loadActiveStrategies();
    // Reload strategies every minute
    setInterval(() => this.loadActiveStrategies(), 60000);
  }

  private loadActiveStrategies(): void {
    // This would need to be implemented to load all active strategies from all users
    console.log('Loading active auto-trading strategies...');
  }

  async processOpportunity(opportunity: ArbitrageOpportunity): Promise<void> {
    // Get all users with active auto-trade strategies
    const strategies = this.getMatchingStrategies(opportunity);

    for (const strategy of strategies) {
      await this.executeArbitrage(strategy, opportunity);
    }
  }

  private getMatchingStrategies(opportunity: ArbitrageOpportunity): TradingStrategy[] {
    const matching: TradingStrategy[] = [];

    for (const strategy of this.activeStrategies.values()) {
      if (!strategy.auto_trade_enabled || !strategy.is_active) {
        continue;
      }

      // Check if profit meets minimum threshold
      if (opportunity.profitPercentage < strategy.min_profit_percentage) {
        continue;
      }

      // Check if exchanges are in strategy
      const exchanges = JSON.parse(strategy.exchanges);
      if (!exchanges.includes(opportunity.buyExchange) || !exchanges.includes(opportunity.sellExchange)) {
        continue;
      }

      matching.push(strategy);
    }

    return matching;
  }

  private async executeArbitrage(strategy: TradingStrategy, opportunity: ArbitrageOpportunity): Promise<void> {
    const tradeKey = `${strategy.id}_${opportunity.symbol}_${opportunity.buyExchange}_${opportunity.sellExchange}`;
    
    // Prevent duplicate trades
    if (this.executingTrades.has(tradeKey)) {
      return;
    }

    this.executingTrades.add(tradeKey);

    try {
      console.log(`Executing arbitrage for strategy ${strategy.id}: ${opportunity.symbol}`);

      // Get user's API keys
      const apiKeys = this.db.getUserApiKeys(strategy.user_id);
      const buyExchangeKey = apiKeys.find(k => k.exchange_name === opportunity.buyExchange);
      const sellExchangeKey = apiKeys.find(k => k.exchange_name === opportunity.sellExchange);

      if (!buyExchangeKey || !sellExchangeKey) {
        console.error('Missing API keys for exchanges');
        return;
      }

      // Calculate trade amount (use a small percentage of max amount for safety)
      const tradeAmount = Math.min(strategy.max_trade_amount * 0.1, 100); // Max $100 per trade
      const quantity = tradeAmount / opportunity.buyPrice;

      // Execute buy order
      const buyResult = await this.placeBuyOrder(
        opportunity.buyExchange,
        buyExchangeKey,
        opportunity.symbol,
        quantity,
        opportunity.buyPrice
      );

      if (!buyResult.success) {
        console.error('Buy order failed:', buyResult.error);
        this.db.addNotification(
          strategy.user_id,
          'trade',
          'Ошибка покупки',
          `Не удалось купить ${opportunity.symbol} на ${opportunity.buyExchange}: ${buyResult.error}`
        );
        return;
      }

      // Execute sell order
      const sellResult = await this.placeSellOrder(
        opportunity.sellExchange,
        sellExchangeKey,
        opportunity.symbol,
        quantity,
        opportunity.sellPrice
      );

      if (!sellResult.success) {
        console.error('Sell order failed:', sellResult.error);
        this.db.addNotification(
          strategy.user_id,
          'trade',
          'Ошибка продажи',
          `Не удалось продать ${opportunity.symbol} на ${opportunity.sellExchange}: ${sellResult.error}`
        );
        return;
      }

      // Calculate profit
      const profit = (opportunity.sellPrice - opportunity.buyPrice) * quantity;
      const profitPercentage = opportunity.profitPercentage;

      // Save trade history
      this.db.addTradeHistory({
        user_id: strategy.user_id,
        strategy_id: strategy.id,
        symbol: opportunity.symbol,
        buy_exchange: opportunity.buyExchange,
        sell_exchange: opportunity.sellExchange,
        buy_price: opportunity.buyPrice,
        sell_price: opportunity.sellPrice,
        amount: quantity,
        profit,
        profit_percentage: profitPercentage,
        status: 'completed'
      });

      // Send notification
      this.db.addNotification(
        strategy.user_id,
        'trade',
        'Успешная сделка',
        `Арбитраж ${opportunity.symbol}: Прибыль $${profit.toFixed(2)} (${profitPercentage.toFixed(2)}%)`
      );

      console.log(`Arbitrage executed successfully: ${opportunity.symbol}, profit: $${profit.toFixed(2)}`);
    } catch (error) {
      console.error('Error executing arbitrage:', error);
      this.db.addNotification(
        strategy.user_id,
        'trade',
        'Ошибка сделки',
        `Ошибка при выполнении арбитража ${opportunity.symbol}: ${error}`
      );
    } finally {
      this.executingTrades.delete(tradeKey);
    }
  }

  private async placeBuyOrder(
    exchange: string,
    apiKey: ExchangeApiKey,
    symbol: string,
    quantity: number,
    price: number
  ): Promise<OrderResult> {
    try {
      // Decrypt API keys
      const decryptedKey = Buffer.from(apiKey.api_key, 'base64').toString();
      const decryptedSecret = Buffer.from(apiKey.api_secret, 'base64').toString();

      switch (exchange) {
        case 'Binance':
          return await this.placeBinanceOrder(decryptedKey, decryptedSecret, symbol, 'BUY', quantity, price);
        case 'Bybit':
          return await this.placeBybitOrder(decryptedKey, decryptedSecret, symbol, 'Buy', quantity, price);
        case 'HTX':
          return await this.placeHTXOrder(decryptedKey, decryptedSecret, symbol, 'buy', quantity, price);
        case 'KuCoin':
          return await this.placeKuCoinOrder(decryptedKey, decryptedSecret, symbol, 'buy', quantity, price);
        case 'OKX':
          return await this.placeOKXOrder(decryptedKey, decryptedSecret, symbol, 'buy', quantity, price);
        case 'BingX':
          return await this.placeBingXOrder(decryptedKey, decryptedSecret, symbol, 'BUY', quantity, price);
        default:
          return { success: false, error: 'Unsupported exchange' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async placeSellOrder(
    exchange: string,
    apiKey: ExchangeApiKey,
    symbol: string,
    quantity: number,
    price: number
  ): Promise<OrderResult> {
    try {
      const decryptedKey = Buffer.from(apiKey.api_key, 'base64').toString();
      const decryptedSecret = Buffer.from(apiKey.api_secret, 'base64').toString();

      switch (exchange) {
        case 'Binance':
          return await this.placeBinanceOrder(decryptedKey, decryptedSecret, symbol, 'SELL', quantity, price);
        case 'Bybit':
          return await this.placeBybitOrder(decryptedKey, decryptedSecret, symbol, 'Sell', quantity, price);
        case 'HTX':
          return await this.placeHTXOrder(decryptedKey, decryptedSecret, symbol, 'sell', quantity, price);
        case 'KuCoin':
          return await this.placeKuCoinOrder(decryptedKey, decryptedSecret, symbol, 'sell', quantity, price);
        case 'OKX':
          return await this.placeOKXOrder(decryptedKey, decryptedSecret, symbol, 'sell', quantity, price);
        case 'BingX':
          return await this.placeBingXOrder(decryptedKey, decryptedSecret, symbol, 'SELL', quantity, price);
        default:
          return { success: false, error: 'Unsupported exchange' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Exchange-specific order placement methods
  private async placeBinanceOrder(apiKey: string, apiSecret: string, symbol: string, side: string, quantity: number, price: number): Promise<OrderResult> {
    try {
      const timestamp = Date.now();
      const params = {
        symbol: symbol.replace('/', ''),
        side,
        type: 'LIMIT',
        timeInForce: 'GTC',
        quantity: quantity.toFixed(8),
        price: price.toFixed(8),
        timestamp
      };

      const queryString = Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&');
      const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');

      const response = await axios.post(
        `https://api.binance.com/api/v3/order?${queryString}&signature=${signature}`,
        {},
        { headers: { 'X-MBX-APIKEY': apiKey } }
      );

      return { success: true, orderId: response.data.orderId };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.msg || error.message };
    }
  }

  private async placeBybitOrder(apiKey: string, apiSecret: string, symbol: string, side: string, quantity: number, price: number): Promise<OrderResult> {
    try {
      const timestamp = Date.now();
      const params = {
        category: 'spot',
        symbol: symbol.replace('/', ''),
        side,
        orderType: 'Limit',
        qty: quantity.toString(),
        price: price.toString(),
        timestamp
      };

      const queryString = timestamp + apiKey + JSON.stringify(params);
      const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');

      const response = await axios.post(
        'https://api.bybit.com/v5/order/create',
        params,
        {
          headers: {
            'X-BAPI-API-KEY': apiKey,
            'X-BAPI-SIGN': signature,
            'X-BAPI-TIMESTAMP': timestamp.toString()
          }
        }
      );

      return { success: true, orderId: response.data.result?.orderId };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.retMsg || error.message };
    }
  }

  private async placeHTXOrder(apiKey: string, apiSecret: string, symbol: string, side: string, quantity: number, price: number): Promise<OrderResult> {
    // HTX order implementation
    return { success: false, error: 'HTX trading not implemented yet' };
  }

  private async placeKuCoinOrder(apiKey: string, apiSecret: string, symbol: string, side: string, quantity: number, price: number): Promise<OrderResult> {
    // KuCoin order implementation
    return { success: false, error: 'KuCoin trading not implemented yet' };
  }

  private async placeOKXOrder(apiKey: string, apiSecret: string, symbol: string, side: string, quantity: number, price: number): Promise<OrderResult> {
    // OKX order implementation
    return { success: false, error: 'OKX trading not implemented yet' };
  }

  private async placeBingXOrder(apiKey: string, apiSecret: string, symbol: string, side: string, quantity: number, price: number): Promise<OrderResult> {
    // BingX order implementation
    return { success: false, error: 'BingX trading not implemented yet' };
  }
}

// Singleton instance
let autoTraderInstance: AutoTrader | null = null;

export function getAutoTrader(): AutoTrader {
  if (!autoTraderInstance) {
    autoTraderInstance = new AutoTrader();
  }
  return autoTraderInstance;
}
