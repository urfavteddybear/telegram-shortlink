# Simple Docker Deployment (Bot Only)

## 🐳 Minimal Docker Setup

This setup containerizes only the Telegram bot, using your existing MongoDB and infrastructure.

### Quick Start

1. **Setup environment**:
   ```bash
   cp .env.example .env
   nano .env  # Configure your MongoDB URI and bot token
   ```

2. **Build and run**:
   ```bash
   # Using Docker Compose (recommended)
   docker-compose up -d
   
   # Or using Docker directly
   docker build -t telegram-shortlink-bot .
   docker run -d --name shortlink-bot -p 3000:3000 --env-file .env telegram-shortlink-bot
   ```

### Environment Configuration

Edit `.env` with your values:

```env
# Your Telegram bot token
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Your domain
BASE_URL=https://yourdomain.com

# Your existing MongoDB connection
MONGODB_URI=mongodb://username:password@your-mongo-host:27017/shortlink?authSource=admin
```

### MongoDB Connection Options

#### Option 1: Local MongoDB on Host
```env
MONGODB_URI=mongodb://host.docker.internal:27017/shortlink
```

#### Option 2: MongoDB with Authentication
```env
MONGODB_URI=mongodb://username:password@host.docker.internal:27017/shortlink?authSource=admin
```

#### Option 3: MongoDB Atlas
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/shortlink?retryWrites=true&w=majority
```

#### Option 4: Remote MongoDB Server
```env
MONGODB_URI=mongodb://username:password@your-server-ip:27017/shortlink?authSource=admin
```

### Docker Commands

```bash
# Start the bot
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the bot
docker-compose down

# Restart the bot
docker-compose restart

# Check status
docker-compose ps
```

### NPM Scripts

You can also use the predefined npm scripts:

```bash
# Start with Docker Compose
npm run compose:up

# View logs
npm run compose:logs

# Stop
npm run compose:down

# Build standalone image
npm run docker:build

# Run standalone container
npm run docker:run
```

### Image Details

- **Base**: `node:18-alpine` (~50MB final image)
- **Security**: Non-root user, minimal packages
- **Health Check**: Built-in `/health` endpoint monitoring
- **Auto-restart**: Container restarts on failure

### Integration with Existing Infrastructure

This setup works perfectly with:
- ✅ Your existing MongoDB server
- ✅ Your existing reverse proxy (Nginx, Apache, Cloudflare)
- ✅ Your existing SSL certificates
- ✅ Your existing monitoring setup

### Production Tips

1. **Resource Limits**: Add to docker-compose.yml if needed:
   ```yaml
   deploy:
     resources:
       limits:
         memory: 512M
         cpus: '0.5'
   ```

2. **Logging**: Configure log rotation:
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

3. **Health Monitoring**: Check container health:
   ```bash
   curl http://localhost:3000/health
   ```

### Troubleshooting

#### Container won't start:
```bash
docker-compose logs shortlink-bot
```

#### MongoDB connection issues:
- For local MongoDB: Use `host.docker.internal` instead of `localhost`
- Check firewall settings
- Verify MongoDB is accepting connections

#### Port conflicts:
Change the host port in docker-compose.yml:
```yaml
ports:
  - "3001:3000"  # Use port 3001 on host
```

This minimal setup gives you all the benefits of containerization while keeping your existing infrastructure intact!
