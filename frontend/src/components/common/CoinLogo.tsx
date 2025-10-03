import React, { useState } from 'react';
import { DollarSign } from 'lucide-react';

interface CoinLogoProps {
  symbol: string;
  size?: number;
  className?: string;
}

export const CoinLogo: React.FC<CoinLogoProps> = ({ symbol, size = 32, className = '' }) => {
  const [imageError, setImageError] = useState(false);
  
  // Extract base currency from trading pair (e.g., "BTC/USDT" -> "BTC")
  const getCoinSymbol = (tradingSymbol: string): string => {
    return tradingSymbol.split('/')[0].toLowerCase();
  };

  // Get logo URL from Huobi CDN
  const getLogoUrl = (tradingSymbol: string): string => {
    const coinSymbol = getCoinSymbol(tradingSymbol);
    
    // Using Huobi CDN for coin logos - circular images
    // Format: https://huobicfg.s3.amazonaws.com/currency_icon/{symbol}.png
    return `https://huobicfg.s3.amazonaws.com/currency_icon/${coinSymbol}.png`;
  };

  if (imageError) {
    // Show dollar icon as fallback
    return (
      <div 
        style={{ 
          width: size, 
          height: size, 
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
        }}
        className={className}
      >
        <DollarSign 
          size={size * 0.6} 
          color="white" 
          strokeWidth={2.5}
        />
      </div>
    );
  }

  return (
    <div 
      style={{ 
        width: size, 
        height: size, 
        overflow: 'hidden',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      className={className}
    >
      <img
        src={getLogoUrl(symbol)}
        alt={`${symbol} logo`}
        style={{ 
          width: `${size + 2}px`,
          height: `${size + 2}px`,
          objectFit: 'cover',
          transform: 'scale(1.05)' // Zoom in slightly to hide white border
        }}
        onError={() => setImageError(true)}
      />
    </div>
  );
};
