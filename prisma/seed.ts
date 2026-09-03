import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

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
  "Pantallas": 1,
  "Baterías": 2,
  "Tapas": 3,
  "Chasis": 4,
  "Conectores": 5,
  "Cámaras": 6,
  "Altavoces": 7,
  "Flex": 8,
  "Adhesivos": 9,
  "Sim & Botones": 10,
  "IC & Tornillos": 11,
  "Otros": 99,
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

async function main() {
  const dataDir = path.join(__dirname, "..", "data");
  const tree: Tree = JSON.parse(fs.readFileSync(path.join(dataDir, "categories_tree.json"), "utf-8"));
  const products: RawModelResult[] = JSON.parse(fs.readFileSync(path.join(dataDir, "products_raw.json"), "utf-8"));

  console.log(`Loaded tree for brands: ${Object.keys(tree).join(", ")}`);
  console.log(`Loaded ${products.length} model-level product groups`);

  // Index products by "brand||line||model" so we can attach them to the right model.
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
      const lineSlug = slugify(lineName);
      const deviceLine = await prisma.deviceLine.upsert({
        where: { brandId_slug: { brandId: brand.id, slug: lineSlug } },
        update: {},
        create: { name: lineName, slug: lineSlug, brandId: brand.id },
      });
      lineCount++;

      for (const model of lineData.models) {
        const modelSlug = slugify(model.name);
        const modelRow = await prisma.model.upsert({
          where: { deviceLineId_slug: { deviceLineId: deviceLine.id, slug: modelSlug } },
          update: { sourceUrl: model.url },
          create: {
            name: model.name,
            slug: modelSlug,
            sourceUrl: model.url,
            deviceLineId: deviceLine.id,
          },
        });
        modelCount++;

        const key = `${brandName}||${lineName}||${model.name}`;
        const groups = byModel.get(key) ?? [];

        for (const group of groups) {
          if (group.products.length === 0) continue;
          const partCategory = await prisma.partCategory.upsert({
            where: { modelId_name: { modelId: modelRow.id, name: group.part_type_name } },
            update: {},
            create: {
              name: group.part_type_name,
              order: PART_TYPE_ORDER[group.part_type_name] ?? 50,
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
                name: prod.name,
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
      console.log(`  seeded line "${lineName}" (${lineData.models.length} models)`);
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
