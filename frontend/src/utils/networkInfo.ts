// Network information utilities for cryptocurrency transfers

interface NetworkInfo {
  fee: string;
  transferTime: string;
  feeUSD?: number;
}

// Network data based on blockchain type
const NETWORK_DATA: Record<string, { avgFee: number; avgTime: string; blockchain: string }> = {
  // ERC-20 tokens (Ethereum)
  'ETH': { avgFee: 0.003, avgTime: '2-5 мин', blockchain: 'Ethereum' },
  'USDT': { avgFee: 0.002, avgTime: '2-5 мин', blockchain: 'Ethereum' },
  'USDC': { avgFee: 0.002, avgTime: '2-5 мин', blockchain: 'Ethereum' },
  
  // BTC
  'BTC': { avgFee: 0.0001, avgTime: '10-30 мин', blockchain: 'Bitcoin' },
  
  // BSC tokens
  'BNB': { avgFee: 0.0005, avgTime: '1-3 мин', blockchain: 'BSC' },
  
  // Solana
  'SOL': { avgFee: 0.00001, avgTime: '30-60 сек', blockchain: 'Solana' },
  
  // Polygon
  'MATIC': { avgFee: 0.001, avgTime: '1-3 мин', blockchain: 'Polygon' },
  
  // Arbitrum
  'ARB': { avgFee: 0.0001, avgTime: '1-2 мин', blockchain: 'Arbitrum' },
  
  // Optimism
  'OP': { avgFee: 0.0001, avgTime: '1-2 мин', blockchain: 'Optimism' },
  
  // Avalanche
  'AVAX': { avgFee: 0.001, avgTime: '1-2 мин', blockchain: 'Avalanche' },
  
  // Tron
  'TRX': { avgFee: 0.000001, avgTime: '1-3 мин', blockchain: 'Tron' },
  
  // XRP
  'XRP': { avgFee: 0.00001, avgTime: '3-5 сек', blockchain: 'XRP Ledger' },
  
  // Litecoin
  'LTC': { avgFee: 0.001, avgTime: '2-5 мин', blockchain: 'Litecoin' },
  
  // Cardano
  'ADA': { avgFee: 0.17, avgTime: '5-10 мин', blockchain: 'Cardano' },
  
  // Polkadot
  'DOT': { avgFee: 0.01, avgTime: '6-12 сек', blockchain: 'Polkadot' },
};

// Default values for unknown tokens
const DEFAULT_NETWORK_INFO = {
  avgFee: 0.001,
  avgTime: '2-5 мин',
  blockchain: 'Unknown'
};

/**
 * Get network information for a given symbol
 * @param symbol - Trading pair symbol (e.g., "BTC/USDT")
 * @returns Network information including fee and transfer time
 */
export function getNetworkInfo(symbol: string): NetworkInfo {
  // Extract base currency from symbol (e.g., "BTC" from "BTC/USDT")
  const baseCurrency = symbol.split('/')[0];
  
  // Get network data or use default
  const networkData = NETWORK_DATA[baseCurrency] || DEFAULT_NETWORK_INFO;
  
  // Format fee with appropriate precision
  const feeFormatted = networkData.avgFee < 0.0001 
    ? `~${networkData.avgFee.toFixed(6)} ${baseCurrency}`
    : `~${networkData.avgFee.toFixed(4)} ${baseCurrency}`;
  
  return {
    fee: feeFormatted,
    transferTime: networkData.avgTime
  };
}

/**
 * Get real-time network fee estimate (placeholder for future API integration)
 * In production, this should call a real API like Etherscan, Blockchain.com, etc.
 */
export async function getRealTimeNetworkFee(symbol: string): Promise<NetworkInfo> {
  // For now, return static data
  // TODO: Integrate with real-time APIs:
  // - Etherscan API for Ethereum
  // - Blockchain.com API for Bitcoin
  // - BSCScan for BSC
  // - etc.
  
  return getNetworkInfo(symbol);
}
