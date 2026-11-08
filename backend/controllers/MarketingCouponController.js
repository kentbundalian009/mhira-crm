import Coupon from '../models/MarketingCoupon.js';

const sampleCoupons = [
  { code: "MHIRA30", discount: "30", minSpend: "500", usageLimit: 100, usedCount: 12, expiry: "2026-12-31", status: "Active", targetSegment: "All", isArchived: false },
  { code: "GOLDEXCLUSIVE", discount: "25", minSpend: "1000", usageLimit: 50, usedCount: 5, expiry: "2026-11-30", status: "Active", targetSegment: "Gold Tier", isArchived: false },
  { code: "WELCOME10", discount: "10", minSpend: "300", usageLimit: 0, usedCount: 18, expiry: "2026-10-15", status: "Active", targetSegment: "Bronze Tier", isArchived: false },
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
    const { code, discount, minSpend, usageLimit, expiry, targetSegment } = req.body;
    const newCoupon = new Coupon({
      code: code ? code.toUpperCase().trim() : '',
      discount: String(discount || '').trim(),
      minSpend: minSpend !== undefined && minSpend !== '' ? String(minSpend) : '0',
      usageLimit: Math.max(0, Number(usageLimit) || 0),
      usedCount: 0,
      expiry: expiry || '',
      status: 'Active',
      targetSegment: targetSegment || 'All',
      isArchived: false,
    });
    const saved = await newCoupon.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: 'Error creating coupon', error: error.message });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const { code, discount, minSpend, usageLimit, usedCount, expiry, targetSegment, status, isArchived } = req.body;
    const updateFields = {};
    if (code !== undefined) updateFields.code = String(code).toUpperCase().trim();
    if (discount !== undefined) updateFields.discount = String(discount).trim();
    if (minSpend !== undefined) updateFields.minSpend = minSpend !== '' ? String(minSpend) : '0';
    if (usageLimit !== undefined) updateFields.usageLimit = Math.max(0, Number(usageLimit) || 0);
    if (usedCount !== undefined) updateFields.usedCount = Math.max(0, Number(usedCount) || 0);
    if (expiry !== undefined) updateFields.expiry = expiry;
    if (targetSegment !== undefined) updateFields.targetSegment = targetSegment || 'All';
    if (status !== undefined) updateFields.status = status;
    if (isArchived !== undefined) updateFields.isArchived = Boolean(isArchived);

    const updated = await Coupon.findByIdAndUpdate(req.params.id, updateFields, { new: true });
    if (!updated) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: 'Error updating coupon', error: error.message });
  }
};

export const updateCouponStatus = async (req, res) => {
  try {
    const { status, isArchived } = req.body;
    const updateFields = {};
    if (status !== undefined) updateFields.status = status;
    if (isArchived !== undefined) updateFields.isArchived = Boolean(isArchived);
    const updated = await Coupon.findByIdAndUpdate(req.params.id, updateFields, { new: true });
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
    const { code, subtotal = 0, redeem = false } = req.body;
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

    if (coupon.isArchived || coupon.status !== 'Active') {
      return res.status(400).json({ valid: false, message: 'This voucher is no longer active.' });
    }

    const limitNum = Number(coupon.usageLimit || 0);
    const usedNum = Number(coupon.usedCount || 0);
    if (limitNum > 0 && usedNum >= limitNum) {
      return res.status(400).json({
        valid: false,
        message: 'This voucher has reached its maximum usage limit.',
      });
    }

    if (coupon.expiry) {
      const expDate = new Date(coupon.expiry);
      if (!isNaN(expDate.getTime())) {
        expDate.setHours(23, 59, 59, 999);
        if (expDate < new Date()) {
          return res.status(400).json({ valid: false, message: 'This voucher has already expired.' });
        }
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
    if (discountStr.includes('%') || (!discountStr.includes('₱') && !isNaN(parseFloat(discountStr)))) {
      const percentage = parseFloat(discountStr) || 0;
      discountAmount = Math.round((subtotal * (percentage / 100)) * 100) / 100;
    } else {
      const flat = Number(discountStr.replace(/[^0-9.]/g, '')) || 0;
      discountAmount = Math.min(subtotal, flat);
    }

    if (redeem && coupon._id) {
      coupon = await Coupon.findByIdAndUpdate(
        coupon._id,
        { $inc: { usedCount: 1 } },
        { new: true }
      );
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
