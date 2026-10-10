"use client";

import "./community-cii-analyser.css";

export const CII_FINAL_LOGO_SRC = "/ciel-sdg-logo.png";

export const CII_FINAL_BADGE_SRC: Record<number, string> = {
    1: "/certificate-badges/level-1-participation-acknowledgement.png",
    2: "/certificate-badges/level-2-foundation-stage-contributor.png",
    3: "/certificate-badges/level-3-emerging-community-contributor.png",
    4: "/certificate-badges/level-4-developing-impact-contributor.png",
    5: "/certificate-badges/level-5-distinguished-impact-contributor.png",
    6: "/certificate-badges/level-6-transformative-impact-contributor.png",
};

export type CiiFinalSheetSection = {
    dimension?: string;
    name?: string;
    score?: number | null;
    maximumPoints?: number | null;
};

export function CiiFinalOnePageSheet({
    title,
    studentName,
    university,
    reportId,
    score,
    badgeName,
    badgeLevel,
    lockedAt,
    sections,
    analysis,
    strengths,
    limitations,
    adminComment,
    showPrint = true,
    showSectionScores = true,
    className,
    embedded = false,
}: {
    title: string;
    studentName: string;
    university?: string;
    reportId?: string;
    score: number | null;
    badgeName: string | null;
    badgeLevel?: number | null;
    lockedAt?: string | null;
    sections: CiiFinalSheetSection[];
    analysis: string;
    strengths: string[];
    limitations: string[];
    adminComment?: string;
    showPrint?: boolean;
    /** Student package/wall show overall CII only; Admin analyser keeps the dim 1–9 grid. */
    showSectionScores?: boolean;
    className?: string;
    /** Parent already provides `.cii-final` (Admin/Faculty analyser). */
    embedded?: boolean;
}) {
    const badgeSrc = badgeLevel && CII_FINAL_BADGE_SRC[badgeLevel] ? CII_FINAL_BADGE_SRC[badgeLevel] : undefined;
    const meta = [studentName, university].filter(Boolean).join(" · ");
    const publicRef =
        reportId &&
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reportId.trim())
            ? reportId.trim()
            : "";
    return (
        <div className={[embedded ? "" : "cii-final", "onepage", className].filter(Boolean).join(" ")}>
            {showPrint ? (
                <div className="print-actions">
                    <button type="button" className="secondary" onClick={() => window.print()}>
                        Print / Save 1-Page Analysis
                    </button>
                </div>
            ) : null}
            <article className="analysis-sheet">
                <div className="sheet-head">
                    <div>
                        <img src={CII_FINAL_LOGO_SRC} className="sheet-logo" alt="Official locked CIEL PK logo" draggable={false} />
                        <div className="eyebrow">CIEL PK · APPROVED COMMUNITY IMPACT ANALYSIS</div>
                        <h1>{title || "Community Engagement Project"}</h1>
                        <p>{meta || "Student"}</p>
                    </div>
                    <div className="sheet-badge">{badgeSrc ? <img src={badgeSrc} alt={badgeName || "CIEL PK badge"} /> : null}</div>
                </div>
                <div className="sheet-body">
                    <div className="score-strip">
                        <div>
                            <div className="eyebrow">FINAL COMPOSITE CII</div>
                            <div className="final-score">
                                {score != null ? (Math.round(score * 10) / 10).toFixed(1) : "—"}
                                <small>/100</small>
                            </div>
                        </div>
                        <div>
                            <div className="eyebrow">AWARDED BADGE</div>
                            <h2 style={{ font: "23px Georgia, serif", margin: "5px 0" }}>{badgeName || "—"}</h2>
                            <div className="final-status">
                                {lockedAt ? `Approved ${new Date(lockedAt).toLocaleString()}` : "Approved by CIEL PK · Final authority"}
                            </div>
                        </div>
                    </div>
                    {showSectionScores ? (
                    <div className="section-score-grid">
                        {(sections.length ? sections : [{ name: "Sections pending", score: null, maximumPoints: null }]).map((section, index) => (
                            <div key={`${section.dimension || section.name}-${index}`} className="sscore">
                                <span>
                                    {section.dimension ? `${section.dimension} · ` : ""}
                                    {section.name || "Section"}
                                </span>
                                <b>
                                    {section.score != null ? Number(section.score).toFixed(1) : "—"}
                                    {section.maximumPoints != null ? ` / ${section.maximumPoints}` : ""}
                                </b>
                            </div>
                        ))}
                    </div>
                    ) : null}
                    <h3>Overall Analysis</h3>
                    <p className="analysis-copy">{analysis || "—"}</p>
                    <div className="sheet-cols">
                        <div>
                            <h3>What Went Well</h3>
                            <ul>
                                {(strengths.length ? strengths : ["—"]).map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3>Limitations &amp; Next Learning</h3>
                            <ul>
                                {(limitations.length ? limitations : ["—"]).map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="admin-comment">
                        <strong>CIEL PK Admin Overall Comment</strong>
                        <div style={{ marginTop: 4 }}>{adminComment?.trim() || "No additional Admin comment."}</div>
                    </div>
                </div>
                <div className="sheet-foot">
                    <span>{publicRef ? `Report ${publicRef}` : "CIEL PK Impact Package"}</span>
                    <span>Approved by CIEL PK · Final authority</span>
                </div>
            </article>
        </div>
    );
}
