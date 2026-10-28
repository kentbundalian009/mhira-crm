import { connectDB } from "../lib/db.js";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function optimize() {
  await connectDB();
  const db = mongoose.connection.db;

  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const saveBase64ToFile = (base64Str, prefix) => {
    if (!base64Str || typeof base64Str !== "string" || !base64Str.startsWith("data:image")) return base64Str;
    try {
      const match = base64Str.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (!match) return base64Str;
      let ext = match[1].toLowerCase();
      if (ext === "jpeg") ext = "jpg";
      if (ext === "svg+xml") ext = "svg";
      const buffer = Buffer.from(match[2], "base64");
      const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const filepath = path.join(uploadDir, filename);
      fs.writeFileSync(filepath, buffer);
      console.log(`Migrated base64 (${base64Str.length} bytes) -> /uploads/${filename}`);
      return `/uploads/${filename}`;
    } catch (e) {
      console.error("Error saving base64 to file:", e);
      return base64Str;
    }
  };

  // 1. Collections
  const colls = await db.collection("collections").find({}).toArray();
  for (const c of colls) {
    let changed = false;
    let newImg = c.image;
    let newImages = c.images;
    if (c.image && c.image.startsWith("data:image")) {
      newImg = saveBase64ToFile(c.image, `col_${c.code || c._id}`);
      changed = true;
    }
    if (Array.isArray(c.images)) {
      newImages = c.images.map((img, i) => {
        if (img && img.startsWith("data:image")) {
          changed = true;
          return saveBase64ToFile(img, `col_${c.code || c._id}_${i}`);
        }
        return img;
      });
    }
    if (changed) {
      await db.collection("collections").updateOne({ _id: c._id }, { $set: { image: newImg, images: newImages } });
      console.log("Updated collection:", c.code || c._id);
    }
  }

  // 2. Products
  const prods = await db.collection("products").find({}).toArray();
  for (const p of prods) {
    let changed = false;
    let newImg = p.image;
    if (p.image && p.image.startsWith("data:image")) {
      newImg = saveBase64ToFile(p.image, `prod_${p.code || p._id}`);
      changed = true;
    }
    if (changed) {
      await db.collection("products").updateOne({ _id: p._id }, { $set: { image: newImg } });
      console.log("Updated product:", p.code || p._id);
    }
  }



  console.log("All image migrations completed successfully!");
  process.exit(0);
}

optimize();
