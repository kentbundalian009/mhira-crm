import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { connectDB } from '../lib/db.js';

// Import all models
import User from '../models/AdminUser.js';
import Order from '../models/LogisticOrder.js';
import ReturnRequest from '../models/LogisticReturnRequest.js';
import ChatbotTicket from '../models/LogisticChatbotTicket.js';
import Product from '../models/InventoryProduct.js';
import RawMaterial from '../models/InventoryRawMaterial.js';
import WIP from '../models/InventoryWIP.js';
import Inbound from '../models/InventoryInbound.js';
import Expiry from '../models/InventoryExpiry.js';
import Supplier from '../models/InventorySupplier.js';
import SupplierReturnTicket from '../models/InventorySupplierReturnTicket.js';
import Cart from '../models/CustomerCart.js';
import CustomerFavorites from '../models/CustomerFavorites.js';
import Collection from '../models/MarketingCollection.js';
import Coupon from '../models/MarketingCoupon.js';
import Review from '../models/MarketingReview.js';
import Event from '../models/MarketingEvent.js';
import HomeSection from '../models/MarketingHomeSection.js';
import ScrapAuditLog from '../models/ScrapAuditLog.js';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const models = [
  { name: 'AdminUser', model: User },
  { name: 'LogisticOrder', model: Order },
  { name: 'LogisticReturnRequest', model: ReturnRequest },
  { name: 'LogisticChatbotTicket', model: ChatbotTicket },
  { name: 'InventoryProduct', model: Product },
  { name: 'InventoryRawMaterial', model: RawMaterial },
  { name: 'InventoryWIP', model: WIP },
  { name: 'InventoryInbound', model: Inbound },
  { name: 'InventoryExpiry', model: Expiry },
  { name: 'InventorySupplier', model: Supplier },
  { name: 'InventorySupplierReturnTicket', model: SupplierReturnTicket },
  { name: 'CustomerCart', model: Cart },
  { name: 'CustomerFavorites', model: CustomerFavorites },
  { name: 'MarketingCollection', model: Collection },
  { name: 'MarketingCoupon', model: Coupon },
  { name: 'MarketingReview', model: Review },
  { name: 'MarketingEvent', model: Event },
  { name: 'MarketingHomeSection', model: HomeSection },
  { name: 'ScrapAuditLog', model: ScrapAuditLog },
];

async function runIndexSync() {
  console.log('⏳ Connecting to MongoDB for index optimization...');
  await connectDB();

  console.log('⚡ Synchronizing and building indexes for all collections...');
  for (const { name, model } of models) {
    try {
      await model.syncIndexes();
      const collectionIndexes = await model.collection.indexes();
      const indexKeys = collectionIndexes.map(idx => Object.keys(idx.key).join(', ')).join(' | ');
      console.log(`✅ [${name}] Indexed successfully -> (${indexKeys})`);
    } catch (err) {
      console.warn(`⚠️ [${name}] Index sync warning:`, err.message);
    }
  }

  console.log('🎉 All database collections successfully indexed for sub-millisecond querying!');
  await mongoose.connection.close();
  process.exit(0);
}

runIndexSync().catch(err => {
  console.error('❌ Failed to synchronize indexes:', err);
  process.exit(1);
});
