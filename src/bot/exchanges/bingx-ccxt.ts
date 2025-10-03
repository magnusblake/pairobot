import { CCXTBaseExchange } from './ccxt-base';
import { ExchangeConfig } from '../types';

export class BingXExchangeCCXT extends CCXTBaseExchange {
  constructor(config: ExchangeConfig) {
    super(config, 'bingx');
  }
}
