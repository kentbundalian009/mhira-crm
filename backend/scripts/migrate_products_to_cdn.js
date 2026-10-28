import dotenv from "dotenv";
dotenv.config({ path: "./backend/.env" });
import mongoose from "mongoose";

async function uploadBase64ToCatbox(base64Str, filename = "product.png") {
  if (!base64Str || typeof base64Str !== "string") return null;
  const match = base64Str.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  const base64Data = match ? match[2] : base64Str;
  const ext = match ? (match[1] === "jpeg" ? "jpg" : match[1]) : "png";
  
  try {
    const buffer = Buffer.from(base64Data, "base64");
    const blob = new Blob([buffer], { type: `image/${ext}` });
    const formData = new FormData();
    formData.append("reqtype", "fileupload");
    formData.append("fileToUpload", blob, `${filename}.${ext}`);

    const res = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: formData,
    });
    const url = await res.text();
    if (url && url.startsWith("https://files.catbox.moe/")) {
      return url.trim();
    }
  } catch (err) {
    console.error("Failed to upload to catbox:", err.message);
  }
  return null;
}

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: "test" });
  const db = mongoose.connection.db;

  const products = await db.collection("products").find({}).toArray();
  console.log(`Checking ${products.length} products...`);

  for (const p of products) {
    const title = p.itemName || p.itemDescription || "Product";
    const rawImg = p.image || (p.images && p.images[0]) || "";
    
    if (rawImg && rawImg.startsWith("data:image")) {
      console.log(`Uploading image for: ${title}...`);
      const cdnUrl = await uploadBase64ToCatbox(rawImg, `mhira_${p._id}`);
      if (cdnUrl) {
        console.log(`✅ ${title} -> ${cdnUrl}`);
        await db.collection("products").updateOne(
          { _id: p._id },
          { $set: { image: cdnUrl, images: [cdnUrl] } }
        );
      }
    } else if (rawImg && rawImg.startsWith("http")) {
      console.log(`Already HTTP: ${title} -> ${rawImg}`);
    } else {
      console.log(`No base64 image for: ${title}`);
    }
  }

  console.log("Migration finished!");
  process.exit(0);
}

migrate().catch(console.error);
