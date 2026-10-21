import Link from "next/link";
import type { ReactNode } from "react";
import type { Conference } from "@config/conferences";

/** Conference name at the top of every conference page, with a way back to the conference list. */
export function ConferenceHeader({ conference, subtitle, actions, switchHref }: { conference: Conference; subtitle?: string; actions?: ReactNode; switchHref: string }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{conference.name}</h1>
        <p className="text-sm font-medium text-slate-700">{conference.fullName}</p>
        <p className="text-xs text-slate-500">{conference.datesAndVenue}</p>
        {subtitle && <p className="mt-2 text-sm text-slate-600">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {actions}
        <Link href={switchHref} className="rounded px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900">
          Change conference
        </Link>
      </div>
    </header>
  );
}
