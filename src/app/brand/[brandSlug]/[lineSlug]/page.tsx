import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Breadcrumbs from "@/components/Breadcrumbs";
import ManagedCardGrid from "@/components/ManagedCardGrid";

export const dynamic = "force-dynamic";

export default async function LinePage({
  params,
}: {
  params: Promise<{ brandSlug: string; lineSlug: string }>;
}) {
  const { brandSlug, lineSlug } = await params;

  const brand = await prisma.brand.findUnique({ where: { slug: brandSlug } });
  if (!brand) notFound();

  const line = await prisma.deviceLine.findUnique({
    where: { brandId_slug: { brandId: brand.id, slug: lineSlug } },
    include: {
      models: {
        orderBy: { name: "asc" },
        include: { _count: { select: { categories: true } } },
      },
    },
  });
  if (!line) notFound();

  const items = line.models.map((model) => ({
    id: model.id,
    name: model.name,
    slug: model.slug,
    meta: `${model._count.categories} categor${model._count.categories === 1 ? "y" : "ies"}`,
  }));

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: brand.name, href: `/brand/${brand.slug}` },
          { label: line.name },
        ]}
      />
      <h1 className="text-2xl font-semibold mb-6">
        {brand.name} {line.name}
      </h1>
      <ManagedCardGrid
        items={items}
        kind="model"
        basePath={`/brand/${brand.slug}/${line.slug}`}
        parentId={line.id}
        emptyText="No models yet."
        addPlaceholder="New model name…"
      />
    </div>
  );
}
