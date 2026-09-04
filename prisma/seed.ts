import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { translateText, translateLineName, translateModelName } from "./translate";
import { classifyCategory, CATEGORY_ORDER } from "./classify";

const prisma = new PrismaClient();

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
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

  let brandCount = 0, lineCount = 0, modelCount = 0, categoryCount = 0, itemCount = 0;

  for (const [brandName, lines] of Object.entries(tree)) {
    const brand = await prisma.brand.upsert({
      where: { slug: slugify(brandName) },
      update: {},
      create: { name: brandName, slug: slugify(brandName) },
    });
    brandCount++;

    for (const [lineName, lineData] of Object.entries(lines)) {
      const translatedLineName = translateLineName(lineName);
      const lineSlug = slugify(translatedLineName);
      const deviceLine = await prisma.deviceLine.upsert({
        where: { brandId_slug: { brandId: brand.id, slug: lineSlug } },
        update: {},
        create: { name: translatedLineName, slug: lineSlug, brandId: brand.id },
      });
      lineCount++;

      for (const model of lineData.models) {
        const translatedModelName = translateModelName(model.name);
        const modelSlug = slugify(translatedModelName);
        const modelRow = await prisma.model.upsert({
          where: { deviceLineId_slug: { deviceLineId: deviceLine.id, slug: modelSlug } },
          update: { sourceUrl: model.url },
          create: {
            name: translatedModelName,
            slug: modelSlug,
            sourceUrl: model.url,
            deviceLineId: deviceLine.id,
          },
        });
        modelCount++;

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
          const partCategory = await prisma.partCategory.upsert({
            where: { modelId_name: { modelId: modelRow.id, name: categoryName } },
            update: {},
            create: {
              name: categoryName,
              order: CATEGORY_ORDER[categoryName] ?? 50,
              modelId: modelRow.id,
            },
          });
          categoryCount++;

          for (const { prod, translatedName } of entries) {
            const existing = prod.id
              ? await prisma.inventoryItem.findFirst({
                  where: { partCategoryId: partCategory.id, sourceProductId: prod.id },
                })
              : null;
            if (existing) continue;
            await prisma.inventoryItem.create({
              data: {
                name: translatedName,
                reference: prod.ref ?? null,
                sourceProductId: prod.id ?? null,
                sourceUrl: prod.url ?? null,
                referencePriceEur: parsePrice(prod.price),
                quantity: 0,
                partCategoryId: partCategory.id,
              },
            });
            itemCount++;
          }
        }
      }
      console.log(`  seeded line "${translatedLineName}" (${lineData.models.length} models)`);
    }
  }

  console.log(
    `\nDone. Brands: ${brandCount}, Lines: ${lineCount}, Models: ${modelCount}, Categories: ${categoryCount}, Items: ${itemCount}`
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
