import { sendEmail, renderEmailLayout } from "../lib/email.js";
import Order from "../models/LogisticOrder.js";
import User from "../models/AdminUser.js";

/**
 * Send an Order Notification / Logistics Update Email to a Customer
 */
export const sendOrderNotification = async (req, res) => {
  try {
    const {
      recipientEmail,
      recipientName = "Valued Customer",
      orderId,
      notificationType = "ORDER_UPDATE", // ORDER_UPDATE | WEATHER_DELAY | REPLACEMENT_DISPATCHED | RETURN_APPROVED | GENERAL
      subject,
      headline,
      message,
      courier,
      trackingNumber,
      estimatedDelivery,
      actionUrl,
      actionText = "Track Order Details",
    } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ success: false, message: "Recipient email is required" });
    }

    const emailSubject =
      subject ||
      (notificationType === "WEATHER_DELAY"
        ? `[Advisory] Weather Delay Notice for Order #${orderId ? orderId.slice(-8).toUpperCase() : ""}`
        : notificationType === "REPLACEMENT_DISPATCHED"
        ? `[Mhira Logistics] Replacement Dispatched for Order #${orderId ? orderId.slice(-8).toUpperCase() : ""}`
        : notificationType === "RETURN_APPROVED"
        ? `[Mhira Logistics] Return Request Resolution for Order #${orderId ? orderId.slice(-8).toUpperCase() : ""}`
        : `[Mhira Logistics] Shipment & Order Update #${orderId ? orderId.slice(-8).toUpperCase() : ""}`);

    const badgeCategory =
      notificationType === "WEATHER_DELAY"
        ? "LOGISTICS ADVISORY"
        : notificationType === "REPLACEMENT_DISPATCHED"
        ? "REPLACEMENT DISPATCHED"
        : notificationType === "RETURN_APPROVED"
        ? "RETURN RESOLUTION"
        : "ORDER DISPATCH UPDATE";

    // Build rich details card
    let detailsHtml = "";
    if (orderId || courier || trackingNumber || estimatedDelivery) {
      detailsHtml = `
        <div class="credential-box">
          ${
            orderId
              ? `<div class="credential-row">
                  <div class="credential-label">Order Reference</div>
                  <div class="credential-value" style="color: #01390f; font-weight: 700;">#${orderId.slice(-8).toUpperCase()}</div>
                </div>`
              : ""
          }
          ${
            courier
              ? `<div class="credential-row">
                  <div class="credential-label">Courier Partner</div>
                  <div class="credential-value">${courier}</div>
                </div>`
              : ""
          }
          ${
            trackingNumber
              ? `<div class="credential-row">
                  <div class="credential-label">Waybill / Tracking No.</div>
                  <div class="credential-value">
                    <span class="credential-code">${trackingNumber}</span>
                  </div>
                </div>`
              : ""
          }
          ${
            estimatedDelivery
              ? `<div class="credential-row" style="margin-bottom: 0;">
                  <div class="credential-label">Estimated Delivery Window</div>
                  <div class="credential-value" style="color: #01390f; font-weight: 600;">${estimatedDelivery}</div>
                </div>`
              : ""
          }
        </div>
      `;
    }

    const contentHtml = `
      <p class="lead-text">
        Dear <strong style="color: #1f2937;">${recipientName}</strong>,
      </p>
      <div style="font-size: 13px; line-height: 1.65; color: #4b5563; margin-bottom: 20px; text-align: center;">
        ${(message || "Here is an official status update regarding your order from Mhira Natural.")
          .split("\n")
          .map((para) => `<p style="margin: 0 0 10px 0;">${para.trim()}</p>`)
          .join("")}
      </div>

      ${detailsHtml}

      ${
        actionUrl
          ? `<div style="text-align: center; margin: 28px 0 20px 0;">
              <a href="${actionUrl}" class="action-btn">
                ${actionText}
              </a>
            </div>`
          : ""
      }

      <div class="notice-box">
        <strong style="color: #01390f;">Logistics Assurance:</strong> All Mhira botanical packages are inspected and sealed prior to dispatch. If you have any inquiries regarding your package, contact our logistics desk or customer support.
      </div>
    `;

    const html = renderEmailLayout({
      title: headline || "Logistics Order Advisory",
      category: badgeCategory,
      contentHtml,
    });

    const result = await sendEmail({ to: recipientEmail, subject: emailSubject, html });

    // If orderId is provided and valid, optionally push note to order's timeline
    if (orderId) {
      try {
        await Order.findByIdAndUpdate(orderId, {
          $push: {
            trackingTimeline: {
              title: `Email Notification Sent: ${badgeCategory}`,
              description: `Notification sent to ${recipientEmail} - ${headline || emailSubject}`,
              timestamp: new Date(),
              status: "Notification Dispatched",
            },
          },
        });
      } catch (logErr) {
        console.warn("Could not log notification to order timeline:", logErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Order notification email successfully sent to ${recipientEmail}`,
      result,
    });
  } catch (error) {
    console.error("Error sending order notification:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to send email notification" });
  }
};

/**
 * Send a Promotional Marketing / Advertisement Email to Customers
 */
export const sendMarketingAd = async (req, res) => {
  try {
    const {
      targetAudience = "CUSTOM", // 'ALL_CUSTOMERS' | 'CUSTOM'
      recipientEmail,
      campaignTitle,
      headline,
      bodyText,
      discountCode,
      discountNote, // e.g. "Get 15% off your next checkout"
      ctaText = "Shop the Botanical Collection",
      ctaUrl = `${process.env.FRONTEND_URL || "https://mhira-crmsystem.onrender.com"}/collection`,
      bannerImage,
    } = req.body;

    if (targetAudience === "CUSTOM" && !recipientEmail) {
      return res.status(400).json({ success: false, message: "Recipient email is required for custom audience" });
    }

    // Determine recipients
    let recipients = [];
    if (targetAudience === "ALL_CUSTOMERS") {
      const customers = await User.find({ role: "Customer", email: { $exists: true, $ne: "" } }).select("email fullName");
      recipients = customers.map((c) => ({ email: c.email, name: c.fullName || "Valued Customer" }));
      if (recipients.length === 0) {
        return res.status(400).json({ success: false, message: "No registered customer emails found in system." });
      }
    } else {
      recipients = [{ email: recipientEmail, name: "Valued Customer" }];
    }

    const emailSubject = campaignTitle || headline || "Exclusive Offer from Mhira Natural";

    // Build coupon / promo highlight card
    let promoCardHtml = "";
    if (discountCode || discountNote) {
      promoCardHtml = `
        <div style="background: linear-gradient(135deg, #01390f 0%, #064e1b 100%); border-radius: 20px; padding: 24px; color: #ffffff; text-align: center; margin: 26px 0; box-shadow: 0 4px 14px rgba(1, 57, 15, 0.15);">
          <div style="font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #bbf7d0; margin-bottom: 6px;">LIMITED TIME OFFER</div>
          ${discountNote ? `<div style="font-size: 16px; font-weight: 700; margin-bottom: 12px; color: #ffffff;">${discountNote}</div>` : ""}
          ${
            discountCode
              ? `<div style="display: inline-block; background-color: #ffffff; color: #01390f; padding: 10px 28px; border-radius: 9999px; font-family: 'Poppins', Consolas, monospace; font-size: 20px; font-weight: 800; letter-spacing: 4px; border: 2px dashed #01390f; margin-bottom: 10px;">${discountCode}</div>
                 <div style="font-size: 11px; color: #d1fae5; margin-top: 4px;">Use code at checkout to claim your savings</div>`
              : ""
          }
        </div>
      `;
    }

    // Banner image if provided
    let bannerHtml = "";
    if (bannerImage) {
      bannerHtml = `
        <div style="text-align: center; margin-bottom: 20px; border-radius: 16px; overflow: hidden; max-height: 240px;">
          <img src="${bannerImage}" alt="Campaign Banner" style="max-width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 14px;" />
        </div>
      `;
    }

    const contentHtml = `
      ${bannerHtml}
      <h2 style="font-size: 20px; font-weight: 800; color: #01390f; line-height: 1.35; margin: 0 0 16px 0; text-align: center; letter-spacing: -0.3px;">
        ${headline || "Experience Pure Botanical Luxury"}
      </h2>
      <div style="font-size: 13px; line-height: 1.65; color: #4b5563; margin-bottom: 20px; text-align: center;">
        ${(bodyText || "Discover our latest botanical beauty innovations handcrafted with sustainable, natural ingredients.")
          .split("\n")
          .map((para) => `<p style="margin: 0 0 10px 0;">${para.trim()}</p>`)
          .join("")}
      </div>

      ${promoCardHtml}

      <div style="text-align: center; margin: 28px 0 20px 0;">
        <a href="${ctaUrl}" class="action-btn">
          ${ctaText} &rarr;
        </a>
      </div>

      <div class="notice-box" style="text-align: center;">
        You received this exclusive invitation as a distinguished member of the Mhira Natural community. Cash on Delivery is available nationwide across the Philippines.
      </div>
    `;

    const html = renderEmailLayout({
      title: headline || "Special Announcement",
      category: "EXCLUSIVE MARKETING PROMOTION",
      contentHtml,
    });

    // Send emails (concurrently up to 10 at a time if batch)
    let successCount = 0;
    for (const recipient of recipients) {
      try {
        await sendEmail({ to: recipient.email, subject: emailSubject, html });
        successCount++;
      } catch (e) {
        console.warn(`Failed to deliver marketing ad to ${recipient.email}:`, e.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Marketing email campaign dispatched to ${successCount} recipient(s).`,
      sentCount: successCount,
      totalRecipients: recipients.length,
    });
  } catch (error) {
    console.error("Error sending marketing advertisement:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to send marketing email" });
  }
};
