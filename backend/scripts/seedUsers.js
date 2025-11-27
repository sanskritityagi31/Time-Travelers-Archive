// backend/scripts/seedUsers.js
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { faker } = require("@faker-js/faker");
const User = require("../models/User"); // path depends on your repo

async function main(){
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/timearchive");
  console.log("Connected to MongoDB");
  const users = [];
  for(let i=0;i<500;i++){
    const email = faker.internet.email().toLowerCase();
    const hash = await bcrypt.hash("Password123!", 10);
    users.push({ email, passwordHash: hash, role: i===0?'admin':'editor' });
  }
  await User.insertMany(users);
  console.log("Inserted 500 users");
  process.exit(0);
}

main().catch(err=>{ console.error(err); process.exit(1); });
