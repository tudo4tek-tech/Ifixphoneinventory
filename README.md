# iFix Spare Part Inventory

A spare-part inventory manager for a phone/tablet repair shop. Browse
**Brand → Device line → Model → Part category** and track quantity, cost,
sell price, supplier and notes for every part.

The catalog structure and starting part list (names, reference codes, and
reference prices) were seeded from a scrape of a public spare-parts
storefront, scoped to Apple and Samsung. Your own stock counts, cost and
sell prices start at zero/empty — the reference price is just a baseline
you can compare against.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Prisma 6 + PostgreSQL
- Deploys on Vercel

## Data model

```
Brand → DeviceLine → Model → PartCategory → InventoryItem
```

Each `InventoryItem` has: `quantity`, `lowStockThreshold`, `costPrice`,
`sellPrice`, `supplier`, `notes`, plus read-only scrape provenance
(`reference`, `referencePriceEur`, `sourceUrl`).

## Access control

The whole site is gated behind a single shared password (`SITE_PASSWORD` env
var), enforced in `src/proxy.ts` (Next.js 16 renamed `middleware.ts` to
`proxy.ts`). Anyone who knows the password can view and edit everything —
there are no separate accounts. If `SITE_PASSWORD` is unset, the gate is
skipped entirely (useful for local dev only — always set it in Vercel).

**Optional second factor:** set `SITE_TOTP_SECRET` to also require a
Google Authenticator (or any TOTP app) code before the password is
accepted. Generate one with:

```bash
npx tsx scripts/generate-totp-secret.ts
```

It prints the secret to set as `SITE_TOTP_SECRET` (locally in `.env`, and
in Vercel's environment variables) plus an `otpauth://` URI — paste that
URI into any QR-code generator to scan it into Google Authenticator, or
add it manually via "Enter a setup key" using the printed secret. Once
`SITE_TOTP_SECRET` is set, the login page requires both the password and
a valid 6-digit code; leave it unset to keep password-only login.

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Get a Postgres database.** Easiest path: in the Vercel dashboard, open
   this project → **Storage** → **Create Database** → **Postgres** (this
   provisions a Neon-backed Postgres and wires up the env vars for you).
   Then pull them locally:

   ```bash
   npx vercel link      # if not already linked
   npx vercel env pull .env
   ```

   Alternatively, point `DATABASE_URL` / `DIRECT_URL` in `.env` (copy from
   `.env.example`) at any Postgres instance (local, Supabase, Neon, etc).

3. **Create the schema**

   ```bash
   npx prisma migrate dev --name init
   ```

4. **Seed the catalog** (brands, device lines, models, part categories, and
   the scraped starting part list — reads `data/categories_tree.json` and
   `data/products_raw.json`, translating the scraped Spanish text to
   English via `prisma/translate.ts` on the way in):

   ```bash
   npm run db:seed
   ```

   **Note:** the seed script clears and reloads the whole catalog every
   run (`Brand`/`DeviceLine`/`Model`/`PartCategory`/`InventoryItem` tables
   are wiped first, then rebuilt from `data/*.json`). This keeps re-seeding
   simple after adding a brand or improving the translation dictionary, but
   it means **your own stock quantities, cost/sell prices, supplier and
   notes are NOT preserved across a re-seed** — treat `npm run db:seed` as
   a catalog-structure refresh, not something to run casually once you're
   tracking real stock.

5. **Run the app**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Deploying (GitHub → Vercel)

The GitHub repo is already set up: https://github.com/adnanestate/ifix-spare-part-inventory (private).

1. In Vercel, **Add New → Project** and import that repo.
2. Pick your database — either works, the app doesn't care which:
   - **Vercel Postgres** (Storage tab → Create Database → Postgres) — sets
     `DATABASE_URL`/`DIRECT_URL` automatically for all environments.
   - **Supabase** — create a project, then in Supabase go to
     **Project Settings → Database → Connection string** and copy the
     **URI** (pooled, "Transaction" mode, port 6543) into `DATABASE_URL`
     and the **direct** connection (port 5432) into `DIRECT_URL`, both as
     Vercel environment variables. Supabase's Postgres supports the
     `unaccent` extension this app uses, same as Vercel Postgres/Neon — no
     code changes either way.
3. Add a `SITE_PASSWORD` environment variable in the Vercel project settings
   (Production, and Preview if you want previews gated too). Add
   `SITE_TOTP_SECRET` too if you want the Google Authenticator second
   factor — see "Access control" above.
4. Deploy. On the first deploy, run the schema + seed once against the
   production database:

   ```bash
   npx vercel env pull .env.production.local --environment=production
   npx prisma migrate deploy
   DATABASE_URL=... npm run db:seed   # or run against .env.production.local
   ```

   (`prisma migrate deploy` is safe to re-run on later deploys as the
   schema evolves. The seed is **not** safe to casually re-run once real
   stock data exists — see the warning above.)

## Re-scraping / extending the catalog

`scripts/scrape.py` (Python) crawls the source site's category tree and
product listings. It currently covers Apple, Samsung, Xiaomi, and Oppo via
the `ROOTS` dict at the top of the file — add another brand's root
category URL there to extend coverage, or scrape a new brand in isolation
(temporary `ROOTS` override + separate output dir) and merge its
`categories_tree.json`/`products_raw.json` into `data/` to avoid
re-scraping brands already done. Either way, re-running `npm run db:seed`
afterward wipes and rebuilds the whole catalog from `data/*.json` — fine
before you're tracking real stock, but back up your `InventoryItem` table
first if you're not.

Spanish → English translation happens in `prisma/translate.ts` at seed
time (a phrase dictionary, then a ~200-word dictionary, applied to product
names, device line names, and part category names). It's a best-effort
rule-based translation, not a translation API — if you spot a term it
missed, add it to the dictionary in that file and re-seed.
