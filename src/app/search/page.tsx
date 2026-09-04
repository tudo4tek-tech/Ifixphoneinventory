import { prisma } from "@/lib/prisma";
import ItemListRow from "@/components/ItemListRow";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const matchIds = query
    ? await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "InventoryItem"
        WHERE unaccent(name) ILIKE unaccent(${"%" + query + "%"})
           OR (reference IS NOT NULL AND unaccent(reference) ILIKE unaccent(${"%" + query + "%"}))
        LIMIT 100
      `
    : [];

  const items = matchIds.length
    ? await prisma.inventoryItem.findMany({
        where: { id: { in: matchIds.map((r) => r.id) } },
        orderBy: { name: "asc" },
        include: {
          partCategory: {
            include: { model: { include: { deviceLine: { include: { brand: true } } } } },
          },
        },
      })
    : [];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Search</h1>
      <p className="text-black/60 dark:text-white/60 mb-6">
        {query ? `Results for "${query}"` : "Type a search term above."}
      </p>

      {query && items.length === 0 && (
        <p className="text-black/50 dark:text-white/50">No parts matched.</p>
      )}

      <div className="rounded-lg border border-black/10 dark:border-white/15 divide-y divide-black/10 dark:divide-white/10">
        {items.map((item) => (
          <ItemListRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
