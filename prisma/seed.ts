import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import {
  translateText,
  translateLineName,
  translateModelName,
  PART_TYPE_TRANSLATIONS,
} from "./translate";

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

const PART_TYPE_ORDER: Record<string, number> = {
  "Screens": 1,
  "Batteries": 2,
  "Back Covers": 3,
  "Chassis": 4,
  "Connectors": 5,
  "Cameras": 6,
  "Speakers": 7,
  "Flex Cables": 8,
  "Adhesives": 9,
  "SIM & Buttons": 10,
  "IC & Screws": 11,
  "Other": 99,
};

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

function translatePartType(name: string): string {
  return PART_TYPE_TRANSLATIONS[name] ?? translateText(name);
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
  // can attach them to the right model as scraped.
  const byModel = new Map<string, RawModelResult[]>();
  for (const p of products) {
    const key = `${p.brand}||${p.line}||${p.model}`;
    if (!byModel.has(key)) byModel.set(key, []);
    byModel.get(key)!.push(p);
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
        const groups = byModel.get(key) ?? [];

        for (const group of groups) {
          if (group.products.length === 0) continue;
          const categoryName = translatePartType(group.part_type_name);
          const partCategory = await prisma.partCategory.upsert({
            where: { modelId_name: { modelId: modelRow.id, name: categoryName } },
            update: {},
            create: {
              name: categoryName,
              order: PART_TYPE_ORDER[categoryName] ?? 50,
              modelId: modelRow.id,
            },
          });
          categoryCount++;

          for (const prod of group.products) {
            if (!prod.name) continue;
            const existing = prod.id
              ? await prisma.inventoryItem.findFirst({
                  where: { partCategoryId: partCategory.id, sourceProductId: prod.id },
                })
              : null;
            if (existing) continue;
            await prisma.inventoryItem.create({
              data: {
                name: translateText(prod.name),
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
