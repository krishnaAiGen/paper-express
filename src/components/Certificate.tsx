/**
 * TAIIS 2026 certificate. Markup, styles and wording are copied unchanged from the
 * Claude Design file resources/design/TAIIS 2026 Certificate.dc.html; only the
 * per-paper values (name, affiliation, title, paper ID) come from props.
 */

export const CERTIFICATE_FONTS =
  "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,300;1,6..72,400&family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Noto+Serif+TC:wght@400;500&display=swap";

export const CERTIFICATE_WIDTH = 1123;
export const CERTIFICATE_HEIGHT = 794;

const CONF =
  "International Conference on Trustworthy AI and Intelligent IoT Systems (TAIIS 2026), held December 3–5, 2026, at Asia University, Taichung, Taiwan";
const ZC = "2026年可信賴人工智慧與智慧物聯網系統國際研討會（TAIIS 2026）";
const TYPES = {
  presentation: { e: "Certificate of", t: "Presentation", zh: "論文發表證明", c: "P", paper: true, lead: "has presented the paper", tail: `at the ${CONF}.`, z: `於${ZC}發表論文，特此證明。` },
  best: { e: "TAIIS 2026 Award", t: "Best Paper", zh: "最佳論文獎", c: "B", paper: true, lead: "has received the Best Paper Award for the paper", tail: `presented at the ${CONF}.`, z: `榮獲${ZC}最佳論文獎，特頒此狀。` },
  doctoral: { e: "Certificate of", t: "Presentation", zh: "博士生論壇發表證明", c: "D", paper: true, lead: "has presented the research", tail: `in the Doctoral Symposium of the ${CONF}.`, z: `於${ZC}博士生論壇發表研究，特此證明。` },
};

export type CertificateType = keyof typeof TYPES;

export interface CertificateProps {
  type?: CertificateType;
  paperId: string;
  name: string;
  affiliation: string;
  paper: string;
}

/** Paper IDs are zero-padded to three digits, as in the design's lookup. */
export const certificateNumber = (type: CertificateType, paperId: string) => {
  const id = /^\d+$/.test(paperId) ? paperId.padStart(3, "0") : paperId;
  return `TAIIS26-${TYPES[type].c}-${id}`;
};

export function Certificate({ type = "presentation", paperId, name, affiliation, paper }: CertificateProps) {
  const t = TYPES[type];
  return (
    <div data-screen-label="Certificate" style={{ width: 1123, height: 794, background: "#f9f6ee", padding: 26, boxSizing: "border-box", color: "#1b2033" }}>
      <div style={{ height: "100%", border: "1.5px solid #a88647", padding: 6, boxSizing: "border-box" }}>
        <div style={{ height: "100%", border: "1px solid #cdb98e", boxSizing: "border-box", padding: "40px 80px 36px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, border: "1px solid #cdb98e", background: "repeating-linear-gradient(135deg,#efe8d8 0 5px,transparent 5px 10px)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: "#8a6a2c" }}>LOGO</div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, textAlign: "left" }}>
              <div style={{ fontWeight: 600, fontSize: 13, letterSpacing: ".24em", color: "#16213d" }}>TAIIS 2026</div>
              <div style={{ fontSize: 11, letterSpacing: ".04em", color: "#6b6656" }}>Dec 3–5, 2026 · Asia University, Taichung, Taiwan</div>
            </div>
          </div>
          <div style={{ marginTop: 30, fontFamily: "'Newsreader',serif", fontStyle: "italic", fontSize: 20, color: "#8a6a2c" }}>{t.e}</div>
          <h1 style={{ margin: "4px 0 0", fontFamily: "'Newsreader',serif", fontWeight: 400, fontSize: 60, lineHeight: 1.05, letterSpacing: ".01em", color: "#16213d" }}>{t.t}</h1>
          <div style={{ marginTop: 8, fontFamily: "'Noto Serif TC',serif", fontSize: 20, letterSpacing: ".3em", color: "#6b6656" }}>{t.zh}</div>
          <div style={{ marginTop: 26, fontSize: 11, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase", color: "#6b6656" }}>This is to certify that</div>
          <div style={{ flex: "none", marginTop: 10, padding: "0 40px 10px", borderBottom: "1px solid #cdb98e", fontFamily: "'Newsreader',serif", fontSize: 46, lineHeight: 1.1 }}>{name}</div>
          <div style={{ flex: "none", marginTop: 10, fontSize: 14, color: "#5a5648", maxWidth: 640, textWrap: "balance" }}>{affiliation}</div>
          <p style={{ flex: "none", margin: "20px 0 0", maxWidth: 760, fontFamily: "'Newsreader',serif", fontSize: 18, lineHeight: 1.5, color: "#2a2f40", textWrap: "balance" }}>{t.lead}</p>
          {t.paper && <div style={{ flex: "none", marginTop: 6, maxWidth: 760, fontFamily: "'Newsreader',serif", fontStyle: "italic", fontSize: 20, lineHeight: 1.35, color: "#16213d", textWrap: "balance" }}>“{paper}”</div>}
          {t.tail && <p style={{ flex: "none", margin: "6px 0 0", maxWidth: 760, fontFamily: "'Newsreader',serif", fontSize: 18, lineHeight: 1.5, color: "#2a2f40", textWrap: "balance" }}>{t.tail}</p>}
          <p style={{ flex: "none", margin: "8px 0 0", maxWidth: 760, fontFamily: "'Noto Serif TC',serif", fontSize: 13, lineHeight: 1.7, color: "#5a5648" }}>{t.z}</p>
          <div style={{ marginTop: "auto", width: "100%", display: "grid", gridTemplateColumns: "minmax(0,1fr) 220px minmax(0,1fr)", gap: 40, alignItems: "end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}><div style={{ height: 1, background: "#1b2033" }}></div><div style={{ fontFamily: "'Newsreader',serif", fontSize: 16 }}>Signatory Name</div><div style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#6b6656" }}>General Chair</div></div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: 10, height: 10, transform: "rotate(45deg)", background: "#a88647" }}></div>
              <div style={{ marginTop: 8, fontFamily: "'Newsreader',serif", fontSize: 15 }}>December 5, 2026</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: ".06em", color: "#6b6656" }}>{certificateNumber(type, paperId)}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}><div style={{ height: 1, background: "#1b2033" }}></div><div style={{ fontFamily: "'Newsreader',serif", fontSize: 16 }}>Signatory Name</div><div style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#6b6656" }}>Program Chair</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
