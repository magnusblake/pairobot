import { CCXTBaseExchange } from './ccxt-base';
import { ExchangeConfig } from '../types';

export class KuCoinExchangeCCXT extends CCXTBaseExchange {
  constructor(config: ExchangeConfig) {
    super(config, 'kucoin');
  }
}
