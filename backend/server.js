// ===============================================
// Time Travelers Archive - Backend (Final Version)
// ===============================================

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const AWS = require("aws-sdk");
const { OpenAI } = require("openai");

// Models
const User = require("./models/User");
const Event = require("./models/Event");

// Middlewares
const { requireRole } = require("./middleware/roles");

const app = express();
app.use(cors());
app.use(express.json());

// ===============================================
// CONFIG
// ===============================================
const PORT = process.env.PORT || 4000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/timearchive";
const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBED_MODEL =
  process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small";

const S3_BUCKET = process.env.S3_BUCKET || null;

// ===============================================
// OpenAI Client
// ===============================================
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ===============================================
// AWS S3
// ===============================================
let s3 = null;
if (
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  S3_BUCKET
) {
  AWS.config.update({ region: process.env.AWS_REGION || "us-east-1" });
  s3 = new AWS.S3();
}

// ===============================================
// Mongoose Connection
// ===============================================
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(console.error);

// ===============================================
// MongoDB Indexes (Performance Boost)
// ===============================================
Event.collection.createIndex({ createdAt: -1 });
Event.collection.createIndex({ text: "text" });

// ===============================================
// Helper: Embeddings
// ===============================================
async function createEmbedding(text) {
  if (!OPENAI_API_KEY)
    throw new Error("Missing OPENAI_API_KEY in environment");

  const result = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: text,
  });

  return result.data[0].embedding;
}

function cosineSimilarity(a, b) {
  let dot = 0,
    na = 0,
    nb = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }

  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

// ===============================================
// JWT AUTH MIDDLEWARE
// ===============================================
function jwtAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Missing token" });

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ===============================================
// Multer Upload Config
// ===============================================
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) =>
    cb(null, `${Date.now()}_${file.originalname}`),
});

const upload = multer({ storage });

// ===============================================
// AUTH ROUTES
// ===============================================
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, role = "editor" } = req.body;

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      passwordHash: hash,
      role,
    });

    await user.save();

    res.json({ message: "Registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok)
      return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================================
// EVENTS CRUD
// ===============================================
app.post("/api/events", jwtAuth, requireRole("editor"), async (req, res) => {
  try {
    const { title, date, text } = req.body;

    const embedding = await createEmbedding(text);

    const ev = new Event({
      title,
      date,
      text,
      embedding,
      createdBy: req.user.id,
    });

    await ev.save();

    res.json({ message: "Event saved", id: ev._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/events", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || "1"));
  const limit = Math.min(100, parseInt(req.query.limit || "10"));
  const skip = (page - 1) * limit;

  const total = await Event.countDocuments();
  const items = await Event.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("title date createdAt _id")
    .lean();

  res.json({ page, limit, total, items });
});

// ===============================================
// UPLOAD (PDF + IMAGES)
// ===============================================
app.post(
  "/api/upload",
  jwtAuth,
  requireRole("editor"),
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ error: "No file provided" });

      const filePath = req.file.path;
      let extractedText = "";

      if (
        req.file.mimetype === "application/pdf" ||
        req.file.originalname.endsWith(".pdf")
      ) {
        const data = fs.readFileSync(filePath);
        const parsed = await pdf(data);
        extractedText = parsed.text || "";
      } else {
        extractedText = req.body.text || "";
      }

      // Upload to S3 if available
      let fileURL = null;

      if (s3) {
        const key = `uploads/${path.basename(filePath)}`;

        const fileStream = fs.createReadStream(filePath);

        await s3
          .upload({
            Bucket: S3_BUCKET,
            Key: key,
            Body: fileStream,
            ACL: "private",
          })
          .promise();

        fileURL = `s3://${S3_BUCKET}/${key}`;
      }

      let embedding = [];
      if (extractedText.trim().length > 0) {
        embedding = await createEmbedding(extractedText);
      }

      const ev = new Event({
        title: req.body.title || req.file.originalname,
        date: req.body.date || "",
        text: extractedText,
        embedding,
        sourceFile: fileURL || filePath,
        createdBy: req.user.id,
      });

      await ev.save();

      res.json({ message: "Uploaded and indexed", id: ev._id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ===============================================
// SEMANTIC SEARCH
// ===============================================
app.post("/api/search", async (req, res) => {
  try {
    const { query, page = 1, limit = 10 } = req.body;

    if (!query) return res.status(400).json({ error: "Missing query" });

    const qEmbed = await createEmbedding(query);

    const events = await Event.find({
      embedding: { $exists: true, $ne: [] },
    }).lean();

    const scored = events
      .map((ev) => ({
        ...ev,
        score:
          ev.embedding?.length === qEmbed.length
            ? cosineSimilarity(ev.embedding, qEmbed)
            : 0,
      }))
      .sort((a, b) => b.score - a.score);

    const start = (page - 1) * limit;
    const results = scored.slice(start, start + limit);

    res.json({
      total: scored.length,
      page,
      limit,
      results,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================================
// ADMIN ROUTE (Test RBAC)
// ===============================================
app.get("/api/admin/stats", jwtAuth, requireRole("admin"), async (_, res) => {
  const totalEvents = await Event.countDocuments();
  const totalUsers = await User.countDocuments();

  res.json({
    totalEvents,
    totalUsers,
  });
});

// ===============================================
// Static Files (Dev only)
// ===============================================
app.use("/uploads", express.static(uploadDir));

// ===============================================
// START SERVER
// ===============================================
app.listen(PORT, () =>
  console.log(`Backend running on port ${PORT}`)
);
