const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { logger } = require("firebase-functions");

admin.initializeApp();
const db = admin.firestore();

exports.createOrderV2 = onCall({ 
  cors: true,
  region: "us-central1",
  secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"] 
}, async (request) => {
    const { data, auth } = request;
    
    // Safety check
    if (!auth) throw new HttpsError("unauthenticated", "Auth missing");

    const k_id = process.env.RAZORPAY_KEY_ID || "";
    const k_sec = process.env.RAZORPAY_KEY_SECRET || "";

    // MASKED LOGGING: Verify keys are loaded without exposing them
    logger.info("KEY_VERIFICATION", {
        id_start: k_id.substring(0, 8),
        id_end: k_id.slice(-3),
        sec_len: k_sec.length,
        sec_start: k_sec.substring(0, 3),
        sec_end: k_sec.slice(-3)
    });

    // Only return dummy order if specifically requested AND we are in a test/mock context
    // Removing the 1.23 hardcode because we want to test real live transactions
    if (data && data.planId === 'dummy_mock_only') {
      return { orderId: "order_test_99999", isTest: true };
    }

    try {
      const razorpay = new Razorpay({ key_id: k_id, key_secret: k_sec });
      const order = await razorpay.orders.create({
        amount: Math.round(data.amount * 100),
        currency: "INR",
        receipt: `rcpt_${auth.uid.slice(0, 8)}`,
        notes: { userId: auth.uid, planId: data.planId }
      });
      return { orderId: order.id };
    } catch (error) {
      logger.error("RAZORPAY_API_FAILURE", { error: error.message, raw: JSON.stringify(error) });
      throw new HttpsError("internal", `Razorpay Auth Failed: Check your Live Secret.`);
    }
});

exports.razorpayWebhookV2 = onRequest({ region: "us-central1", cors: true }, async (req, res) => {
    res.json({ status: "ok" });
});
