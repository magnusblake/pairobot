import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { Settings as SettingsIcon, User, Bell, Shield, Key, MessageCircle, Plus, Trash2, Unlink } from 'lucide-react';
import { ExchangeLogo } from '../common/ExchangeLogo';

interface ApiKey {
  id: number;
  exchange_name: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
}

export default function Settings() {
  const { user, token, refreshUser } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showAddKey, setShowAddKey] = useState(false);

  const [keyForm, setKeyForm] = useState({
    exchange_name: 'Binance',
    api_key: '',
    api_secret: '',
    passphrase: '',
  });

  const exchanges = ['HTX', 'Bybit', 'KuCoin', 'OKX', 'BingX'];
  const [linkingCode, setLinkingCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);
  
  // Notification settings
  const [notifyOpportunities, setNotifyOpportunities] = useState(true);
  const [notifyTrades, setNotifyTrades] = useState(true);
  const [notifySystem, setNotifySystem] = useState(true);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await axios.get('/api/exchange-keys', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApiKeys(response.data.keys || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/exchange-keys', keyForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowAddKey(false);
      setKeyForm({
        exchange_name: 'HTX',
        api_key: '',
        api_secret: '',
        passphrase: '',
      });
      fetchApiKeys();
      alert('API ключ успешно добавлен!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка добавления ключа');
    }
  };

  const handleTelegramLink = async () => {
    setLoadingCode(true);
    try {
      const response = await axios.post('/api/telegram/generate-code', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const code = response.data.code;
      setLinkingCode(code);
      
      // Open Telegram with deep link
      const botUsername = 'p4irobot';
      window.open(`https://t.me/${botUsername}?start=${code}`, '_blank');
      
      // Start polling for user data update
      const pollInterval = setInterval(async () => {
        await refreshUser();
      }, 3000); // Check every 3 seconds
      
      // Stop polling after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
      }, 120000);
    } catch (error) {
      console.error('Error generating linking code:', error);
      alert('Ошибка при генерации кода привязки');
    } finally {
      setLoadingCode(false);
    }
  };
  
  const handleTelegramUnlink = async () => {
    if (!confirm('Вы уверены, что хотите отвязать Telegram? Вы перестанете получать уведомления.')) {
      return;
    }
    
    try {
      await axios.post('/api/telegram/unlink', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      await refreshUser();
      alert('Telegram успешно отвязан');
    } catch (error: any) {
      console.error('Error unlinking Telegram:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Ошибка при отвязке Telegram. Попробуйте позже.';
      alert(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <SettingsIcon className="w-6 h-6" />
        Настройки
      </h2>

      {/* User Info */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Информация о пользователе
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-400">Имя пользователя:</span>
            <span className="text-white font-medium">{user?.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Email:</span>
            <span className="text-white font-medium">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Telegram Integration */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Интеграция с Telegram
        </h3>
        
        {user?.telegram_id ? (
          <div className="space-y-4">
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-green-400 font-medium mb-2 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Telegram привязан
                  </p>
                  <p className="text-sm text-gray-400">
                    Аккаунт: @{user.telegram_username || 'Пользователь'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    ID: {user.telegram_id}
                  </p>
                </div>
                <button
                  onClick={handleTelegramUnlink}
                  className="px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 border border-red-500/50 text-red-400 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                  title="Отвязать Telegram"
                >
                  <Unlink className="w-3 h-3" />
                  Отвязать
                </button>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-dark-secondary rounded-lg p-4">
              <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Настройки уведомлений
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-dark-bg rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white">Арбитражные возможности</p>
                    <p className="text-xs text-gray-400">Уведомления о новых прибыльных возможностях</p>
                  </div>
                  <button
                    onClick={() => setNotifyOpportunities(!notifyOpportunities)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      notifyOpportunities ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      notifyOpportunities ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-dark-bg rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white">Выполненные сделки</p>
                    <p className="text-xs text-gray-400">Уведомления о завершенных автоматических сделках</p>
                  </div>
                  <button
                    onClick={() => setNotifyTrades(!notifyTrades)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      notifyTrades ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      notifyTrades ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-dark-bg rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white">Системные уведомления</p>
                    <p className="text-xs text-gray-400">Важные системные сообщения и обновления</p>
                  </div>
                  <button
                    onClick={() => setNotifySystem(!notifySystem)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      notifySystem ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      notifySystem ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
              
              <div className="mt-4 bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                <p className="text-xs text-blue-400">
                  💡 Совет: Настройте минимальный процент прибыли во вкладке "Фильтры", чтобы получать только самые выгодные уведомления
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
              <p className="text-sm text-blue-400 mb-2 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Получайте уведомления о новых возможностях
              </p>
              <p className="text-xs text-gray-400 mb-3">
                Привяжите Telegram для получения мгновенных уведомлений о прибыльных арбитражных возможностях
              </p>
              <div className="bg-dark-secondary rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-2">Как привязать:</p>
                <ol className="text-xs text-gray-300 space-y-1 list-decimal list-inside">
                  <li>Нажмите кнопку "Привязать Telegram" ниже</li>
                  <li>Вы будете перенаправлены в Telegram бот @p4irobot</li>
                  <li>Бот автоматически привяжет ваш аккаунт</li>
                </ol>
              </div>
            </div>

            <button 
              onClick={handleTelegramLink}
              disabled={loadingCode}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              {loadingCode ? 'Генерация кода...' : 'Привязать Telegram'}
            </button>
            
            {linkingCode && (
              <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-3">
                <p className="text-xs text-yellow-400 mb-2">
                  ✅ Код сгенерирован! Если Telegram не открылся автоматически:
                </p>
                <p className="text-xs text-gray-300">
                  1. Откройте @p4irobot в Telegram<br />
                  2. Отправьте команду: <span className="bg-dark-bg px-2 py-1 rounded font-mono">/start {linkingCode}</span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* API Keys */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Ключи бирж
          </h3>
          <button
            onClick={() => setShowAddKey(!showAddKey)}
            className="btn-primary flex items-center gap-2"
          >
            {showAddKey ? (
              <>Отмена</>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Добавить ключ
              </>
            )}
          </button>
        </div>

        {showAddKey && (
          <form onSubmit={handleAddKey} className="space-y-4 mb-6 p-4 bg-dark-secondary rounded-lg">
            <div>
              <label className="label">Биржа</label>
              <select
                className="input-field"
                value={keyForm.exchange_name}
                onChange={(e) => setKeyForm({ ...keyForm, exchange_name: e.target.value })}
              >
                {exchanges.map(ex => (
                  <option key={ex} value={ex}>{ex}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">API Key</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="Ваш API ключ"
                value={keyForm.api_key}
                onChange={(e) => setKeyForm({ ...keyForm, api_key: e.target.value })}
              />
            </div>

            <div>
              <label className="label">API Secret</label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="Ваш API секрет"
                value={keyForm.api_secret}
                onChange={(e) => setKeyForm({ ...keyForm, api_secret: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Passphrase (если требуется)</label>
              <input
                type="password"
                className="input-field"
                placeholder="Passphrase"
                value={keyForm.passphrase}
                onChange={(e) => setKeyForm({ ...keyForm, passphrase: e.target.value })}
              />
            </div>

            <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-3">
              <p className="text-xs text-yellow-400 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Важно: Убедитесь, что API ключи имеют только права на чтение и торговлю. 
                Никогда не давайте права на вывод средств!
              </p>
            </div>

            <button type="submit" className="btn-success w-full">
              Добавить API ключ
            </button>
          </form>
        )}

        {/* API Keys List */}
        {apiKeys.length === 0 ? (
          <div className="text-center py-8">
            <Key className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">API ключи не добавлены</p>
          </div>
        ) : (
          <div className="space-y-2">
            {apiKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between p-3 bg-dark-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  <ExchangeLogo exchange={key.exchange_name} size={40} />
                  <div>
                    <p className="font-medium text-white">{key.exchange_name}</p>
                    <p className="text-sm text-gray-400">{key.api_key}</p>
                    <p className="text-xs text-gray-500">
                      Добавлен: {new Date(key.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs ${
                  key.is_active ? 'bg-green-900/30 text-green-400' : 'bg-gray-700 text-gray-400'
                }`}>
                  {key.is_active ? 'Активен' : 'Неактивен'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
