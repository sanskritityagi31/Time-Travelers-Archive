// backend/scripts/seed100k.js
// Usage: from backend folder run: node scripts/seed100k.js

const mongoose = require("mongoose");
const path = require("path");

// robust faker import for different versions
const { faker } = require("@faker-js/faker");

// helper to support both old and new faker APIs
function randInt(min, max) {
  if (faker.number && typeof faker.number.int === "function") {
    return faker.number.int({ min, max });
  }
  if (faker.datatype && typeof faker.datatype.number === "function") {
    return faker.datatype.number({ min, max });
  }
  // fallback
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// === Adjust require to match your models filename ===
// You have backend/models/Events.js so require ../models/Events
const Event = require(path.join(__dirname, "..", "models", "Events"));

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/timearchive";

(async function main() {
  try {
    console.log("Connecting to MongoDB:", MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected");

    const TOTAL = 100000;          // total docs to create
    const BATCH = 2000;            // insertMany size
    console.log(`Seeding ${TOTAL} documents in batches of ${BATCH}...`);

    for (let start = 0; start < TOTAL; start += BATCH) {
      const batch = [];
      const end = Math.min(start + BATCH, TOTAL);
      for (let i = start; i < end; i++) {
        const title = faker.lorem.words(randInt(3, 7));
        const text = faker.lorem.paragraphs(randInt(1, 4), "\n\n");
        const date = faker.date.past(10).toISOString(); // ISO string for date
        const doc = {
          title,
          date,
          text,
          embedding: [],     // leave empty for now (you can compute real embeddings later)
          sourceFile: "",
          createdBy: null,
          createdAt: new Date()
        };
        batch.push(doc);
      }

      // insert this batch
      await Event.insertMany(batch);
      console.log(`Inserted ${batch.length} documents (so far ${Math.min(end, TOTAL)}/${TOTAL})`);
    }

    console.log("Seeding complete.");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error in seed script:", err);
    await mongoose.disconnect().catch(()=>{});
    process.exit(1);
  }
})();
