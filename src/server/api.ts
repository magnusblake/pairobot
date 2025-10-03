import express, { Request, Response, NextFunction } from 'express';
import expressWs from 'express-ws';
import crypto from 'crypto';
import { getDatabase, User } from '../database/schema';
import cors from 'cors';

const { app } = expressWs(express());
const db = getDatabase();

// Wait for database initialization
await db.ensureInitialized();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Auth middleware
interface AuthRequest extends Request {
  user?: User;
}

const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Не авторизован' });
  }

  const user = db.validateSession(token);
  if (!user) {
    return res.status(401).json({ error: 'Недействительная сессия' });
  }

  req.user = user;
  next();
};

// Admin middleware
const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Требуются права администратора' });
  }
  next();
};

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });
    }

    const existingUser = db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const user = db.createUser(username, email, password);
    if (!user) {
      return res.status(500).json({ error: 'Ошибка создания пользователя' });
    }

    const token = db.createSession(user.id);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        telegram_id: user.telegram_id
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const password_hash = crypto.createHash('sha256').update(password).digest('hex');
    if (password_hash !== user.password_hash) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Аккаунт деактивирован' });
    }

    const token = db.createSession(user.id);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        telegram_id: user.telegram_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Logout
app.post('/api/auth/logout', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      db.deleteSession(token);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Get current user
app.get('/api/auth/me', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    user: {
      id: req.user!.id,
      username: req.user!.username,
      email: req.user!.email,
      role: req.user!.role,
      telegram_id: req.user!.telegram_id,
      telegram_username: req.user!.telegram_username
    }
  });
});

// Generate Telegram linking code
app.post('/api/telegram/generate-code', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Call bot service to generate code
    const response = await fetch('http://localhost:3002/telegram/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: req.user!.id })
    });
    
    const data = await response.json();
    
    if (data.code) {
      res.json({ success: true, code: data.code });
    } else {
      res.status(500).json({ error: 'Ошибка генерации кода' });
    }
  } catch (error) {
    console.error('Generate Telegram code error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Link Telegram account
app.post('/api/auth/link-telegram', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { telegram_id, telegram_username } = req.body;

    if (!telegram_id) {
      return res.status(400).json({ error: 'Telegram ID обязателен' });
    }

    const success = db.linkTelegramAccount(req.user!.id, telegram_id, telegram_username);
    
    if (success) {
      res.json({ success: true, message: 'Telegram аккаунт успешно привязан' });
    } else {
      res.status(500).json({ error: 'Ошибка привязки Telegram аккаунта' });
    }
  } catch (error) {
    console.error('Link Telegram error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Unlink Telegram account
app.post('/api/telegram/unlink', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const success = db.unlinkTelegramAccount(req.user!.id);
    
    if (success) {
      res.json({ success: true, message: 'Telegram аккаунт успешно отвязан' });
    } else {
      res.status(500).json({ error: 'Ошибка отвязки Telegram аккаунта' });
    }
  } catch (error) {
    console.error('Unlink Telegram error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ==================== EXCHANGE API KEYS ROUTES ====================

// Get user's API keys
app.get('/api/exchange-keys', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const keys = db.getUserApiKeys(req.user!.id);
    
    // Mask sensitive data
    const maskedKeys = keys.map(key => ({
      id: key.id,
      exchange_name: key.exchange_name,
      api_key: key.api_key.substring(0, 8) + '...',
      is_active: key.is_active,
      created_at: key.created_at
    }));

    res.json({ keys: maskedKeys });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Add API key
app.post('/api/exchange-keys', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { exchange_name, api_key, api_secret, passphrase } = req.body;

    if (!exchange_name || !api_key || !api_secret) {
      return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
    }

    const success = db.addExchangeApiKey(req.user!.id, exchange_name, api_key, api_secret, passphrase);
    
    if (success) {
      res.json({ success: true, message: 'API ключ успешно добавлен' });
    } else {
      res.status(500).json({ error: 'Ошибка добавления API ключа' });
    }
  } catch (error) {
    console.error('Add API key error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ==================== TRADING STRATEGIES ROUTES ====================

// Get user's strategies
app.get('/api/strategies', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const strategies = db.getUserStrategies(req.user!.id);
    res.json({ strategies });
  } catch (error) {
    console.error('Get strategies error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Create strategy
app.post('/api/strategies', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { name, exchanges, min_profit_percentage } = req.body;

    if (!name || !exchanges || !Array.isArray(exchanges)) {
      return res.status(400).json({ error: 'Неверные данные стратегии' });
    }

    const strategy = db.createStrategy(
      req.user!.id,
      name,
      exchanges,
      min_profit_percentage || 0.5,
      1000 // Default max_trade_amount
    );

    if (strategy) {
      res.json({ success: true, strategy });
    } else {
      res.status(500).json({ error: 'Ошибка создания стратегии' });
    }
  } catch (error) {
    console.error('Create strategy error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Toggle auto-trade
app.patch('/api/strategies/:id/auto-trade', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const strategyId = parseInt(req.params.id);
    const { enabled } = req.body;

    const strategy = db.getStrategyById(strategyId);
    if (!strategy || strategy.user_id !== req.user!.id) {
      return res.status(404).json({ error: 'Стратегия не найдена' });
    }

    const success = db.updateStrategyAutoTrade(strategyId, enabled);
    
    if (success) {
      res.json({ success: true, message: 'Автоторговля обновлена' });
    } else {
      res.status(500).json({ error: 'Ошибка обновления стратегии' });
    }
  } catch (error) {
    console.error('Toggle auto-trade error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ==================== TRADE HISTORY ROUTES ====================

// Get user's trade history
app.get('/api/trades', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const trades = db.getUserTradeHistory(req.user!.id, limit);
    res.json({ trades });
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ==================== NOTIFICATIONS ROUTES ====================

// Get user's notifications
app.get('/api/notifications', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const unreadOnly = req.query.unread === 'true';
    const notifications = db.getUserNotifications(req.user!.id, unreadOnly);
    res.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Mark notification as read
app.patch('/api/notifications/:id/read', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id);
    const success = db.markNotificationAsRead(notificationId);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Ошибка обновления уведомления' });
    }
  } catch (error) {
    console.error('Mark notification error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ==================== ARBITRAGE OPPORTUNITIES ROUTES ====================

// Store for current opportunities
let currentOpportunities: any[] = [];

export function updateOpportunities(opportunities: any[]) {
  currentOpportunities = opportunities;
}

// Get current opportunities
app.get('/api/opportunities', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Fetch from bot service
    const response = await fetch('http://localhost:3002/opportunities');
    const data = await response.json();
    
    const marketType = req.query.market || 'spot';
    let filtered = data.opportunities.filter((opp: any) => opp.marketType === marketType);
    
    // Apply user filters
    const strategies = db.getUserStrategies(req.user!.id);
    if (strategies.length > 0) {
      const strategy = strategies[0];
      const userExchanges = JSON.parse(strategy.exchanges || '[]');
      const minProfit = strategy.min_profit_percentage || 0;
      
      // Filter by exchanges (both buy and sell must be in user's selected exchanges)
      if (userExchanges.length > 0) {
        filtered = filtered.filter((opp: any) => 
          userExchanges.includes(opp.buyExchange) && userExchanges.includes(opp.sellExchange)
        );
      }
      
      // Filter by minimum profit
      filtered = filtered.filter((opp: any) => opp.profitPercentage >= minProfit);
      
      // Filter by trading pairs
      const tradingPairs = JSON.parse(strategy.trading_pairs || '[]');
      if (tradingPairs.length > 0) {
        filtered = filtered.filter((opp: any) => tradingPairs.includes(opp.symbol));
      }
    }
    
    // Sort by profit percentage (highest first) and then by timestamp (newest first)
    filtered.sort((a: any, b: any) => {
      if (Math.abs(b.profitPercentage - a.profitPercentage) > 0.001) {
        return b.profitPercentage - a.profitPercentage;
      }
      return b.timestamp - a.timestamp;
    });
    
    res.json({ opportunities: filtered });
  } catch (error) {
    console.error('Get opportunities error:', error);
    res.json({ opportunities: [] });
  }
});

// Get bot statistics
app.get('/api/bot-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const response = await fetch('http://localhost:3002/stats');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Get bot stats error:', error);
    res.json({ 
      uptime: 0,
      totalOpportunities: 0,
      activeOpportunities: 0,
      uniqueSymbols: 0,
      opportunitiesByExchange: {},
      monitoredPairs: { spot: 0, futures: 0 }
    });
  }
});

// ==================== FILTERS ROUTES ====================

// Get user filters
app.get('/api/filters', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const strategies = db.getUserStrategies(req.user!.id);
    if (strategies.length > 0) {
      const strategy = strategies[0];
      const exchanges = JSON.parse(strategy.exchanges || '[]');
      const tradingPairs = JSON.parse(strategy.trading_pairs || '[]');
      res.json({
        filters: {
          id: strategy.id,
          user_id: strategy.user_id,
          exchanges: exchanges,
          min_profit_percentage: strategy.min_profit_percentage,
          trading_pairs: tradingPairs,
          created_at: strategy.created_at,
          updated_at: strategy.updated_at
        }
      });
    } else {
      res.json({ filters: null });
    }
  } catch (error) {
    console.error('Get filters error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Save user filters
app.post('/api/filters', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { exchanges, min_profit_percentage, trading_pairs } = req.body;
    
    // Validate: minimum 2 exchanges
    if (!exchanges || exchanges.length < 2) {
      return res.status(400).json({ error: 'Необходимо выбрать минимум 2 биржи' });
    }
    
    const strategies = db.getUserStrategies(req.user!.id);
    
    let success = false;
    
    if (strategies.length > 0) {
      // Update existing strategy
      const strategyId = strategies[0].id;
      success = db.updateStrategy(
        strategyId,
        exchanges,
        min_profit_percentage || 0.5,
        1000, // Default max_trade_amount
        trading_pairs || []
      );
    } else {
      // Create new strategy
      const strategy = db.createStrategy(
        req.user!.id,
        'Default Strategy',
        exchanges,
        min_profit_percentage || 0.5,
        1000, // Default max_trade_amount
        trading_pairs || []
      );
      success = strategy !== null;
    }
    
    if (success) {
      res.json({ success: true, message: 'Фильтры успешно сохранены' });
    } else {
      res.status(500).json({ error: 'Ошибка сохранения фильтров' });
    }
  } catch (error) {
    console.error('Save filters error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Get available trading pairs from bot
app.get('/api/available-pairs', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const response = await fetch('http://localhost:3002/available-pairs');
    const data = await response.json();
    res.json({ pairs: data.pairs || [] });
  } catch (error) {
    console.error('Get available pairs error:', error);
    res.json({ pairs: [] });
  }
});

// ==================== WEBSOCKET ====================

const wsClients = new Set<any>();

app.ws('/ws', (ws, req) => {
  console.log('WebSocket client connected');
  wsClients.add(ws);

  ws.on('message', (msg: string) => {
    try {
      const data = JSON.parse(msg);
      
      if (data.type === 'auth') {
        const user = db.validateSession(data.token);
        if (user) {
          (ws as any).userId = user.id;
          ws.send(JSON.stringify({ type: 'auth', success: true }));
        } else {
          ws.send(JSON.stringify({ type: 'auth', success: false }));
        }
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    wsClients.delete(ws);
  });
});

export function broadcastOpportunity(opportunity: any) {
  const message = JSON.stringify({
    type: 'opportunity',
    data: opportunity
  });

  wsClients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  });
}

// ==================== ADMIN ROUTES ====================

// Get all users (admin only)
app.get('/api/admin/users', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  // Implementation for admin panel
  res.json({ message: 'Admin users endpoint' });
});

// Start server
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ API Server running on http://localhost:${PORT}`);
  console.log(`📊 Database initialized and ready`);
});

export { app };
