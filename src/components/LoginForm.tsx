"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { login } from "./api";
import { Banner } from "./ui";

interface Field {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}

export function LoginForm({ title, subtitle, endpoint, fields }: { title: string; subtitle: string; endpoint: string; fields: Field[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="mb-6 text-sm text-slate-600">{subtitle}</p>
      <form
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const res = await login(endpoint, values);
          setBusy(false);
          if (res.ok) router.refresh();
          else setError(res.error ?? "Sign-in failed");
        }}
      >
        {fields.map((f) => (
          <label key={f.name} className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{f.label}</span>
            <input
              required
              type={f.type ?? "text"}
              autoComplete={f.autoComplete}
              placeholder={f.placeholder}
              value={values[f.name] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </label>
        ))}
        {error && <Banner tone="red" title={error} />}
        <button disabled={busy} className="w-full rounded bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-400">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
