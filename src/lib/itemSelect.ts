// Shared field selection for item list views (dashboard panels, search,
// in-stock, low-stock). Deliberately excludes sourceUrl/sourceProductId
// (both Model.sourceUrl and InventoryItem.sourceUrl) so no reference back
// to the original scraped site ever reaches the browser.
export const ITEM_LIST_SELECT = {
  id: true,
  name: true,
  quantity: true,
  lowStockThreshold: true,
  partCategory: {
    select: {
      name: true,
      model: {
        select: {
          name: true,
          slug: true,
          deviceLine: {
            select: {
              name: true,
              slug: true,
              brand: { select: { name: true, slug: true } },
            },
          },
        },
      },
    },
  },
} as const;
