import Coupon from '../models/MarketingCoupon.js';

const sampleCoupons = [
  { code: "MHIRA30", discount: "30% OFF", minSpend: "₱500", expiry: "2026-12-31", status: "Active", targetSegment: "All" },
  { code: "VIPEXCLUSIVE", discount: "₱250 OFF", minSpend: "₱1,000", expiry: "2026-11-30", status: "Active", targetSegment: "VIP Spenders" },
  { code: "WELCOME100", discount: "₱100 OFF", minSpend: "₱300", expiry: "2026-10-15", status: "Active", targetSegment: "New Customers" },
];

export const getCoupons = async (req, res) => {
  try {
    let coupons = await Coupon.find().sort({ createdAt: -1 }).lean().maxTimeMS(5000);
    if (!coupons || coupons.length === 0) {
      coupons = await Coupon.insertMany(sampleCoupons);
    }
    return res.status(200).json(coupons || []);
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return res.status(200).json([]);
  }
};

export const createCoupon = async (req, res) => {
  try {
    const { code, discount, minSpend, expiry, targetSegment } = req.body;
    const newCoupon = new Coupon({
      code: code ? code.toUpperCase() : '',
      discount,
      minSpend: minSpend || '₱0',
      expiry: expiry || '2026-12-31',
      status: 'Active',
      targetSegment: targetSegment || 'All',
    });
    const saved = await newCoupon.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: 'Error creating coupon', error: error.message });
  }
};

export const updateCouponStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await Coupon.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: 'Error updating coupon status', error: error.message });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting coupon', error: error.message });
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const { code, subtotal = 0 } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ valid: false, message: 'Please enter a voucher code.' });
    }

    const cleanCode = code.trim().toUpperCase();
    let coupon = await Coupon.findOne({ code: cleanCode });

    if (!coupon) {
      const sample = sampleCoupons.find((c) => c.code.toUpperCase() === cleanCode);
      if (sample) {
        coupon = await Coupon.create(sample);
      }
    }

    if (!coupon) {
      return res.status(404).json({ valid: false, message: 'Invalid voucher code.' });
    }

    if (coupon.status !== 'Active') {
      return res.status(400).json({ valid: false, message: `This voucher is ${coupon.status.toLowerCase()}.` });
    }

    if (coupon.expiry) {
      const expDate = new Date(coupon.expiry);
      if (!isNaN(expDate.getTime()) && expDate < new Date()) {
        return res.status(400).json({ valid: false, message: 'This voucher has already expired.' });
      }
    }

    const minSpendNum = Number(String(coupon.minSpend || '0').replace(/[^0-9.]/g, '')) || 0;
    if (subtotal < minSpendNum) {
      return res.status(400).json({
        valid: false,
        message: `Minimum spend of ₱${minSpendNum.toLocaleString()} is required for this voucher.`,
      });
    }

    let discountAmount = 0;
    const discountStr = String(coupon.discount || '').toUpperCase();
    if (discountStr.includes('%')) {
      const percentage = parseFloat(discountStr) || 0;
      discountAmount = Math.round((subtotal * (percentage / 100)) * 100) / 100;
    } else {
      const flat = Number(discountStr.replace(/[^0-9.]/g, '')) || 0;
      discountAmount = Math.min(subtotal, flat);
    }

    return res.status(200).json({
      valid: true,
      message: 'Voucher applied successfully!',
      coupon,
      discountAmount,
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return res.status(500).json({ valid: false, message: 'Failed to validate voucher.', error: error.message });
  }
};

