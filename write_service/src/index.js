require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./db");
const redis = require("./redis");
const { Url } = require("./models");
const { nextCode } = require("./idGenerator");
const { validateUrlInput } = require("./validateUrl");

const app = express();
const PORT = Number(process.env.PORT || 3001);
const PUBLIC_BASE_URL = (
  process.env.PUBLIC_BASE_URL || "http://localhost:3000"
).replace(/\/+$/, "");
const MAX_CODE_ATTEMPTS = 3;

app.use(express.json({ limit: "16kb" }));

app.get("/health", (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  const redisConnected = redis.status === "ready";
  res.status(dbConnected && redisConnected ? 200 : 503).json({
    service: "write-service",
    status: dbConnected && redisConnected ? "ok" : "unavailable",
    db: dbConnected ? "connected" : "disconnected",
    redis: redis.status,
  });
});

app.post("/api/urls", async (req, res, next) => {
  const validation = validateUrlInput(req.body);
  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }

  try {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      const shortCode = await nextCode();
      try {
        await Url.create({ ...validation.value, shortCode });
        return res.status(201).json({
          shortCode,
          shortUrl: `${PUBLIC_BASE_URL}/${shortCode}`,
        });
      } catch (err) {
        if (err?.code !== 11000 || attempt === MAX_CODE_ATTEMPTS - 1) {
          throw err;
        }
      }
    }
  } catch (err) {
    return next(err);
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ message: "Request body must contain valid JSON" });
  }

  if (err.status === 413) {
    return res.status(413).json({ message: "Request body is too large" });
  }

  console.error("Write-service request failed:", err.message);
  return res.status(500).json({ message: "Internal server error" });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Write-service running on :${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exitCode = 1;
    redis.disconnect();
  });
