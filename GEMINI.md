# AdVocalize Pro - Roadmap & Versions

## Stage 1: Core Engine (V1)
- [x] 4-Step Ad Creation Flow.
- [x] Gemini 1.5 Brain + 3.1 TTS integration.
- [x] Aspect Ratio Presets (WhatsApp Story, Instagram Post, Cinema).
- [x] Image fitting logic (Cover/Fit) on Canvas.

## Stage 2: User System (V2)
- [x] Firebase Auth (Google & Email).
- [x] Anonymous guest session linking.
- [x] CRM: Saving user profiles (emails) to Firestore.
- [x] Configuration Locking (Free users restricted to 1 voice/tone/speed).
- [x] Tier-based Voice Generation Limits (3 for free, 5 then credit-based for pro).
- [x] Granular Limit Modals (Explicit feedback for voice/credit/download limits).
- [x] Audio-Only download option (.wav).

## Stage 3: Economy (V3)
- [x] Transition to `creditsRemaining` system (replacing `videoCount`).
- [x] **New:** VocalAd.ai Branding & Professional UI.
- [x] **New:** Fit vs. Fill Choice with Blurred Background fallback.
- [x] AI Script Architect (Magic Wand tool for script generation).
- [x] Mobile Ergonomics Pass (Above-the-fold previews & Logic-first layout).
- [x] UPI Payment Modal (One-Tap Redirect).
- [x] **Infrastructure:** Migrated to Firebase Functions v2 for better CORS & performance.
- [x] **Security:** Fully operational Razorpay Live integration via Secret Manager.
- [x] **Fixed:** Resolved 401 Auth errors and hidden character key bugs.
- [/] Manual/Automatic payment verification logic. (Automatic webhook in progress)

## Stage 4: Professional Polish & UX (Current)
- [ ] **Fix:** Resolve frozen frame bug in final video renderer.
- [ ] **UX:** Consolidate Voice selection into a clean dropdown.
- [ ] **Ergonomics:** Unified Mixing Player (remove separate simulation slider).
- [ ] **Cleanup:** Remove redundant UI steps and simplify the user journey.

## Testing & Quality Assurance
- [x] Build `AdVocalizeLab.js` for automated API & Renderer health checks.
- [x] Implement browser-side error logging to Firestore.
- [x] **Debug Suite:** Added "Backend Test" (₹1.23) plan for end-to-end payment verification.

## Design Philosophy
- **Style over Specs:** Use "WhatsApp Style" instead of "Vertical 1080x1920".
- **Safety First:** Strict `.env` usage, no hardcoded secrets.
- **Logic First:** Action buttons placed where the user needs them next.
- **Studio Ergonomics:** High-density, professional tools with zero fluff.
