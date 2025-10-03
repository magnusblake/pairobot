#!/usr/bin/env node
/**
 * PairBot Unified Launcher
 * Запускает все сервисы платформы одновременно:
 * - Bot Service (порт 3002)
 * - API Server (порт 3001)
 * - Frontend Dev Server (порт 5173)
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

interface Service {
  name: string;
  command: string;
  args: string[];
  color: string;
  cwd: string;
  process?: ChildProcess;
}

class UnifiedLauncher {
  private services: Service[] = [];
  private isShuttingDown = false;

  constructor() {
    this.services = [
      {
        name: 'Bot Service',
        command: 'tsx',
        args: ['src/bot/index.ts'],
        color: '\x1b[36m', // Cyan
        cwd: rootDir
      },
      {
        name: 'API Server',
        command: 'tsx',
        args: ['src/server/api.ts'],
        color: '\x1b[33m', // Yellow
        cwd: rootDir
      },
      {
        name: 'Frontend',
        command: 'vite',
        args: [],
        color: '\x1b[35m', // Magenta
        cwd: rootDir
      }
    ];
  }

  private log(serviceName: string, message: string, color: string) {
    const timestamp = new Date().toLocaleTimeString('ru-RU');
    const reset = '\x1b[0m';
    console.log(`${color}[${timestamp}] [${serviceName}]${reset} ${message}`);
  }

  private startService(service: Service): Promise<void> {
    return new Promise((resolve, reject) => {
      this.log(service.name, `Запуск...`, service.color);

      const proc = spawn(service.command, service.args, {
        cwd: service.cwd,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, FORCE_COLOR: '1' }
      });

      service.process = proc;

      let startupTimeout: NodeJS.Timeout;
      let hasStarted = false;

      // Обработка stdout
      proc.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        const lines = output.split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
          this.log(service.name, line, service.color);
        });

        // Проверяем успешный запуск
        if (!hasStarted) {
          const successPatterns = [
            /server running/i,
            /started successfully/i,
            /listening on/i,
            /ready in/i,
            /Local:.*http/i
          ];

          if (successPatterns.some(pattern => pattern.test(output))) {
            hasStarted = true;
            clearTimeout(startupTimeout);
            this.log(service.name, '✅ Успешно запущен', service.color);
            resolve();
          }
        }
      });

      // Обработка stderr
      proc.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();
        const lines = output.split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
          // Vite выводит некоторые сообщения в stderr
          if (line.includes('VITE') || line.includes('ready in')) {
            this.log(service.name, line, service.color);
            if (!hasStarted) {
              hasStarted = true;
              clearTimeout(startupTimeout);
              resolve();
            }
          } else {
            this.log(service.name, `⚠️ ${line}`, service.color);
          }
        });
      });

      // Обработка завершения процесса
      proc.on('exit', (code, signal) => {
        if (!this.isShuttingDown) {
          this.log(service.name, `❌ Процесс завершен (код: ${code}, сигнал: ${signal})`, service.color);
          this.shutdown();
        }
      });

      proc.on('error', (error) => {
        this.log(service.name, `❌ Ошибка: ${error.message}`, service.color);
        clearTimeout(startupTimeout);
        reject(error);
      });

      // Таймаут запуска
      startupTimeout = setTimeout(() => {
        if (!hasStarted) {
          this.log(service.name, '⚠️ Таймаут запуска (продолжаем работу)', service.color);
          resolve(); // Продолжаем даже если не получили подтверждение
        }
      }, 30000); // 30 секунд
    });
  }

  private async shutdown() {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    console.log('\n\x1b[31m🛑 Остановка всех сервисов...\x1b[0m\n');

    for (const service of this.services) {
      if (service.process && !service.process.killed) {
        this.log(service.name, 'Остановка...', service.color);
        
        try {
          // Пытаемся graceful shutdown
          service.process.kill('SIGTERM');
          
          // Ждем 5 секунд, затем force kill
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
              if (service.process && !service.process.killed) {
                service.process.kill('SIGKILL');
              }
              resolve();
            }, 5000);

            service.process?.on('exit', () => {
              clearTimeout(timeout);
              resolve();
            });
          });
          
          this.log(service.name, '✅ Остановлен', service.color);
        } catch (error: any) {
          this.log(service.name, `⚠️ Ошибка при остановке: ${error.message}`, service.color);
        }
      }
    }

    console.log('\n\x1b[32m✅ Все сервисы остановлены\x1b[0m\n');
    process.exit(0);
  }

  public async start() {
    console.log('\x1b[1m\x1b[36m');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                                                              ║');
    console.log('║              🚀 PairBot Unified Launcher v2.5.0              ║');
    console.log('║                                                              ║');
    console.log('║        Платформа арбитража криптовалют в реальном времени    ║');
    console.log('║                                                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\x1b[0m\n');

    // Обработка сигналов завершения
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
    process.on('uncaughtException', (error) => {
      console.error('\x1b[31m❌ Необработанная ошибка:\x1b[0m', error);
      this.shutdown();
    });

    try {
      console.log('\x1b[1m📋 Запуск сервисов...\x1b[0m\n');

      // Запускаем сервисы последовательно с задержкой
      for (const service of this.services) {
        await this.startService(service);
        // Небольшая задержка между запусками
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log('\n\x1b[1m\x1b[32m');
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║                                                              ║');
      console.log('║              ✅ ВСЕ СЕРВИСЫ УСПЕШНО ЗАПУЩЕНЫ!                ║');
      console.log('║                                                              ║');
      console.log('╚══════════════════════════════════════════════════════════════╝');
      console.log('\x1b[0m');

      console.log('\n\x1b[1m📊 Доступные сервисы:\x1b[0m\n');
      console.log('  \x1b[35m🌐 Frontend:\x1b[0m      http://localhost:5173');
      console.log('  \x1b[33m🔌 API Server:\x1b[0m    http://localhost:3001');
      console.log('  \x1b[36m🤖 Bot Service:\x1b[0m   http://localhost:3002');
      console.log('\n\x1b[1m💡 Откройте браузер:\x1b[0m \x1b[4mhttp://localhost:5173\x1b[0m\n');
      console.log('\x1b[90mНажмите Ctrl+C для остановки всех сервисов\x1b[0m\n');
      console.log('\x1b[1m' + '═'.repeat(62) + '\x1b[0m\n');

    } catch (error: any) {
      console.error('\x1b[31m❌ Ошибка при запуске:\x1b[0m', error.message);
      await this.shutdown();
      process.exit(1);
    }
  }
}

// Запуск лаунчера
const launcher = new UnifiedLauncher();
launcher.start().catch((error) => {
  console.error('\x1b[31m❌ Критическая ошибка:\x1b[0m', error);
  process.exit(1);
});
