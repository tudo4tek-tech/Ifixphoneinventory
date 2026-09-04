import { prisma } from "@/lib/prisma";
import Breadcrumbs from "@/components/Breadcrumbs";
import ItemListRow from "@/components/ItemListRow";

export const dynamic = "force-dynamic";

const LIMIT = 300;

export default async function InStockPage() {
  const [total, items] = await Promise.all([
    prisma.inventoryItem.count({ where: { quantity: { gt: 0 } } }),
    prisma.inventoryItem.findMany({
      where: { quantity: { gt: 0 } },
      orderBy: { updatedAt: "desc" },
      take: LIMIT,
      include: {
        partCategory: { include: { model: { include: { deviceLine: { include: { brand: true } } } } } },
      },
    }),
  ]);

  return (
    <div>
      <Breadcrumbs items={[{ label: "In Stock" }]} />
      <h1 className="text-2xl font-semibold mb-1">In Stock</h1>
      <p className="text-black/60 dark:text-white/60 mb-6">
        {total.toLocaleString()} part{total === 1 ? "" : "s"} currently have stock
        {total > LIMIT ? ` (showing the ${LIMIT} most recently updated)` : ""}.
      </p>

      {items.length === 0 ? (
        <p className="text-black/50 dark:text-white/50">
          Nothing in stock yet. Add quantities from any part&apos;s page.
        </p>
      ) : (
        <div className="rounded-lg border border-black/10 dark:border-white/15 divide-y divide-black/10 dark:divide-white/10">
          {items.map((item) => (
            <ItemListRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
