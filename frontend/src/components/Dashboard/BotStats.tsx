import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { Activity, TrendingUp, Zap, Clock, Database } from 'lucide-react';

interface BotStats {
  uptime: number;
  totalOpportunities: number;
  activeOpportunities: number;
  uniqueSymbols: number;
  opportunitiesByExchange: Record<string, number>;
  monitoredPairs: {
    spot: number;
    futures: number;
  };
}

export default function BotStats() {
  const { token } = useAuth();
  const [stats, setStats] = useState<BotStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/api/bot-stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching bot stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [token]);

  if (!stats) {
    return null;
  }

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}ч ${minutes % 60}м`;
    }
    if (minutes > 0) {
      return `${minutes}м ${seconds % 60}с`;
    }
    return `${seconds}с`;
  };

  const topExchanges = Object.entries(stats.opportunitiesByExchange)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
      {/* Uptime */}
      <div className="card bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-500/30">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <div>
            <p className="text-xs text-gray-400">Работает</p>
            <p className="text-sm font-bold text-white">{formatUptime(stats.uptime)}</p>
          </div>
        </div>
      </div>

      {/* Total Opportunities Found */}
      <div className="card bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-500/30">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <div>
            <p className="text-xs text-gray-400">Всего найдено</p>
            <p className="text-sm font-bold text-white">{stats.totalOpportunities}</p>
          </div>
        </div>
      </div>

      {/* Active Opportunities */}
      <div className="card bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 border-yellow-500/30">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <div>
            <p className="text-xs text-gray-400">Активных</p>
            <p className="text-sm font-bold text-white">{stats.activeOpportunities}</p>
          </div>
        </div>
      </div>

      {/* Unique Symbols */}
      <div className="card bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-500/30">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" />
          <div>
            <p className="text-xs text-gray-400">Уникальных пар</p>
            <p className="text-sm font-bold text-white">{stats.uniqueSymbols}</p>
          </div>
        </div>
      </div>

      {/* Monitored Pairs */}
      <div className="card bg-gradient-to-br from-cyan-900/20 to-cyan-800/10 border-cyan-500/30">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <div>
            <p className="text-xs text-gray-400">Мониторинг</p>
            <p className="text-sm font-bold text-white">{stats.monitoredPairs.spot + stats.monitoredPairs.futures}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
