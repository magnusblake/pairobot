import { Decimal } from 'decimal.js';
import {PriceData, ArbitrageOpportunity, MarketType} from './types';
import { MIN_PROFIT_PERCENTAGE } from './config';

export class ArbitrageAnalyzer {
  findOpportunities(prices: PriceData[], marketType: MarketType): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    const symbolGroups = this.groupBySymbol(prices);

    for (const [symbol, symbolPrices] of symbolGroups) {
      // Need at least 2 exchanges to compare
      if (symbolPrices.length < 2) continue;

      // Compare EVERY exchange with EVERY other exchange
      for (let i = 0; i < symbolPrices.length; i++) {
        for (let j = 0; j < symbolPrices.length; j++) {
          // Skip same exchange
          if (i === j) continue;
          
          // Skip if same exchange name (shouldn't happen but safety check)
          if (symbolPrices[i].exchange === symbolPrices[j].exchange) continue;

          const buyPrice = new Decimal(symbolPrices[i].price);
          const sellPrice = new Decimal(symbolPrices[j].price);

          // Calculate profit percentage: (sell - buy) / buy * 100
          const profitPercentage = sellPrice.minus(buyPrice)
            .div(buyPrice)
            .times(100)
            .toNumber();

          // Only consider profitable opportunities (sell > buy)
          if (profitPercentage >= MIN_PROFIT_PERCENTAGE) {
            opportunities.push({
              symbol,
              buyExchange: symbolPrices[i].exchange,
              sellExchange: symbolPrices[j].exchange,
              buyPrice: symbolPrices[i].price,
              sellPrice: symbolPrices[j].price,
              profitPercentage,
              marketType,
              timestamp: Date.now(),
            });
          }
        }
      }
    }

    return opportunities;
  }

  private groupBySymbol(prices: PriceData[]): Map<string, PriceData[]> {
    const groups = new Map<string, PriceData[]>();
    
    for (const price of prices) {
      if (!groups.has(price.symbol)) {
        groups.set(price.symbol, []);
      }
      groups.get(price.symbol)?.push(price);
    }

    return groups;
  }
}