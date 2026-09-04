import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Breadcrumbs from "@/components/Breadcrumbs";
import ItemsTable from "@/components/ItemsTable";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{
    brandSlug: string;
    lineSlug: string;
    modelSlug: string;
    categorySlug: string;
  }>;
}) {
  const { brandSlug, lineSlug, modelSlug, categorySlug } = await params;

  const brand = await prisma.brand.findUnique({ where: { slug: brandSlug } });
  if (!brand) notFound();
  const line = await prisma.deviceLine.findUnique({
    where: { brandId_slug: { brandId: brand.id, slug: lineSlug } },
  });
  if (!line) notFound();
  const model = await prisma.model.findUnique({
    where: { deviceLineId_slug: { deviceLineId: line.id, slug: modelSlug } },
    include: { categories: { orderBy: { order: "asc" } } },
  });
  if (!model) notFound();

  const category = model.categories.find((c) => slugify(c.name) === categorySlug);
  if (!category) notFound();

  const items = await prisma.inventoryItem.findMany({
    where: { partCategoryId: category.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      reference: true,
      referencePriceEur: true,
      costPrice: true,
      sellPrice: true,
      quantity: true,
      lowStockThreshold: true,
      supplier: true,
      notes: true,
    },
  });

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: brand.name, href: `/brand/${brand.slug}` },
          { label: line.name, href: `/brand/${brand.slug}/${line.slug}` },
          { label: model.name, href: `/brand/${brand.slug}/${line.slug}/${model.slug}` },
          { label: category.name },
        ]}
      />
      <h1 className="text-2xl font-semibold mb-6">
        {model.name} — {category.name}
      </h1>
      <ItemsTable items={items} categoryId={category.id} />
    </div>
  );
}
