const express = require('express');

class WebServer {
  constructor(database, baseUrl, port = 3000) {
    this.app = express();
    this.database = database;
    this.baseUrl = baseUrl;
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Basic middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Log all requests
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'telegram-shortlink-bot'
      });
    });

    // Stats endpoint
    this.app.get('/stats', async (req, res) => {
      try {
        // You can add aggregate stats here if needed
        res.json({
          message: 'Stats endpoint - implement as needed',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Main redirect handler - this is the core of Workflow 2
    this.app.get('/:shortCode', async (req, res) => {
      await this.handleRedirect(req, res);
    });

    // Handle root path
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Telegram ShortLink Bot Server',
        usage: 'Use /:shortCode to redirect to original URL',
        bot: 'Contact the Telegram bot to create short links'
      });
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found'
      });
    });

    // Error handler
    this.app.use((error, req, res, next) => {
      console.error('Server error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Something went wrong on the server'
      });
    });
  }

  async handleRedirect(req, res) {
    const shortCode = req.params.shortCode;

    // Validate short code format
    if (!shortCode || shortCode.length < 3) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Invalid short code format'
      });
    }

    try {
      // Find the short link in database (MongoDB Find equivalent)
      const shortLink = await this.database.findShortLink(shortCode);

      if (!shortLink) {
        // Not Valid URL - return 404
        return res.status(404).json({
          error: 'Not Found',
          message: 'Short link not found'
        });
      }

      // Valid URL found - increment click count and redirect
      try {
        await this.database.incrementClickCount(shortCode);
      } catch (error) {
        console.error('Error incrementing click count:', error);
        // Don't fail the redirect if click counting fails
      }

      // Redirect to original URL
      console.log(`Redirecting ${shortCode} to ${shortLink.originalUrl}`);
      res.redirect(302, shortLink.originalUrl);

    } catch (error) {
      console.error('Error handling redirect:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Error processing redirect'
      });
    }
  }

  start() {
    this.server = this.app.listen(this.port, () => {
      console.log(`🌐 Web server running on port ${this.port}`);
      console.log(`🔗 Base URL: ${this.baseUrl}`);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.log('🛑 Web server stopped');
    }
  }
}

module.exports = WebServer;
