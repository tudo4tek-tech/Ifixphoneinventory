"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type InventoryItemDTO = {
  id: string;
  name: string;
  reference: string | null;
  referencePriceEur: number | null;
  costPrice: number | null;
  sellPrice: number | null;
  quantity: number;
  lowStockThreshold: number;
  supplier: string | null;
  notes: string | null;
};

async function patchItem(id: string, data: Record<string, unknown>) {
  const res = await fetch(`/api/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save");
}

function EditableNumber({
  value,
  onSave,
  className,
  integer,
}: {
  value: number | null;
  onSave: (n: number | null) => void;
  className?: string;
  integer?: boolean;
}) {
  const [local, setLocal] = useState(value === null ? "" : String(value));
  return (
    <input
      type="number"
      step={integer ? "1" : "0.01"}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        if (local.trim() === "") {
          onSave(null);
          return;
        }
        const n = integer ? Math.round(Number(local)) : Number(local);
        onSave(Number.isFinite(n) ? n : null);
      }}
      className={
        className ??
        "w-20 rounded border border-black/15 dark:border-white/15 bg-transparent px-2 py-1 text-sm"
      }
    />
  );
}

function EditableText({
  value,
  onSave,
  placeholder,
}: {
  value: string | null;
  onSave: (s: string | null) => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value ?? "");
  return (
    <input
      type="text"
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onSave(local.trim() === "" ? null : local.trim())}
      className="w-full rounded border border-black/15 dark:border-white/15 bg-transparent px-2 py-1 text-sm"
    />
  );
}

export default function ItemsTable({
  items: initial,
  categoryId,
}: {
  items: InventoryItemDTO[];
  categoryId: string;
}) {
  const [items, setItems] = useState(initial);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function update<K extends keyof InventoryItemDTO>(id: string, field: K, value: InventoryItemDTO[K]) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
    patchItem(id, { [field]: value }).catch(() => {
      // revert on failure by re-syncing from server
      startTransition(() => router.refresh());
    });
  }

  async function remove(id: string) {
    if (!confirm("Delete this part from inventory?")) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
    if (!res.ok) startTransition(() => router.refresh());
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), partCategoryId: categoryId }),
      });
      if (res.ok) {
        const created = await res.json();
        setItems((prev) => [...prev, created]);
        setNewName("");
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-3">
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
      <table className="w-full text-sm">
        <thead className="bg-black/[0.03] dark:bg-white/[0.03] text-left">
          <tr>
            <th className="px-3 py-2 font-medium">Part</th>
            <th className="px-3 py-2 font-medium">Reference</th>
            <th className="px-3 py-2 font-medium">Ref. price</th>
            <th className="px-3 py-2 font-medium">Cost</th>
            <th className="px-3 py-2 font-medium">Sell</th>
            <th className="px-3 py-2 font-medium">Qty</th>
            <th className="px-3 py-2 font-medium">Low at</th>
            <th className="px-3 py-2 font-medium">Supplier</th>
            <th className="px-3 py-2 font-medium">Notes</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/10 dark:divide-white/10">
          {items.map((item) => {
            const low = item.quantity <= item.lowStockThreshold;
            return (
              <tr key={item.id} className={low ? "bg-red-500/5" : undefined}>
                <td className="px-3 py-2 max-w-xs">{item.name}</td>
                <td className="px-3 py-2 text-black/60 dark:text-white/60 whitespace-nowrap">
                  {item.reference ?? "—"}
                </td>
                <td className="px-3 py-2 text-black/60 dark:text-white/60 whitespace-nowrap">
                  {item.referencePriceEur != null ? `${item.referencePriceEur.toFixed(2)} €` : "—"}
                </td>
                <td className="px-3 py-2">
                  <EditableNumber
                    value={item.costPrice}
                    onSave={(n) => update(item.id, "costPrice", n as number)}
                  />
                </td>
                <td className="px-3 py-2">
                  <EditableNumber
                    value={item.sellPrice}
                    onSave={(n) => update(item.id, "sellPrice", n as number)}
                  />
                </td>
                <td className="px-3 py-2">
                  <EditableNumber
                    value={item.quantity}
                    onSave={(n) => update(item.id, "quantity", (n ?? 0) as number)}
                    integer
                    className={`w-16 rounded border px-2 py-1 text-sm bg-transparent ${
                      low
                        ? "border-red-500 text-red-600 dark:text-red-400 font-semibold"
                        : "border-black/15 dark:border-white/15"
                    }`}
                  />
                </td>
                <td className="px-3 py-2">
                  <EditableNumber
                    value={item.lowStockThreshold}
                    onSave={(n) => update(item.id, "lowStockThreshold", (n ?? 0) as number)}
                    integer
                  />
                </td>
                <td className="px-3 py-2 min-w-[8rem]">
                  <EditableText
                    value={item.supplier}
                    placeholder="supplier"
                    onSave={(s) => update(item.id, "supplier", s)}
                  />
                </td>
                <td className="px-3 py-2 min-w-[10rem]">
                  <EditableText
                    value={item.notes}
                    placeholder="notes"
                    onSave={(s) => update(item.id, "notes", s)}
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => remove(item.id)}
                    className="text-black/40 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400"
                    title="Delete"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={10} className="px-3 py-6 text-center text-black/50 dark:text-white/50">
                No parts in this category yet. Add one below.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
      <form onSubmit={addItem} className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Add a new part by name…"
          className="flex-1 max-w-sm rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={adding || !newName.trim()}
          className="rounded-md bg-blue-600 text-white px-4 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          Add
        </button>
      </form>
    </div>
  );
}
