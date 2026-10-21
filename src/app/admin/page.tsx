import Link from "next/link";
import { appConfig } from "@config/app.config";
import { ConferencePicker } from "@/components/ConferencePicker";
import { LoginForm, LogoutButton } from "@/components/LoginForm";
import { getAdmin } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** Admin sign-in, then the choice of conference to manage. */
export default async function AdminPage() {
  const admin = await getAdmin();
  if (!admin)
    return (
      <LoginForm
        title={`${appConfig.portalName} admin`}
        subtitle="Sign in with your admin email and password."
        endpoint="/api/auth/admin"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "username" },
          { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
        ]}
      />
    );
  return (
    <ConferencePicker
      title="Select a conference"
      subtitle={`Signed in as ${admin.email}. Bulk checks, saved results, certificates and emails are kept separately for each conference.`}
      basePath="/admin"
      footer={
        <div className="flex items-center gap-3">
          <LogoutButton />
          <Link href="/" className="text-slate-600 hover:underline">
            Public portal
          </Link>
        </div>
      }
    />
  );
}
