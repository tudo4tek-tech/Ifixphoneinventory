import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Breadcrumbs from "@/components/Breadcrumbs";
import ManagedCardGrid from "@/components/ManagedCardGrid";

export const dynamic = "force-dynamic";

export default async function BrandPage({
  params,
}: {
  params: Promise<{ brandSlug: string }>;
}) {
  const { brandSlug } = await params;

  const brand = await prisma.brand.findUnique({
    where: { slug: brandSlug },
    include: {
      lines: {
        orderBy: { name: "asc" },
        include: { _count: { select: { models: true } } },
      },
    },
  });

  if (!brand) notFound();

  const items = brand.lines.map((line) => ({
    id: line.id,
    name: line.name,
    slug: line.slug,
    meta: `${line._count.models} model${line._count.models === 1 ? "" : "s"}`,
  }));

  return (
    <div>
      <Breadcrumbs items={[{ label: brand.name }]} />
      <h1 className="text-2xl font-semibold mb-6">{brand.name}</h1>
      <ManagedCardGrid
        items={items}
        kind="line"
        basePath={`/brand/${brand.slug}`}
        parentId={brand.id}
        emptyText="No device lines yet."
        addPlaceholder="New device line name…"
      />
    </div>
  );
}
