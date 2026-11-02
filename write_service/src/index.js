require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./db");

const app = express();
const PORT = process.env.PORT || 3001;

const { Url } = require('./models');
const { nextCode } = require('./idGenerator');

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    service: "write-service",
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.post("/api/urls", async (req, res) => {
  const { longUrl, userId } = req.body;
  if (!longUrl) return res.status(400).json({ message: 'longUrl is required' });

  const shortCode = await nextCode();
  await Url.create({ shortCode, longUrl, userId });

  res.status(201).json({ shortCode, shortUrl: `http://localhost:3000/${shortCode}` });
});

connectDB()
  .then(() =>
    app.listen(PORT, () => console.log(`Write-service running on :${PORT}`)),
  )
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
