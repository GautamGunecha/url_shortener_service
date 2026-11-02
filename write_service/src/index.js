require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./db");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    service: "write-service",
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.post("/api/urls", (req, res) => {
  res.status(501).json({ message: "Not implemented yet" });
});

connectDB()
  .then(() =>
    app.listen(PORT, () => console.log(`Write-service running on :${PORT}`)),
  )
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });

