"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginFormInner({ totpRequired }: { totpRequired: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, code }),
      });
      if (res.ok) {
        router.push(params.get("next") || "/");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Incorrect password");
      }
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = password && (!totpRequired || /^\d{6}$/.test(code));

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-lg border border-black/10 dark:border-white/15 p-6 space-y-4"
      >
        <h1 className="text-lg font-semibold">iFix Inventory</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          {totpRequired
            ? "Enter the password and your authenticator code to continue."
            : "Enter the shared password to continue."}
        </p>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
        />
        {totpRequired && (
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit authenticator code"
            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm tracking-widest"
          />
        )}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || !canSubmit}
          className="w-full rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  );
}

export default function LoginForm({ totpRequired }: { totpRequired: boolean }) {
  return (
    <Suspense>
      <LoginFormInner totpRequired={totpRequired} />
    </Suspense>
  );
}
