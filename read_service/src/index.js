require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./db');

const app = express();
const PORT = process.env.PORT || 3002;

app.get('/health', (req, res) => {
  res.json({
    service: 'read-service',
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.get('/:code', (req, res) => {
  res.status(501).json({ message: 'Not implemented yet', code: req.params.code });
});

connectDB()
  .then(() => app.listen(PORT, () => console.log(`Read-service running on :${PORT}`)))
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

  