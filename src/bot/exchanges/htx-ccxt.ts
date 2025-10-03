import { CCXTBaseExchange } from './ccxt-base';
import { ExchangeConfig } from '../types';

export class HTXExchangeCCXT extends CCXTBaseExchange {
  constructor(config: ExchangeConfig) {
    super(config, 'htx');
  }
}
