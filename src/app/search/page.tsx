import { prisma } from "@/lib/prisma";
import ItemListRow from "@/components/ItemListRow";
import { ITEM_LIST_SELECT } from "@/lib/itemSelect";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  // Rank by full-text relevance (matches any/all keywords, any order, e.g.
  // "12 screen iphone" finds the same things as "iphone 12 screen"), and
  // fall back to a plain substring match for partial codes/words that a
  // whole-lexeme keyword search would otherwise miss (e.g. typing half of
  // a reference code). Substring-only hits rank below any keyword match.
  const rankedIds = query
    ? await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "InventoryItem"
        WHERE to_tsvector('simple', unaccent(name || ' ' || coalesce(reference, '')))
              @@ websearch_to_tsquery('simple', unaccent(${query}))
           OR unaccent(name) ILIKE unaccent(${"%" + query + "%"})
           OR (reference IS NOT NULL AND unaccent(reference) ILIKE unaccent(${"%" + query + "%"}))
        ORDER BY
          ts_rank(
            to_tsvector('simple', unaccent(name || ' ' || coalesce(reference, ''))),
            websearch_to_tsquery('simple', unaccent(${query}))
          ) DESC NULLS LAST,
          name ASC
        LIMIT 100
      `
    : [];

  const items = rankedIds.length
    ? await prisma.inventoryItem.findMany({
        where: { id: { in: rankedIds.map((r) => r.id) } },
        select: ITEM_LIST_SELECT,
      })
    : [];

  // Prisma's findMany doesn't preserve the `id IN (...)` order, so re-sort
  // by the relevance ranking the raw query already computed.
  const rankIndex = new Map(rankedIds.map((r, i) => [r.id, i]));
  items.sort((a, b) => (rankIndex.get(a.id) ?? 0) - (rankIndex.get(b.id) ?? 0));

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
