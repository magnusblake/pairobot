import { ExchangeConfig } from './types';
import dotenv from 'dotenv';

dotenv.config();

export const EXCHANGES: ExchangeConfig[] = [
  {
    name: 'HTX',
    wsSpotEndpoint: 'wss://api.huobi.pro/ws',
    wsFuturesEndpoint: 'wss://api.hbdm.com/linear-swap-ws',
    restSpotEndpoint: 'https://api.huobi.pro',
    restFuturesEndpoint: 'https://api.hbdm.com',
  },
  {
    name: 'Bybit',
    wsSpotEndpoint: 'wss://stream.bybit.com/v5/public/spot',
    restSpotEndpoint: 'https://api.bybit.com',
    wsFuturesEndpoint: 'wss://stream.bybit.com/v5/public/linear',
    restFuturesEndpoint: 'https://api.bybit.com'
  },
  {
    name: 'KuCoin',
    wsSpotEndpoint: 'wss://ws-api-spot.kucoin.com',
    wsFuturesEndpoint: 'wss://ws-api-futures.kucoin.com',
    restSpotEndpoint: 'https://api.kucoin.com',
    restFuturesEndpoint: 'https://api-futures.kucoin.com',
  },
  {
    name: 'OKX',
    wsSpotEndpoint: 'wss://ws.okx.com:8443/ws/v5/public',
    wsFuturesEndpoint: 'wss://ws.okx.com:8443/ws/v5/public',
    restSpotEndpoint: 'https://www.okx.com',
    restFuturesEndpoint: 'https://www.okx.com',
  },
  {
    name: 'BingX',
    wsSpotEndpoint: 'wss://open-api-ws.bingx.com/market',
    wsFuturesEndpoint: 'wss://open-api-swap.bingx.com/swap-market',
    restSpotEndpoint: 'https://open-api.bingx.com',
    restFuturesEndpoint: 'https://open-api.bingx.com',
  },
];

// Token name mappings between exchanges (if needed)
export const TOKEN_MAPPINGS: Record<string, Record<string, string>> = {
  'HTX': {},
  'Bybit': {},
  'KuCoin': {},
  'OKX': {},
  'BingX': {}
};

export const MIN_PROFIT_PERCENTAGE = 0.05; // 0.05% - lower threshold for more opportunities
export const PRICE_UPDATE_INTERVAL = 1 * 1000; // 1 second - faster updates

// Telegram Configuration
export const TELEGRAM_CONFIG = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  chatId: process.env.TELEGRAM_CHAT_ID || '',
};

export const BLACKLIST = [
    'TST',
    'NEIRO',
];

export const config = {
  // ... existing config ...
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || 'your_redis_password',
  },
  // ... existing config ...
};