require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./db");
const redis = require("./redis");
const { Url } = require("./models");
const { startClickFlusher, flushClicks } = require("./clicks");
const { isValidShortCode } = require("./shortCode");

const app = express();
const PORT = Number(process.env.PORT || 3002);
const PUBLIC_BASE_URL = (
  process.env.PUBLIC_BASE_URL || "http://localhost:3000"
).replace(/\/+$/, "");
const CACHE_TTL = 60 * 60 * 24;
const NOT_FOUND_TTL = 60;
const NOT_FOUND = "__none__";

app.get("/health", (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  const redisConnected = redis.status === "ready";
  res.status(dbConnected && redisConnected ? 200 : 503).json({
    service: "read-service",
    status: dbConnected && redisConnected ? "ok" : "unavailable",
    db: dbConnected ? "connected" : "disconnected",
    redis: redis.status,
  });
});

app.get("/api/urls/:code", async (req, res, next) => {
  const { code } = req.params;
  if (!isValidShortCode(code)) {
    return res.status(404).json({ message: "Short URL not found" });
  }

  try {
    const url = await Url.findOne({ shortCode: code })
      .select("shortCode longUrl clicks createdAt")
      .lean();
    if (!url) {
      return res.status(404).json({ message: "Short URL not found" });
    }

    return res.json({
      shortCode: url.shortCode,
      shortUrl: `${PUBLIC_BASE_URL}/${url.shortCode}`,
      longUrl: url.longUrl,
      clicks: url.clicks,
      createdAt: url.createdAt,
    });
  } catch (err) {
    return next(err);
  }
});

app.get("/:code", async (req, res, next) => {
  const { code } = req.params;
  if (!isValidShortCode(code)) {
    return res.status(404).json({ message: "Short URL not found" });
  }

  const cacheKey = `cache:url:${code}`;
  let longUrl;
  try {
    longUrl = await redis.get(cacheKey);
  } catch (err) {
    console.error("URL cache lookup failed:", err.message);
  }

  if (longUrl === NOT_FOUND) {
    return res.status(404).json({ message: "Short URL not found" });
  }

  if (!longUrl) {
    try {
      const url = await Url.findOne({ shortCode: code }, "longUrl").lean();
      if (!url) {
        try {
          await redis.set(cacheKey, NOT_FOUND, "EX", NOT_FOUND_TTL);
        } catch (err) {
          console.error("URL miss cache write failed:", err.message);
        }
        return res.status(404).json({ message: "Short URL not found" });
      }

      longUrl = url.longUrl;
      try {
        await redis.set(cacheKey, longUrl, "EX", CACHE_TTL);
      } catch (err) {
        console.error("URL cache write failed:", err.message);
      }
    } catch (err) {
      return next(err);
    }
  }

  try {
    await redis.hincrby("clicks:pending", code, 1);
  } catch (err) {
    console.error("Click counter update failed:", err.message);
  }

  return res.redirect(302, longUrl);
});

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, _req, res, _next) => {
  console.error("Read-service request failed:", err.message);
  res.status(500).json({ message: "Internal server error" });
});

let server;
let clickFlusher;
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; shutting down read-service`);

  if (clickFlusher) clearInterval(clickFlusher);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  try {
    await flushClicks();
  } catch (err) {
    console.error("Final click flush failed:", err.message);
    process.exitCode = 1;
  }

  await Promise.allSettled([mongoose.disconnect(), redis.quit()]);
}

connectDB()
  .then(() => {
    clickFlusher = startClickFlusher();
    server = app.listen(PORT, () =>
      console.log(`Read-service running on :${PORT}`),
    );
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exitCode = 1;
    redis.disconnect();
  });

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
