import dotenv from "dotenv";
dotenv.config({ path: "./backend/.env" });
import mongoose from "mongoose";

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: "test" });
  const carts = await mongoose.connection.db.collection("carts").find({}).toArray();
  console.log("Total carts found:", carts.length);

  for (const c of carts) {
    let changed = false;
    if (c.items && c.items.length > 0) {
      for (const item of c.items) {
        if (item.product) {
          const prod = await mongoose.connection.db.collection("products").findOne({ _id: item.product });
          if (prod && prod.image && prod.image.startsWith("http")) {
            if (item.image !== prod.image) {
              item.image = prod.image;
              changed = true;
            }
          }
        }
      }
    }
    if (changed) {
      await mongoose.connection.db.collection("carts").updateOne(
        { _id: c._id },
        { $set: { items: c.items } }
      );
      console.log("Updated cart:", c._id);
    }
  }

  console.log("All carts synced successfully!");
  process.exit(0);
}

run().catch(console.error);
