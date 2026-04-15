require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'auto-accountant-secret-key-2026',
  jwtExpiresIn: '7d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  // MySQL Database Configuration
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3309'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'han131420',
    database: process.env.DB_NAME || 'auto_accountant',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  }
};

module.exports = { config };