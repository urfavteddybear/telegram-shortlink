const mongoose = require('mongoose');
const ShortLink = require('./ShortLink');

class Database {
  constructor() {
    this.isConnected = false;
  }

  async connect(uri) {
    try {
      // Connection options for better stability
      const options = {
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      };

      await mongoose.connect(uri, options);
      this.isConnected = true;
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error.message);
      if (error.message.includes('authentication')) {
        console.error('💡 Authentication issue detected. Please check:');
        console.error('   - MongoDB connection string includes correct username/password');
        console.error('   - Database user has proper permissions');
        console.error('   - authSource is correctly specified');
      }
      throw error;
    }
  }

  async findShortLink(shortCode) {
    try {
      return await ShortLink.findOne({ shortCode });
    } catch (error) {
      console.error('Error finding short link:', error);
      throw error;
    }
  }

  async createShortLink(originalUrl, shortCode, createdBy) {
    try {
      const shortLink = new ShortLink({
        originalUrl,
        shortCode,
        createdBy
      });
      return await shortLink.save();
    } catch (error) {
      console.error('Error creating short link:', error);
      throw error;
    }
  }

  async incrementClickCount(shortCode) {
    try {
      return await ShortLink.findOneAndUpdate(
        { shortCode },
        { $inc: { clickCount: 1 } },
        { new: true }
      );
    } catch (error) {
      console.error('Error incrementing click count:', error);
      throw error;
    }
  }

  async getUserLinks(userId) {
    try {
      return await ShortLink.find({ createdBy: userId })
        .sort({ createdAt: -1 })
        .limit(10);
    } catch (error) {
      console.error('Error getting user links:', error);
      throw error;
    }
  }
}

module.exports = Database;
