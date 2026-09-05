import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Breadcrumbs from "@/components/Breadcrumbs";
import { compareModelsNewestFirst } from "@/lib/modelSort";

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

  const models = [...line.models].sort(compareModelsNewestFirst);

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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {models.map((model) => (
          <Link
            key={model.id}
            href={`/brand/${brand.slug}/${line.slug}/${model.slug}`}
            className="rounded-lg border border-black/10 dark:border-white/15 p-4 hover:border-blue-500 hover:shadow-sm transition flex flex-col gap-1"
          >
            <span className="font-medium">{model.name}</span>
            <span className="text-sm text-black/50 dark:text-white/50">
              {model._count.categories} categor{model._count.categories === 1 ? "y" : "ies"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
