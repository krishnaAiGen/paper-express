import Link from "next/link";
import { notFound } from "next/navigation";
import { getConference } from "@config/conferences";
import { CompareTab } from "@/components/CompareTab";
import { ConferenceHeader } from "@/components/ConferenceHeader";
import { ConferenceProvider } from "@/components/ConferenceContext";
import { FormatTab } from "@/components/FormatTab";
import { Tabs } from "@/components/Tabs";

/** Public portal for one conference. Only the certificate page asks for a payment ID. */
export default async function ConferencePortal({ params }: { params: Promise<{ conference: string }> }) {
  const conference = getConference((await params).conference);
  if (!conference) notFound();

  return (
    <ConferenceProvider id={conference.id}>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <ConferenceHeader
          conference={conference}
          switchHref="/"
          subtitle={`Check that your paper follows the ${conference.paper.template} template and is camera-ready.`}
          actions={
            conference.certificates && (
              <Link
                href={`/c/${conference.id}/certificate`}
                className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Get your certificate →
              </Link>
            )
          }
        />
        <Tabs
          tabs={[
            { id: "format", label: "Format check", content: <FormatTab /> },
            { id: "compare", label: "Camera-ready check", content: <CompareTab /> },
          ]}
        />
      </main>
    </ConferenceProvider>
  );
}
