import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Siguraduhing mabasa ang .env kahit saan i-run ang command
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

mongoose.set('bufferTimeoutMS', 5000);

let isConnecting = false;

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (isConnecting) {
    return;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ MONGO_URI is missing in .env");
    return;
  }

  isConnecting = true;

  const connectWithRetry = async (retryCount = 1) => {
    try {
      const conn = await mongoose.connect(uri, {
        dbName: "test",
        autoIndex: false,
        maxPoolSize: 25,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 20000, // 20s para sa cloud Atlas connection handshake
        connectTimeoutMS: 20000,
        socketTimeoutMS: 45000,
        heartbeatFrequencyMS: 10000,
      });

      isConnecting = false;
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      isConnecting = false;
      console.error(`⚠️ MongoDB Connection Attempt ${retryCount} Failed (${error.message}). Retrying in 2 seconds...`);
      setTimeout(() => connectWithRetry(retryCount + 1), 2000);
    }
  };

  return await connectWithRetry();
};