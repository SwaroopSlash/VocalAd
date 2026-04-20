# AdVocalize Pro - Roadmap & Versions

## Core Mandates & Governance
- **Logic Integrity:** CRITICAL. Any major decision or refactor that affects the application flow, backend logic, or core functional paths (Auth, Payments, Engine) MUST receive explicit user permission before implementation.
- **Stability Over Aesthetics:** Functional logic must never be traded off for UI design decisions unless specifically requested.

## Stage 4: Professional Polish & UX (Current)
- [x] **Fix:** Resolved frozen frame bug in renderer.
- [x] **UX:** Consolidated Voice selection into dropdown.
- [x] **Payments:** Final stability verification on live domain.
- [x] **Webhook:** Implemented Golden Logic (Idempotency, Fast 200, Full Secrets).

## Final Technical Handover (Integration Map)

### 1. Razorpay Dashboard Settings
- **Whitelisted Domains:**
  - `vocal-ad.co.in`
  - `www.vocal-ad.co.in`
  - `advocalize.web.app`
  - `advocalize.firebaseapp.com`
- **Webhook URL:** `https://razorpaywebhookv2-uiasllwjoa-uc.a.run.app`
- **Webhook Secret:** `vocalad_secure_hook_2026`
- **Webhook Event:** `payment.captured`

### 2. Firebase Secret Manager
- `RAZORPAY_KEY_ID`: `rzp_live_SfCZvOMFGefR8r`
- `RAZORPAY_KEY_SECRET`: [Set correctly by user]
- `RAZORPAY_WEBHOOK_SECRET`: `vocalad_secure_hook_2026`

### 3. Build Configuration
- `appId`: `advocalize-pro-v2` (Synced between frontend and backend)
- **Functions:** Gen 2 (Faster CORS, Dedicated secrets)
- **Frontend:** Self-healing Razorpay script loader

## Design Philosophy
- **Style over Specs:** Use "WhatsApp Style" instead of "Vertical 1080x1920".
- **Studio Ergonomics:** High-density, professional tools with zero fluff.
- **Security First:** No keys in codebase; all managed via Secret Manager.
