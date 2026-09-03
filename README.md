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
   `data/products_raw.json`):

   ```bash
   npm run db:seed
   ```

5. **Run the app**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Deploying (GitHub → Vercel)

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Add the **Postgres** storage integration in the Vercel project (Storage
   tab) if you haven't already — it sets `DATABASE_URL`/`DIRECT_URL`
   automatically for all environments.
4. Add a `SITE_PASSWORD` environment variable in the Vercel project settings
   (Production, and Preview if you want previews gated too).
5. Deploy. On the first deploy, run the schema + seed once against the
   production database:

   ```bash
   npx vercel env pull .env.production.local --environment=production
   npx prisma migrate deploy
   DATABASE_URL=... npm run db:seed   # or run against .env.production.local
   ```

   (Only needs to be done once — `prisma migrate deploy` is safe to re-run
   on later deploys as the schema evolves; re-running the seed is safe too,
   it skips products it has already imported.)

## Re-scraping / extending the catalog

`scripts/scrape.py` (Python) crawls the source site's category tree and
product listings. It's scoped to Apple + Samsung by editing the `ROOTS`
dict at the top of the file — add another brand's root category URL there
to extend coverage. Re-run it, then re-run `npm run db:seed` (it upserts
brands/lines/models/categories and skips products it already knows about
via their scraped source product ID, so it's safe to re-run).
