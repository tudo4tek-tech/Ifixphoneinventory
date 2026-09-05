import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

// tsx does not auto-load .env, and neither does @prisma/client -- load it
// explicitly so `npm run db:seed` works the same locally as it does when
// DATABASE_URL is injected directly (e.g. by Vercel, with no .env file).
try {
  process.loadEnvFile();
} catch {
  // no .env file present -- fine if DATABASE_URL is already in the env.
}

import { PrismaClient, Prisma } from "@prisma/client";
import { translateText, translateLineName, translateModelName } from "./translate";
import { classifyCategory, CATEGORY_ORDER } from "./classify";

const prisma = new PrismaClient();

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type Tree = Record<
  string,
  Record<
    string,
    {
      id: string;
      url: string;
      models: { id: string; name: string; url: string; part_types: unknown[] }[];
    }
  >
>;

type RawProduct = {
  id: string | null;
  name: string | null;
  price: string | null;
  url: string | null;
  ref: string | null;
};

type RawModelResult = {
  brand: string;
  line: string;
  model: string;
  part_type_id: string;
  part_type_name: string;
  part_type_url: string;
  products: RawProduct[];
};

function parsePrice(raw: string | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Bulk-insert in chunks instead of one row at a time -- against a remote
// database (Supabase, Neon, etc.) at ~100-150ms round-trip, a few thousand
// individual awaited creates can take well over an hour; a few dozen
// batched createMany calls take seconds. Safe here because the whole
// catalog is wiped and rebuilt from scratch every run (see below), so
// there's no existing-row merging to worry about.
async function bulkInsert<T>(
  model: { createMany: (args: { data: T[] }) => Prisma.PrismaPromise<unknown> },
  rows: T[],
  batchSize = 1000
) {
  for (let i = 0; i < rows.length; i += batchSize) {
    await model.createMany({ data: rows.slice(i, i + batchSize) });
  }
}

async function main() {
  const dataDir = path.join(__dirname, "..", "data");
  const tree: Tree = JSON.parse(fs.readFileSync(path.join(dataDir, "categories_tree.json"), "utf-8"));
  const products: RawModelResult[] = JSON.parse(fs.readFileSync(path.join(dataDir, "products_raw.json"), "utf-8"));

  console.log(`Loaded tree for brands: ${Object.keys(tree).join(", ")}`);
  console.log(`Loaded ${products.length} model-level product groups`);

  console.log("Clearing existing catalog data...");
  await prisma.inventoryItem.deleteMany({});
  await prisma.partCategory.deleteMany({});
  await prisma.model.deleteMany({});
  await prisma.deviceLine.deleteMany({});
  await prisma.brand.deleteMany({});

  // Index products by original (pre-translation) "brand||line||model" so we
  // can attach them to the right model as scraped. A model may have several
  // groups (one per scraped source subcategory); we flatten all of them and
  // reclassify every product fresh, ignoring the old grouping, so every
  // brand/model ends up using the exact same standardized category set.
  const byModel = new Map<string, RawProduct[]>();
  for (const p of products) {
    const key = `${p.brand}||${p.line}||${p.model}`;
    if (!byModel.has(key)) byModel.set(key, []);
    byModel.get(key)!.push(...p.products);
  }

  const brandRows: Prisma.BrandCreateManyInput[] = [];
  const lineRows: Prisma.DeviceLineCreateManyInput[] = [];
  const modelRows: Prisma.ModelCreateManyInput[] = [];
  const categoryRows: Prisma.PartCategoryCreateManyInput[] = [];
  const itemRows: Prisma.InventoryItemCreateManyInput[] = [];

  console.log("Building catalog in memory (translating + classifying)...");

  for (const [brandName, lines] of Object.entries(tree)) {
    const brandId = randomUUID();
    brandRows.push({ id: brandId, name: brandName, slug: slugify(brandName) });

    for (const [lineName, lineData] of Object.entries(lines)) {
      const translatedLineName = translateLineName(lineName);
      const lineId = randomUUID();
      lineRows.push({
        id: lineId,
        name: translatedLineName,
        slug: slugify(translatedLineName),
        brandId,
      });

      for (const model of lineData.models) {
        const translatedModelName = translateModelName(model.name);
        const modelId = randomUUID();
        modelRows.push({
          id: modelId,
          name: translatedModelName,
          slug: slugify(translatedModelName),
          sourceUrl: model.url,
          deviceLineId: lineId,
        });

        // Look up scraped products using the ORIGINAL (untranslated) key,
        // since that's how the scraper recorded brand/line/model.
        const key = `${brandName}||${lineName}||${model.name}`;
        const rawProducts = byModel.get(key) ?? [];

        // Translate every product name once, then classify by the
        // translated text so category assignment matches what a reader
        // actually sees, and bucket by the resulting standardized name.
        const byCategory = new Map<string, { prod: RawProduct; translatedName: string }[]>();
        for (const prod of rawProducts) {
          if (!prod.name) continue;
          const translatedName = translateText(prod.name);
          const categoryName = classifyCategory(translatedName);
          if (!byCategory.has(categoryName)) byCategory.set(categoryName, []);
          byCategory.get(categoryName)!.push({ prod, translatedName });
        }

        for (const [categoryName, entries] of byCategory) {
          const categoryId = randomUUID();
          categoryRows.push({
            id: categoryId,
            name: categoryName,
            order: CATEGORY_ORDER[categoryName] ?? 50,
            modelId,
          });

          for (const { prod, translatedName } of entries) {
            itemRows.push({
              id: randomUUID(),
              name: translatedName,
              reference: prod.ref ?? null,
              sourceProductId: prod.id ?? null,
              sourceUrl: prod.url ?? null,
              referencePriceEur: parsePrice(prod.price),
              quantity: 0,
              partCategoryId: categoryId,
            });
          }
        }
      }
    }
  }

  console.log(
    `Built ${brandRows.length} brands, ${lineRows.length} lines, ${modelRows.length} models, ` +
      `${categoryRows.length} categories, ${itemRows.length} items. Inserting...`
  );

  await bulkInsert(prisma.brand, brandRows);
  await bulkInsert(prisma.deviceLine, lineRows);
  await bulkInsert(prisma.model, modelRows, 500);
  await bulkInsert(prisma.partCategory, categoryRows, 1000);
  await bulkInsert(prisma.inventoryItem, itemRows, 1000);

  console.log(
    `\nDone. Brands: ${brandRows.length}, Lines: ${lineRows.length}, Models: ${modelRows.length}, ` +
      `Categories: ${categoryRows.length}, Items: ${itemRows.length}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
