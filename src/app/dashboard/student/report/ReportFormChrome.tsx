"use client";

import type { ReactNode } from "react";
import type { ReportData } from "./context/ReportContext";
import { mergeReportSdgSnapshotRows } from "./utils/reportSdgMerge";
import { findSdgById } from "@/utils/sdgData";
import { getReportProjectContextDisplay } from "@/utils/reportProjectContext";
import { REPORT_UI_SECTION_TOTAL, FLASH_CARD_STEP, canonicalReportStep, isMergedActivitiesStep, wizardStepToDataSections } from "./utils/reportWizardNav";

export const REPORT_TAB_ITEMS: Array<{ step: number; label: string; flash?: boolean }> = [
    { step: 1, label: "1 Participation" },
    { step: 2, label: "2 Context" },
    { step: 3, label: "3 SDG mapping" },
    { step: 4, label: "4 Activities" },
    { step: 5, label: "5 Resources" },
    { step: 6, label: "6 Partnerships" },
    { step: 7, label: "7 Evidence" },
    { step: 8, label: "8 Reflection" },
    { step: 9, label: "9 Sustainability" },
    { step: 10, label: "Summary card", flash: true },
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
        note: "Describe things before the project — activities and results stay in Section 4.",
    },
    3: { kicker: "YOUR ACHIEVEMENTS SO FAR · CARRIED AUTOMATICALLY", title: "Pick your goals off the wall" },
    4: {
        kicker: "YOUR ACHIEVEMENTS SO FAR · CARRIED AUTOMATICALLY",
        title: "What we did — and what changed because of it",
        note: "One section, two parts: Part A is what you did (counts). Part B is what changed (before → after). Both still save as their own fields.",
    },
    5: { kicker: "YOUR ACHIEVEMENTS SO FAR · CARRIED AUTOMATICALLY", title: "What the project ran on" },
    6: { kicker: "YOUR ACHIEVEMENTS SO FAR · CARRIED AUTOMATICALLY", title: "Who stood with us" },
    7: { kicker: "YOUR ACHIEVEMENTS SO FAR · CARRIED AUTOMATICALLY", title: "Every claim, backed by evidence" },
    8: { kicker: "YOUR ACHIEVEMENTS SO FAR · CARRIED AUTOMATICALLY", title: "What it did to you" },
    9: {
        kicker: "YOUR ACHIEVEMENTS SO FAR · CARRIED AUTOMATICALLY",
        title: "What survives after you leave",
        note: "Not all projects continue — a candid answer is stronger than an optimistic one.",
    },
    10: {
        kicker: "SUMMARY CARD · ONE RECORD",
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
    5: "SECTION 5 · RESOURCES",
    6: "SECTION 6 · PARTNERSHIPS",
    7: "SECTION 7 · EVIDENCE",
    8: "SECTION 8 · REFLECTION",
    9: "SECTION 9 · SUSTAINABILITY",
};

const BANNER_FOOT: Record<number, string> = {
    1: "No extra approval here — attendance locks when faculty approves your flash card at the end.",
    2: "Section 4 · Part B measures everything against this exact line.",
    3: "Section 4 activities must align with these exact targets.",
    4: "Part A counts what was done; Part B proves what it changed — one section, one story.",
    5: "Every rupee and every item traced to what it made possible.",
    6: "Linked since Section 1 — verification is one click on their side.",
    7: "Files map to claims — gaps are named honestly, never hidden.",
    8: "Honest middle scores with strong proof outrank a row of 5s.",
    9: "A candid “partial” with named mechanisms outranks a hollow “yes”.",
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
    const uiStep = canonicalReportStep(step);
    const meta = SECTION_BRIDGES[uiStep];
    if (!meta) return null;

    const a = chromeAgg(data, projectData);
    const { context, title, sdgs, hours, members, acts, reach, evidence, competency, bestPct, pkr } = a;

    const pills: Array<[string, string]> = [];
    if (uiStep > 1 && hours) pills.push([`${Math.round(hours * 10) / 10}h`, "VERIFIED HOURS"]);
    if (uiStep > 1) pills.push([String(members), "MEMBERS"]);
    if (uiStep > 2 && data.section2?.problem_statement) pills.push(["📍", "BASELINE SET"]);
    if (uiStep > 3 && sdgs.length) pills.push([String(sdgs.length), "SDGs MAPPED"]);
    if (uiStep > 4 && acts.length) pills.push([String(acts.length), "ACTIVITIES"]);
    if (uiStep > 4 && reach) pills.push([reach, "REACHED"]);
    if (uiStep > 4 && bestPct != null) pills.push([`${bestPct >= 0 ? "+" : ""}${bestPct}%`, "BEST MEASURED CHANGE"]);
    if (uiStep > 5 && pkr) pills.push([`PKR ${pkr.toLocaleString()}`, "RESOURCES TRACED"]);
    if (uiStep > 7 && evidence) pills.push([String(evidence), "EVIDENCE FILES"]);
    if (uiStep > 8 && competency) pills.push([`${competency}/5`, "COMPETENCY"]);

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
                {uiStep > 3 && sdgs.length ? (
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
                {onOpenHelp && uiStep < FLASH_CARD_STEP ? (
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
    const uiStep = canonicalReportStep(step);
    if (uiStep < 1 || uiStep >= FLASH_CARD_STEP) return null;
    const a = chromeAgg(data, projectData);
    const mergedAi = [data.section4?.summary_text, data.section5?.summary_text]
        .filter((text): text is string => typeof text === "string" && text.trim().length > 0)
        .join("\n\n");
    const dataSecs = wizardStepToDataSections(uiStep);
    const primaryDataKey = dataSecs.length === 1 ? `section${dataSecs[0]}` : "";
    const ai = pickString(
        uiStep === 1 ? data.section1?.verified_summary : undefined,
        isMergedActivitiesStep(uiStep) ? mergedAi : undefined,
        primaryDataKey
            ? (data as unknown as Record<string, { summary_text?: string }>)[primaryDataKey]?.summary_text
            : undefined,
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

    if (isMergedActivitiesStep(uiStep)) {
        const challengeTags = Array.isArray(data.section5?.challenge_tags) ? data.section5.challenge_tags : [];
        return (
            <BannerShell
                step={4}
                title={`${a.acts.length} activities · ${a.outputs} outputs · ${a.reach || "—"} reached${a.measured.length ? ` → ${a.measured.length} measured change${a.measured.length === 1 ? "" : "s"}${a.bestPct != null ? ` · best ${a.bestPct >= 0 ? "+" : ""}${a.bestPct}%` : ""}` : ""}`}
                ai={ai}
            >
                {a.acts.length ? (
                    <>
                        <div className="cer-bsec">PART A · WHAT WE DID</div>
                        {a.acts.map((block, i) => (
                            <div key={block.id || i} className="cer-row">
                                <b>
                                    {i + 1}. {block.title || "Unnamed"}
                                </b>
                                <span style={{ color: "#7a919a" }}>{block.primary_category}</span>
                                <span style={{ marginLeft: "auto", color: "#0e7d74", fontWeight: 800 }}>{block.status}</span>
                            </div>
                        ))}
                    </>
                ) : null}
                {data.section5?.observed_change ? (
                    <>
                        <div className="cer-bsec">PART B · THE CHANGE, IN OUR WORDS</div>
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
                {challengeTags.length ? (
                    <>
                        <div className="cer-bsec">WHAT WAS HARD</div>
                        <div className="cer-mrow">
                            {challengeTags.map((tag) => (
                                <span key={tag} className="cer-mtag">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </>
                ) : null}
            </BannerShell>
        );
    }

    if (uiStep === 5) {
        const timeOnly = data.section6?.use_resources === "no";
        const resources = data.section6?.resources || [];
        return (
            <BannerShell
                step={5}
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

    if (uiStep === 6) {
        const partners = data.section7?.partners || [];
        const roles = partners.flatMap((p) => p.role || []);
        return (
            <BannerShell
                step={6}
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

    if (uiStep === 7) {
        return (
            <BannerShell step={7} title={`${a.evidence} evidence files on record`} ai={ai}>
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

    if (uiStep === 8) {
        const skills = data.section9?.skills_grown || [];
        return (
            <BannerShell
                step={8}
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

    if (uiStep !== 9) return null;

    const mechs = data.section10?.mechanisms || [];
    return (
        <BannerShell
            step={9}
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

export function ReportLifecycleBanner({
    data,
    sectionsComplete,
    paymentHref,
}: {
    data: ReportData;
    sectionsComplete: number;
    paymentHref?: string;
}) {
    const reportSt = String(data.status || "").toLowerCase();
    const reportRs = String(data.report_status || "").toLowerCase();
    const paymentSt = String(data.payment_status || "").toLowerCase();
    const adminSt = String(data.admin_status || data.admin_approval_status || "").toLowerCase();
    const submitted = [
        "submitted",
        "under_review",
        "payment_pending",
        "pending_payment",
        "payment_under_review",
        "paid",
        "approved",
        "verified",
        "partner_verified",
        "finalized",
    ].includes(reportSt) || ["pending_payment", "payment_under_review", "paid"].includes(reportRs);
    const feeDone =
        reportSt === "paid" ||
        reportSt === "payment_under_review" ||
        reportSt === "verified" ||
        reportSt === "approved" ||
        reportRs === "paid" ||
        reportRs === "payment_under_review" ||
        paymentSt === "paid" ||
        paymentSt === "approved" ||
        data.payment_verified === true;
    const feeWaiting = submitted && !feeDone;
    const approved =
        reportSt === "verified" ||
        reportSt === "approved" ||
        adminSt === "verified" ||
        adminSt === "approved";
    const allDone = sectionsComplete >= REPORT_UI_SECTION_TOTAL;
    const steps: Array<{ label: string; state: "done" | "current" | "pending" }> = [
        { label: `${sectionsComplete}/${REPORT_UI_SECTION_TOTAL} sections`, state: allDone ? "done" : "current" },
        { label: "Submitted", state: flagsSubmitted(submitted, approved) },
        { label: "Reporting fee", state: flagsFee(feeDone, approved, feeWaiting, submitted) },
        { label: "Admin approval", state: approved ? "done" : feeDone ? "current" : "pending" },
        { label: "Scores & certificate", state: approved ? "done" : "pending" },
    ];

    const tone = approved ? "ok" : feeWaiting ? "fee" : submitted ? "wait" : "draft";
    const heading = approved
        ? "Approved"
        : feeWaiting
          ? "Sent — waiting on your reporting fee"
          : submitted
            ? "Sent — waiting on review"
            : allDone
              ? "Ready to send"
              : "Draft — finish the remaining sections";
    const copy = approved
        ? "Scores, certificate and the public card are unlocked."
        : feeWaiting
          ? "Pay the reporting fee so admin can verify hours, CII and your certificate."
          : submitted
            ? "CIEL admin reviews after the fee is on file."
            : "Complete all 9 sections, then send from the summary card.";

    return (
        <div className={`cer-life cer-life-${tone}`}>
            <div className="cer-life-row">
                <div>
                    <p className="cer-life-k">{heading}</p>
                    <p className="cer-life-t">{copy}</p>
                </div>
                {feeWaiting && paymentHref ? (
                    <a href={paymentHref} className="cer-pay">
                        Pay the fee
                    </a>
                ) : null}
            </div>
            <div className="cer-pipe">
                {steps.map((step) => (
                    <span key={step.label} className={`cer-pip ${step.state}`}>
                        {step.state === "done" ? "✓ " : ""}
                        {step.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

function flagsSubmitted(submitted: boolean, approved: boolean): "done" | "current" | "pending" {
    if (submitted || approved) return "done";
    return "pending";
}

function flagsFee(
    feeDone: boolean,
    approved: boolean,
    feeWaiting: boolean,
    submitted: boolean,
): "done" | "current" | "pending" {
    if (feeDone || approved) return "done";
    if (feeWaiting || submitted) return "current";
    return "pending";
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
            "Purpose",
            "Why this mattered",
            `“${baseline}” ${data.section2?.affected_group ? `Around ${data.section2.affected_group} lived this daily.` : ""} Anchored to ${a.sdgs.length || 0} SDG target${a.sdgs.length === 1 ? "" : "s"}.`,
            "Baseline on record",
        ]);
    }
    if (a.acts.length) {
        dossier.push([
            "What was done",
            "Execution and scale",
            `${a.members} students · ${Math.round(a.hours * 10) / 10} verified-track hours · ${a.logs.length} session${a.logs.length === 1 ? "" : "s"} → ${a.acts.length} activit${a.acts.length === 1 ? "y" : "ies"} delivering ${a.outputs} counted outputs${a.reach ? ` and serving ${a.reach}` : ""}.`,
            "Counted",
        ]);
    }
    if (firstMeas) {
        dossier.push([
            "Measured change",
            "Before → after, with proof",
            a.measured
                .map((o) => `${o.metric || o.outcome_area}: ${o.baseline} → ${o.endline}`)
                .join(" · "),
            "Measured",
        ]);
    }
    if (data.section6?.use_resources === "no") {
        dossier.push([
            "Resources",
            "Every rupee traced",
            `Zero budget — this ran on time and effort alone. ${Math.round(a.hours * 10) / 10} verified hours were the resource base.`,
            "On file",
        ]);
    } else if ((data.section6?.resources || []).length) {
        dossier.push([
            "Resources",
            "Every rupee traced",
            `${a.pkr ? `PKR ${a.pkr.toLocaleString()} in cash` : "In-kind and other support"} across ${data.section6.resources.length} resource ${data.section6.resources.length === 1 ? "entry" : "entries"}.`,
            "On file",
        ]);
    }
    if ((data.section7?.partners || []).length) {
        dossier.push([
            "Who vouches",
            "Partnership and verification",
            `${a.context.partnerOrganization || data.section7.partners[0]?.name || "Partner"} stood with the team. ${a.evidence} evidence files back the record.`,
            `${a.evidence} files`,
        ]);
    }
    if (a.competency || (data.section9?.skills_grown || []).length) {
        dossier.push([
            "Learning",
            "The academic return",
            `${(data.section9?.skills_grown || []).join(", ")}${a.competency ? ` Self-rated ${a.competency}/5 across 12 competencies.` : ""}`,
            a.competency ? `Honest spread` : "Reflected",
        ]);
    }
    if (data.section10?.continuation_status) {
        dossier.push([
            "Continuity",
            "What survives the team leaving",
            `Continuation: ${data.section10.continuation_status}. ${(data.section10.mechanisms || []).length ? `Held in place by ${(data.section10.mechanisms || []).join(", ")}.` : ""}`,
            `${(data.section10.mechanisms || []).length || 1} mechanism${(data.section10.mechanisms || []).length === 1 ? "" : "s"}`,
        ]);
    }

    return (
        <div className="cer-fcwrap">
            <div className="cer-fcard">
                <div className="cer-fch">
                    <span className="cer-ribbon">CIEL PK · COMMUNITY ENGAGEMENT</span>
                    <h1>{a.title}</h1>
                    <div className="cer-fm">
                        {[
                            a.context.projectLocation && a.context.projectLocation !== "N/A"
                                ? a.context.projectLocation
                                : a.context.partnerOrganization,
                            `${a.members} student${a.members === 1 ? "" : "s"}`,
                        ]
                            .filter(Boolean)
                            .join(" • ")}
                    </div>
                    {a.sdgs.length ? (
                        <div className="cer-sdgrow">
                            {a.sdgs.map((row) => {
                                const sdg = findSdgById(row.goalNumber);
                                return (
                                    <span
                                        key={`${row.goalNumber}-${row.targetId}`}
                                        className="cer-sdgc"
                                        style={{ background: "rgba(255,255,255,0.16)" }}
                                        title={sdg?.title}
                                    >
                                        SDG {row.goalNumber}
                                        {row.targetId ? ` - target ${row.targetId}` : ""}
                                    </span>
                                );
                            })}
                        </div>
                    ) : null}
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
                    <div className="cer-fstats cer-fstats-onhero">
                        <div className="cer-fs">
                            <div className="v">{Math.round(a.hours * 10) / 10} h</div>
                            <div className="k">Hours logged</div>
                        </div>
                        <div className="cer-fs">
                            <div className="v">{a.reach || "—"}</div>
                            <div className="k">People reached</div>
                        </div>
                        <div className="cer-fs">
                            <div className="v">
                                {a.bestPct != null ? `${a.bestPct >= 0 ? "+" : ""}${a.bestPct}%` : "—"}
                            </div>
                            <div className="k">Measured change</div>
                        </div>
                        <div className="cer-fs">
                            <div className="v">{a.evidence}</div>
                            <div className="k">Evidence files</div>
                        </div>
                    </div>
                </div>
                <div className="cer-fbody">
                    {baseline && firstMeas ? (
                        <div className="cer-arrow">
                            <div className="a">
                                <b>Before · section 2</b>
                                {baseline}
                            </div>
                            <span className="mid">→</span>
                            <div className="a">
                                <b>After · section 4</b>
                                {firstMeas.metric || firstMeas.outcome_area}: {firstMeas.baseline} →{" "}
                                <span className="hl">{firstMeas.endline}</span>
                            </div>
                        </div>
                    ) : null}
                    <p className="cer-record-k">The record behind the numbers</p>
                    {dossier.length ? (
                        dossier.map((row) => (
                            <div key={row[0]} className="cer-dr">
                                <div className="bx">
                                    <div className="crit">{row[0]}</div>
                                    <div className="sub">{row[1]}</div>
                                </div>
                                <div className="txt">{row[2]}</div>
                                <span className="ev">{row[3]}</span>
                            </div>
                        ))
                    ) : (
                        <div className="cer-missing">Fill the sections — each one becomes a scored criterion row here.</div>
                    )}
                </div>
                {st === "draft" || st === "live" ? (
                <div className="cer-fcfoot">
                    {st === "draft" ? (
                        <>
                            <div className="cer-status cer-st-draft">
                                DRAFT — {sectionsComplete}/{REPORT_UI_SECTION_TOTAL} sections complete
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
                ) : null}
            </div>
        </div>
    );
}
