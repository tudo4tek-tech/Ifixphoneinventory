"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// Only ever navigate to a same-site relative path -- "next" comes from a
// query param, so this also guards against it being used to redirect
// somewhere else entirely (e.g. "//evil.example.com").
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function LoginFormInner({ totpRequired }: { totpRequired: boolean }) {
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
        // A hard navigation (not the client router) guarantees a fresh
        // request that the proxy re-checks with the just-set cookie --
        // no client-side route cache to end up "stuck" on the old state.
        window.location.href = safeNext(params.get("next"));
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Incorrect password");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Try again.");
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
