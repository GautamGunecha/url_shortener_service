const Redis = require('ioredis');
module.exports = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
