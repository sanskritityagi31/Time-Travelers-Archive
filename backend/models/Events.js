// backend/models/Event.js
const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  date: { type: String, default: "" },
  text: { type: String, default: "" },
  embedding: { type: [Number], default: [] }, // optional
  sourceFile: { type: String, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  createdAt: { type: Date, default: Date.now },
});

// text index for quick text search
EventSchema.index({ text: "text", title: "text" });
// createdAt index for sorting
EventSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Event", EventSchema);
