import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { History, Calendar, TrendingUp, CheckCircle, Clock, XCircle, Download, FileSpreadsheet } from 'lucide-react';

interface Trade {
  id: number;
  symbol: string;
  buy_exchange: string;
  sell_exchange: string;
  buy_price: number;
  sell_price: number;
  amount: number;
  profit: number;
  profit_percentage: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
}

export default function TradeHistory() {
  const { token } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    totalProfit: 0,
    avgProfit: 0,
  });

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      const response = await axios.get('/api/trades', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const tradesData = response.data.trades || [];
      setTrades(tradesData);

      // Calculate stats
      const completed = tradesData.filter((t: Trade) => t.status === 'completed');
      const totalProfit = completed.reduce((sum: number, t: Trade) => sum + t.profit, 0);
      setStats({
        total: tradesData.length,
        completed: completed.length,
        totalProfit,
        avgProfit: completed.length > 0 ? totalProfit / completed.length : 0,
      });
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-900/30 text-green-400';
      case 'pending':
        return 'bg-yellow-900/30 text-yellow-400';
      case 'failed':
        return 'bg-red-900/30 text-red-400';
      default:
        return 'bg-gray-700 text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-3 h-3" />;
      case 'pending':
        return <Clock className="w-3 h-3" />;
      case 'failed':
        return <XCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Завершена';
      case 'pending':
        return 'В процессе';
      case 'failed':
        return 'Ошибка';
      default:
        return status;
    }
  };

  const exportToCSV = () => {
    if (trades.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    // CSV headers
    const headers = [
      'Дата создания',
      'Дата завершения',
      'Символ',
      'Биржа покупки',
      'Цена покупки',
      'Биржа продажи',
      'Цена продажи',
      'Объем',
      'Прибыль ($)',
      'Прибыль (%)',
      'Статус'
    ];

    // Convert trades to CSV rows
    const rows = trades.map(trade => [
      new Date(trade.created_at).toLocaleString('ru-RU'),
      trade.completed_at ? new Date(trade.completed_at).toLocaleString('ru-RU') : 'N/A',
      trade.symbol,
      trade.buy_exchange,
      trade.buy_price.toFixed(4),
      trade.sell_exchange,
      trade.sell_price.toFixed(4),
      trade.amount.toFixed(6),
      trade.profit.toFixed(2),
      trade.profit_percentage.toFixed(2),
      getStatusText(trade.status)
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `trade_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    if (trades.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    const jsonContent = JSON.stringify(trades, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `trade_history_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-400">Загрузка истории...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-400 mb-1">Всего сделок</p>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400 mb-1">Завершено</p>
          <p className="text-3xl font-bold text-green-400">{stats.completed}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400 mb-1">Общая прибыль</p>
          <p className="text-3xl font-bold text-blue-400">${stats.totalProfit.toFixed(2)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400 mb-1">Средняя прибыль</p>
          <p className="text-3xl font-bold text-purple-400">${stats.avgProfit.toFixed(2)}</p>
        </div>
      </div>

      {/* Trades List */}
      <div className="card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6" />
            История сделок
          </h2>
          
          {trades.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Экспорт CSV
              </button>
              <button
                onClick={exportToJSON}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                Экспорт JSON
              </button>
            </div>
          )}
        </div>

        {trades.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">История пуста</h3>
            <p className="text-gray-400">Здесь будут отображаться ваши сделки</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 border-b border-dark-border">
                  <th className="pb-3 font-medium">Дата</th>
                  <th className="pb-3 font-medium">Пара</th>
                  <th className="pb-3 font-medium">Покупка</th>
                  <th className="pb-3 font-medium">Продажа</th>
                  <th className="pb-3 font-medium">Объем</th>
                  <th className="pb-3 font-medium">Прибыль</th>
                  <th className="pb-3 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className="border-b border-dark-border hover:bg-dark-secondary transition-colors">
                    <td className="py-4 text-sm text-gray-300">
                      {new Date(trade.created_at).toLocaleString('ru-RU')}
                    </td>
                    <td className="py-4">
                      <span className="font-medium text-white">{trade.symbol}</span>
                    </td>
                    <td className="py-4">
                      <div>
                        <p className="text-sm text-gray-400">{trade.buy_exchange}</p>
                        <p className="text-sm font-medium text-white">${trade.buy_price.toFixed(4)}</p>
                      </div>
                    </td>
                    <td className="py-4">
                      <div>
                        <p className="text-sm text-gray-400">{trade.sell_exchange}</p>
                        <p className="text-sm font-medium text-white">${trade.sell_price.toFixed(4)}</p>
                      </div>
                    </td>
                    <td className="py-4 text-sm text-gray-300">
                      {trade.amount.toFixed(6)}
                    </td>
                    <td className="py-4">
                      <div>
                        <p className="font-bold text-green-400">${trade.profit.toFixed(2)}</p>
                        <p className="text-xs text-gray-400">{trade.profit_percentage.toFixed(2)}%</p>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${getStatusColor(trade.status)}`}>
                        {getStatusIcon(trade.status)}
                        {getStatusText(trade.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
