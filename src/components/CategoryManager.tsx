"use client";

import { useState } from "react";
import Link from "next/link";
import { slugify } from "@/lib/slug";

const STANDARD_CATEGORIES = [
  "Screens",
  "Batteries",
  "Tampa",
  "Chassis",
  "Charging Board",
  "Cameras",
  "Speakers",
  "Network Flex",
  "Volume Flex",
  "Power Flex",
  "Main Flex",
  "Adhesives",
  "Buttons",
  "Sim Tray",
  "IC & Screws",
  "Other",
];

export type CategoryDTO = {
  id: string;
  name: string;
  itemCount: number;
  totalQty: number;
  lowCount: number;
};

export default function CategoryManager({
  modelId,
  baseHref,
  categories: initial,
}: {
  modelId: string;
  baseHref: string;
  categories: CategoryDTO[];
}) {
  const [categories, setCategories] = useState(initial);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const existingNames = new Set(categories.map((c) => c.name));

  async function addCategory(value: string) {
    if (!value.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId, name: value.trim() }),
      });
      if (res.ok) {
        const created = await res.json();
        setCategories((prev) =>
          prev.some((c) => c.id === created.id)
            ? prev
            : [...prev, { id: created.id, name: created.name, itemCount: 0, totalQty: 0, lowCount: 0 }]
        );
        setName("");
      }
    } finally {
      setSaving(false);
    }
  }

  async function removeCategory(cat: CategoryDTO) {
    const warning =
      cat.itemCount > 0
        ? `Delete "${cat.name}"? This also deletes the ${cat.itemCount} part${cat.itemCount === 1 ? "" : "s"} in it. This cannot be undone.`
        : `Delete "${cat.name}"?`;
    if (!confirm(warning)) return;
    setDeletingId(cat.id);
    try {
      const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="relative rounded-lg border border-black/10 dark:border-white/15 p-4 hover:border-blue-500 hover:shadow-sm transition"
          >
            <button
              onClick={() => removeCategory(cat)}
              disabled={deletingId === cat.id}
              title="Delete category"
              className="absolute top-2 right-2 text-black/30 hover:text-red-600 dark:text-white/30 dark:hover:text-red-400 text-xs disabled:opacity-50"
            >
              ✕
            </button>
            <Link href={`${baseHref}/${slugify(cat.name)}`} className="flex flex-col gap-1 pr-4">
              <span className="font-medium">{cat.name}</span>
              <span className="text-sm text-black/50 dark:text-white/50">
                {cat.itemCount} part{cat.itemCount === 1 ? "" : "s"} · {cat.totalQty} in stock
              </span>
              {cat.lowCount > 0 && (
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                  {cat.lowCount} low stock
                </span>
              )}
            </Link>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <p className="text-black/50 dark:text-white/50 mb-4 mt-4">
          No part categories yet for this model.
        </p>
      )}

      <div className="mt-6 space-y-3">
        <p className="text-sm text-black/50 dark:text-white/50">Add a category</p>
        <div className="flex flex-wrap gap-2">
          {STANDARD_CATEGORIES.filter((s) => !existingNames.has(s)).map((s) => (
            <button
              key={s}
              onClick={() => addCategory(s)}
              disabled={saving}
              className="text-xs rounded-full border border-black/15 dark:border-white/15 px-3 py-1 hover:border-blue-500 disabled:opacity-50"
            >
              + {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addCategory(name);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Custom category name…"
            className="flex-1 max-w-sm rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="rounded-md bg-blue-600 text-white px-4 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  );
}
