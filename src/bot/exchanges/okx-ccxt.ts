import { CCXTBaseExchange } from './ccxt-base';
import { ExchangeConfig } from '../types';

export class OKXExchangeCCXT extends CCXTBaseExchange {
  constructor(config: ExchangeConfig) {
    super(config, 'okx');
  }
}
