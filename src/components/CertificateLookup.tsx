"use client";

import { useState } from "react";
import { getConference } from "@config/conferences";
import type { CertificateData } from "@/app/api/certificate/route";
import { Certificate } from "./Certificate";
import { CertificateStage } from "./CertificateStage";

/** Payment ID form; on success shows the certificate. The only part of the portal that needs a payment ID. */
export function CertificateLookup({ conferenceId }: { conferenceId: string }) {
  const [paymentId, setPaymentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cert, setCert] = useState<CertificateData | null>(null);

  if (cert)
    return (
      <CertificateStage backHref={`/c/${conferenceId}`}>
        <Certificate type={cert.type} paperId={cert.paperId} name={cert.name} affiliation={cert.affiliation} paper={cert.paperTitle} />
      </CertificateStage>
    );

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, boxSizing: "border-box" }}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            const res = await fetch("/api/certificate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conferenceId, paymentId }) });
            const body = await res.json().catch(() => ({}));
            if (res.ok) setCert(body);
            else setError(body.error ?? "Could not load the certificate.");
          } catch {
            setError("Network error. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
        style={{ width: "100%", maxWidth: 360, background: "#fbfaf7", border: "1px solid #d9d5cc", padding: "28px 24px", display: "flex", flexDirection: "column", gap: 14, boxSizing: "border-box" }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".2em", color: "#8a6a2c" }}>{getConference(conferenceId)?.name}</div>
          <div style={{ fontFamily: "'Newsreader',serif", fontSize: 22 }}>Your certificate</div>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: "#6b6656" }}>Payment ID</span>
          <input
            required
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value)}
            placeholder="PAY-…"
            autoComplete="off"
            style={{ padding: "10px 12px", border: "1px solid #cfc9bc", background: "#fff", fontFamily: "'IBM Plex Mono',monospace", fontSize: 15, borderRadius: 3 }}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          style={{ padding: "11px 12px", border: "none", background: busy ? "#6b6656" : "#16213d", color: "#fff", fontSize: 14, fontWeight: 500, borderRadius: 3, cursor: "pointer" }}
        >
          {busy ? "Looking up…" : "Get certificate"}
        </button>
        {error && <div style={{ fontSize: 13, lineHeight: 1.5, color: "#9a3b2c" }}>{error}</div>}
        <div style={{ fontSize: 12, lineHeight: 1.5, color: "#6b6656" }}>Use the payment ID from your registration receipt.</div>
      </form>
    </main>
  );
}
