require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./db");
const redis = require("./redis");
const { Url } = require("./models");
const { startClickFlusher, flushClicks } = require("./clicks");

const app = express();
const PORT = process.env.PORT || 3002;

const CACHE_TTL = 60 * 60 * 24; // 24h
const NOT_FOUND_TTL = 60; // remember misses briefly so bad codes don't hit Mongo
const NOT_FOUND = "__none__";

app.get("/health", (req, res) => {
  res.json({
    service: "read-service",
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    redis: redis.status === "ready" ? "connected" : redis.status,
  });
});

app.get("/:code", async (req, res) => {
  const { code } = req.params;
  if (!/^[A-Za-z0-9]{1,10}$/.test(code)) {
    return res.status(404).json({ message: "Short URL not found" });
  }

  try {
    const key = `cache:url:${code}`;
    let longUrl = await redis.get(key);

    if (longUrl === NOT_FOUND) {
      return res.status(404).json({ message: "Short URL not found" });
    }

    if (!longUrl) {
      const doc = await Url.findOne({ shortCode: code }, "longUrl").lean();
      if (!doc) {
        await redis.set(key, NOT_FOUND, "EX", NOT_FOUND_TTL);
        return res.status(404).json({ message: "Short URL not found" });
      }
      longUrl = doc.longUrl;
      await redis.set(key, longUrl, "EX", CACHE_TTL);
    }

    redis.hincrby("clicks:pending", code, 1).catch(() => {}); // don't block the redirect
    res.redirect(302, longUrl);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

connectDB()
  .then(() => {
    startClickFlusher();
    app.listen(PORT, () => console.log(`Read-service running on :${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });

process.on("SIGINT", async () => {
  await flushClicks().catch(() => {});
  process.exit(0);
});
