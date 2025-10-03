import { CCXTBaseExchange } from './ccxt-base';
import { ExchangeConfig } from '../types';

export class BybitExchangeCCXT extends CCXTBaseExchange {
  constructor(config: ExchangeConfig) {
    super(config, 'bybit');
  }
}
