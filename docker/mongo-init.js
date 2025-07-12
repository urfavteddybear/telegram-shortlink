// MongoDB initialization script for Docker
// This script runs when the MongoDB container starts for the first time

// Switch to the shortlink database
db = db.getSiblingDB('shortlink');

// Create a user for the application
db.createUser({
  user: 'shortlink_user',
  pwd: 'shortlink_password',
  roles: [
    {
      role: 'readWrite',
      db: 'shortlink'
    }
  ]
});

// Create indexes for better performance
db.shortlinks.createIndex({ "shortCode": 1 }, { unique: true });
db.shortlinks.createIndex({ "originalUrl": 1 });
db.shortlinks.createIndex({ "userId": 1 });
db.shortlinks.createIndex({ "createdAt": 1 });

print('MongoDB initialization completed successfully!');
