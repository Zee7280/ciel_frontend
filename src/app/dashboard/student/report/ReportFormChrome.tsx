"use client";

import type { ReactNode } from "react";
import type { ReportData } from "./context/ReportContext";
import { mergeReportSdgSnapshotRows } from "./utils/reportSdgMerge";
import { findSdgById } from "@/utils/sdgData";
import { getReportProjectContextDisplay } from "@/utils/reportProjectContext";

export const REPORT_TAB_ITEMS: Array<{ step: number; label: string; flash?: boolean }> = [
    { step: 1, label: "1 PARTICIPATION" },
    { step: 2, label: "2 CONTEXT" },
    { step: 3, label: "3 SDG MAPPING" },
    { step: 4, label: "4 ACTIVITIES" },
    { step: 5, label: "5 OUTCOMES" },
    { step: 6, label: "6 RESOURCES" },
    { step: 7, label: "7 PARTNERSHIPS" },
    { step: 8, label: "8 EVIDENCE" },
    { step: 9, label: "9 REFLECTION" },
    { step: 10, label: "10 SUSTAINABILITY" },
    { step: 11, label: "⭐ FLASH CARD", flash: true },
];

const SECTION_BRIDGES: Record<number, { kicker: string; title: string; note?: string }> = {
    1: {
        kicker: "START HERE · APPROVAL COMES ONCE, AT THE END",
        title: "Your crew, your hours, your proof",
        note: "Attendance still saves through the existing Section 1 flow. Faculty / partner approval is unchanged.",
    },
    2: {
        kicker: "YOUR ACHIEVEMENTS SO FAR · CARRIED AUTOMATICALLY",
        title: "What was the situation before you started?",
        note: "Describe things before the project — activities and results stay in Sections 4 and 5.",
    },
    3: { kicker: "YOUR ACHIEVEMENTS SO FAR · CARRIED AUTOMATICALLY", title: "Pick your goals off the wall" },
    4: {
        kicker: "YOUR ACHIEVEMENTS SO FAR · CARRIED AUTOMATICALLY",
        title: "What we did — activity by activity",
        note: "Record what you did and delivered. What changed goes in Section 5.",
    },
    5: {
        kicker: "YOUR ACHIEVEMENTS SO FAR · CARRIED AUTOMATICALLY",
        title: "What changed because of us",
        note: "Only what changed. Session counts belong in Section 4.",
    },
    6: { kicker: "YOUR ACHIEVEMENTS SO FAR · CARRIED AUTOMATICALLY", title: "What the project ran on" },
    7: { kicker: "YOUR ACHIEVEMENTS SO FAR · CARRIED AUTOMATICALLY", title: "Who stood with us" },
    8: { kicker: "YOUR ACHIEVEMENTS SO FAR · CARRIED AUTOMATICALLY", title: "Every claim, backed by evidence" },
    9: { kicker: "YOUR ACHIEVEMENTS SO FAR · CARRIED AUTOMATICALLY", title: "What it did to you" },
    10: {
        kicker: "YOUR ACHIEVEMENTS SO FAR · CARRIED AUTOMATICALLY",
        title: "What survives after you leave",
        note: "Not all projects continue — a candid answer is stronger than an optimistic one.",
    },
    11: {
        kicker: "FLASH CARD · ONE RECORD, THREE VIEWS",
        title: "Your accumulated report — summary, CII, and submit",
    },
};

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}

function pickString(...values: unknown[]): string {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
}

function pickNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const n = Number(value.replace(/,/g, "").trim());
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

const BANNER_KICKERS: Record<number, string> = {
    1: "SECTION 1 · PARTICIPATION",
    2: "SECTION 2 · PROJECT CONTEXT",
    3: "SECTION 3 · SDG MAPPING",
    4: "SECTION 4 · ACTIVITIES & OUTPUTS",
    5: "SECTION 5 · OUTCOMES & RESULTS",
    6: "SECTION 6 · RESOURCES",
    7: "SECTION 7 · PARTNERSHIPS",
    8: "SECTION 8 · EVIDENCE",
    9: "SECTION 9 · REFLECTION",
    10: "SECTION 10 · SUSTAINABILITY",
};

const BANNER_FOOT: Record<number, string> = {
    1: "No extra approval here — attendance locks when faculty approves your flash card at the end.",
    2: "Sections 4 & 5 measure everything against this exact line.",
    3: "Section 4 activities must align with these exact targets.",
    4: "Counts only — the change these produced lives in Section 5.",
    5: "Measured against the Section 2 baseline and Section 3 targets.",
    6: "Every rupee and every item traced to what it made possible.",
    7: "Linked since Section 1 — verification is one click on their side.",
    8: "Files map to claims — gaps are named honestly, never hidden.",
    9: "Honest middle scores with strong proof outrank a row of 5s.",
    10: "A candid “partial” with named mechanisms outranks a hollow “yes”.",
};

const AVATAR_COLORS = ["#0e7d74,#2dd4bf", "#0f5e63,#22d3ee", "#0891b2,#67e8f9", "#0e5f63,#5eead4"];

function firstSentence(text: string): string {
    const trimmed = (text || "").trim();
    if (!trimmed) return "";
    const match = trimmed.match(/^[^.!?]*[.!?]/);
    return (match ? match[0] : trimmed).trim();
}

function displayName(person: { name?: string; fullName?: string } | undefined): string {
    return pickString(person?.fullName, person?.name);
}

function chromeAgg(data: ReportData, projectData?: unknown) {
    const context = getReportProjectContextDisplay({ ...asRecord(projectData), opportunity: projectData, ...data });
    const title = pickString(asRecord(projectData).title, data.project_title) || "Community engagement";
    const sdgs = mergeReportSdgSnapshotRows({ ...asRecord(projectData), ...data }, data.section3);
    const hours = pickNumber(data.section1?.metrics?.total_verified_hours) || 0;
    const members =
        (data.section1?.participation_type === "team"
            ? 1 + (Array.isArray(data.section1.team_members) ? data.section1.team_members.length : 0)
            : 1) || 1;
    const logs = Array.isArray(data.section1?.attendance_logs) ? data.section1.attendance_logs : [];
    const acts = Array.isArray(data.section4?.activity_blocks) ? data.section4.activity_blocks : [];
    const outputs = acts.reduce((sum, block) => sum + (Array.isArray(block.outputs) ? block.outputs.length : 0), 0);
    const reach = pickString(data.section4?.project_summary?.distinct_total_beneficiaries);
    const outcomes = Array.isArray(data.section5?.measurable_outcomes) ? data.section5.measurable_outcomes : [];
    const measured = outcomes.filter((o) => pickString(o.metric, o.outcome_area) && (o.baseline || o.endline));
    const pcts = measured
        .map((o) => {
            const b = pickNumber(o.baseline);
            const e = pickNumber(o.endline);
            if (b == null || e == null || b === 0) return null;
            return Math.round(((e - b) / b) * 100);
        })
        .filter((n): n is number => n != null);
    const bestPct = pcts.length ? Math.max(...pcts) : null;
    const evidence =
        (Array.isArray(data.section8?.evidence_files) ? data.section8.evidence_files.length : 0) +
        (Array.isArray(data.evidence_urls) ? data.evidence_urls.length : 0);
    const competencyScores = Object.values(data.section9?.competency_scores || {});
    const ratedCompetencyCount = competencyScores.filter((n) => typeof n === "number" && n > 0).length;
    const competency =
        ratedCompetencyCount === 12
            ? (competencyScores.reduce((sum, n) => sum + (Number(n) || 0), 0) / 12).toFixed(1)
            : "";
    const ethicsVals = Object.values(data.section8?.ethical_compliance || {});
    const ethicsOk = ethicsVals.length > 0 && ethicsVals.every(Boolean);
    const names = [
        displayName(data.section1?.team_lead),
        ...(Array.isArray(data.section1?.team_members) ? data.section1.team_members.map(displayName) : []),
    ].filter(Boolean);
    const pkr = (data.section6?.resources || []).reduce((sum, r) => {
        if (r.unit !== "PKR") return sum;
        return sum + (pickNumber(r.amount) || 0);
    }, 0);
    return {
        context,
        title,
        sdgs,
        hours,
        members,
        logs,
        acts,
        outputs,
        reach,
        measured,
        bestPct,
        evidence,
        competency,
        ethicsOk,
        names,
        pkr,
    };
}

export function ReportSectionBridge({
    step,
    data,
    projectData,
    onOpenHelp,
}: {
    step: number;
    data: ReportData;
    projectData?: unknown;
    onOpenHelp?: () => void;
}) {
    const meta = SECTION_BRIDGES[step];
    if (!meta) return null;

    const a = chromeAgg(data, projectData);
    const { context, title, sdgs, hours, members, acts, reach, evidence, competency, bestPct, pkr } = a;

    const pills: Array<[string, string]> = [];
    if (step > 1 && hours) pills.push([`${Math.round(hours * 10) / 10}h`, "VERIFIED HOURS"]);
    if (step > 1) pills.push([String(members), "MEMBERS"]);
    if (step > 2 && data.section2?.problem_statement) pills.push(["📍", "BASELINE SET"]);
    if (step > 3 && sdgs.length) pills.push([String(sdgs.length), "SDGs MAPPED"]);
    if (step > 4 && acts.length) pills.push([String(acts.length), "ACTIVITIES"]);
    if (step > 4 && reach) pills.push([reach, "REACHED"]);
    if (step > 5 && bestPct != null) pills.push([`${bestPct >= 0 ? "+" : ""}${bestPct}%`, "BEST MEASURED CHANGE"]);
    if (step > 6 && pkr) pills.push([`PKR ${pkr.toLocaleString()}`, "RESOURCES TRACED"]);
    if (step > 8 && evidence) pills.push([String(evidence), "EVIDENCE FILES"]);
    if (step > 9 && competency) pills.push([`${competency}/5`, "COMPETENCY"]);

    return (
        <>
            <div className="cer-bridge">
                <div className="k">{meta.kicker}</div>
                <h1>{meta.title}</h1>
                <p>
                    {title}
                    {context.partnerOrganization ? ` · ${context.partnerOrganization}` : ""}
                    {context.projectLocation && context.projectLocation !== "N/A"
                        ? ` · ${context.projectLocation}`
                        : ""}
                    {context.timelineLabel && context.timelineLabel !== "—"
                        ? ` · ${context.timelineLabel}`
                        : ""}
                </p>
                {step > 3 && sdgs.length ? (
                    <div className="cer-sdgrow">
                        {sdgs.map((row) => {
                            const sdg = findSdgById(row.goalNumber);
                            return (
                                <span
                                    key={`${row.goalNumber}-${row.targetId}`}
                                    className="cer-sdgc"
                                    style={{ background: sdg?.color || "#0e7d74" }}
                                >
                                    {row.role === "primary" ? "★ " : ""}
                                    SDG {row.goalNumber}
                                    {row.targetId ? ` · ${row.targetId}` : ""}
                                </span>
                            );
                        })}
                    </div>
                ) : null}
                {pills.length ? (
                    <div className="cer-bpills">
                        {pills.map(([value, label]) => (
                            <div key={label} className="cer-bp">
                                <div className="v">{value}</div>
                                <div className="kk">{label}</div>
                            </div>
                        ))}
                    </div>
                ) : null}
                {onOpenHelp && step <= 10 ? (
                    <button type="button" className="cer-hchip" onClick={onOpenHelp}>
                        How to fill this section — with examples
                    </button>
                ) : null}
            </div>
            {meta.note ? <div className="cer-note">{meta.note}</div> : null}
        </>
    );
}

function BannerShell({
    step,
    title,
    children,
    ai,
}: {
    step: number;
    title: string;
    children?: ReactNode;
    ai?: string;
}) {
    return (
        <div className="cer-ban">
            <div className="cer-bh">
                <div className="cer-bk">
                    {BANNER_KICKERS[step]} · SUMMARY
                    <span className="cer-live">● UPDATES LIVE</span>
                </div>
                <div className="cer-bt">{title}</div>
            </div>
            <div className="cer-bb">
                {children}
                {ai ? (
                    <>
                        <div className="cer-bsec" style={{ marginTop: 11 }}>
                            AI SUMMARY — WHAT THE RUBRIC WILL READ
                        </div>
                        <div className="cer-quote tl">{ai}</div>
                    </>
                ) : null}
            </div>
            <div className="cer-bf">
                <b>This banner is what gets scored.</b> {BANNER_FOOT[step]}
            </div>
        </div>
    );
}

export function ReportLiveBanner({
    step,
    data,
    projectData,
}: {
    step: number;
    data: ReportData;
    projectData?: unknown;
}) {
    if (step < 1 || step > 10) return null;
    const a = chromeAgg(data, projectData);
    const ai = pickString(
        step === 1 ? data.section1?.verified_summary : undefined,
        (data as unknown as Record<string, { summary_text?: string }>)[`section${step}`]?.summary_text,
    );
    const baseline = firstSentence(data.section2?.problem_statement || "");

    if (step === 1) {
        return (
            <BannerShell
                step={1}
                title={`${Math.round(a.hours * 10) / 10} verified-track hours · ${a.logs.length} sessions`}
                ai={ai}
            >
                {a.logs.length ? (
                    <>
                        <div className="cer-bsec">WHAT WE DID</div>
                        {a.logs.slice(0, 4).map((log) => (
                            <div key={log.id} className="cer-row">
                                <span className="cer-mtag">{(log.activity_type || "SESSION").toUpperCase()}</span>
                                <span style={{ flex: 1, color: "#3c5a5c" }}>{log.description || log.location}</span>
                                <b style={{ color: "#0e7d74" }}>{log.hours}h</b>
                            </div>
                        ))}
                    </>
                ) : null}
            </BannerShell>
        );
    }

    if (step === 2) {
        return (
            <BannerShell step={2} title={baseline ? `“${baseline}”` : "Your baseline, in your words"} ai={ai}>
                {data.section2?.problem_statement ? (
                    <>
                        <div className="cer-bsec">BASELINE STATEMENT</div>
                        <div className="cer-quote">{data.section2.problem_statement}</div>
                    </>
                ) : null}
            </BannerShell>
        );
    }

    if (step === 3) {
        return (
            <BannerShell
                step={3}
                title={`${a.sdgs.filter((s) => s.role === "primary").length} registered goal · ${a.sdgs.filter((s) => s.role !== "primary").length} student-mapped`}
                ai={ai}
            >
                {a.sdgs.length ? (
                    <div className="cer-mrow">
                        {a.sdgs.map((row) => {
                            const sdg = findSdgById(row.goalNumber);
                            return (
                                <span
                                    key={`${row.goalNumber}-${row.targetId}`}
                                    className="cer-sdgc"
                                    style={{ background: sdg?.color || "#0e7d74" }}
                                >
                                    {row.role === "primary" ? "★ " : ""}
                                    SDG {row.goalNumber}
                                    {row.targetId ? ` · ${row.targetId}` : ""}
                                </span>
                            );
                        })}
                    </div>
                ) : null}
                {data.section3?.contribution_intent_statement ? (
                    <>
                        <div className="cer-bsec">PATHWAY</div>
                        <div className="cer-quote">{data.section3.contribution_intent_statement}</div>
                    </>
                ) : null}
            </BannerShell>
        );
    }

    if (step === 4) {
        return (
            <BannerShell
                step={4}
                title={`${a.acts.length} activities · ${a.outputs} outputs · ${a.reach || "—"} reached`}
                ai={ai}
            >
                {a.acts.map((block, i) => (
                    <div key={block.id || i} className="cer-row">
                        <b>
                            {i + 1}. {block.title || "Unnamed"}
                        </b>
                        <span style={{ color: "#7a919a" }}>{block.primary_category}</span>
                        <span style={{ marginLeft: "auto", color: "#0e7d74", fontWeight: 800 }}>{block.status}</span>
                    </div>
                ))}
            </BannerShell>
        );
    }

    if (step === 5) {
        return (
            <BannerShell
                step={5}
                title={`${a.measured.length} outcomes measured${a.bestPct != null ? ` · best ${a.bestPct >= 0 ? "+" : ""}${a.bestPct}%` : ""}`}
                ai={ai}
            >
                {data.section5?.observed_change ? (
                    <>
                        <div className="cer-bsec">THE CHANGE, IN OUR WORDS</div>
                        <div className="cer-quote">{data.section5.observed_change}</div>
                    </>
                ) : null}
                {a.measured.length ? (
                    <>
                        <div className="cer-bsec">BEFORE → AFTER</div>
                        {a.measured.map((o) => (
                            <div key={o.id} className="cer-row">
                                <b style={{ flex: 1 }}>{o.metric || o.outcome_area}</b>
                                <span>
                                    {o.baseline} → <b>{o.endline}</b>
                                </span>
                            </div>
                        ))}
                    </>
                ) : null}
            </BannerShell>
        );
    }

    if (step === 6) {
        const timeOnly = data.section6?.use_resources === "no";
        const resources = data.section6?.resources || [];
        return (
            <BannerShell
                step={6}
                title={
                    timeOnly
                        ? "Ran on time & effort alone"
                        : `${resources.length} resource entries${a.pkr ? ` · PKR ${a.pkr.toLocaleString()}` : ""}`
                }
                ai={ai}
            >
                {timeOnly ? (
                    <div className="cer-quote">Zero-budget project — declared proudly, not apologetically.</div>
                ) : (
                    resources.map((r, i) => (
                        <div key={`${r.type}-${i}`} className="cer-row">
                            <b>
                                {r.type}
                                {r.amount ? ` — ${r.amount} ${r.unit}` : ""}
                            </b>
                            <span style={{ flex: 1, color: "#7a919a" }}>{(r.sources || []).join(", ")}</span>
                        </div>
                    ))
                )}
            </BannerShell>
        );
    }

    if (step === 7) {
        const partners = data.section7?.partners || [];
        const roles = partners.flatMap((p) => p.role || []);
        return (
            <BannerShell
                step={7}
                title={`${a.context.partnerOrganization || "Your partner"}${roles.length ? ` · ${roles.length} roles` : ""}`}
                ai={ai}
            >
                {roles.length ? (
                    <div className="cer-mrow">
                        {roles.slice(0, 8).map((role) => (
                            <span key={role} className="cer-mtag">
                                {role}
                            </span>
                        ))}
                    </div>
                ) : null}
                {partners
                    .filter((p) => p.contribution?.length)
                    .slice(0, 2)
                    .map((p) => (
                        <div key={p.name} className="cer-quote">
                            “{(p.contribution || []).join("; ")}”
                        </div>
                    ))}
            </BannerShell>
        );
    }

    if (step === 8) {
        return (
            <BannerShell step={8} title={`${a.evidence} evidence files on record`} ai={ai}>
                {(data.section8?.evidence_types || []).length ? (
                    <div className="cer-mrow">
                        {data.section8.evidence_types.map((t) => (
                            <span key={t} className="cer-mtag">
                                {t}
                            </span>
                        ))}
                    </div>
                ) : null}
            </BannerShell>
        );
    }

    if (step === 9) {
        const skills = data.section9?.skills_grown || [];
        return (
            <BannerShell
                step={9}
                title={`${skills.length ? `${skills.length} skills grown` : "Your reflection"}${a.competency ? ` · ${a.competency}/5 self-rated` : ""}`}
                ai={ai}
            >
                {skills.length ? (
                    <div className="cer-mrow">
                        {skills.map((s) => (
                            <span key={s} className="cer-mtag">
                                {s}
                            </span>
                        ))}
                    </div>
                ) : null}
                {data.section9?.personal_learning ? (
                    <div className="cer-quote">{data.section9.personal_learning}</div>
                ) : null}
            </BannerShell>
        );
    }

    const mechs = data.section10?.mechanisms || [];
    return (
        <BannerShell
            step={10}
            title={
                data.section10?.continuation_status
                    ? `Continues: ${data.section10.continuation_status}${mechs.length ? ` · ${mechs.length} mechanisms` : ""}`
                    : "The last question"
            }
            ai={ai}
        >
            {data.section10?.continuation_details ? (
                <div className="cer-quote">{data.section10.continuation_details}</div>
            ) : null}
            {mechs.length ? (
                <div className="cer-mrow">
                    {mechs.map((m) => (
                        <span key={m} className="cer-mtag">
                            {m}
                        </span>
                    ))}
                </div>
            ) : null}
        </BannerShell>
    );
}

function flashStatus(data: ReportData): "draft" | "pending" | "live" {
    const status = `${data.status || ""} ${data.admin_status || ""} ${data.report_status || ""}`.toLowerCase();
    if (/(verified|approved|live)/.test(status)) return "live";
    if (/(submitted|pending|payment)/.test(status)) return "pending";
    return "draft";
}

export function ReportFlashCard({
    data,
    projectData,
    sectionsComplete,
    missingLabels,
    canSend,
    onSend,
    sending,
}: {
    data: ReportData;
    projectData?: unknown;
    sectionsComplete: number;
    missingLabels: string[];
    canSend?: boolean;
    onSend?: () => void;
    sending?: boolean;
}) {
    const a = chromeAgg(data, projectData);
    const st = flashStatus(data);
    const baseline = firstSentence(data.section2?.problem_statement || "");
    const firstMeas = a.measured[0];
    const dossier: Array<[string, string, string, string]> = [];

    if (baseline) {
        dossier.push([
            "🎯",
            "PURPOSE & BASELINE · why this mattered",
            `“${baseline}” ${data.section2?.affected_group ? `Around ${data.section2.affected_group} lived this daily.` : ""} Anchored to ${a.sdgs.length || 0} SDG target${a.sdgs.length === 1 ? "" : "s"}.`,
            "BASELINE ON RECORD",
        ]);
    }
    if (a.acts.length) {
        dossier.push([
            "🛠️",
            "EXECUTION & SCALE · what was actually done",
            `${a.members} students · ${Math.round(a.hours * 10) / 10} verified-track hours · ${a.logs.length} session${a.logs.length === 1 ? "" : "s"} → ${a.acts.length} activit${a.acts.length === 1 ? "y" : "ies"} delivering ${a.outputs} counted outputs${a.reach ? ` and serving ${a.reach}` : ""}.`,
            "COUNTED · LOGGED SESSIONS",
        ]);
    }
    if (firstMeas) {
        dossier.push([
            "📈",
            "MEASURED CHANGE · before → after, with proof",
            a.measured
                .map((o) => `${o.metric || o.outcome_area}: ${o.baseline} → ${o.endline}`)
                .join(" · "),
            "MEASURED",
        ]);
    }
    if (data.section6?.use_resources === "no") {
        dossier.push([
            "💵",
            "RESOURCE INTEGRITY · every input accounted for",
            `Zero budget — this ran on time and effort alone. ${Math.round(a.hours * 10) / 10} verified hours were the resource base.`,
            "ZERO-BUDGET · DECLARED",
        ]);
    } else if ((data.section6?.resources || []).length) {
        dossier.push([
            "💵",
            "RESOURCE INTEGRITY · every rupee traced",
            `${a.pkr ? `PKR ${a.pkr.toLocaleString()} in cash` : "In-kind and other support"} across ${data.section6.resources.length} resource ${data.section6.resources.length === 1 ? "entry" : "entries"}.`,
            "ON FILE",
        ]);
    }
    if ((data.section7?.partners || []).length) {
        dossier.push([
            "🤝",
            "PARTNERSHIP & VERIFICATION · who vouches",
            `${a.context.partnerOrganization || data.section7.partners[0]?.name || "Partner"} stood with the team. ${a.evidence} evidence files back the record.`,
            `${a.evidence} FILES`,
        ]);
    }
    if (a.competency || (data.section9?.skills_grown || []).length) {
        dossier.push([
            "🪞",
            "LEARNING & GROWTH · the academic return",
            `${(data.section9?.skills_grown || []).join(", ")}${a.competency ? ` Self-rated ${a.competency}/5 across 12 competencies.` : ""}`,
            a.competency ? `HONEST SPREAD · ${a.competency}/5` : "REFLECTED",
        ]);
    }
    if (data.section10?.continuation_status) {
        dossier.push([
            "🌱",
            "CONTINUITY · what survives the team leaving",
            `Continuation: ${data.section10.continuation_status}. ${(data.section10.mechanisms || []).length ? `Held in place by ${(data.section10.mechanisms || []).join(", ")}.` : ""}`,
            `${(data.section10.mechanisms || []).length} MECHANISMS NAMED`,
        ]);
    }

    return (
        <div className="cer-fcwrap">
            <div className="cer-fcard">
                <div className="cer-fch">
                    <span className="cer-ribbon">CIEL PK · COMMUNITY ENGAGEMENT</span>
                    <h1>{a.title}</h1>
                    <div className="cer-fm">
                        {a.context.partnerOrganization ? `🏛️ ${a.context.partnerOrganization}` : ""}
                        {a.context.projectLocation && a.context.projectLocation !== "N/A"
                            ? ` · 📍 ${a.context.projectLocation}`
                            : ""}
                        {a.context.timelineLabel && a.context.timelineLabel !== "—"
                            ? ` · 📅 ${a.context.timelineLabel}`
                            : ""}
                    </div>
                    {a.names.length ? (
                        <div className="cer-avrow">
                            {a.names.slice(0, 6).map((name, i) => (
                                <div
                                    key={`${name}-${i}`}
                                    className="cer-av"
                                    style={{
                                        background: `linear-gradient(135deg,${AVATAR_COLORS[i % AVATAR_COLORS.length]})`,
                                    }}
                                    title={name}
                                >
                                    {name.charAt(0).toUpperCase()}
                                </div>
                            ))}
                        </div>
                    ) : null}
                    {a.sdgs.length ? (
                        <div className="cer-sdgrow">
                            {a.sdgs.map((row) => {
                                const sdg = findSdgById(row.goalNumber);
                                return (
                                    <span
                                        key={`${row.goalNumber}-${row.targetId}`}
                                        className="cer-sdgc"
                                        style={{ background: sdg?.color || "#0e7d74" }}
                                    >
                                        {row.role === "primary" ? "★ " : ""}
                                        SDG {row.goalNumber}
                                        {row.targetId ? ` · ${row.targetId}` : ""}
                                    </span>
                                );
                            })}
                        </div>
                    ) : null}
                </div>
                <div className="cer-fstats">
                    <div className="cer-fs">
                        <div className="v">{Math.round(a.hours * 10) / 10}h</div>
                        <div className="k">VERIFIED HOURS</div>
                    </div>
                    <div className="cer-fs">
                        <div className="v">{a.reach || "—"}</div>
                        <div className="k">PEOPLE REACHED</div>
                    </div>
                    <div className="cer-fs">
                        <div className="v">
                            {a.bestPct != null ? `${a.bestPct >= 0 ? "+" : ""}${a.bestPct}%` : "—"}
                        </div>
                        <div className="k">MEASURED CHANGE</div>
                    </div>
                    <div className="cer-fs">
                        <div className="v">{a.evidence}</div>
                        <div className="k">EVIDENCE FILES</div>
                    </div>
                </div>
                <div className="cer-fbody">
                    <div className="cer-qsig">
                        <div className="cer-qs">
                            <div className="v">{sectionsComplete}/10</div>
                            <div className="k">SECTIONS COMPLETE</div>
                        </div>
                        <div className="cer-qs">
                            <div className="v">{a.measured.length}</div>
                            <div className="k">OUTCOMES MEASURED</div>
                        </div>
                        <div className="cer-qs">
                            <div className="v">{a.evidence}</div>
                            <div className="k">EVIDENCE ON FILE</div>
                        </div>
                        <div className="cer-qs">
                            <div className="v">{a.ethicsOk ? "✅" : "⏳"}</div>
                            <div className="k">ETHICS CONFIRMED</div>
                        </div>
                    </div>
                    {baseline && firstMeas ? (
                        <div className="cer-arrow">
                            <div className="a">
                                <b>BEFORE · SECTION 2</b>
                                {baseline}
                            </div>
                            <span className="mid">➜</span>
                            <div className="a">
                                <b>AFTER · SECTION 5</b>
                                {firstMeas.metric || firstMeas.outcome_area}: {firstMeas.baseline} → {firstMeas.endline}
                            </div>
                        </div>
                    ) : null}
                    <div className="cer-bsec" style={{ marginTop: 13 }}>
                        THE RUBRIC DOSSIER — FROM YOUR EXISTING SECTIONS
                    </div>
                    {dossier.length ? (
                        dossier.map((row) => (
                            <div key={row[1]} className="cer-dr">
                                <span className="ic">{row[0]}</span>
                                <div className="bx">
                                    <div className="crit">{row[1]}</div>
                                    <div className="txt">{row[2]}</div>
                                </div>
                                <span className="ev">{row[3]}</span>
                            </div>
                        ))
                    ) : (
                        <div className="cer-missing">Fill the sections — each one becomes a scored criterion row here.</div>
                    )}
                </div>
                <div className="cer-fcfoot">
                    {st === "draft" ? (
                        <>
                            <div className="cer-status cer-st-draft">
                                DRAFT — {sectionsComplete}/10 sections complete
                            </div>
                            {onSend ? (
                                <button
                                    type="button"
                                    className="cer-bigbtn"
                                    disabled={!canSend || sending}
                                    onClick={onSend}
                                >
                                    {sending ? "Working…" : "Send to faculty for approval"}
                                </button>
                            ) : null}
                            {!canSend && missingLabels.length ? (
                                <div className="cer-missing">
                                    Complete {missingLabels.join(", ")} to unlock — every section you fill raises your
                                    score.
                                </div>
                            ) : null}
                        </>
                    ) : null}
                    {st === "pending" ? (
                        <div className="cer-status cer-st-pend">SENT — awaiting review</div>
                    ) : null}
                    {st === "live" ? (
                        <>
                            <div className="cer-status cer-st-live">APPROVED & LIVE</div>
                            <div className="cer-dash">
                                <span className="cer-dchip">STUDENT DASHBOARD</span>
                                <span className="cer-dchip">FACULTY DASHBOARD</span>
                                <span className="cer-dchip">UNIVERSITY DASHBOARD</span>
                                <span className="cer-dchip">CIEL PK DASHBOARD</span>
                            </div>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
