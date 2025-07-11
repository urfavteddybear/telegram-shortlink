require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  console.log('🔍 Testing MongoDB connection...');
  console.log('📝 Connection string:', process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
  
  try {
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('✅ MongoDB connection successful!');
    
    // Test a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📊 Available collections:', collections.map(c => c.name));
    
    await mongoose.connection.close();
    console.log('🔌 Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.message.includes('authentication')) {
      console.error('\n💡 Authentication Solutions:');
      console.error('1. Add credentials to MONGODB_URI: mongodb://username:password@host:port/database');
      console.error('2. Use a database that doesn\'t require auth');
      console.error('3. Configure MongoDB to allow connections without auth');
    }
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Connection Solutions:');
      console.error('1. Make sure MongoDB is running on 100.99.1.1:27017');
      console.error('2. Check if the IP address and port are correct');
      console.error('3. Verify firewall settings');
    }
    
    process.exit(1);
  }
}

testConnection();
