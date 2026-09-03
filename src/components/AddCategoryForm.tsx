"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SUGGESTIONS = [
  "Pantallas",
  "Baterías",
  "Tapas",
  "Chasis",
  "Conectores",
  "Cámaras",
  "Altavoces",
  "Flex",
  "Adhesivos",
  "Sim & Botones",
];

export default function AddCategoryForm({ modelId }: { modelId: string }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function submit(value: string) {
    if (!value.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId, name: value.trim() }),
      });
      if (res.ok) {
        router.refresh();
        setName("");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => submit(s)}
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
          submit(name);
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
  );
}
