import Link from "next/link";
import { conferences } from "@config/conferences";

/** Cards for every configured conference; `basePath` + id is where each one leads. */
export function ConferencePicker({ title, subtitle, basePath, footer }: { title: string; subtitle: string; basePath: string; footer?: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="mb-6 text-sm text-slate-600">{subtitle}</p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {conferences.map((c) => (
          <li key={c.id}>
            <Link
              href={`${basePath}/${c.id}`}
              className="flex h-full flex-col gap-1 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-500 hover:shadow"
            >
              <span className="text-xl font-semibold text-slate-900">{c.name}</span>
              <span className="text-sm text-slate-700">{c.fullName}</span>
              <span className="text-xs text-slate-500">{c.datesAndVenue}</span>
              <span className="mt-3 text-sm font-medium text-blue-700">Select →</span>
            </Link>
          </li>
        ))}
      </ul>
      {footer && <div className="mt-6 text-sm">{footer}</div>}
    </main>
  );
}
