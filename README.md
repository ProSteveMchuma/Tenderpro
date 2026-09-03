# SupplierOS Africa

**From Tender to Payment.**

Africa-first B2B SaaS for suppliers, contractors and SMEs that sell to governments, corporates, NGOs, schools, hospitals and parastatals.

SupplierOS is not a document dump. It is an operating system for the full commercial cycle:

Opportunity → Bid → Award → PO/LPO → Sourcing → Delivery → GRN → Invoice → Approval → Payment → Profitability.

The product metric that matters is **money collected**.

## Tech stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4 and shadcn/ui
- PostgreSQL via Supabase in production
- PGlite (embedded Postgres) for local/demo when `DATABASE_URL` is not set
- Supabase Auth in production; signed httpOnly sessions in demo mode
- Supabase Storage in production; local `.data/uploads` in demo mode
- AI provider abstraction (`AI_PROVIDER`, `AI_MODEL`) with OpenAI and a schema-validated mock
- Vitest for business-critical tests

## Architecture

- **Multi-tenant:** every business record has `organization_id`. Server actions always use the organization from the authenticated membership, never an unverified client-supplied org id.
- **RBAC:** owner, admin, procurement, finance, operations, viewer with a permission map that can grow.
- **Entitlements:** plan limits live in `src/lib/entitlements.ts` only.
- **Money:** `numeric` in Postgres and `decimal.js` in application code. No floating-point arithmetic.
- **Tender deadlines:** stored as local date + time + timezone, plus a computed UTC timestamp.
- **AI:** capability functions (`analyzeTender`, `extractPurchaseOrder`, …) with Zod validation. Untrusted document text cannot override system instructions.
- **Notifications:** in-app immediately; email (Resend or console) and WhatsApp (mock) adapters are ready.
- **Billing:** development provider ships with the MVP. Paystack and M-Pesa can be added behind the same interface.

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

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `DATABASE_URL` (Supabase Postgres)
- `SESSION_SECRET`
- `AI_PROVIDER` / `AI_MODEL` / `OPENAI_API_KEY` when live extraction is needed

## Database

Schema and RLS live in `supabase/migrations/`.

Local/demo: PGlite applies `20260903_init.sql` on boot and seeds demo data.

Supabase:

```bash
# using the Supabase CLI
supabase start
psql "$DATABASE_URL" -f supabase/migrations/20260903_init.sql
psql "$DATABASE_URL" -f supabase/migrations/20260903_rls.sql
psql "$DATABASE_URL" -f supabase/storage.sql
```

Row Level Security is mandatory on hosted Postgres. The application still enforces membership checks on every mutation.

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

## Production deployment (Vercel + Supabase)

1. Create a Supabase project (Kenya or closest region).
2. Run the SQL migrations and storage policies.
3. Set environment variables in Vercel. Leave service-role keys server-side only.
4. Deploy this repository. Framework is Next.js (`vercel.json`).
5. Point `NEXT_PUBLIC_APP_URL` and `SUPABASE_AUTH_REDIRECT_URL` at the production domain.
6. Switch `DEMO_MODE=false` once real auth is live.
7. Configure Resend, OpenAI and a billing provider when ready. The app runs without them.

## Security notes

- Tenant isolation is enforced in application code and RLS.
- Uploads are size-limited, MIME-sniffed and treated as untrusted.
- Prompt injection in tender PDFs cannot override application instructions.
- Audit logs store who did what, not secrets.
- Rate limiting is an in-memory interface intended to be replaced with Redis at scale.

## Product philosophy

Most tender software stops at **submit bid**.

SupplierOS continues:

Submit bid → Win → PO → Deliver → GRN → Invoice → Collect → Profit.
