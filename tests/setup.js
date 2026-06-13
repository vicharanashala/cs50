import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

let mongoServer;

export async function startDb() {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}

export async function stopDb() {
  await mongoose.disconnect();
  await mongoServer.stop();
}

export async function clearDb() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "1h";
