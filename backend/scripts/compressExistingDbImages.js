import { connectDB } from "../lib/db.js";
import mongoose from "mongoose";
import sharp from "sharp";
import dotenv from "dotenv";

dotenv.config();

/**
 * Compresses a Base64 data URL into an ultra-compact WebP Base64 string.
 * Keeps everything in-memory and writes DIRECTLY back to MongoDB.
 * ZERO hard drive files written.
 */
async function compressBase64(base64Str, label = "") {
  if (!base64Str || typeof base64Str !== "string") return base64Str;
  if (!base64Str.startsWith("data:image")) return base64Str;

  // If already under 35 KB, skip
  if (base64Str.length < 35 * 1024) return base64Str;

  try {
    const commaIndex = base64Str.indexOf(",");
    if (commaIndex === -1) return base64Str;

    const rawData = base64Str.slice(commaIndex + 1);
    const inputBuffer = Buffer.from(rawData, "base64");
    const originalKB = (inputBuffer.length / 1024).toFixed(1);

    const compressedBuffer = await sharp(inputBuffer)
      .resize(600, 600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();

    const compressedKB = (compressedBuffer.length / 1024).toFixed(1);
    const newBase64 = `data:image/webp;base64,${compressedBuffer.toString("base64")}`;

    const savings = (((inputBuffer.length - compressedBuffer.length) / inputBuffer.length) * 100).toFixed(1);
    console.log(`  ✨ [${label}] Compressed from ${originalKB} KB -> ${compressedKB} KB (-${savings}%)`);

    return newBase64;
  } catch (err) {
    console.warn(`  ⚠️ Could not compress [${label}]:`, err.message);
    return base64Str;
  }
}

async function runOptimization() {
  console.log("⏳ Connecting to MongoDB Atlas...");
  await connectDB();
  const db = mongoose.connection.db;

  console.log("\n🚀 Starting MongoDB Base64 Image Compression (Doc by Doc)...\n");

  // Helper to process collection safely by IDs
  const processCollection = async (colName, handler) => {
    console.log(`\n--- Optimizing ${colName} ---`);
    const idList = await db.collection(colName).find({}, { projection: { _id: 1 } }).toArray();
    console.log(`Found ${idList.length} documents in ${colName}.`);
    for (let i = 0; i < idList.length; i++) {
      const { _id } = idList[i];
      try {
        const doc = await db.collection(colName).findOne({ _id });
        if (doc) {
          await handler(doc, i + 1, idList.length);
        }
      } catch (e) {
        console.warn(`  ⚠️ Error on ${colName} doc ${_id}:`, e.message);
      }
    }
  };

  // 1. PRODUCTS
  await processCollection("products", async (p, idx, total) => {
    if (p.image && p.image.startsWith("data:image") && p.image.length > 35000) {
      const optimized = await compressBase64(p.image, `Product ${idx}/${total} (${p.code || p.itemName || p._id})`);
      if (optimized !== p.image) {
        await db.collection("products").updateOne({ _id: p._id }, { $set: { image: optimized } });
      }
    }
  });

  // 2. COLLECTIONS
  await processCollection("collections", async (c, idx, total) => {
    let updateFields = {};
    if (c.image && c.image.startsWith("data:image") && c.image.length > 35000) {
      updateFields.image = await compressBase64(c.image, `Collection ${idx}/${total} main (${c.code || c._id})`);
    }
    if (Array.isArray(c.images)) {
      let changedImages = false;
      const optimizedList = [];
      for (let i = 0; i < c.images.length; i++) {
        const img = c.images[i];
        if (img && img.startsWith("data:image") && img.length > 35000) {
          const opt = await compressBase64(img, `Collection ${idx}/${total} img[${i}]`);
          optimizedList.push(opt);
          changedImages = true;
        } else {
          optimizedList.push(img);
        }
      }
      if (changedImages) {
        updateFields.images = optimizedList;
      }
    }
    if (Object.keys(updateFields).length > 0) {
      await db.collection("collections").updateOne({ _id: c._id }, { $set: updateFields });
    }
  });



  // 4. USERS
  await processCollection("users", async (u, idx, total) => {
    if (u.profileImage && u.profileImage.startsWith("data:image") && u.profileImage.length > 25000) {
      const opt = await compressBase64(u.profileImage, `User ${idx}/${total} (${u.email || u._id})`);
      if (opt !== u.profileImage) {
        await db.collection("users").updateOne({ _id: u._id }, { $set: { profileImage: opt } });
      }
    }
  });

  // 5. CARTS
  await processCollection("carts", async (cart, idx, total) => {
    if (Array.isArray(cart.items) && cart.items.length > 0) {
      let cartChanged = false;
      const updatedItems = [];
      for (const item of cart.items) {
        let itemChanged = false;
        let newItem = { ...item };
        if (newItem.image && newItem.image.startsWith("data:image") && newItem.image.length > 35000) {
          newItem.image = await compressBase64(newItem.image, `Cart ${idx}/${total} item image`);
          itemChanged = true;
        }
        if (newItem.product && newItem.product.image && newItem.product.image.startsWith("data:image") && newItem.product.image.length > 35000) {
          newItem.product = { ...newItem.product };
          newItem.product.image = await compressBase64(newItem.product.image, `Cart ${idx}/${total} product.image`);
          itemChanged = true;
        }
        if (newItem.product && Array.isArray(newItem.product.images)) {
          let imgsChanged = false;
          const newImgs = [];
          for (const img of newItem.product.images) {
            if (img && img.startsWith("data:image") && img.length > 35000) {
              newImgs.push(await compressBase64(img, `Cart ${idx}/${total} product.images[]`));
              imgsChanged = true;
            } else {
              newImgs.push(img);
            }
          }
          if (imgsChanged) {
            newItem.product.images = newImgs;
            itemChanged = true;
          }
        }
        if (itemChanged) cartChanged = true;
        updatedItems.push(newItem);
      }
      if (cartChanged) {
        await db.collection("carts").updateOne({ _id: cart._id }, { $set: { items: updatedItems } });
      }
    }
  });

  // 6. ORDERS
  await processCollection("orders", async (order, idx, total) => {
    if (Array.isArray(order.items) && order.items.length > 0) {
      let orderChanged = false;
      const updatedItems = [];
      for (const item of order.items) {
        let itemChanged = false;
        let newItem = { ...item };
        if (newItem.image && newItem.image.startsWith("data:image") && newItem.image.length > 35000) {
          newItem.image = await compressBase64(newItem.image, `Order ${idx}/${total} (#${order.orderNumber || order._id})`);
          itemChanged = true;
        }
        if (newItem.product && newItem.product.image && newItem.product.image.startsWith("data:image") && newItem.product.image.length > 35000) {
          newItem.product = { ...newItem.product };
          newItem.product.image = await compressBase64(newItem.product.image, `Order ${idx}/${total} product.image`);
          itemChanged = true;
        }
        if (newItem.product && Array.isArray(newItem.product.images)) {
          let imgsChanged = false;
          const newImgs = [];
          for (const img of newItem.product.images) {
            if (img && img.startsWith("data:image") && img.length > 35000) {
              newImgs.push(await compressBase64(img, `Order ${idx}/${total} product.images[]`));
              imgsChanged = true;
            } else {
              newImgs.push(img);
            }
          }
          if (imgsChanged) {
            newItem.product.images = newImgs;
            itemChanged = true;
          }
        }
        if (itemChanged) orderChanged = true;
        updatedItems.push(newItem);
      }
      if (orderChanged) {
        await db.collection("orders").updateOne({ _id: order._id }, { $set: { items: updatedItems } });
      }
    }
  });

  // 7. CHATBOT TICKETS
  await processCollection("chatbottickets", async (ticket, idx, total) => {
    if (Array.isArray(ticket.messages)) {
      let ticketChanged = false;
      const updatedMessages = [];
      for (const msg of ticket.messages) {
        let newMsg = { ...msg };
        if (newMsg.attachment && newMsg.attachment.startsWith("data:image") && newMsg.attachment.length > 35000) {
          newMsg.attachment = await compressBase64(newMsg.attachment, `Ticket ${idx}/${total} attachment`);
          ticketChanged = true;
        }
        updatedMessages.push(newMsg);
      }
      if (ticketChanged) {
        await db.collection("chatbottickets").updateOne({ _id: ticket._id }, { $set: { messages: updatedMessages } });
      }
    }
  });

  console.log("\n🎉 ALL COLLECTIONS SUCCESSFULLY OPTIMIZED!");
  console.log("Checking final database sizes...\n");

  const finalCols = ["products", "collections", "orders", "carts", "users", "chatbottickets", "rawmaterials"];
  for (const colName of finalCols) {
    const stats = await db.command({ collStats: colName }).catch(() => null);
    if (stats) {
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      const avgObjSizeKB = (stats.avgObjSize / 1024).toFixed(2);
      console.log(`  ${colName.padEnd(16)}: ${stats.count} docs, total size: ${sizeMB} MB, avg doc: ${avgObjSizeKB} KB`);
    }
  }

  console.log("\n✅ Done! Everything is direct Base64 in MongoDB, compact, and fast.");
  process.exit(0);
}

runOptimization().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
