# 🚀 ПРОСТОЕ РАЗВЕРТЫВАНИЕ (Работает 100%)

## Шаг 1: Установка Node.js и зависимостей

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка PM2
sudo npm install -g pm2

# Установка Nginx
sudo apt install nginx -y

# Проверка версий
node --version
npm --version
```

## Шаг 2: Клонирование проекта

```bash
cd /var/www
git clone https://github.com/magnusblake/pairobot.git
cd pairobot
```

## Шаг 3: Создание .env файла

```bash
nano .env
```

Вставьте это содержимое:

```env
TELEGRAM_BOT_TOKEN=8066805985:AAE9Jj-OjwcEUZ31TxHNNHmThyIS6ARbRVU
PORT=3001
NODE_ENV=production
```

Сохраните: `Ctrl+X`, затем `Y`, затем `Enter`

## Шаг 4: Установка зависимостей

```bash
# Установка зависимостей бэкенда
npm install

# Установка зависимостей фронтенда
cd frontend
npm install
cd ..
```

## Шаг 5: Сборка фронтенда

```bash
cd frontend
npm run build
cd ..
```

## Шаг 6: Компиляция TypeScript

```bash
# Установка TypeScript
npm install -g typescript

# Компиляция
npx tsc

# Проверка что dist создан
ls -la dist/
```

## Шаг 7: Запуск приложения

```bash
# Запуск с PM2
pm2 start dist/launcher.js --name pairobot

# Проверка статуса
pm2 status

# Просмотр логов
pm2 logs pairobot --lines 50
```

Если видите ошибки, скопируйте их и отправьте мне.

## Шаг 8: Настройка Nginx (ПРОСТАЯ ВЕРСИЯ)

```bash
# Создайте конфигурацию
sudo nano /etc/nginx/sites-available/2cakes.ru
```

Вставьте это:

```nginx
server {
    listen 80;
    server_name 2cakes.ru www.2cakes.ru;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Сохраните: `Ctrl+X`, `Y`, `Enter`

```bash
# Активация конфигурации
sudo ln -s /etc/nginx/sites-available/2cakes.ru /etc/nginx/sites-enabled/

# Удаление дефолтной конфигурации
sudo rm /etc/nginx/sites-enabled/default

# Проверка конфигурации
sudo nginx -t

# Если ошибка - покажите мне вывод
# Если OK - перезапустите Nginx
sudo systemctl restart nginx
```

## Шаг 9: Проверка работы

```bash
# Проверка что приложение запущено
pm2 status

# Проверка логов
pm2 logs pairobot --lines 20

# Проверка порта
sudo netstat -tulpn | grep :3001

# Проверка Nginx
sudo systemctl status nginx

# Тест локально
curl http://localhost:3001
```

## Шаг 10: Настройка Cloudflare

В панели Cloudflare для 2cakes.ru:

1. **DNS:**
   - Тип: `A`
   - Имя: `@`
   - Значение: `IP_вашего_VPS`
   - Proxy: `Включено` (оранжевое облако)

2. **SSL/TLS:**
   - Режим: `Flexible` (для начала)

## Шаг 11: Автозапуск при перезагрузке

```bash
pm2 save
pm2 startup
# Выполните команду, которую выдаст PM2
```

## 🔍 Диагностика ошибок

### Если 500 Internal Error:

```bash
# 1. Проверьте логи приложения
pm2 logs pairobot --err --lines 50

# 2. Проверьте логи Nginx
sudo tail -f /var/log/nginx/error.log

# 3. Проверьте что приложение запущено
pm2 status

# 4. Проверьте порт
sudo netstat -tulpn | grep :3001

# 5. Перезапустите всё
pm2 restart pairobot
sudo systemctl restart nginx
```

### Если приложение не запускается:

```bash
# Проверьте логи
pm2 logs pairobot --err

# Попробуйте запустить вручную для диагностики
node dist/launcher.js

# Если ошибка с модулями
npm install
npm rebuild
```

### Если Nginx не работает:

```bash
# Проверьте конфигурацию
sudo nginx -t

# Проверьте статус
sudo systemctl status nginx

# Перезапустите
sudo systemctl restart nginx
```

## 📝 Быстрая перезагрузка всего

```bash
pm2 restart pairobot
sudo systemctl restart nginx
```

## 🆘 Если ничего не помогает

Выполните эти команды и отправьте мне вывод:

```bash
echo "=== PM2 Status ==="
pm2 status

echo "=== PM2 Logs ==="
pm2 logs pairobot --lines 30 --nostream

echo "=== Nginx Status ==="
sudo systemctl status nginx

echo "=== Nginx Error Log ==="
sudo tail -20 /var/log/nginx/error.log

echo "=== Port Check ==="
sudo netstat -tulpn | grep :3001

echo "=== Process Check ==="
ps aux | grep node
```

## ✅ Проверка что всё работает

1. Откройте http://2cakes.ru в браузере
2. Должна открыться страница приложения
3. Если видите 502/504 - приложение не запущено
4. Если видите 500 - ошибка в приложении (смотрите логи)
5. Если видите Nginx страницу - неправильная конфигурация

---

**Отправьте мне вывод команд диагностики, если что-то не работает!**
