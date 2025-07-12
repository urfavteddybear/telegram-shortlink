const validator = require('validator');
const { nanoid } = require('nanoid');

class UrlValidator {
  static isValidUrl(url) {
    // Check if it's a valid URL
    if (!validator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_host: true,
      require_valid_protocol: true
    })) {
      return false;
    }

    // Security: Block dangerous URLs
    const dangerousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /file:/i,
      /ftp:/i,
      /@/,  // Prevent URLs with @ (potential phishing)
      /localhost/i,
      /127\.0\.0\.1/,
      /0\.0\.0\.0/,
      /::1/,  // IPv6 localhost
      /\.local/i,
      /\.internal/i,
      /192\.168\./,  // Private network
      /10\./,        // Private network
      /172\.(1[6-9]|2[0-9]|3[0-1])\./  // Private network
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(url)) {
        return false;
      }
    }

    // Additional checks for common URL patterns
    const urlPattern = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    return urlPattern.test(url);
  }

  static isValidCustomCode(code) {
    if (!code || typeof code !== 'string') {
      return false;
    }
    
    // Allow alphanumeric characters, hyphens, and underscores
    // Length between 3-20 characters
    const codePattern = /^[a-zA-Z0-9_-]{3,20}$/;
    return codePattern.test(code);
  }

  static generateShortCode(length = 6) {
    // Generate a random short code
    return nanoid(length);
  }

  static extractUrlFromMessage(message) {
    // Extract URL from message text
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
    const urls = message.match(urlRegex);
    return urls ? urls[0] : null;
  }

  static parseCustomCode(message) {
    // Look for custom code pattern like "code:mycustomcode"
    const codeMatch = message.match(/code:([a-zA-Z0-9_-]+)/i);
    return codeMatch ? codeMatch[1] : null;
  }
}

module.exports = UrlValidator;
