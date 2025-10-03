import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_PATH = path.join(process.cwd(), 'pairobot.db');
let SQL: any = null;
let sqlDbInstance: SqlJsDatabase | null = null;

async function initDatabase() {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  
  if (!sqlDbInstance) {
    try {
      const buffer = fs.readFileSync(DB_PATH);
      sqlDbInstance = new SQL.Database(buffer);
    } catch {
      sqlDbInstance = new SQL.Database();
    }
  }
  
  return sqlDbInstance;
}

function saveDatabase() {
  if (sqlDbInstance) {
    const data = sqlDbInstance.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  telegram_id?: string;
  telegram_username?: string;
  telegram_chat_id?: string; // Chat ID для отправки сообщений
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface ExchangeApiKey {
  id: number;
  user_id: number;
  exchange_name: string;
  api_key: string;
  api_secret: string;
  passphrase?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TradingStrategy {
  id: number;
  user_id: number;
  name: string;
  exchanges: string; // JSON array
  min_profit_percentage: number;
  max_trade_amount: number;
  trading_pairs: string; // JSON array
  auto_trade_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TradeHistory {
  id: number;
  user_id: number;
  strategy_id: number;
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

export interface UserNotification {
  id: number;
  user_id: number;
  type: 'arbitrage' | 'trade' | 'system';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export class DatabaseManager {
  private db: SqlJsDatabase | null = null;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.init();
  }

  private async init() {
    this.db = await initDatabase();
    this.initTables();
    this.initialized = true;
  }

  async ensureInitialized() {
    if (!this.initialized && this.initPromise) {
      await this.initPromise;
    }
  }

  private initTables(): void {
    if (!this.db) return;
    
    // Users table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        telegram_id TEXT UNIQUE,
        telegram_username TEXT,
        telegram_chat_id TEXT,
        role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1
      )
    `);

    saveDatabase();

    // Exchange API Keys table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS exchange_api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        exchange_name TEXT NOT NULL,
        api_key TEXT NOT NULL,
        api_secret TEXT NOT NULL,
        passphrase TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, exchange_name)
      )
    `);

    saveDatabase();

    // Trading Strategies table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS trading_strategies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        exchanges TEXT NOT NULL,
        min_profit_percentage REAL DEFAULT 0.5,
        max_trade_amount REAL DEFAULT 1000,
        trading_pairs TEXT DEFAULT '[]',
        auto_trade_enabled INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    saveDatabase();

    // Migration: Add trading_pairs column if it doesn't exist
    try {
      const tableInfo = this.db.exec("PRAGMA table_info(trading_strategies)");
      const columns = tableInfo[0]?.values.map(row => row[1]) || [];
      
      if (!columns.includes('trading_pairs')) {
        console.log('🔄 Migrating database: Adding trading_pairs column...');
        this.db.run(`ALTER TABLE trading_strategies ADD COLUMN trading_pairs TEXT DEFAULT '[]'`);
        saveDatabase();
        console.log('✅ Migration completed successfully');
      }
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Trade History table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS trade_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        strategy_id INTEGER,
        symbol TEXT NOT NULL,
        buy_exchange TEXT NOT NULL,
        sell_exchange TEXT NOT NULL,
        buy_price REAL NOT NULL,
        sell_price REAL NOT NULL,
        amount REAL NOT NULL,
        profit REAL NOT NULL,
        profit_percentage REAL NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed')),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (strategy_id) REFERENCES trading_strategies(id) ON DELETE SET NULL
      )
    `);

    saveDatabase();

    // User Notifications table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS user_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('arbitrage', 'trade', 'system')),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    saveDatabase();

    // Sessions table for JWT alternative
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    saveDatabase();

    // Create indexes
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON exchange_api_keys(user_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON trading_strategies(user_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_trade_history_user_id ON trade_history(user_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON user_notifications(user_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`);

    saveDatabase();
    console.log('Database tables initialized successfully');
  }

  // User methods
  createUser(username: string, email: string, password: string, role: 'admin' | 'user' = 'user'): User | null {
    try {
      if (!this.db) return null;
      const password_hash = crypto.createHash('sha256').update(password).digest('hex');
      this.db.run(`
        INSERT INTO users (username, email, password_hash, role)
        VALUES (?, ?, ?, ?)
      `, [username, email, password_hash, role]);
      saveDatabase();
      
      const result = this.db.exec('SELECT last_insert_rowid() as id');
      if (result[0]?.values[0]) {
        return this.getUserById(result[0].values[0][0] as number);
      }
      return null;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  getUserById(id: number): User | null {
    if (!this.db) return null;
    const result = this.db.exec('SELECT * FROM users WHERE id = ?', [id]);
    if (result[0]?.values[0]) {
      const row = result[0].values[0];
      const columns = result[0].columns;
      return this.rowToObject(columns, row) as User;
    }
    return null;
  }

  getAllUsers(): User[] {
    if (!this.db) return [];
    const result = this.db.exec('SELECT * FROM users WHERE is_active = 1');
    if (result[0]?.values) {
      return result[0].values.map(row => this.rowToObject(result[0].columns, row)) as User[];
    }
    return [];
  }

  getUserByEmail(email: string): User | null {
    if (!this.db) return null;
    const result = this.db.exec('SELECT * FROM users WHERE email = ?', [email]);
    if (result[0]?.values[0]) {
      const row = result[0].values[0];
      const columns = result[0].columns;
      return this.rowToObject(columns, row) as User;
    }
    return null;
  }

  getUserByTelegramId(telegram_id: string): User | null {
    if (!this.db) return null;
    const result = this.db.exec('SELECT * FROM users WHERE telegram_id = ?', [telegram_id]);
    if (result[0]?.values[0]) {
      const row = result[0].values[0];
      const columns = result[0].columns;
      return this.rowToObject(columns, row) as User;
    }
    return null;
  }

  private rowToObject(columns: string[], values: any[]): any {
    const obj: any = {};
    columns.forEach((col, idx) => {
      obj[col] = values[idx];
    });
    return obj;
  }

  linkTelegramAccount(userId: number, telegramId: string, telegramUsername?: string, chatId?: string): boolean {
    try {
      if (!this.db) return false;
      this.db.run(`
        UPDATE users 
        SET telegram_id = ?, telegram_username = ?, telegram_chat_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [telegramId, telegramUsername, chatId, userId]);
      saveDatabase();
      return true;
    } catch (error) {
      console.error('Error linking Telegram account:', error);
      return false;
    }
  }

  unlinkTelegramAccount(userId: number): boolean {
    try {
      if (!this.db) return false;
      this.db.run(`
        UPDATE users 
        SET telegram_id = NULL, telegram_username = NULL, telegram_chat_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [userId]);
      saveDatabase();
      return true;
    } catch (error) {
      console.error('Error unlinking Telegram account:', error);
      return false;
    }
  }

  // API Keys methods
  addExchangeApiKey(userId: number, exchangeName: string, apiKey: string, apiSecret: string, passphrase?: string): boolean {
    try {
      if (!this.db) return false;
      const encryptedKey = Buffer.from(apiKey).toString('base64');
      const encryptedSecret = Buffer.from(apiSecret).toString('base64');
      const encryptedPassphrase = passphrase ? Buffer.from(passphrase).toString('base64') : null;

      this.db.run(`
        INSERT OR REPLACE INTO exchange_api_keys (user_id, exchange_name, api_key, api_secret, passphrase, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [userId, exchangeName, encryptedKey, encryptedSecret, encryptedPassphrase]);
      saveDatabase();
      return true;
    } catch (error) {
      console.error('Error adding API key:', error);
      return false;
    }
  }

  getUserApiKeys(userId: number): ExchangeApiKey[] {
    if (!this.db) return [];
    const result = this.db.exec('SELECT * FROM exchange_api_keys WHERE user_id = ? AND is_active = 1', [userId]);
    if (result[0]?.values) {
      return result[0].values.map(row => this.rowToObject(result[0].columns, row)) as ExchangeApiKey[];
    }
    return [];
  }

  // Strategy methods
  createStrategy(userId: number, name: string, exchanges: string[], minProfit: number, maxAmount: number, tradingPairs: string[] = []): TradingStrategy | null {
    try {
      if (!this.db) return null;
      this.db.run(`
        INSERT INTO trading_strategies (user_id, name, exchanges, min_profit_percentage, max_trade_amount, trading_pairs)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [userId, name, JSON.stringify(exchanges), minProfit, maxAmount, JSON.stringify(tradingPairs)]);
      saveDatabase();
      
      const result = this.db.exec('SELECT last_insert_rowid() as id');
      if (result[0]?.values[0]) {
        return this.getStrategyById(result[0].values[0][0] as number);
      }
      return null;
    } catch (error) {
      console.error('Error creating strategy:', error);
      return null;
    }
  }

  getStrategyById(id: number): TradingStrategy | null {
    if (!this.db) return null;
    const result = this.db.exec('SELECT * FROM trading_strategies WHERE id = ?', [id]);
    if (result[0]?.values[0]) {
      return this.rowToObject(result[0].columns, result[0].values[0]) as TradingStrategy;
    }
    return null;
  }

  getUserStrategies(userId: number): TradingStrategy[] {
    if (!this.db) return [];
    const result = this.db.exec('SELECT * FROM trading_strategies WHERE user_id = ? AND is_active = 1', [userId]);
    if (result[0]?.values) {
      return result[0].values.map(row => this.rowToObject(result[0].columns, row)) as TradingStrategy[];
    }
    return [];
  }

  updateStrategyAutoTrade(strategyId: number, enabled: boolean): boolean {
    try {
      if (!this.db) return false;
      this.db.run(`
        UPDATE trading_strategies 
        SET auto_trade_enabled = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [enabled ? 1 : 0, strategyId]);
      saveDatabase();
      return true;
    } catch (error) {
      console.error('Error updating strategy:', error);
      return false;
    }
  }

  updateStrategy(strategyId: number, exchanges: string[], minProfit: number, maxAmount: number, tradingPairs: string[] = []): boolean {
    try {
      if (!this.db) return false;
      this.db.run(`
        UPDATE trading_strategies 
        SET exchanges = ?, min_profit_percentage = ?, max_trade_amount = ?, trading_pairs = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [JSON.stringify(exchanges), minProfit, maxAmount, JSON.stringify(tradingPairs), strategyId]);
      saveDatabase();
      return true;
    } catch (error) {
      console.error('Error updating strategy:', error);
      return false;
    }
  }

  // Trade History methods
  addTradeHistory(trade: Omit<TradeHistory, 'id' | 'created_at' | 'completed_at'>): boolean {
    try {
      if (!this.db) return false;
      this.db.run(`
        INSERT INTO trade_history (
          user_id, strategy_id, symbol, buy_exchange, sell_exchange,
          buy_price, sell_price, amount, profit, profit_percentage, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        trade.user_id, trade.strategy_id, trade.symbol, trade.buy_exchange, trade.sell_exchange,
        trade.buy_price, trade.sell_price, trade.amount, trade.profit, trade.profit_percentage, trade.status
      ]);
      saveDatabase();
      return true;
    } catch (error) {
      console.error('Error adding trade history:', error);
      return false;
    }
  }

  getUserTradeHistory(userId: number, limit: number = 100): TradeHistory[] {
    if (!this.db) return [];
    const result = this.db.exec(`
      SELECT * FROM trade_history 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `, [userId, limit]);
    if (result[0]?.values) {
      return result[0].values.map(row => this.rowToObject(result[0].columns, row)) as TradeHistory[];
    }
    return [];
  }

  // Notification methods
  addNotification(userId: number, type: string, title: string, message: string): boolean {
    try {
      if (!this.db) return false;
      this.db.run(`
        INSERT INTO user_notifications (user_id, type, title, message)
        VALUES (?, ?, ?, ?)
      `, [userId, type, title, message]);
      saveDatabase();
      return true;
    } catch (error) {
      console.error('Error adding notification:', error);
      return false;
    }
  }

  getUserNotifications(userId: number, unreadOnly: boolean = false): UserNotification[] {
    if (!this.db) return [];
    const query = unreadOnly
      ? 'SELECT * FROM user_notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC'
      : 'SELECT * FROM user_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50';
    const result = this.db.exec(query, [userId]);
    if (result[0]?.values) {
      return result[0].values.map(row => this.rowToObject(result[0].columns, row)) as UserNotification[];
    }
    return [];
  }

  markNotificationAsRead(notificationId: number): boolean {
    try {
      if (!this.db) return false;
      this.db.run('UPDATE user_notifications SET is_read = 1 WHERE id = ?', [notificationId]);
      saveDatabase();
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  // Session methods
  createSession(userId: number): string {
    if (!this.db) return '';
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    
    this.db.run(`
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `, [userId, token, expiresAt]);
    saveDatabase();
    return token;
  }

  validateSession(token: string): User | null {
    if (!this.db) return null;
    const result = this.db.exec(`
      SELECT u.* FROM users u
      JOIN sessions s ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `, [token]);
    if (result[0]?.values[0]) {
      return this.rowToObject(result[0].columns, result[0].values[0]) as User;
    }
    return null;
  }

  deleteSession(token: string): boolean {
    try {
      if (!this.db) return false;
      this.db.run('DELETE FROM sessions WHERE token = ?', [token]);
      saveDatabase();
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }

  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}

// Singleton instance
let dbInstance: DatabaseManager | null = null;

export function getDatabase(): DatabaseManager {
  if (!dbInstance) {
    dbInstance = new DatabaseManager();
  }
  return dbInstance;
}
