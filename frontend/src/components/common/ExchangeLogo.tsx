import React from 'react';

interface ExchangeLogoProps {
  exchange: string;
  size?: number;
  className?: string;
}

export const ExchangeLogo: React.FC<ExchangeLogoProps> = ({ exchange, size = 32, className = '' }) => {
  // Map exchange names to logo URLs from CoinMarketCap CDN
  const getLogoUrl = (exchangeName: string): string => {
    const normalizedName = exchangeName.toLowerCase();
    
    // Using CoinMarketCap CDN for exchange logos (32x32)
    const logoMap: Record<string, string> = {
      'bybit': 'https://s2.coinmarketcap.com/static/img/exchanges/32x32/521.png',
      'okx': 'https://s2.coinmarketcap.com/static/img/exchanges/32x32/294.png',
      'kucoin': 'https://s2.coinmarketcap.com/static/img/exchanges/32x32/311.png',
      'htx': 'https://s2.coinmarketcap.com/static/img/exchanges/32x32/102.png',
      'huobi': 'https://s2.coinmarketcap.com/static/img/exchanges/32x32/102.png',
      'bingx': 'https://s2.coinmarketcap.com/static/img/exchanges/32x32/1064.png',
      'binance': 'https://s2.coinmarketcap.com/static/img/exchanges/32x32/270.png',
    };

    return logoMap[normalizedName] || `https://via.placeholder.com/${size}x${size}/1a1a1a/ffffff?text=${exchangeName}`;
  };

  return (
    <img
      src={getLogoUrl(exchange)}
      alt={`${exchange} logo`}
      width={size}
      height={size}
      className={`rounded-lg ${className}`}
      style={{ borderRadius: '10px' }}
      onError={(e) => {
        // Fallback to placeholder if image fails to load
        (e.target as HTMLImageElement).src = `https://via.placeholder.com/${size}x${size}/1a1a1a/ffffff?text=${exchange}`;
      }}
    />
  );
};
