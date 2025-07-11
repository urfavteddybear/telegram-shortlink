const TelegramBot = require('node-telegram-bot-api');
const UrlValidator = require('../utils/UrlValidator');

class TelegramBotHandler {
  constructor(token, database, baseUrl) {
    this.bot = new TelegramBot(token, { polling: true });
    this.database = database;
    this.baseUrl = baseUrl;
    this.userStates = new Map(); // Store user interaction states
    this.setupHandlers();
    this.startCleanupInterval(); // Start the cleanup interval
  }

  setupHandlers() {
    // Start command
    this.bot.onText(/\/start/, (msg) => {
      this.handleStart(msg);
    });

    // Help command
    this.bot.onText(/\/help/, (msg) => {
      this.handleHelp(msg);
    });

    // List user's links
    this.bot.onText(/\/mylinks/, (msg) => {
      this.handleMyLinks(msg);
    });

    // Handle all other messages
    this.bot.on('message', (msg) => {
      // Skip if it's a command
      if (msg.text && msg.text.startsWith('/')) {
        return;
      }
      this.handleMessage(msg);
    });

    // Handle callback queries (inline keyboard responses)
    this.bot.on('callback_query', (callbackQuery) => {
      this.handleCallbackQuery(callbackQuery);
    });

    // Start cleanup interval
    this.startCleanupInterval();

    console.log('🤖 Telegram bot handlers set up');
  }

  async handleStart(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const firstName = msg.from.first_name || 'there';
    
    // Clear any existing state
    this.userStates.delete(userId);
    
    const welcomeMessage = `
� **Hello ${firstName}! Welcome to ShortLink Bot!**

I'm here to help you create short, shareable links from your long URLs.

🔗 **What I can do:**
• Transform long URLs into short links
• Let you choose custom short codes
• Track click statistics
• Manage all your links

Ready to create your first short link? 

📎 **Please send me the URL you want to shorten.**

💡 *Type "cancel" anytime to stop the current process.*`;

    await this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    
    // Set state to waiting for URL
    this.userStates.set(userId, {
      step: 'waiting_for_url',
      timestamp: Date.now()
    });
  }

  async handleHelp(msg) {
    const chatId = msg.chat.id;
    const helpMessage = `
🆘 **Help - ShortLink Bot**

**Commands:**
• /start - Start creating a new short link
• /help - Show this help message
• /mylinks - Show your recent links

**How it works:**
1️⃣ Use /start to begin
2️⃣ Send me your long URL
3️⃣ Choose a custom code (optional)
4️⃣ Get your short link!

**Valid URLs:**
✅ https://example.com/long-url
✅ http://website.com/page
❌ just-text-without-protocol

**Custom codes:**
✅ 3-20 characters
✅ Letters, numbers, hyphens, underscores
✅ Must be unique

**Tips:**
• Type "cancel" to stop current process
• Type "random" for auto-generated codes
• All your links are saved and tracked

Need help? Just use /start to begin! 🚀`;

    await this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  }

  async handleMyLinks(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    try {
      const userLinks = await this.database.getUserLinks(userId);
      
      if (userLinks.length === 0) {
        await this.bot.sendMessage(chatId, "📭 **No links found**\n\nYou haven't created any short links yet.\n\n🚀 Use /start to create your first short link!");
        return;
      }

      let message = "🔗 **Your Recent Links:**\n\n";
      userLinks.forEach((link, index) => {
        const shortUrl = `${this.baseUrl}/${link.shortCode}`;
        const createdDate = link.createdAt.toLocaleDateString();
        const clickText = link.clickCount === 1 ? 'click' : 'clicks';
        
        message += `**${index + 1}. ${link.shortCode}**\n`;
        message += `🔗 ${shortUrl}\n`;
        message += `📊 ${link.clickCount} ${clickText}\n`;
        message += `📅 ${createdDate}\n`;
        message += `🎯 ${link.originalUrl.substring(0, 60)}${link.originalUrl.length > 60 ? '...' : ''}\n\n`;
      });

      message += "🚀 Want to create another? Use /start";

      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error fetching user links:', error);
      await this.bot.sendMessage(chatId, "❌ **Error loading links**\n\nSomething went wrong while fetching your links. Please try again later.");
    }
  }

  async handleMessage(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const messageText = msg.text;

    if (!messageText) {
      await this.bot.sendMessage(chatId, "❌ Please send me a text message.");
      return;
    }

    // Handle cancel command
    if (messageText.toLowerCase() === 'cancel') {
      this.userStates.delete(userId);
      await this.bot.sendMessage(chatId, "❌ **Process cancelled.**\n\nUse /start to create a new short link.");
      return;
    }

    // Get user state
    const userState = this.userStates.get(userId);
    
    if (!userState) {
      // User hasn't started the process, guide them
      await this.bot.sendMessage(chatId, "👋 Hi! Use /start to begin creating a short link, or /help for more information.");
      return;
    }

    // Handle different conversation steps
    switch (userState.step) {
      case 'waiting_for_url':
        await this.handleUrlInput(msg, userState);
        break;
      case 'waiting_for_code':
        await this.handleCodeInput(msg, userState);
        break;
      case 'waiting_for_new_code':
        await this.handleNewCodeInput(msg, userState);
        break;
      default:
        // Reset state if unknown step
        this.userStates.delete(userId);
        await this.bot.sendMessage(chatId, "🔄 Something went wrong. Please use /start to begin again.");
    }
  }

  async askForAnotherCode(msg, url, existingCode) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    // Store user state
    this.userStates.set(userId, {
      step: 'waiting_for_new_code',
      url: url,
      existingCode: existingCode,
      timestamp: Date.now()
    });

    const message = `❌ **Code already taken!**

The code \`${existingCode}\` is already being used by someone else.

🔄 **Please choose a different code:**
• Try a variation like \`${existingCode}1\` or \`${existingCode}2\`
• Type "random" for auto-generated code

💡 Type "cancel" to stop.`;
    
    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  async handleNewCodeInput(msg, userState) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const messageText = msg.text.trim();

    let newCode;
    
    if (messageText.toLowerCase() === 'random') {
      // Generate random code
      newCode = UrlValidator.generateShortCode();
    } else {
      // Validate new custom code
      if (!UrlValidator.isValidCustomCode(messageText)) {
        await this.bot.sendMessage(chatId, "❌ **Invalid custom code**\n\nCustom codes must be 3-20 characters long and contain only letters, numbers, hyphens, and underscores.\n\nPlease try again or type \"random\" for auto-generated code.\n\n💡 Type \"cancel\" to stop.");
        return;
      }
      newCode = messageText;
    }

    try {
      // Check if new code exists
      const existingLink = await this.database.findShortLink(newCode);
      
      if (existingLink) {
        if (messageText.toLowerCase() === 'random') {
          // If random generation failed, try again
          await this.retryWithNewCode(msg, userState.url, userId);
        } else {
          // Ask for another code
          await this.askForAnotherCode(msg, userState.url, newCode);
        }
        return;
      }

      // Create short link with new code
      await this.createShortLink(msg, userState.url, newCode, userId);
      
      // Clear user state
      this.userStates.delete(userId);
      
    } catch (error) {
      console.error('Error handling new code input:', error);
      await this.bot.sendMessage(chatId, "❌ An error occurred while processing your request. Please try again or type \"cancel\" to stop.");
    }
  }

  async retryWithNewCode(msg, url, userId) {
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const newCode = UrlValidator.generateShortCode();
      
      try {
        const existingLink = await this.database.findShortLink(newCode);
        
        if (!existingLink) {
          await this.createShortLink(msg, url, newCode, userId);
          // Clear user state
          this.userStates.delete(userId);
          return;
        }
        
        attempts++;
      } catch (error) {
        console.error('Error during retry:', error);
        break;
      }
    }

    // If we couldn't generate a unique code after 5 attempts
    await this.bot.sendMessage(msg.chat.id, "❌ **Unable to generate unique code**\n\nPlease try choosing a custom code or try again later.\n\n💡 Type \"cancel\" to stop.");
  }

  async createShortLink(msg, url, shortCode, userId) {
    const chatId = msg.chat.id;

    try {
      // Save to database
      await this.database.createShortLink(url, shortCode, userId);
      
      // Send success message with better formatting
      const shortUrl = `${this.baseUrl}/${shortCode}`;
      const successMessage = `
🎉 **Short link created successfully!**

🔗 **Your short link:**
${shortUrl}

� **Details:**
• **Code:** \`${shortCode}\`
• **Original URL:** ${url}
• **Clicks:** 0 (just created)

✅ **Ready to share!** Copy the short link above and share it anywhere.

🔄 Want to create another? Use /start
📊 View all your links: /mylinks`;
      
      await this.bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
      
      // Clear user state
      this.userStates.delete(userId);
      
    } catch (error) {
      console.error('Error creating short link:', error);
      await this.bot.sendMessage(chatId, "❌ **Error creating short link**\n\nSomething went wrong. Please try again or type \"cancel\" to stop.");
    }
  }

  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    // Acknowledge the callback query
    await this.bot.answerCallbackQuery(callbackQuery.id);

    // Handle different callback actions
    if (data === 'help') {
      await this.handleHelp({ chat: { id: chatId } });
    } else if (data === 'mylinks') {
      await this.handleMyLinks({ chat: { id: chatId }, from: callbackQuery.from });
    }
  }

  async handleUrlInput(msg, userState) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const messageText = msg.text;

    // Extract URL from message
    const url = UrlValidator.extractUrlFromMessage(messageText);
    if (!url) {
      await this.bot.sendMessage(chatId, "❌ **Invalid URL format**\n\nPlease send a valid URL starting with http:// or https://\n\nExample: `https://example.com`\n\n💡 Type \"cancel\" to stop.", { parse_mode: 'Markdown' });
      return;
    }

    // Validate URL
    if (!UrlValidator.isValidUrl(url)) {
      await this.bot.sendMessage(chatId, "❌ **URL not valid**\n\nThe URL format is incorrect. Please check and try again.\n\n💡 Type \"cancel\" to stop.", { parse_mode: 'Markdown' });
      return;
    }

    // URL is valid, now ask for custom code
    const codeMessage = `
✅ **Great! URL received:**
🔗 ${url}

Now, would you like to choose a custom short code?

**Options:**
• Type your custom code (3-20 characters)
• Type "random" for auto-generated code

**Custom code rules:**
• Letters, numbers, hyphens, underscores only
• Must be unique

💡 Type "cancel" to stop.`;

    await this.bot.sendMessage(chatId, codeMessage, { parse_mode: 'Markdown' });
    
    // Update user state
    this.userStates.set(userId, {
      step: 'waiting_for_code',
      url: url,
      timestamp: Date.now()
    });
  }

  async handleCodeInput(msg, userState) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const messageText = msg.text.trim();

    let shortCode;
    
    if (messageText.toLowerCase() === 'random') {
      // Generate random code
      shortCode = UrlValidator.generateShortCode();
    } else {
      // Use custom code
      if (!UrlValidator.isValidCustomCode(messageText)) {
        await this.bot.sendMessage(chatId, "❌ **Invalid custom code**\n\nCustom codes must be 3-20 characters long and contain only letters, numbers, hyphens, and underscores.\n\nPlease try again or type \"random\" for auto-generated code.\n\n💡 Type \"cancel\" to stop.");
        return;
      }
      shortCode = messageText;
    }

    // Check if code already exists
    try {
      const existingLink = await this.database.findShortLink(shortCode);
      
      if (existingLink) {
        if (messageText.toLowerCase() === 'random') {
          // If random generation failed, try again
          await this.retryWithNewCode(msg, userState.url, userId);
        } else {
          // Ask for another custom code
          await this.askForAnotherCode(msg, userState.url, shortCode);
        }
        return;
      }

      // Create the short link
      await this.createShortLink(msg, userState.url, shortCode, userId);
      
      // Clear user state
      this.userStates.delete(userId);
      
    } catch (error) {
      console.error('Error processing code input:', error);
      await this.bot.sendMessage(chatId, "❌ An error occurred while processing your request. Please try again or type \"cancel\" to stop.");
    }
  }

  // Clean up expired user states (older than 10 minutes)
  cleanupExpiredStates() {
    const now = Date.now();
    const expiryTime = 10 * 60 * 1000; // 10 minutes

    for (const [userId, state] of this.userStates.entries()) {
      if (now - state.timestamp > expiryTime) {
        this.userStates.delete(userId);
      }
    }
  }

  // Run cleanup every 5 minutes
  startCleanupInterval() {
    setInterval(() => {
      this.cleanupExpiredStates();
    }, 5 * 60 * 1000); // 5 minutes
  }
}

module.exports = TelegramBotHandler;
