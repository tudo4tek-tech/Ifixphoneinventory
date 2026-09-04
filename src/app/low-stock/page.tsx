import { prisma } from "@/lib/prisma";
import Breadcrumbs from "@/components/Breadcrumbs";
import ItemListRow from "@/components/ItemListRow";
import { ITEM_LIST_SELECT } from "@/lib/itemSelect";

export const dynamic = "force-dynamic";

const LIMIT = 300;

export default async function LowStockPage() {
  const lowStockRows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "InventoryItem" WHERE quantity <= "lowStockThreshold"
  `;

  const items = await prisma.inventoryItem.findMany({
    where: { id: { in: lowStockRows.slice(0, LIMIT).map((r) => r.id) } },
    orderBy: { quantity: "asc" },
    select: ITEM_LIST_SELECT,
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: "Low Stock" }]} />
      <h1 className="text-2xl font-semibold mb-1">Low Stock</h1>
      <p className="text-black/60 dark:text-white/60 mb-6">
        {lowStockRows.length.toLocaleString()} part{lowStockRows.length === 1 ? "" : "s"} at or below
        their low-stock threshold
        {lowStockRows.length > LIMIT ? ` (showing the ${LIMIT} lowest)` : ""}.
      </p>

      {items.length === 0 ? (
        <p className="text-black/50 dark:text-white/50">Nothing is low on stock.</p>
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
