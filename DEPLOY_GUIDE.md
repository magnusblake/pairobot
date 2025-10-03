# 🚀 Руководство по развертыванию на VDS Ubuntu 20.04

## Предварительные требования
- VDS с Ubuntu 20.04
- Домен 2cakes.ru подключен к Cloudflare
- SSH доступ к серверу

## Шаг 1: Подключение к серверу

```bash
ssh root@ваш_IP_адрес
```

## Шаг 2: Установка Node.js 18+

```bash
# Установка Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверка версии
node --version
npm --version
```

## Шаг 3: Установка дополнительных зависимостей

```bash
# Git
sudo apt install git -y

# PM2 для управления процессами
sudo npm install -g pm2

# Nginx
sudo apt install nginx -y
```

## Шаг 4: Клонирование проекта

```bash
# Создайте директорию для проекта
mkdir -p /var/www
cd /var/www

# Клонируйте ваш репозиторий (или загрузите файлы)
# Вариант 1: Если проект в Git
git clone https://github.com/ваш-репозиторий/pairobot.git
cd pairobot

# Вариант 2: Загрузка через SCP с локального компьютера
# На вашем локальном компьютере выполните:
# scp -r C:\Users\Георгий\Desktop\pairobot root@ваш_IP:/var/www/
```

## Шаг 5: Установка зависимостей

```bash
cd /var/www/pairobot

# Установка зависимостей
npm install

# Установка зависимостей фронтенда
cd frontend
npm install
cd ..
```

## Шаг 6: Настройка переменных окружения

```bash
# Создайте .env файл
nano .env
```

Добавьте следующее содержимое:

```env
# Telegram Configuration
TELEGRAM_BOT_TOKEN=8066805985:AAE9Jj-OjwcEUZ31TxHNNHmThyIS6ARbRVU

# Server Configuration
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://2cakes.ru

# Database (если используется)
DB_PATH=/var/www/pairobot/pairobot.db

# Redis (опционально)
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Шаг 7: Сборка фронтенда

```bash
cd frontend
npm run build
cd ..
```

## Шаг 8: Настройка Nginx

```bash
# Создайте конфигурацию для вашего домена
sudo nano /etc/nginx/sites-available/2cakes.ru
```

Добавьте следующую конфигурацию:

```nginx
server {
    listen 80;
    server_name 2cakes.ru www.2cakes.ru;

    # Перенаправление на HTTPS (Cloudflare будет обрабатывать SSL)
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Статические файлы фронтенда
    location /assets {
        alias /var/www/pairobot/frontend/dist/assets;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Активируйте конфигурацию:

```bash
# Создайте символическую ссылку
sudo ln -s /etc/nginx/sites-available/2cakes.ru /etc/nginx/sites-enabled/

# Удалите дефолтную конфигурацию
sudo rm /etc/nginx/sites-enabled/default

# Проверьте конфигурацию
sudo nginx -t

# Перезапустите Nginx
sudo systemctl restart nginx
```

## Шаг 9: Настройка Cloudflare

### В панели Cloudflare для домена 2cakes.ru:

1. **DNS записи:**
   - Тип: `A`
   - Имя: `@`
   - Значение: `IP_вашего_VDS`
   - Proxy status: `Proxied` (оранжевое облако)

   - Тип: `A`
   - Имя: `www`
   - Значение: `IP_вашего_VDS`
   - Proxy status: `Proxied`

2. **SSL/TLS настройки:**
   - Перейдите в `SSL/TLS` → `Overview`
   - Выберите режим: `Full` или `Full (strict)`

3. **Настройки скорости:**
   - `Speed` → `Optimization`
   - Включите `Auto Minify` для HTML, CSS, JS
   - Включите `Brotli`

## Шаг 10: Запуск приложения с PM2

```bash
cd /var/www/pairobot

# Запуск основного сервера
pm2 start src/launcher.ts --name "pairobot-server" --interpreter ts-node

# Или если используется скомпилированный JavaScript
pm2 start dist/launcher.js --name "pairobot-server"

# Сохранение конфигурации PM2
pm2 save

# Автозапуск при перезагрузке сервера
pm2 startup
# Выполните команду, которую выдаст PM2
```

## Шаг 11: Проверка работы

```bash
# Проверка статуса приложения
pm2 status

# Просмотр логов
pm2 logs pairobot-server

# Проверка Nginx
sudo systemctl status nginx

# Проверка портов
sudo netstat -tulpn | grep :3001
```

## Шаг 12: Настройка файрвола (UFW)

```bash
# Установка UFW
sudo apt install ufw -y

# Разрешить SSH
sudo ufw allow 22/tcp

# Разрешить HTTP и HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Включить файрвол
sudo ufw enable

# Проверить статус
sudo ufw status
```

## Шаг 13: Настройка автоматического обновления SSL (опционально)

Если вы хотите использовать Let's Encrypt вместо Cloudflare SSL:

```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получение сертификата
sudo certbot --nginx -d 2cakes.ru -d www.2cakes.ru

# Автоматическое обновление
sudo certbot renew --dry-run
```

## Полезные команды PM2

```bash
# Перезапуск приложения
pm2 restart pairobot-server

# Остановка
pm2 stop pairobot-server

# Удаление из списка
pm2 delete pairobot-server

# Просмотр логов в реальном времени
pm2 logs pairobot-server --lines 100

# Мониторинг
pm2 monit
```

## Обновление приложения

```bash
cd /var/www/pairobot

# Остановка приложения
pm2 stop pairobot-server

# Обновление кода (git pull или загрузка новых файлов)
git pull origin main

# Установка зависимостей
npm install
cd frontend && npm install && cd ..

# Сборка фронтенда
cd frontend && npm run build && cd ..

# Перезапуск
pm2 restart pairobot-server
```

## Мониторинг и логи

```bash
# Логи приложения
pm2 logs pairobot-server

# Логи Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Использование ресурсов
pm2 monit
htop
```

## Резервное копирование

```bash
# Создание бэкапа базы данных
cp /var/www/pairobot/pairobot.db /var/backups/pairobot_$(date +%Y%m%d).db

# Автоматический бэкап (добавьте в crontab)
crontab -e
# Добавьте строку:
# 0 2 * * * cp /var/www/pairobot/pairobot.db /var/backups/pairobot_$(date +\%Y\%m\%d).db
```

## Решение проблем

### Приложение не запускается
```bash
# Проверьте логи
pm2 logs pairobot-server --err

# Проверьте порт
sudo netstat -tulpn | grep :3001

# Проверьте права доступа
ls -la /var/www/pairobot
```

### Nginx не работает
```bash
# Проверьте конфигурацию
sudo nginx -t

# Проверьте статус
sudo systemctl status nginx

# Перезапустите
sudo systemctl restart nginx
```

### Cloudflare показывает ошибку 502/504
- Убедитесь, что приложение запущено: `pm2 status`
- Проверьте, что порт 3001 открыт: `sudo netstat -tulpn | grep :3001`
- Проверьте логи: `pm2 logs`

## Безопасность

1. **Измените SSH порт** (опционально):
```bash
sudo nano /etc/ssh/sshd_config
# Измените Port 22 на другой порт
sudo systemctl restart sshd
```

2. **Отключите root login через SSH**:
```bash
sudo nano /etc/ssh/sshd_config
# Установите: PermitRootLogin no
sudo systemctl restart sshd
```

3. **Установите Fail2Ban**:
```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Готово! 🎉

Ваше приложение должно быть доступно по адресу: https://2cakes.ru

Проверьте:
- ✅ Сайт открывается
- ✅ SSL работает (зеленый замок в браузере)
- ✅ Все функции работают корректно
- ✅ Telegram бот отвечает
