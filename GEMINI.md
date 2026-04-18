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
- [x] **Next:** AI Script Architect (Magic Wand tool for script generation).
- [x] **Next:** Mobile Ergonomics Pass (Above-the-fold previews & Logic-first layout).
- [x] UPI Payment Modal (One-Tap Redirect).
- [/] Manual/Automatic payment verification logic. (Manual flow implemented)

## Testing & Quality Assurance
- [ ] Build `AdVocalizeLab.js` for automated API & Renderer health checks.
- [ ] Implement browser-side error logging to Firestore.

## Design Philosophy
- **Style over Specs:** Use "WhatsApp Style" instead of "Vertical 1080x1920".
- **Safety First:** Strict `.env` usage, no hardcoded secrets.
- **Logic First:** Action buttons placed where the user needs them next.
- **Frictionless:** AI-assisted script writing and mobile-first ergonomics.
