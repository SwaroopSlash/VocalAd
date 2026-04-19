# AdVocalize Pro - Roadmap & Versions

## Core Mandates & Governance
- **Logic Integrity:** CRITICAL. Any major decision or refactor that affects the application flow, backend logic, or core functional paths (Auth, Payments, Engine) MUST receive explicit user permission before implementation.
- **Stability Over Aesthetics:** Functional logic must never be traded off for UI design decisions unless specifically requested.

## Stage 1: Core Engine (V1)
- [x] 4-Step Ad Creation Flow.
- [x] Gemini 1.5 Brain + 3.1 TTS integration.
- [x] Aspect Ratio Presets (WhatsApp Story, Instagram Post, Cinema).
- [x] Image fitting logic (Cover/Fit) on Canvas.

## Stage 2: User System (V2)
- [x] Firebase Auth (Google & Email).
- [x] Anonymous guest session linking.
- [x] Tier-based Voice Generation Limits.
- [x] Audio-Only download option (.wav).

## Stage 3: Economy (V3)
- [x] Transition to `creditsRemaining` system.
- [x] **New:** VocalAd.ai Branding & Professional UI.
- [x] **New:** Fit vs. Fill Choice with Blurred Background fallback.
- [x] AI Script Architect (Magic Wand tool).
- [x] **Infrastructure:** Migrated to Firebase Functions v2 for better CORS.
- [x] **Security:** Fully operational Razorpay Live integration via Secret Manager.
- [x] **Fixed:** Resolved 401 Auth errors and hidden character key bugs.

## Stage 4: Professional Polish & UX (Current)
- [x] **Fix:** Resolved frozen frame bug in renderer.
- [x] **UX:** Consolidated Voice selection into dropdown.
- [ ] **Mobile Ergonomics:** Final pass on studio card and high-density layout.
- [ ] **Payments:** Final stability verification on live domain.

## Design Philosophy
- **Style over Specs:** Use "WhatsApp Style" instead of "Vertical 1080x1920".
- **Safety First:** Strict `.env` usage, no hardcoded secrets.
- **Logic First:** Action buttons placed where the user needs them next.
- **Studio Ergonomics:** High-density, professional tools with zero fluff.
