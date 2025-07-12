# Telegram ShortLink Bot

A Telegram bot that creates short links and handles redirects, built with Node.js and MongoDB.

## Features

- 🔗 **URL Shortening**: Convert long URLs into short, shareable links
- 🤖 **Telegram Bot Interface**: Easy-to-use Telegram bot for creating links
- 🎯 **Custom Short Codes**: Option to specify custom short codes
- 📊 **Click Tracking**: Track how many times each link is clicked
- 🔄 **Intelligent Validation**: Validates URLs and handles conflicts
- 📱 **User-Friendly**: Smart conversation flow with error handling

## Workflow

This bot implements two main workflows:

### Workflow 1: Telegram URL Shortener
- Users send URLs to the Telegram bot
- Bot validates the URL format
- Checks for existing short codes to prevent conflicts
- Creates new short links and stores them in MongoDB
- Sends confirmation with the new short URL

### Workflow 2: URL Redirect Handler
- Web server receives requests to short URLs
- Looks up the short code in MongoDB
- Redirects users to the original URL
- Tracks click counts for analytics

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd telegram-shortlink
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env` and configure your values:
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` with your actual configuration:
   - **TELEGRAM_BOT_TOKEN**: Get from [@BotFather](https://t.me/BotFather)
   - **MONGODB_URI**: Your MongoDB connection string
   - **BASE_URL**: Your domain (use http://localhost:3000 for local development)
   - **PORT**: Server port (3000 for local, keep 3000 for production with reverse proxy)

4. **Set up MongoDB**
   
   Make sure MongoDB is running on your system or use a cloud service like MongoDB Atlas.

5. **Create a Telegram Bot**
   - Message [@BotFather](https://t.me/BotFather) on Telegram
   - Use `/newbot` command to create a new bot
   - Copy the bot token to your `.env` file

## Usage

### Starting the Bot

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

### Telegram Bot Commands

- `/start` - Start the bot and see welcome message
- `/help` - Show help information
- `/mylinks` - View your recent short links

### Creating Short Links

1. **Simple shortening:**
   ```
   https://example.com/very-long-url
   ```

2. **Custom short code:**
   ```
   https://example.com/long-url code:mylink
   ```

3. **Mixed content:**
   ```
   Check this out: https://example.com/article code:cool-article
   ```

### Custom Code Rules

- 3-20 characters long
- Letters, numbers, hyphens, and underscores only
- Must be unique across all users

## API Endpoints

- `GET /` - Service information
- `GET /health` - Health check
- `GET /stats` - Statistics (implement as needed)
- `GET /:shortCode` - Redirect to original URL

## Project Structure

```
telegram-shortlink/
├── bot/
│   └── TelegramBotHandler.js    # Telegram bot logic
├── models/
│   ├── Database.js              # Database operations
│   └── ShortLink.js             # MongoDB schema
├── server/
│   └── WebServer.js             # Express server for redirects
├── utils/
│   └── UrlValidator.js          # URL validation utilities
├── index.js                     # Main application entry point
├── package.json                 # Project dependencies
└── .env                         # Environment variables
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token | Required |
| `MONGODB_URI` | MongoDB connection string | Required |
| `BASE_URL` | Base URL for short links | Required |
| `PORT` | Port for the web server | 3000 |
| `NODE_ENV` | Environment (development/production) | development |

## Error Handling

The bot includes comprehensive error handling for:
- Invalid URLs
- Duplicate short codes
- Database connection issues
- Network errors
- Invalid custom codes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Deployment

### Production Setup

1. **Copy environment file**
   ```bash
   cp .env.example .env
   ```

2. **Configure production variables**
   ```env
   TELEGRAM_BOT_TOKEN=your_actual_bot_token
   MONGODB_URI=mongodb://username:password@host:port/database?authSource=admin
   PORT=3000
   BASE_URL=https://yourdomain.com
   NODE_ENV=production
   ```

3. **Set up reverse proxy (Nginx example)**
   ```nginx
   server {
       listen 443 ssl;
       server_name yourdomain.com;
       
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

4. **Install and start as service**
   ```bash
   npm install --production
   npm start
   ```

### Cloud Platform Deployment

For platforms like Heroku, Railway, or Vercel:

1. **Set environment variables in your platform's dashboard**
2. **Use these settings in .env**:
   ```env
   PORT=${PORT:-3000}
   BASE_URL=https://yourapp.herokuapp.com
   ```

### SSL Certificate Setup

For free SSL certificates with Let's Encrypt:
```bash
sudo certbot --nginx -d yourdomain.com
```

## 🐳 Docker Deployment

### Quick Start with Docker

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd telegram-shortlink
   cp .env.example .env
   ```

2. **Configure environment**:
   ```bash
   nano .env  # Edit with your values
   ```

3. **Deploy with Docker**:
   ```bash
   docker-compose up -d
   ```

### Docker Features

- **Ultra-lightweight image**: ~50MB (vs ~900MB standard Node.js)
- **Bot-only container**: Uses your existing MongoDB and infrastructure
- **Multi-stage build**: Optimized for production
- **Security**: Non-root user, minimal attack surface
- **Health checks**: Built-in monitoring
- **Auto-restart**: Resilient deployment

### Docker Commands

```bash
# Build and run
npm run compose:up

# View logs
npm run compose:logs

# Stop services
npm run compose:down

# Restart services
npm run compose:restart
```

### MongoDB Connection

The Docker container connects to your existing MongoDB using `host.docker.internal`:

```env
# Local MongoDB
MONGODB_URI=mongodb://host.docker.internal:27017/shortlink

# MongoDB with auth
MONGODB_URI=mongodb://user:pass@host.docker.internal:27017/shortlink?authSource=admin

# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/shortlink
```

### Documentation

- 📖 **[DOCKER-DEPLOYMENT.md](DOCKER-DEPLOYMENT.md)** - Bot-only containerization (recommended)
