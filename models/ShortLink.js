const mongoose = require('mongoose');

const shortLinkSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: true,
    trim: true
  },
  shortCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  clickCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: String, // Telegram user ID
    required: true
  }
});

// Index for faster queries (shortCode index is automatically created by unique: true)
shortLinkSchema.index({ createdBy: 1 });

const ShortLink = mongoose.model('ShortLink', shortLinkSchema);

module.exports = ShortLink;
