import { notFound, redirect } from "next/navigation";
import { appEnv } from "@config/app.config";
import { getConference } from "@config/conferences";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { ConferenceProvider } from "@/components/ConferenceContext";
import { env } from "@/lib/server/env";
import { getAdmin } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** Everything for one conference: bulk check, saved results, certificates, single checks. */
export default async function AdminConferencePage({ params }: { params: Promise<{ conference: string }> }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin");
  const conference = getConference((await params).conference);
  if (!conference) notFound();

  return (
    <ConferenceProvider id={conference.id}>
      <AdminDashboard email={admin.email} senderName={env.gmailFromName()} env={appEnv()} />
    </ConferenceProvider>
  );
}
