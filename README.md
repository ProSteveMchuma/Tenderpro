# SupplierOS Africa

**From Tender to Payment.**

Africa-first B2B SaaS for suppliers, contractors and SMEs that sell to governments, corporates, NGOs, schools, hospitals and parastatals.

SupplierOS is not a document dump. It is an operating system for the full commercial cycle:

Opportunity → Bid → Award → PO/LPO → Sourcing → Delivery → GRN → Invoice → Approval → Payment → Profitability.

The product metric that matters is **money collected**.

## Tech stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4 and shadcn/ui
- **Firebase Firestore** as the default database (`DATABASE_DRIVER=firestore`)
- Firebase project: **tenderpro-480721** (`src/lib/firebase/config.ts`)
- Local file-backed Firestore store (`.data/firestore/db.json`) when no Admin service account is set
- Cloud Firestore via `firebase-admin` when `FIREBASE_SERVICE_ACCOUNT_JSON` or the emulator is configured
- Signed httpOnly sessions (`sos_session`); Firebase Auth is not required
- Firebase Storage for uploads when a service account is configured (local `.data/uploads` in development only)
- Paystack checkout + webhook for subscriptions (`/api/billing/paystack/webhook`)
- AI provider abstraction (`AI_PROVIDER`, `AI_MODEL`) with OpenAI and a schema-validated mock
- Vitest for business-critical tests

## Architecture

- **Multi-tenant:** every business record has `organizationId`. Server actions always use the organization from the authenticated membership, never an unverified client-supplied org id.
- **RBAC:** owner, admin, procurement, finance, operations, viewer with a permission map that can grow.
- **Entitlements:** plan limits live in `src/lib/entitlements.ts` only.
- **Money:** stored as decimal strings in Firestore and calculated with `decimal.js`. No floating-point arithmetic.
- **Tender deadlines:** stored as local date + time + timezone, plus a computed UTC timestamp.
- **AI:** capability functions (`analyzeTender`, `extractPurchaseOrder`, …) with Zod validation. Untrusted document text cannot override system instructions.
- **Notifications:** in-app immediately; email (Resend or console) and WhatsApp (mock) adapters are ready.
- **Billing:** Paystack in production (`PAYSTACK_SECRET_KEY`). Development billing simulates plan switches locally.

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo login:

- Email: `steve@acmesupplies.ke`
- Password: `DemoPass123!`

Steve also belongs to **Acme Supplies Kenya Ltd**. Nina (`nina@riftvalley.ke`) owns a second tenant used to prove isolation.

`DEMO_MODE=true` and `DEMO_SEED_ON_BOOT=true` create the Acme workspace automatically, including:

- Tender `KAA/ICT/024/2026` with missing manufacturer authorization and 2023 audited accounts
- PO `PO-2026-00482` delivered with **signed GRN missing** (invoice blocked)
- Invoice `INV-2026-0084` overdue from 20 August 2026
- Business permit expiring 26 September 2026

## Environment variables

See `.env.example`. Never commit `.env`.

Required in production:

- `DATABASE_DRIVER=firestore`
- `FIREBASE_PROJECT_ID=tenderpro-480721` (and the `NEXT_PUBLIC_FIREBASE_*` web config)
- `FIRESTORE_DATABASE=tenderpro`
- `FIREBASE_SERVICE_ACCOUNT_JSON` (Firebase Admin service account, server only — required to write to Cloud Firestore)
- `STORAGE_DRIVER=firebase`
- `SESSION_SECRET` (long random value, not the example placeholder)
- `NEXT_PUBLIC_APP_URL` (public origin, no trailing slash)
- `PAYSTACK_SECRET_KEY` (and optionally `PAYSTACK_WEBHOOK_SECRET`)
- `DEMO_MODE=false` (unless you intentionally want seeded demo data)
- `EMAIL_PROVIDER=resend` and `RESEND_API_KEY` so verification and invite emails actually send
- `AI_PROVIDER` / `AI_MODEL` / `OPENAI_API_KEY` when live extraction is needed

## Database (Firebase Firestore)

`DATABASE_DRIVER=firestore` is the default.

| Mode | When it is used | Where data lives |
| --- | --- | --- |
| Local document store | No service account / emulator | `.data/firestore/db.json` |
| Cloud Firestore | `FIREBASE_SERVICE_ACCOUNT_PATH` / `FIREBASE_SERVICE_ACCOUNT_JSON` | Project `tenderpro-480721` |

Collections are flat (one collection per entity: `profiles`, `organizations`, `invoices`, `tenders`, …). Fields are camelCase. Money is stored as strings. Soft deletes use `deletedAt`.

Access the database through `src/lib/db/repo.ts` (`listByOrg`, `getOrgDoc`, `createDoc`, `patchDoc`). Tenant isolation is enforced by always querying with the authenticated `organizationId`.

Connect this Firebase project (`tenderpro-480721`):

This project’s native Firestore database is named **`tenderpro`** (`FIRESTORE_DATABASE=tenderpro`). There is no `(default)` database.

1. Firebase Console → Project settings → Service accounts → Generate new private key.
2. Save the file locally (gitignored) and set `FIREBASE_SERVICE_ACCOUNT_PATH`, or paste the JSON into `FIREBASE_SERVICE_ACCOUNT_JSON` (Vercel env, never the browser).
3. Set `FIREBASE_USE_CLOUD=true`.
4. Deploy rules and indexes:

```bash
npx firebase-tools deploy --only firestore --project tenderpro-480721
```

Or run the emulator:

```bash
npx firebase-tools emulators:start --only firestore
# FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

`firestore.rules` deny all client SDK access. Server actions use the Admin SDK.

Postgres / PGlite remain available behind `DATABASE_DRIVER=postgres` or `pglite` for legacy SQL migrations in `supabase/migrations/`.

## AI configuration

```
AI_PROVIDER=mock    # or openai
AI_MODEL=gpt-4.1-mini
OPENAI_API_KEY=
```

Mock mode is fully functional for demos. Live OpenAI responses are schema-validated before anything is written to the database. Low-confidence matches become `REVIEW_REQUIRED`. The engine never fabricates compliance.

## Tests

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Critical coverage includes money math, invoice balances, payment allocation, due dates, expiry, tender readiness, permission enforcement, AI schema validation and tenant isolation.

## Production deployment (Vercel + Firebase)

1. This repo is already pointed at Firebase project `tenderpro-480721`.
2. Generate a service account JSON and set `FIREBASE_PROJECT_ID` plus `FIREBASE_SERVICE_ACCOUNT_JSON` in Vercel. Never expose the service account to the browser.
3. Set `FIRESTORE_DATABASE=tenderpro`. This project has no `(default)` native Firestore database.
4. Deploy `firestore.rules`, `firestore.indexes.json` and `storage.rules`.
5. Deploy this repository. Framework is Next.js (`vercel.json`).
6. Point `NEXT_PUBLIC_APP_URL` at the production domain.
7. Set `DEMO_MODE=false` so production does not seed demo tenants or show demo passwords.
8. Configure Paystack: `PAYSTACK_SECRET_KEY`, webhook `https://<domain>/api/billing/paystack/webhook`.
9. Configure Resend (`EMAIL_PROVIDER=resend`) so email verification and invites leave the server.
10. Configure OpenAI when live extraction is needed. The app can run with `AI_PROVIDER=mock`.

## Security notes

- Tenant isolation is enforced in application code (`listByOrg` / `getOrgDoc`). Firestore rules deny client access.
- Uploads are size-limited, MIME-sniffed and treated as untrusted.
- Prompt injection in tender PDFs cannot override application instructions.
- Audit logs store who did what, not secrets.
- Rate limiting is an in-memory interface intended to be replaced with Redis at scale.

## Product philosophy

Most tender software stops at **submit bid**.

SupplierOS continues:

Submit bid → Win → PO → Deliver → GRN → Invoice → Collect → Profit.
