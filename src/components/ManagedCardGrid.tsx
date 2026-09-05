"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { slugify } from "@/lib/slug";
import { compareModelsNewestFirst } from "@/lib/modelSort";

export type ManagedEntity = {
  id: string;
  name: string;
  slug?: string;
  meta?: string;
  warn?: string;
};

type Kind = "line" | "model" | "category";

const KIND_CONFIG: Record<
  Kind,
  {
    apiBase: string;
    parentField: string;
    deleteWarning: (name: string) => string;
    sortNewestFirst: boolean;
  }
> = {
  line: {
    apiBase: "/api/lines",
    parentField: "brandId",
    deleteWarning: (name) => `Delete "${name}"? This also deletes every model, category, and part inside it.`,
    sortNewestFirst: false,
  },
  model: {
    apiBase: "/api/models",
    parentField: "deviceLineId",
    deleteWarning: (name) => `Delete "${name}"? This also deletes every category and part inside it.`,
    sortNewestFirst: true,
  },
  category: {
    apiBase: "/api/categories",
    parentField: "modelId",
    deleteWarning: (name) => `Delete "${name}"? This also deletes every part inside it.`,
    sortNewestFirst: false,
  },
};

function OptionsMenu({
  onEdit,
  onDuplicate,
  onDelete,
}: {
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={ref} className="absolute top-2 right-2 z-10">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Options"
        className="w-6 h-6 flex items-center justify-center rounded text-black/40 hover:bg-black/[0.06] hover:text-black/70 dark:text-white/40 dark:hover:bg-white/[0.08] dark:hover:text-white/70"
      >
        ⋮
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-32 rounded-md border border-black/10 dark:border-white/15 bg-[var(--background)] shadow-lg overflow-hidden text-sm">
          <button
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          >
            Edit
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onDuplicate();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          >
            Duplicate
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="w-full text-left px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function ManagedCardGrid({
  items: initial,
  kind,
  basePath,
  parentId,
  suggestions,
  emptyText,
  addPlaceholder,
}: {
  items: ManagedEntity[];
  kind: Kind;
  basePath: string;
  parentId: string;
  suggestions?: string[];
  emptyText: string;
  addPlaceholder: string;
}) {
  const config = KIND_CONFIG[kind];
  const sortFn = config.sortNewestFirst ? compareModelsNewestFirst : undefined;
  const sortItems = (arr: ManagedEntity[]) => (sortFn ? [...arr].sort(sortFn) : arr);

  const [items, setItemsRaw] = useState(() => sortItems(initial));
  const setItems = (updater: (prev: ManagedEntity[]) => ManagedEntity[]) => {
    setItemsRaw((prev) => sortItems(updater(prev)));
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const existingNames = new Set(items.map((i) => i.name));
  const itemEndpoint = (id: string) => `${config.apiBase}/${id}`;
  const buildHref = (item: ManagedEntity) => `${basePath}/${item.slug ?? slugify(item.name)}`;

  async function create(name: string) {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch(config.apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [config.parentField]: parentId, name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setItems((prev) => [...prev, { id: data.id, name: data.name, slug: data.slug }]);
        setNewName("");
      } else {
        alert(data.error ?? "Failed to add");
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    const value = editValue.trim();
    if (!value) {
      setEditingId(null);
      return;
    }
    const res = await fetch(itemEndpoint(id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, name: data.name, slug: data.slug ?? i.slug } : i))
      );
      setEditingId(null);
    } else {
      alert(data.error ?? "Failed to rename");
    }
  }

  async function duplicate(id: string) {
    const res = await fetch(`${itemEndpoint(id)}/duplicate`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setItems((prev) => [...prev, { id: data.id, name: data.name, slug: data.slug }]);
    } else {
      alert(data.error ?? "Failed to duplicate");
    }
  }

  async function remove(item: ManagedEntity) {
    if (!confirm(config.deleteWarning(item.name))) return;
    if (!confirm("Are you sure? This cannot be undone.")) return;
    const res = await fetch(itemEndpoint(item.id), { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="relative rounded-lg border border-black/10 dark:border-white/15 p-4 hover:border-blue-500 hover:shadow-sm transition"
          >
            <OptionsMenu
              onEdit={() => {
                setEditingId(item.id);
                setEditValue(item.name);
              }}
              onDuplicate={() => duplicate(item.id)}
              onDelete={() => remove(item)}
            />
            {editingId === item.id ? (
              <div className="pr-6 flex flex-col gap-2">
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(item.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="w-full rounded border border-black/15 dark:border-white/15 bg-transparent px-2 py-1 text-sm"
                />
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={() => saveEdit(item.id)}
                    className="rounded bg-blue-600 text-white px-2 py-1 font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded border border-black/15 dark:border-white/15 px-2 py-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <Link href={buildHref(item)} className="flex flex-col gap-1 pr-5">
                <span className="font-medium">{item.name}</span>
                {item.meta && (
                  <span className="text-sm text-black/50 dark:text-white/50">{item.meta}</span>
                )}
                {item.warn && (
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                    {item.warn}
                  </span>
                )}
              </Link>
            )}
          </div>
        ))}
      </div>

      {items.length === 0 && <p className="text-black/50 dark:text-white/50 mb-4 mt-4">{emptyText}</p>}

      <div className="mt-6 space-y-3">
        <p className="text-sm text-black/50 dark:text-white/50">Add new</p>
        {suggestions && suggestions.filter((s) => !existingNames.has(s)).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions
              .filter((s) => !existingNames.has(s))
              .map((s) => (
                <button
                  key={s}
                  onClick={() => create(s)}
                  disabled={busy}
                  className="text-xs rounded-full border border-black/15 dark:border-white/15 px-3 py-1 hover:border-blue-500 disabled:opacity-50"
                >
                  + {s}
                </button>
              ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create(newName);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={addPlaceholder}
            className="flex-1 max-w-sm rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={busy || !newName.trim()}
            className="rounded-md bg-blue-600 text-white px-4 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  );
}
