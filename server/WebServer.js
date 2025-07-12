const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

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
    // Trust Cloudflare proxy (important for IP detection)
    this.app.set('trust proxy', true);
    
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' ? 
        [process.env.BASE_URL] : 
        true,
      credentials: true
    }));

    // Custom IP extraction middleware for Cloudflare
    this.app.use((req, res, next) => {
      // Get real IP from Cloudflare headers
      const realIP = req.headers['cf-connecting-ip'] || 
                     req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     req.ip;
      
      // Set the real IP for rate limiting
      req.clientIP = realIP;
      next();
    });

    // Rate limiting with proper IP detection
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      keyGenerator: (req) => req.clientIP, // Use our custom IP extraction
      message: {
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    // Apply rate limiting to all routes
    this.app.use(limiter);

    // Stricter rate limiting for redirect endpoints
    const redirectLimiter = rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 20, // limit each IP to 20 redirects per minute
      keyGenerator: (req) => req.clientIP, // Use our custom IP extraction
      message: {
        error: 'Too many redirects',
        message: 'You have exceeded the redirect limit. Please try again later.'
      }
    });

    // Basic middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Security: Disable X-Powered-By header
    this.app.disable('x-powered-by');
    
    // Log requests with real IP (avoid logging sensitive data)
    this.app.use((req, res, next) => {
      const safeUrl = req.url.replace(/[?&]token=[^&]*/g, '?token=***');
      const realIP = req.clientIP;
      const cfCountry = req.headers['cf-ipcountry'] || 'Unknown';
      const cfRay = req.headers['cf-ray'] || 'Unknown';
      
      console.log(`${new Date().toISOString()} - ${req.method} ${safeUrl} - IP: ${realIP} - Country: ${cfCountry} - Ray: ${cfRay}`);
      next();
    });

    // Apply stricter rate limiting to shortCode routes
    this.app.use('/:shortCode', redirectLimiter);
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

    // IP detection test endpoint (useful for debugging Cloudflare)
    this.app.get('/ip', (req, res) => {
      res.json({
        detectedIP: req.clientIP,
        headers: {
          'cf-connecting-ip': req.headers['cf-connecting-ip'],
          'x-forwarded-for': req.headers['x-forwarded-for'],
          'x-real-ip': req.headers['x-real-ip'],
          'cf-ipcountry': req.headers['cf-ipcountry'],
          'cf-ray': req.headers['cf-ray']
        },
        expressIP: req.ip,
        timestamp: new Date().toISOString()
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

    // Input validation and sanitization
    if (!shortCode || typeof shortCode !== 'string') {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Invalid short code format'
      });
    }

    // Validate short code format (security)
    const codePattern = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!codePattern.test(shortCode)) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Invalid short code format'
      });
    }

    try {
      // Find the short link in database
      const shortLink = await this.database.findShortLink(shortCode);

      if (!shortLink) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Short link not found'
        });
      }

      // Security: Validate the stored URL before redirecting
      const UrlValidator = require('../utils/UrlValidator');
      if (!UrlValidator.isValidUrl(shortLink.originalUrl)) {
        console.error(`Security: Invalid URL detected for shortCode ${shortCode}: ${shortLink.originalUrl}`);
        return res.status(404).json({
          error: 'Not Found',
          message: 'Invalid destination URL'
        });
      }

      // Increment click count (non-blocking)
      try {
        await this.database.incrementClickCount(shortCode);
      } catch (error) {
        console.error('Error incrementing click count:', error);
        // Don't fail the redirect if click counting fails
      }

      // Security: Add headers to prevent clickjacking
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
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
