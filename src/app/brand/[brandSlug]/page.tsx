import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Breadcrumbs from "@/components/Breadcrumbs";

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

  return (
    <div>
      <Breadcrumbs items={[{ label: brand.name }]} />
      <h1 className="text-2xl font-semibold mb-6">{brand.name}</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {brand.lines.map((line) => (
          <Link
            key={line.id}
            href={`/brand/${brand.slug}/${line.slug}`}
            className="rounded-lg border border-black/10 dark:border-white/15 p-4 hover:border-blue-500 hover:shadow-sm transition flex flex-col gap-1"
          >
            <span className="font-medium">{line.name}</span>
            <span className="text-sm text-black/50 dark:text-white/50">
              {line._count.models} model{line._count.models === 1 ? "" : "s"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
