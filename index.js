require('dotenv').config();
const Database = require('./models/Database');
const TelegramBotHandler = require('./bot/TelegramBotHandler');
const WebServer = require('./server/WebServer');

class ShortLinkBot {
  constructor() {
    this.database = new Database();
    this.telegramBot = null;
    this.webServer = null;
    this.validateEnvironment();
  }

  validateEnvironment() {
    const requiredEnvVars = [
      'TELEGRAM_BOT_TOKEN',
      'MONGODB_URI',
      'BASE_URL',
      'PORT'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars);
      console.error('Please check your .env file and ensure all required variables are set.');
      process.exit(1);
    }
  }

  async start() {
    try {
      console.log('🚀 Starting Telegram ShortLink Bot...');

      // Connect to database
      await this.database.connect(process.env.MONGODB_URI);

      // Initialize Telegram bot (Workflow 1)
      this.telegramBot = new TelegramBotHandler(
        process.env.TELEGRAM_BOT_TOKEN,
        this.database,
        process.env.BASE_URL
      );

      // Initialize web server (Workflow 2)
      this.webServer = new WebServer(
        this.database,
        process.env.BASE_URL,
        parseInt(process.env.PORT)
      );

      // Start web server
      this.webServer.start();

      console.log('✅ All systems are running!');
      console.log('📱 Telegram bot is listening for messages');
      console.log('🌐 Web server is handling redirects');

      // Handle graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      console.error('❌ Failed to start bot:', error);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      
      try {
        // Stop web server
        if (this.webServer) {
          this.webServer.stop();
        }

        // Stop Telegram bot
        if (this.telegramBot && this.telegramBot.bot) {
          await this.telegramBot.bot.stopPolling();
        }

        // Close database connection
        if (this.database && this.database.isConnected) {
          await require('mongoose').connection.close();
          console.log('📪 Database connection closed');
        }

        console.log('✅ Shutdown complete');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// Start the bot
const bot = new ShortLinkBot();
bot.start().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

module.exports = ShortLinkBot;
