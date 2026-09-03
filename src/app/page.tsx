import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { lines: true } } },
  });

  const [totalItems, lowStockRows, totalUnits] = await Promise.all([
    prisma.inventoryItem.count(),
    prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "InventoryItem" WHERE quantity <= "lowStockThreshold"
    `,
    prisma.inventoryItem.aggregate({ _sum: { quantity: true } }),
  ]);
  const lowStockCount = lowStockRows.length;

  const lowStockItems = await prisma.inventoryItem.findMany({
    where: { id: { in: lowStockRows.slice(0, 8).map((r) => r.id) } },
    orderBy: { quantity: "asc" },
    include: {
      partCategory: { include: { model: { include: { deviceLine: { include: { brand: true } } } } } },
    },
  });

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold mb-1">Spare Part Inventory</h1>
        <p className="text-black/60 dark:text-white/60 mb-6">
          Browse by brand to find a part, or track stock levels below.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brand/${brand.slug}`}
              className="rounded-lg border border-black/10 dark:border-white/15 p-5 hover:border-blue-500 hover:shadow-sm transition flex flex-col gap-1"
            >
              <span className="text-lg font-medium">{brand.name}</span>
              <span className="text-sm text-black/50 dark:text-white/50">
                {brand._count.lines} device line{brand._count.lines === 1 ? "" : "s"}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total parts tracked" value={totalItems.toLocaleString()} />
        <StatCard label="Total units in stock" value={(totalUnits._sum.quantity ?? 0).toLocaleString()} />
        <StatCard
          label="Low stock parts"
          value={lowStockCount.toLocaleString()}
          accent={lowStockCount > 0 ? "warn" : undefined}
        />
      </section>

      {lowStockItems.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Low stock</h2>
          <div className="rounded-lg border border-black/10 dark:border-white/15 divide-y divide-black/10 dark:divide-white/10">
            {lowStockItems.map((item) => {
              const m = item.partCategory.model;
              const line = m.deviceLine;
              const brand = line.brand;
              return (
                <Link
                  key={item.id}
                  href={`/brand/${brand.slug}/${line.slug}/${m.slug}/${slugify(item.partCategory.name)}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-sm"
                >
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-black/50 dark:text-white/50">
                      {brand.name} / {line.name} / {m.name} / {item.partCategory.name}
                    </div>
                  </div>
                  <span className="text-red-600 dark:text-red-400 font-semibold">
                    {item.quantity} left
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "warn";
}) {
  return (
    <div className="rounded-lg border border-black/10 dark:border-white/15 p-4">
      <div className="text-sm text-black/50 dark:text-white/50">{label}</div>
      <div
        className={`text-2xl font-semibold ${
          accent === "warn" ? "text-red-600 dark:text-red-400" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
