import { buildPaperConfig, type PaperConfig, type PaperConfigOverrides } from "./paper.config";

/**
 * Conferences served by the portal. To add one, add an entry here; its `id`
 * appears in URLs (/c/<id>, /admin/<id>) and is stored with every record.
 * `paper` overrides any default from config/paper.config.ts for that conference.
 */
const conferenceList = [
  {
    id: "taiis-2026",
    name: "TAIIS 2026",
    fullName: "International Conference on Trustworthy AI and Intelligent IoT Systems",
    datesAndVenue: "December 3–5, 2026 · Asia University, Taichung, Taiwan",
    templateUrl: "https://www.springer.com/gp/computer-science/lncs/conference-proceedings-guidelines",
    resubmitWithinDays: 7,
    /** Whether /c/<id>/certificate is available (needs a certificate design for the conference). */
    certificates: true,
    paper: {} satisfies PaperConfigOverrides,
  },
  {
    id: "syscom-2026",
    name: "SysCom 2026",
    // TODO: real full name, dates and venue for SysCom 2026.
    fullName: "SysCom 2026 (full conference name to be confirmed)",
    datesAndVenue: "Dates and venue to be announced",
    templateUrl: "https://www.springer.com/gp/computer-science/lncs/conference-proceedings-guidelines",
    resubmitWithinDays: 7,
    certificates: false,
    paper: {} satisfies PaperConfigOverrides,
  },
] as const;

export type ConferenceId = (typeof conferenceList)[number]["id"];

export interface Conference {
  id: ConferenceId;
  name: string;
  fullName: string;
  datesAndVenue: string;
  templateUrl: string;
  resubmitWithinDays: number;
  certificates: boolean;
  paper: PaperConfig;
}

export const conferences: Conference[] = conferenceList.map((c) => ({ ...c, paper: buildPaperConfig(c.paper) }));

export function getConference(id: string | null | undefined): Conference | null {
  return conferences.find((c) => c.id === id) ?? null;
}

export const conferenceIds = conferences.map((c) => c.id) as [ConferenceId, ...ConferenceId[]];
