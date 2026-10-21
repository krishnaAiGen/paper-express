import { notFound } from "next/navigation";
import { getConference } from "@config/conferences";
import { CERTIFICATE_FONTS } from "@/components/Certificate";
import { CertificateLookup } from "@/components/CertificateLookup";

export async function generateMetadata({ params }: { params: Promise<{ conference: string }> }) {
  return { title: `${getConference((await params).conference)?.name ?? "Conference"} Certificate` };
}

/** Public: the payment ID entered on the page is what unlocks a certificate. */
export default async function CertificatePage({ params }: { params: Promise<{ conference: string }> }) {
  const conference = getConference((await params).conference);
  if (!conference?.certificates) notFound();

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href={CERTIFICATE_FONTS} precedence="default" />
      <style>{`
html,body{margin:0;background:#e7e5e1;}
body{font-family:'Instrument Sans',sans-serif;-webkit-font-smoothing:antialiased;color:#1b2033;}
@page{size:1123px 794px;margin:0;}
@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact;}body{background:none;}[data-noprint]{display:none!important;}[data-stage]{padding:0!important;}[data-scale]{transform:none!important;box-shadow:none!important;}[data-scalebox]{width:auto!important;height:auto!important;}}
`}</style>
      <CertificateLookup conferenceId={conference.id} />
    </>
  );
}
