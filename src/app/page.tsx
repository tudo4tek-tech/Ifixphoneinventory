import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ItemListRow from "@/components/ItemListRow";

export const dynamic = "force-dynamic";

const PREVIEW_COUNT = 8;

export default async function HomePage() {
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { lines: true } } },
  });

  const [totalItems, lowStockRows, totalUnits, inStockCount, inStockItems] = await Promise.all([
    prisma.inventoryItem.count(),
    prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "InventoryItem" WHERE quantity <= "lowStockThreshold"
    `,
    prisma.inventoryItem.aggregate({ _sum: { quantity: true } }),
    prisma.inventoryItem.count({ where: { quantity: { gt: 0 } } }),
    prisma.inventoryItem.findMany({
      where: { quantity: { gt: 0 } },
      orderBy: { updatedAt: "desc" },
      take: PREVIEW_COUNT,
      include: {
        partCategory: { include: { model: { include: { deviceLine: { include: { brand: true } } } } } },
      },
    }),
  ]);
  const lowStockCount = lowStockRows.length;

  const lowStockItems = await prisma.inventoryItem.findMany({
    where: { id: { in: lowStockRows.slice(0, PREVIEW_COUNT).map((r) => r.id) } },
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
        <StatCard label="Total units in stock" value={(totalUnits._sum.quantity ?? 0).toLocaleString()} href="/in-stock" />
        <StatCard
          label="Low stock parts"
          value={lowStockCount.toLocaleString()}
          accent={lowStockCount > 0 ? "warn" : undefined}
          href="/low-stock"
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StockPanel
          title="In Stock"
          count={inStockCount}
          href="/in-stock"
          items={inStockItems}
          emptyText="Nothing in stock yet. Add quantities from any part's page."
        />
        <StockPanel
          title="Low Stock"
          count={lowStockCount}
          href="/low-stock"
          items={lowStockItems}
          emptyText="Nothing is low on stock."
          accent="warn"
        />
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  href,
}: {
  label: string;
  value: string;
  accent?: "warn";
  href?: string;
}) {
  const body = (
    <div
      className={`rounded-lg border border-black/10 dark:border-white/15 p-4 h-full ${
        href ? "hover:border-blue-500 hover:shadow-sm transition" : ""
      }`}
    >
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
  return href ? <Link href={href}>{body}</Link> : body;
}

function StockPanel({
  title,
  count,
  href,
  items,
  emptyText,
  accent,
}: {
  title: string;
  count: number;
  href: string;
  items: Parameters<typeof ItemListRow>[0]["item"][];
  emptyText: string;
  accent?: "warn";
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <Link href={href} className="group flex items-baseline gap-2 hover:underline">
          <h2 className="text-lg font-semibold">{title}</h2>
          <span
            className={`text-sm ${
              accent === "warn" && count > 0
                ? "text-red-600 dark:text-red-400 font-semibold"
                : "text-black/50 dark:text-white/50"
            }`}
          >
            ({count.toLocaleString()})
          </span>
        </Link>
        {count > items.length && (
          <Link href={href} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            View all
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-black/50 dark:text-white/50 text-sm">{emptyText}</p>
      ) : (
        <div className="rounded-lg border border-black/10 dark:border-white/15 divide-y divide-black/10 dark:divide-white/10">
          {items.map((item) => (
            <ItemListRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
