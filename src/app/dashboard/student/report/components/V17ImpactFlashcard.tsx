"use client";

import type { ReportData } from "../context/ReportContext";
import { CII_BREAKDOWN_ORDER, CII_SECTION_MAX, CII_SECTION_SHORT_LABELS } from "../utils/ciiSectionWeights";
import { resolveReportCii } from "../utils/resolveReportCii";

type Agg = {
    title: string;
    hours: number;
    members: number;
    logs: Array<{ date?: string; location?: string }>;
    acts: Array<{ title?: string }>;
    outputs: number;
    reach: string;
    measured: Array<{ metric?: string; outcome_area?: string; baseline?: string; endline?: string }>;
    bestPct: number | null;
    evidence: number;
    competency: string;
    sdgs: Array<{ goalNumber: number | string }>;
    pkr: number;
    context: { partnerOrganization?: string; projectLocation?: string };
};

function asList(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
    }
    if (typeof value === "string" && value.trim()) return [value.trim()];
    return [];
}

function words(text: unknown, max = 28) {
    const raw = typeof text === "string" ? text : "";
    const parts = raw.trim().split(/\s+/).filter(Boolean);
    if (parts.length <= max) return parts.join(" ");
    return `${parts.slice(0, max).join(" ")}…`;
}

function printFlashcard() {
    document.body.classList.add("cer-print-flash");
    const clear = () => {
        document.body.classList.remove("cer-print-flash");
        window.removeEventListener("afterprint", clear);
    };
    window.addEventListener("afterprint", clear);
    window.setTimeout(clear, 60000);
    window.print();
}

const SOURCE_LABEL = {
    faculty_locked: "Faculty-locked CII",
    submitted_snapshot: "CII saved with this report",
    live_preview: "Live CII preview — same fields the detailed report scores",
} as const;

export function V17ImpactFlashcard({
    data,
    agg,
    sectionsComplete,
    sectionTotal,
    missingLabels,
    canSend,
    onSend,
    sending,
    status,
}: {
    data: ReportData;
    agg: Agg;
    sectionsComplete: number;
    sectionTotal: number;
    missingLabels: string[];
    canSend?: boolean;
    onSend?: () => void;
    sending?: boolean;
    status: "draft" | "pending" | "live";
}) {
    const cii = resolveReportCii(data);
    const score = Math.round(cii.totalScore);
    /** Draft (incl. after admin delete) — no score. After submit / verified — show again. */
    const showCiiScore = status !== "draft";
    const partners = Array.isArray(data.section7?.partners) ? data.section7.partners : [];
    const resources = Array.isArray(data.section6?.resources) ? data.section6.resources : [];
    const skills = asList(data.section9?.skills_grown);
    const mechanisms = asList(data.section10?.mechanisms);
    const problem = words(data.section2?.problem_statement || "Community need not written yet", 26);
    const activities = agg.acts.map((block) => block.title).filter(Boolean) as string[];
    const locations = [...new Set(agg.logs.map((log) => log.location).filter(Boolean))].slice(0, 2);
    const partnerLine = partners.map((partner) => partner.name).filter(Boolean).join(" · ") || agg.context.partnerOrganization || "Partner pending";
    const resourceLine =
        data.section6?.use_resources === "no"
            ? "Student time and effort only"
            : resources.map((row) => row.type || row.purpose).filter(Boolean).slice(0, 3).join(" · ") || "Resources pending";
    const outcomeLines = agg.measured.slice(0, 3).map((row) => {
        const name = row.metric || row.outcome_area || "Outcome";
        return `${name}: ${row.baseline || "—"} → ${row.endline || "—"}`;
    });
    const sdgLine = agg.sdgs.map((row) => `SDG ${row.goalNumber}`).join(" · ") || "SDGs pending";
    const statusLabel = status === "live" ? "Faculty verified" : status === "pending" ? "Awaiting faculty review" : "Draft";

    const sections: Array<{ n: string; title: string; lines: string[] }> = [
        {
            n: "01",
            title: "Participation & verified effort",
            lines: [
                `${agg.members} student${agg.members === 1 ? "" : "s"} · ${Math.round(agg.hours * 10) / 10}h · ${agg.logs.length} sessions`,
                locations.length ? `Locations: ${locations.join(" · ")}` : "Session locations appear as attendance is logged",
            ],
        },
        {
            n: "02",
            title: "Community need, beneficiaries & baseline",
            lines: [
                `Problem: ${problem}`,
                `Who: ${data.section2?.affected_group || "Beneficiary group pending"}${data.section2?.affected_count ? ` · ≈ ${data.section2.affected_count}` : ""}`,
            ],
        },
        {
            n: "03",
            title: "SDG contribution",
            lines: [sdgLine, words(data.section3?.contribution_intent_statement || "Contribution statement pending", 24)],
        },
        {
            n: "04",
            title: "Activities, outputs & outcomes",
            lines: [
                activities.length ? `Activities: ${activities.join(" · ")}` : "Activities pending",
                outcomeLines.length ? outcomeLines.join(" · ") : `${agg.outputs} outputs · measured outcomes pending`,
            ],
        },
        {
            n: "05",
            title: "Resources mobilised",
            lines: [resourceLine, agg.pkr ? `PKR ${agg.pkr.toLocaleString()} traced` : "No separate cash total yet"],
        },
        {
            n: "06",
            title: "Partnerships developed",
            lines: [partnerLine, words(partners[0]?.contribution_line || asList(partners[0]?.contribution).join(", ") || "Contribution line pending", 18)],
        },
        {
            n: "07",
            title: "Evidence, ethics & verification",
            lines: [
                `${agg.evidence} evidence item${agg.evidence === 1 ? "" : "s"} connected to this report`,
                data.section8?.media_visible ? `Visibility: ${data.section8.media_visible}` : "Visibility not chosen yet",
            ],
        },
        {
            n: "08",
            title: "Reflection & academic growth",
            lines: [
                skills.length ? `Skills: ${skills.slice(0, 6).join(" · ")}` : "Skills still being selected",
                agg.competency ? `Overall competency ${agg.competency} / 5` : words(data.section9?.personal_learning || "Reflection pending", 18),
            ],
        },
        {
            n: "09",
            title: "Sustainability & handover",
            lines: [
                `Continuation: ${data.section10?.continuation_status || "Not chosen yet"}`,
                mechanisms.length ? `Mechanisms: ${mechanisms.slice(0, 3).join(" · ")}` : "Continuation mechanism pending",
            ],
        },
    ];

    const spots = [
        { tone: "blue", ey: "Beneficiaries", big: agg.reach || "—", text: data.section2?.affected_group || "Beneficiary group pending" },
        { tone: "coral", ey: "Outputs & outcomes", big: `${agg.outputs} / ${agg.measured.length}`, text: "Outputs / measured outcomes" },
        { tone: "gold", ey: "Resources", big: agg.pkr ? `PKR ${agg.pkr.toLocaleString()}` : String(resources.length || (data.section6?.use_resources === "no" ? "0" : "—")), text: resourceLine },
        { tone: "pink", ey: "Partnerships", big: String(Math.max(partners.length, agg.context.partnerOrganization ? 1 : 0)), text: partnerLine },
        { tone: "green", ey: "SDGs & sustainability", big: String(agg.sdgs.length || "—"), text: `${sdgLine}${data.section10?.continuation_status ? ` · ${data.section10.continuation_status}` : ""}` },
    ];

    return (
        <article className="cer-v17-flash" id="cer-v17-flash">
            <header className="cer-v17-hero">
                <div>
                    <div className="kicker">CIEL PK · Community engagement · Impact flashcard</div>
                    <h1>{agg.title}</h1>
                    <p>
                        {agg.context.partnerOrganization || "Partner on file"} · {agg.context.projectLocation && agg.context.projectLocation !== "N/A" ? agg.context.projectLocation : "Location on the attendance log"}
                        <br />
                        {statusLabel} · {sectionsComplete}/{sectionTotal} sections complete
                    </p>
                </div>
                {showCiiScore ? (
                    <div className="cer-v17-score" aria-label={`CII score ${score} out of 100`}>
                        <b>{score}</b>
                        <small>/ 100 CII</small>
                        <span>{SOURCE_LABEL[cii.source]}</span>
                    </div>
                ) : null}
            </header>

            <div className="cer-v17-metrics">
                {[
                    [`${Math.round(agg.hours * 10) / 10}h`, "Service hours"],
                    [String(agg.logs.length), "Sessions"],
                    [agg.reach || "0", "Beneficiaries"],
                    [String(agg.outputs), "Outputs"],
                    [String(agg.measured.length), "Outcomes"],
                    [String(agg.evidence), "Evidence"],
                ].map(([value, label]) => (
                    <div key={label}>
                        <b>{value}</b>
                        <small>{label}</small>
                    </div>
                ))}
            </div>

            <div className="cer-v17-body">
                <div className="cer-v17-title">
                    <h2>{showCiiScore ? "What the CII score is reading" : "Impact at a glance"}</h2>
                    <span>
                        {showCiiScore
                            ? cii.official
                                ? "Official record"
                                : "Preview until faculty locks the score"
                            : "CII appears after you submit"}
                    </span>
                </div>
                <div className="cer-v17-spots">
                    {spots.map((spot) => (
                        <div key={spot.ey} className={spot.tone}>
                            <small>{spot.ey}</small>
                            <b>{spot.big}</b>
                            <p>{spot.text}</p>
                        </div>
                    ))}
                </div>

                {showCiiScore ? (
                    <div className="cer-v17-bars">
                        {CII_BREAKDOWN_ORDER.map((key) => {
                            const value = Math.round(cii.breakdown[key] || 0);
                            const max = CII_SECTION_MAX[key];
                            const pct = Math.max(0, Math.min(100, (value / max) * 100));
                            return (
                                <div key={key}>
                                    <span>{CII_SECTION_SHORT_LABELS[key]}</span>
                                    <i><b style={{ width: `${pct}%` }} /></i>
                                    <em>{value}/{max}</em>
                                </div>
                            );
                        })}
                    </div>
                ) : null}

                <div className="cer-v17-sections">
                    {sections.map((section) => (
                        <section key={section.n}>
                            <b>{section.n} · {section.title}</b>
                            {section.lines.map((line) => (
                                <p key={line}>{line}</p>
                            ))}
                        </section>
                    ))}
                </div>
                <p className="cer-v17-note">
                    {showCiiScore
                        ? `This flashcard and the detailed report use one CII total (${score}/100). Section bars are the same breakdown the detailed report prints.`
                        : "This flashcard summarises your report. The CII score appears again after you submit."}
                    {agg.bestPct != null ? ` Best measured change: ${agg.bestPct >= 0 ? "+" : ""}${agg.bestPct}%.` : ""}
                </p>
            </div>

            <footer className="cer-v17-foot">
                <div>
                    <b>{statusLabel}</b>
                    <span>
                        {showCiiScore
                            ? "The printed flashcard is this card. The detailed report carries the same CII."
                            : "The printed flashcard is this card. Submit to attach a CII score."}
                    </span>
                </div>
                <div className="cer-v17-actions">
                    <button type="button" onClick={printFlashcard}>Print / Save flashcard</button>
                    {status === "draft" && onSend ? (
                        <button type="button" className="gold" disabled={!canSend || sending} onClick={onSend}>
                            {sending ? "Working…" : "Send to faculty"}
                        </button>
                    ) : null}
                </div>
            </footer>
            {status === "draft" && !canSend && missingLabels.length ? (
                <p className="cer-v17-missing">Complete {missingLabels.join(", ")} before the report can be sent.</p>
            ) : null}
        </article>
    );
}
