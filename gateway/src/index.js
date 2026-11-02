require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware')

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.json({ service: 'gateway', status: 'ok' });
});

app.use(
  createProxyMiddleware({
    target: process.env.WRITE_SERVICE_URL,
    changeOrigin: true,
    pathFilter: '/api/urls',
  })
);

app.use(
  createProxyMiddleware({
    target: process.env.READ_SERVICE_URL,
    changeOrigin: true,
    pathFilter: (pathname) => /^\/[A-Za-z0-9]{6,7}$/.test(pathname),
  })
);

app.listen(PORT, () => console.log(`Gateway running on :${PORT}`));
