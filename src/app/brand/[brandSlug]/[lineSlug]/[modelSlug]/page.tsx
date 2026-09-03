import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Breadcrumbs from "@/components/Breadcrumbs";
import AddCategoryForm from "@/components/AddCategoryForm";
import { slugify } from "@/lib/slug";

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
    include: {
      categories: {
        orderBy: { order: "asc" },
        include: {
          _count: { select: { items: true } },
          items: { select: { quantity: true, lowStockThreshold: true } },
        },
      },
    },
  });
  if (!model) notFound();

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: brand.name, href: `/brand/${brand.slug}` },
          { label: line.name, href: `/brand/${brand.slug}/${line.slug}` },
          { label: model.name },
        ]}
      />
      <h1 className="text-2xl font-semibold mb-1">{model.name}</h1>
      {model.sourceUrl && (
        <a
          href={model.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          reference listing ↗
        </a>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6">
        {model.categories.map((cat) => {
          const totalQty = cat.items.reduce((sum, it) => sum + it.quantity, 0);
          const low = cat.items.filter((it) => it.quantity <= it.lowStockThreshold).length;
          return (
            <Link
              key={cat.id}
              href={`/brand/${brand.slug}/${line.slug}/${model.slug}/${slugify(cat.name)}`}
              className="rounded-lg border border-black/10 dark:border-white/15 p-4 hover:border-blue-500 hover:shadow-sm transition flex flex-col gap-1"
            >
              <span className="font-medium">{cat.name}</span>
              <span className="text-sm text-black/50 dark:text-white/50">
                {cat._count.items} part{cat._count.items === 1 ? "" : "s"} · {totalQty} in stock
              </span>
              {low > 0 && (
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                  {low} low stock
                </span>
              )}
            </Link>
          );
        })}
      </div>
      {model.categories.length === 0 && (
        <div>
          <p className="text-black/50 dark:text-white/50 mb-2">
            No part categories yet for this model.
          </p>
          <AddCategoryForm modelId={model.id} />
        </div>
      )}
    </div>
  );
}
