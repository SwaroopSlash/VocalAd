const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

const APP_ID = 'advocalize-pro-v2';

// Helper to get Razorpay client using Secrets from process.env
const getRazorpay = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    console.error("CRITICAL: Razorpay Secrets are not being injected into process.env");
    throw new Error("Razorpay configuration missing in backend environment.");
  }

  return new Razorpay({
    key_id: key_id,
    key_secret: key_secret,
  });
};

/**
 * Step 1: Create a secure Order ID
 * USES SECRET MANAGER
 */
exports.createOrder = functions
  .runWith({ 
    secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"] 
  })
  .https.onCall(async (data, context) => {
    console.log("createOrder called with data:", JSON.stringify(data));
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Please sign in to continue.");
    }

    const { amount, planId } = data;
    if (!amount || !planId) {
      throw new functions.https.HttpsError("invalid-argument", "Amount and Plan ID are required.");
    }

    try {
      if (data.amount === 1.23) {
        console.log("DUMMY TEST MODE TRIGGERED");
        return { orderId: "order_dummy_" + Date.now() };
      }
      const razorpay = getRazorpay();
      const options = {
        amount: Math.round(amount * 100), // convert to paise
        currency: "INR",
        receipt: `rcpt_${context.auth.uid.slice(0, 8)}_${Date.now()}`,
        notes: {
          userId: context.auth.uid,
          email: context.auth.token.email || "user@vocalad.ai",
          planId: planId
        }
      };

      const order = await razorpay.orders.create(options);
      return { orderId: order.id };
    } catch (error) {
      console.error("Razorpay Order Creation Failed:", error);
      throw new functions.https.HttpsError("internal", error.message || "Failed to initiate payment.");
    }
  });

/**
 * Step 2: Automated Webhook (Instant Credits)
 * USES SECRET MANAGER
 */
exports.razorpayWebhook = functions
  .runWith({ 
    secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"] 
  })
  .https.onRequest(async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    if (!secret || !signature) {
      return res.status(400).send("Missing secret or signature");
    }

    // Verify Signature
    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    if (signature !== digest) {
      console.error("Invalid Webhook Signature");
      return res.status(403).send("Invalid signature");
    }

    const event = req.body.event;
    if (event === "payment.captured") {
      const payload = req.body.payload.payment.entity;
      const orderId = payload.order_id;
      
      try {
        const razorpay = getRazorpay();
        const order = await razorpay.orders.fetch(orderId);
        const { userId, planId } = order.notes;

        if (userId) {
          // Add credits based on plan
          let creditsToAdd = 1;
          if (planId === 'starter') creditsToAdd = 10;
          if (planId === 'pro') creditsToAdd = 50;
          if (planId === 'agency') creditsToAdd = 200;

          const usageRef = db.doc(`artifacts/${APP_ID}/users/${userId}/usage/stats`);
          await usageRef.set({
            creditsRemaining: admin.firestore.FieldValue.increment(creditsToAdd),
            tier: 'paid',
            lastPurchase: new Date().toISOString()
          }, { merge: true });

          console.log(`Successfully added ${creditsToAdd} credits to user ${userId}`);
        }
      } catch (err) {
        console.error("Webhook Processing Error:", err);
      }
    }

    res.json({ status: "ok" });
  });
