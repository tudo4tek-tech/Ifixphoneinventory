import Link from "next/link";
import { slugify } from "@/lib/slug";

export type ItemWithContext = {
  id: string;
  name: string;
  quantity: number;
  lowStockThreshold: number;
  partCategory: {
    name: string;
    model: {
      name: string;
      slug: string;
      deviceLine: {
        name: string;
        slug: string;
        brand: { name: string; slug: string };
      };
    };
  };
};

export default function ItemListRow({ item }: { item: ItemWithContext }) {
  const m = item.partCategory.model;
  const line = m.deviceLine;
  const brand = line.brand;
  const low = item.quantity <= item.lowStockThreshold;

  return (
    <Link
      href={`/brand/${brand.slug}/${line.slug}/${m.slug}/${slugify(item.partCategory.name)}`}
      className="flex items-center justify-between px-4 py-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-sm"
    >
      <div>
        <div className="font-medium">{item.name}</div>
        <div className="text-black/50 dark:text-white/50">
          {brand.name} / {line.name} / {m.name} / {item.partCategory.name}
        </div>
      </div>
      <span className={low ? "text-red-600 dark:text-red-400 font-semibold" : "text-black/60 dark:text-white/60"}>
        {item.quantity} in stock
      </span>
    </Link>
  );
}
