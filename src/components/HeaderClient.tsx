"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function HeaderClient({
  brands,
}: {
  brands: { name: string; slug: string }[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="border-b border-black/10 dark:border-white/10 sticky top-0 bg-[var(--background)]/95 backdrop-blur z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link href="/" className="font-semibold text-lg shrink-0">
          iFix Inventory
        </Link>
        <form onSubmit={onSubmit} className="flex-1 max-w-md">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search parts by name or reference…"
            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>
        <nav className="flex items-center gap-4 text-sm text-black/70 dark:text-white/70 ml-auto">
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/brand/${brand.slug}`}
              className="hover:text-black dark:hover:text-white"
            >
              {brand.name}
            </Link>
          ))}
          <button
            onClick={async () => {
              await fetch("/api/logout", { method: "POST" });
              router.push("/login");
              router.refresh();
            }}
            className="hover:text-black dark:hover:text-white"
          >
            Log out
          </button>
        </nav>
      </div>
    </header>
  );
}
