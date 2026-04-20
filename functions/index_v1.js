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
 * FIX: No changes needed here — this was working correctly.
 */
exports.createOrderV2 = onCall({
  cors: true,
  region: "us-central1",
  secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"]
}, async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Please sign in to purchase credits.");

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
 * Step 2: Webhook — Instant Credits on payment.captured
 *
 * FIX 1: Added RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to secrets array.
 *         Previously these were missing, so razorpay.orders.fetch() was
 *         called with blank credentials, silently failing — userId and
 *         planId could never be resolved, so credits were never written.
 *
 * FIX 2: Added idempotency check using a Firestore document keyed by
 *         payment_id. Prevents double-crediting if Razorpay retries the
 *         webhook (it retries up to 3 times on non-200 responses).
 *
 * FIX 3: Always return 200 after signature verification, even if
 *         processing fails internally. This stops Razorpay from retrying
 *         indefinitely on transient errors.
 *
 * FIX 4: Wrapped the entire processing block in try/catch with detailed
 *         logging so failures are visible in Firebase logs instead of
 *         silently swallowing errors.
 */
exports.razorpayWebhookV2 = onRequest({
  region: "us-central1",
  cors: false, // Webhooks don't need CORS — they come from Razorpay servers
  // FIX 1: All three secrets are now declared
  secrets: ["RAZORPAY_WEBHOOK_SECRET", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"]
}, async (req, res) => {

  // ── Signature verification ──────────────────────────────────────────────
  const signature = req.headers["x-razorpay-signature"];
  const secret = (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();

  if (!signature || !secret) {
    logger.error("WEBHOOK_REJECTED", { reason: "Missing signature or secret" });
    return res.status(400).send("Unauthorized");
  }

  const shasum = crypto.createHmac("sha256", secret);
  shasum.update(req.rawBody);
  const digest = shasum.digest("hex");

  if (signature !== digest) {
    logger.error("WEBHOOK_REJECTED", { reason: "Invalid signature" });
    return res.status(403).send("Invalid signature");
  }

  // ── Only handle payment.captured ────────────────────────────────────────
  const event = req.body.event;
  logger.info("WEBHOOK_RECEIVED", { event });

  if (event !== "payment.captured") {
    return res.json({ status: "ignored", event });
  }

  const payload = req.body.payload.payment.entity;
  const paymentId = payload.id;
  const orderId = payload.order_id;

  // ── FIX 2: Idempotency — skip if already processed ──────────────────────
  const processedRef = db.doc(`webhookEvents/${paymentId}`);
  const alreadyProcessed = await processedRef.get();
  if (alreadyProcessed.exists) {
    logger.warn("WEBHOOK_DUPLICATE", { paymentId, orderId });
    return res.json({ status: "already_processed" });
  }

  // ── FIX 3: Acknowledge immediately so Razorpay doesn't retry ────────────
  // We do the Firestore write after this — if it fails, we log it but
  // Razorpay won't hammer the endpoint with retries.
  res.json({ status: "ok" });

  // ── Credit the user ──────────────────────────────────────────────────────
  try {
    // FIX 1: Now works because KEY_ID + KEY_SECRET are in secrets array
    const razorpay = new Razorpay({
      key_id: (process.env.RAZORPAY_KEY_ID || "").trim(),
      key_secret: (process.env.RAZORPAY_KEY_SECRET || "").trim()
    });

    const order = await razorpay.orders.fetch(orderId);
    const { userId, planId } = order.notes;

    if (!userId) {
      logger.error("WEBHOOK_NO_USERID", { orderId, paymentId });
      return;
    }

    // Map plan to credits
    const creditsMap = {
      single: 1,
      starter: 10,
      pro: 50,
      agency: 200
    };
    const creditsToAdd = creditsMap[planId] ?? 1;

    // Write credits to Firestore
    const usageRef = db.doc(`artifacts/advocalize-pro-v2/users/${userId}/usage/stats`);
    await usageRef.set({
      creditsRemaining: admin.firestore.FieldValue.increment(creditsToAdd),
      tier: "paid",
      lastPurchase: new Date().toISOString()
    }, { merge: true });

    // Mark as processed (idempotency record)
    await processedRef.set({
      paymentId,
      orderId,
      userId,
      planId,
      creditsAdded: creditsToAdd,
      processedAt: new Date().toISOString()
    });

    logger.info("CREDITS_ADDED", { uid: userId, credits: creditsToAdd, paymentId, planId });

  } catch (err) {
    // FIX 4: Log the actual error instead of swallowing it silently
    logger.error("WEBHOOK_PROCESSING_ERROR", {
      error: err.message,
      stack: err.stack,
      paymentId,
      orderId
    });
  }
});