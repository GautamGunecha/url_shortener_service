require("dotenv").config();
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { isCreateRequest, isReadRequest } = require("./routes");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const WRITE_SERVICE_URL =
  process.env.WRITE_SERVICE_URL || "http://localhost:3001";
const READ_SERVICE_URL = process.env.READ_SERVICE_URL || "http://localhost:3002";

app.get("/health", (_req, res) => {
  res.json({ service: "gateway", status: "ok" });
});

function handleProxyError(err, _req, res) {
  console.error("Gateway proxy failed:", err.message);
  if (!res.headersSent) {
    res.status(502).json({ message: "Upstream service unavailable" });
  }
}

app.use(
  createProxyMiddleware({
    target: WRITE_SERVICE_URL,
    changeOrigin: true,
    pathFilter: isCreateRequest,
    on: { error: handleProxyError },
  }),
);

app.use(
  createProxyMiddleware({
    target: READ_SERVICE_URL,
    changeOrigin: true,
    pathFilter: isReadRequest,
    on: { error: handleProxyError },
  }),
);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(PORT, () => console.log(`Gateway running on :${PORT}`));
