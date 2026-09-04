import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Breadcrumbs from "@/components/Breadcrumbs";
import CategoryManager from "@/components/CategoryManager";

export const dynamic = "force-dynamic";

export default async function ModelPage({
  params,
}: {
  params: Promise<{ brandSlug: string; lineSlug: string; modelSlug: string }>;
}) {
  const { brandSlug, lineSlug, modelSlug } = await params;

  const brand = await prisma.brand.findUnique({ where: { slug: brandSlug } });
  if (!brand) notFound();
  const line = await prisma.deviceLine.findUnique({
    where: { brandId_slug: { brandId: brand.id, slug: lineSlug } },
  });
  if (!line) notFound();
  const model = await prisma.model.findUnique({
    where: { deviceLineId_slug: { deviceLineId: line.id, slug: modelSlug } },
    select: {
      id: true,
      name: true,
      slug: true,
      categories: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          _count: { select: { items: true } },
          items: { select: { quantity: true, lowStockThreshold: true } },
        },
      },
    },
  });
  if (!model) notFound();

  const categories = model.categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    itemCount: cat._count.items,
    totalQty: cat.items.reduce((sum, it) => sum + it.quantity, 0),
    lowCount: cat.items.filter((it) => it.quantity <= it.lowStockThreshold).length,
  }));

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: brand.name, href: `/brand/${brand.slug}` },
          { label: line.name, href: `/brand/${brand.slug}/${line.slug}` },
          { label: model.name },
        ]}
      />
      <h1 className="text-2xl font-semibold mb-6">{model.name}</h1>
      <CategoryManager
        modelId={model.id}
        baseHref={`/brand/${brand.slug}/${line.slug}/${model.slug}`}
        categories={categories}
      />
    </div>
  );
}
