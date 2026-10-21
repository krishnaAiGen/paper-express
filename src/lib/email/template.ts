import type { Conference } from "@config/conferences";

export interface CorrectionEmailInput {
  paperId: string | null;
  fileName: string;
  title?: string | null;
  reasons: string[];
  authorName?: string | null;
}

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Email asking the authors to fix the listed format problems and resubmit. */
export function correctionEmail(input: CorrectionEmailInput, senderName: string, conference: Conference): EmailContent {
  const paperConfig = conference.paper;
  const ref = input.paperId ? `Paper ${input.paperId}` : input.fileName;
  const subject = `${conference.name}, ${ref}: formatting corrections required (${paperConfig.template})`;
  const greeting = input.authorName ? `Dear ${input.authorName},` : "Dear Author(s),";
  const titleLine = input.title ? `"${input.title}"` : `"${input.fileName}"`;
  const limits = `The paper must use the ${paperConfig.template} template and be at most ${paperConfig.maxPages} pages including references (up to ${paperConfig.extraPagesMax} pages are possible with an extra-page fee).`;
  const deadline = `Please submit the corrected version within ${conference.resubmitWithinDays} days, keeping the same paper ID${input.paperId ? ` (${input.paperId})` : ""}.`;

  const text = [
    greeting,
    "",
    `Thank you for your submission ${titleLine} (${ref}) to ${conference.name}. Our format check found the following problems:`,
    "",
    ...input.reasons.map((r, i) => `  ${i + 1}. ${r}`),
    "",
    limits,
    `Template and author guidelines: ${conference.templateUrl}`,
    "",
    deadline,
    "",
    "Best regards,",
    senderName,
  ].join("\n");

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1e293b;max-width:640px">
<p>${esc(greeting)}</p>
<p>Thank you for your submission <strong>${esc(titleLine)}</strong> (${esc(ref)}) to ${esc(conference.name)}. Our format check found the following problems:</p>
<ol style="padding-left:20px">${input.reasons.map((r) => `<li style="margin-bottom:6px">${esc(r)}</li>`).join("")}</ol>
<p>${esc(limits)}</p>
<p>Template and author guidelines: <a href="${esc(conference.templateUrl)}">${esc(conference.templateUrl)}</a></p>
<p><strong>${esc(deadline)}</strong></p>
<p>Best regards,<br>${esc(senderName)}</p>
</div>`;

  return { subject, text, html };
}
