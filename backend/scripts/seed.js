// backend/scripts/seed.js
const mongoose = require('mongoose');
const faker = require('faker'); // npm i faker
const Event = require('../models/Event'); // adjust if model path differs

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/timearchive');
  console.log('Connected to Mongo');

  const BATCH = 1000;
  const TOTAL = 50000; // set 100k if you want
  for (let i = 0; i < TOTAL; i += BATCH) {
    const batch = [];
    for (let j=0;j<BATCH && i+j<TOTAL;j++) {
      const text = faker.lorem.paragraphs(2);
      // fake embedding vector of length 1536 (or smaller) so your vector fields exist:
      const embLen = 1536;
      const embedding = Array.from({length: 128}).map(()=>Math.random()); // smaller length for speed
      batch.push({
        title: faker.lorem.words(3),
        date: faker.date.past().toISOString(),
        text,
        embedding,
        sourceFile: '',
        createdAt: new Date()
      });
    }
    await Event.insertMany(batch);
    console.log('Inserted', Math.min(i+BATCH, TOTAL), 'of', TOTAL);
  }

  console.log('Done');
  await mongoose.disconnect();
}
main().catch(console.error);
