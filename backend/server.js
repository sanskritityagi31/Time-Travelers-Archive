// server.js — extended with auth, file upload, pdf parsing, embeddings, search, pagination
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

const app = express();
app.use(cors());
app.use(express.json());

// === Config / env ===
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/timearchive";
const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small";
const S3_BUCKET = process.env.S3_BUCKET || null;

// === openai client ===
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// === AWS (optional) ===
let s3 = null;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  AWS.config.update({ region: process.env.AWS_REGION || "us-east-1" });
  s3 = new AWS.S3();
}

// === MongoDB ===
mongoose.connect(MONGODB_URI).then(() => console.log("MongoDB Connected")).catch(console.error);

// === Schemas ===
const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  passwordHash: String,
  role: { type: String, default: "editor" }
});
const User = mongoose.model("User", UserSchema);

const EventSchema = new mongoose.Schema({
  title: String,
  date: String,
  text: String,
  embedding: [Number],
  sourceFile: String,   // filename or s3 url
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now }
});
EventSchema.index({ embedding: "dense_vector", type: "number" }, { sparse: true }); // note: mongoose doesn't provide vector search natively; we store and compare manually
const Event = mongoose.model("Event", EventSchema);

// === Helpers ===
async function createEmbedding(text) {
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY in .env");
  const r = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: text
  });
  return r.data[0].embedding;
}

function jwtAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: "Missing token" });
  const token = h.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

// === Multer file upload config ===
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });

// === Auth routes ===
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: "Email already used" });
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ email, passwordHash: hash, role: role || "editor" });
    await user.save();
    res.json({ message: "Registered" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// === Add event (text only) ===
app.post("/api/events", jwtAuth, async (req, res) => {
  try {
    const { title, date, text } = req.body;
    const embedding = await createEmbedding(text);
    const ev = new Event({ title, date, text, embedding, createdBy: req.user.id });
    await ev.save();
    res.json({ message: "Event saved", id: ev._id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// === Upload file (image or PDF) and auto-extract text for PDF ===
app.post("/api/upload", jwtAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const filepath = req.file.path;
    let text = "";

    // if pdf -> extract text using pdf-parse
    if (req.file.mimetype === "application/pdf" || req.file.originalname.endsWith(".pdf")) {
      const data = fs.readFileSync(filepath);
      const parsed = await pdf(data);
      text = parsed.text || "";
    } else {
      // for images, you may want OCR (not included). For now we just store path.
      text = req.body.text || ""; // optional caption text
    }

    // if text exists -> create embedding and save event
    let s3url = null;
    if (s3) {
      // upload to s3
      const fileStream = fs.createReadStream(filepath);
      const key = `uploads/${path.basename(filepath)}`;
      const params = { Bucket: S3_BUCKET, Key: key, Body: fileStream, ACL: "private" };
      await s3.upload(params).promise();
      s3url = `s3://${S3_BUCKET}/${key}`;
    }

    let embedding = [];
    if (text && text.trim().length > 0) {
      // chunk large text to avoid token limits
      const CHUNK_SIZE = 1000;
      const chunks = [];
      for (let i = 0; i < text.length; i += CHUNK_SIZE) {
        chunks.push(text.slice(i, i + CHUNK_SIZE));
      }

      // create embedding for combined or first chunk (simple)
      // you can store per-chunk embeddings; here we store embedding of the whole text concatenated
      const combined = chunks.join(" ");
      embedding = await createEmbedding(combined);
    }

    const ev = new Event({
      title: req.body.title || req.file.originalname,
      date: req.body.date || "",
      text,
      embedding,
      sourceFile: s3 ? s3url : filepath,
      createdBy: req.user.id
    });
    await ev.save();

    res.json({ message: "Uploaded and indexed", id: ev._id });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// === Get events with pagination ===
app.get("/api/events", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || "1"));
  const limit = Math.min(100, parseInt(req.query.limit || "10"));
  const skip = (page - 1) * limit;
  const total = await Event.countDocuments();
  const items = await Event.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  res.json({ page, limit, total, items });
});

// === Semantic search with pagination & score ===
app.post("/api/search", async (req, res) => {
  try {
    const { query, page = 1, limit = 10 } = req.body;
    if (!query) return res.status(400).json({ error: "Missing query" });

    const qEmbed = await createEmbedding(query);

    // load all events that have embeddings (small dataset). For bigger dataset use vector DB.
    const events = await Event.find({ embedding: { $exists: true, $ne: [] } }).lean();

    const scored = events.map(ev => {
      let score = 0;
      if (ev.embedding && ev.embedding.length === qEmbed.length) {
        score = cosine(ev.embedding, qEmbed);
      }
      return { ...ev, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // paginate results
    const start = (page - 1) * limit;
    const pageItems = scored.slice(start, start + limit);

    res.json({ total: scored.length, page, limit, results: pageItems });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// === Serve uploaded files locally (only for dev) ===
app.use("/uploads", express.static(uploadDir));

// === Start server ===
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
