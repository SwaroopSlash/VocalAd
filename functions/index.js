const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { logger } = require("firebase-functions");

admin.initializeApp();
const db = admin.firestore();

/**
 * Step 1: Create a secure Order ID (v2)
 * Clean Production Version
 */
exports.createOrderV2 = onCall({ 
  cors: true,
  region: "us-central1",
  secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"] 
}, async (request) => {
    const { data, auth } = request;
    if (!auth) throw new HttpsError("unauthenticated", "Please sign in to purchase credits.");

    // Clean secrets from potential terminal whitespace
    const k_id = (process.env.RAZORPAY_KEY_ID || "").trim();
    const k_sec = (process.env.RAZORPAY_KEY_SECRET || "").trim();

    logger.info("PAYMENT_REQUEST", { 
        uid: auth.uid, 
        domain: request.rawRequest?.headers?.origin || "unknown",
        userAgent: request.rawRequest?.headers?.["user-agent"]
    });

    try {
      const razorpay = new Razorpay({ key_id: k_id, key_secret: k_sec });
      const order = await razorpay.orders.create({
        amount: Math.round(data.amount * 100),
        currency: "INR",
        receipt: `rcpt_${auth.uid.slice(0, 8)}_${Date.now()}`,
        payment_capture: 1,
        notes: { userId: auth.uid, planId: data.planId }
      });
      
      logger.info("ORDER_CREATED", { orderId: order.id, uid: auth.uid });
      return { orderId: order.id };
    } catch (error) {
      logger.error("RAZORPAY_ERROR", { msg: error.message, uid: auth.uid });
      throw new HttpsError("internal", `Payment gateway error: ${error.message}`);
    }
});

/**
 * Step 2: Automated Webhook (Instant Credits)
 */
exports.razorpayWebhookV2 = onRequest({ 
    region: "us-central1",
    cors: true,
    secrets: ["RAZORPAY_WEBHOOK_SECRET"]
}, async (req, res) => {
    const signature = req.headers["x-razorpay-signature"];
    const secret = (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();

    if (!signature || !secret) return res.status(400).send("Unauthorized");

    // Signature Verification
    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(req.rawBody);
    const digest = shasum.digest("hex");

    if (signature !== digest) return res.status(403).send("Invalid signature");

    const event = req.body.event;
    if (event === "payment.captured") {
      const payload = req.body.payload.payment.entity;
      const orderId = payload.order_id;
      
      try {
        const razorpay = new Razorpay({ 
            key_id: (process.env.RAZORPAY_KEY_ID || "").trim(), 
            key_secret: (process.env.RAZORPAY_KEY_SECRET || "").trim() 
        });
        const order = await razorpay.orders.fetch(orderId);
        const { userId, planId } = order.notes;

        if (userId) {
          let creditsToAdd = 1;
          if (planId === 'starter') creditsToAdd = 10;
          if (planId === 'pro') creditsToAdd = 50;
          if (planId === 'agency') creditsToAdd = 200;

          const usageRef = db.doc(`artifacts/advocalize-pro-v2/users/${userId}/usage/stats`);
          await usageRef.set({
            creditsRemaining: admin.firestore.FieldValue.increment(creditsToAdd),
            tier: 'paid',
            lastPurchase: new Date().toISOString()
          }, { merge: true });
          
          logger.info("CREDITS_ADDED", { uid: userId, credits: creditsToAdd });
        }
      } catch (err) {
        logger.error("WEBHOOK_PROCESSING_ERROR", { error: err.message });
      }
    }
    res.json({ status: "ok" });
});
