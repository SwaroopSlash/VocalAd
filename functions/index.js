const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

const APP_ID = 'advocalize-pro-v2';

// Helper to get Razorpay client late (prevents analysis crash)
const getRazorpay = () => {
  const config = functions.config().razorpay;
  if (!config || !config.key_id || !config.key_secret) {
    throw new Error("Razorpay configuration is missing. Run firebase functions:config:set razorpay.key_id=...");
  }
  return new Razorpay({
    key_id: config.key_id,
    key_secret: config.key_secret,
  });
};

/**
 * Step 1: Create a secure Order ID
 */
exports.createOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Please sign in.");
  }

  const { amount, planId } = data;
  const razorpay = getRazorpay();
  
  try {
    const options = {
      amount: amount * 100, 
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: context.auth.uid,
        email: context.auth.token.email || "guest",
        planId: planId
      }
    };

    const order = await razorpay.orders.create(options);
    return { orderId: order.id };
  } catch (error) {
    console.error("Razorpay Order Error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Step 2: Automated Webhook (Instant Credits)
 */
exports.razorpayWebhook = functions.https.onRequest(async (req, res) => {
  const config = functions.config().razorpay;
  const secret = config ? config.webhook_secret : null;
  const signature = req.headers["x-razorpay-signature"];

  if (!secret) {
    console.error("Webhook Secret Missing");
    return res.status(500).send("Configuration missing");
  }

  // Verify the signature
  const shasum = crypto.createHmac("sha256", secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest("hex");

  if (signature !== digest) {
    console.error("Invalid Webhook Signature");
    return res.status(403).send("Invalid signature");
  }

  const event = req.body.event;
  const payload = req.body.payload.payment.entity;

  if (event === "payment.captured") {
    const orderId = payload.order_id;
    const razorpay = getRazorpay();
    
    // Fetch order details from Razorpay to get user notes
    const order = await razorpay.orders.fetch(orderId);
    const userId = order.notes.userId;
    const planId = order.notes.planId;

    let creditsToAdd = 0;
    if (planId === 'single') creditsToAdd = 1;
    else if (planId === 'starter') creditsToAdd = 10;
    else if (planId === 'pro') creditsToAdd = 50;
    else if (planId === 'agency') creditsToAdd = 200;

    if (creditsToAdd > 0) {
      const usageRef = db.collection('artifacts').doc(APP_ID).collection('users').doc(userId).collection('usage').doc('stats');
      
      await usageRef.set({
        creditsRemaining: admin.firestore.FieldValue.increment(creditsToAdd),
        tier: 'paid'
      }, { merge: true });

      console.log(`Successfully credited ${creditsToAdd} to ${userId} for order ${orderId}`);
    }
  }

  res.status(200).send("ok");
});
