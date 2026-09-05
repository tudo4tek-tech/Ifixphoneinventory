import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Breadcrumbs from "@/components/Breadcrumbs";
import ManagedCardGrid from "@/components/ManagedCardGrid";

export const dynamic = "force-dynamic";

const STANDARD_CATEGORIES = [
  "Screens",
  "Batteries",
  "Tampa",
  "Chassis",
  "Charging Board",
  "Cameras",
  "Speakers",
  "Network Flex",
  "Volume Flex",
  "Power Flex",
  "Main Flex",
  "Adhesives",
  "Buttons",
  "Sim Tray",
  "IC & Screws",
  "Other",
];

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

  const items = model.categories.map((cat) => {
    const totalQty = cat.items.reduce((sum, it) => sum + it.quantity, 0);
    const lowCount = cat.items.filter((it) => it.quantity <= it.lowStockThreshold).length;
    return {
      id: cat.id,
      name: cat.name,
      meta: `${cat._count.items} part${cat._count.items === 1 ? "" : "s"} · ${totalQty} in stock`,
      warn: lowCount > 0 ? `${lowCount} low stock` : undefined,
    };
  });

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
      <ManagedCardGrid
        items={items}
        kind="category"
        basePath={`/brand/${brand.slug}/${line.slug}/${model.slug}`}
        parentId={model.id}
        suggestions={STANDARD_CATEGORIES}
        emptyText="No part categories yet for this model."
        addPlaceholder="Custom category name…"
      />
    </div>
  );
}
