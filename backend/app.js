const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// ===== HEALTH CHECK (USED BY TESTS & CI) =====
app.get("/", (req, res) => {
  res.status(200).json({ status: "ok" });
});

module.exports = app;
