const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const https = require("https");
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

// ── Gemini REST helper ───────────────────────────────────────────────────────
function callGeminiRest(model, payload, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname: "generativelanguage.googleapis.com",
      path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
    }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch (e) { reject(new Error("Failed to parse Gemini response")); } });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── generateVoice ────────────────────────────────────────────────────────────
exports.generateVoice = onCall({
  cors: true,
  region: "us-central1",
  secrets: ["GEMINI_VOICE_API_KEY", "GEMINI_BRAIN_API_KEY"],
  timeoutSeconds: 120,
  memory: "256MiB"
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to generate voice.");

  const { text, voiceName, tone, speed } = request.data;
  if (!text?.trim()) throw new HttpsError("invalid-argument", "Script text is required.");

  const voiceKey = (process.env.GEMINI_VOICE_API_KEY || "").trim();
  const brainKey = (process.env.GEMINI_BRAIN_API_KEY || "").trim();
  const VOICE_MODEL = "gemini-3.5-flash-preview-tts";
  const VOICE_FALLBACK = "gemini-2.5-flash-preview-tts";
  const BRAIN_MODEL = "gemini-2.5-flash";
  const BRAIN_FALLBACK = "gemini-2.0-flash";

  // Spell-check for longer scripts (non-critical — continue on failure)
  let scriptToSpeak = text.trim();
  if (scriptToSpeak.split(/\s+/).length > 15) {
    try {
      const spellPayload = { contents: [{ parts: [{ text: `Fix spelling errors and grammar only. Return ONLY the corrected text, same length and words. No additions or rewrites. Text: "${scriptToSpeak}"` }] }] };
      let spellRes = await callGeminiRest(BRAIN_MODEL, spellPayload, brainKey);
      if (spellRes.error) spellRes = await callGeminiRest(BRAIN_FALLBACK, spellPayload, brainKey);
      const corrected = spellRes.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (corrected) scriptToSpeak = corrected;
    } catch (e) {
      logger.warn("SPELL_CHECK_FAILED", { msg: e.message, uid: request.auth.uid });
    }
  }

  const ttsPrompt = `Deliver in a ${tone} tone, ${speed}:\n${scriptToSpeak}`;
  const ttsPayload = {
    contents: [{ parts: [{ text: ttsPrompt }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
    }
  };

  let ttsResult = await callGeminiRest(VOICE_MODEL, ttsPayload, voiceKey);
  if (ttsResult.error) {
    logger.warn("VOICE_PRIMARY_FAILED", { msg: ttsResult.error.message, uid: request.auth.uid });
    ttsResult = await callGeminiRest(VOICE_FALLBACK, ttsPayload, voiceKey);
    if (ttsResult.error) throw new HttpsError("internal", `Voice generation failed: ${ttsResult.error.message}`);
  }

  const inlineData = ttsResult.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!inlineData) throw new HttpsError("internal", "Voice engine returned no audio.");

  logger.info("VOICE_GENERATED", { uid: request.auth.uid, voiceName });
  return { audioBase64: inlineData.data, mimeType: inlineData.mimeType };
});

// ── analyzeImage — auto-suggest script from uploaded image ───────────────────
// ── analyzeImage (Vision & Strategy) ─────────────────────────────────────────
exports.analyzeImage = onCall({
  cors: true,
  region: "us-central1",
  secrets: ["GEMINI_BRAIN_API_KEY"],
  timeoutSeconds: 30,
  memory: "256MiB"
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to analyze image.");

  const { imageBase64 } = request.data;
  if (!imageBase64) return { script: null };

  const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { script: null };

  const mimeType = match[1];
  const base64Data = match[2];
  const apiKey = (process.env.GEMINI_BRAIN_API_KEY || "").trim();
  const BRAIN_MODEL = "gemini-2.5-flash";
  const BRAIN_FALLBACK = "gemini-2.0-flash";

  const prompt = `You are a Principal AI Strategist. Perform a forensic analysis of this image.

1. CATEGORIZE: Identify the Campaign Type (e.g., Political Election, Retail Sale, Event Invite, Brand Story).
2. EXTRACT HARD FACTS: Find and list every specific detail: Brand/Name, Discount %, Price, Phone Numbers, Address, Dates.
3. DETECT LANGUAGE: Identify the primary language of the text.

RESPONSE SCHEMA (STRICT JSON):
{
  "primaryMemory": {
    "campaignType": "e.g. Political/Retail",
    "brandName": "Name or 'Unknown'",
    "hardFacts": {
      "offers": "e.g. 50% off",
      "contact": "Phone/Email",
      "location": "Address",
      "specifics": "Any other key labels"
    },
    "visualVibe": "Description of scene",
    "complexity": "HIGH/LOW",
    "detectedLanguage": "Full language name"
  },
  "themes": [{"emoji": "string", "label": "string"}],
  "script": "Write a 40-50 word script using ALL Hard Facts extracted above.",
  "language": "ISO code"
}

If the image is not commercial, output: {"skip": true}`;

  const payload = {
    contents: [{ parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] }],
    generationConfig: { 
      temperature: 1.0,
      response_mime_type: "application/json"
    }
  };

  try {
    let result = await callGeminiRest(BRAIN_MODEL, payload, apiKey);
    if (result.error) result = await callGeminiRest(BRAIN_FALLBACK, payload, apiKey);
    const raw = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!raw) return { themes: [], script: null };
    
    const parsed = JSON.parse(raw);
    if (parsed.skip) return { themes: [], script: null };
    
    logger.info("IMAGE_ANALYZED_V3", { uid: request.auth.uid, product: parsed.primaryMemory?.productName });
    return { 
      themes: parsed.themes || [], 
      script: parsed.script, 
      language: parsed.language || 'en',
      primaryMemory: parsed.primaryMemory 
    };
  } catch (e) {
    logger.warn("IMAGE_ANALYSIS_FAILED", { msg: e.message, uid: request.auth.uid });
    return { themes: [], script: null };
  }
});

// ── generateScript (Stateful Engine) ──────────────────────────────────────────
exports.generateScript = onCall({
  cors: true,
  region: "us-central1",
  secrets: ["GEMINI_BRAIN_API_KEY"],
  timeoutSeconds: 60
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to generate script.");

  const { prompt, language, boliPrompt, lightweight, constraints, history, userInstruction, tone, primaryMemory } = request.data;
  if (!prompt?.trim()) throw new HttpsError("invalid-argument", "Prompt is required.");

  const apiKey = (process.env.GEMINI_BRAIN_API_KEY || "").trim();
  const BRAIN_MODEL = "gemini-2.5-flash";
  const BRAIN_FALLBACK = "gemini-2.0-flash";
  const LIGHT_MODEL = "gemini-2.0-flash-lite";

  if (lightweight) {
    const payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { response_mime_type: "application/json" } };
    let result = await callGeminiRest(LIGHT_MODEL, payload, apiKey);
    if (result.error) result = await callGeminiRest(BRAIN_FALLBACK, payload, apiKey);
    const script = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return { script };
  }

  const wordCount = prompt.trim().split(/\s+/).length;
  const baseWords = (primaryMemory?.complexity === 'HIGH') ? 50 : 25;
  const targetWords = wordCount <= 10 ? baseWords : Math.round(wordCount * 1.2);
  
  const contextAnchor = primaryMemory ? `
CORE AD MEMORY (SOURCE OF TRUTH):
- CAMPAIGN: ${primaryMemory.campaignType}
- BRAND: ${primaryMemory.brandName}
- HARD FACTS: ${JSON.stringify(primaryMemory.hardFacts)}
- VIBE: ${primaryMemory.visualVibe}

STRICT RULE: Include ALL hard facts naturally.
` : '';

  const lines = [
    `You are an expert Indian commercial voiceover scriptwriter.`,
    `TTS TAGS — REQUIRED: Use [excited], [laughs], [short pause], [medium pause], [curious], [whispers], [serious], [sighs].`,
    language ? `LANGUAGE: Write ONLY in ${language}.` : '',
    tone ? `Tone: ${tone}` : '',
    contextAnchor,
    `Current Angle: "${prompt.trim()}"`,
    userInstruction ? `\n⚠ USER INSTRUCTION (SUPREME PRIORITY): "${userInstruction.trim()}"\nIf the user instruction changes a brand name, phone, or fact, RECONCILE the memory.` : '',
    Array.isArray(constraints) && constraints.length ? `Requirements: ${constraints.join(' · ')}` : '',
    `Write a spoken commercial script (~${targetWords} words).`,
    userInstruction ? `Since there is a User Instruction, return a JSON object: {"script": "the text", "updatedMemory": {"brandName": "...", "hardFacts": {"offers": "...", "contact": "..."}}}. Only include fields that CHANGED.` : `OUTPUT ONLY THE SCRIPT TEXT. No JSON.`
  ].filter(Boolean).join('\n');

  const payload = {
    contents: [{ parts: [{ text: lines }] }],
    generationConfig: { 
      thinkingConfig: { thinkingBudget: 0 },
      response_mime_type: userInstruction ? "application/json" : "text/plain"
    }
  };
  
  let result = await callGeminiRest(BRAIN_MODEL, payload, apiKey);
  if (result.error) result = await callGeminiRest(BRAIN_FALLBACK, payload, apiKey);
  
  const raw = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (userInstruction) {
    try {
      const parsed = JSON.parse(raw);
      return { script: parsed.script, updatedMemory: parsed.updatedMemory };
    } catch (e) {
      return { script: raw.replace(/\{.*\}/g, '').trim() }; // Fallback to stripping JSON
    }
  }
  return { script: raw };
});