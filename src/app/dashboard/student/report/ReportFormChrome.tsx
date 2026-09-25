"use client";

import { useState, type ReactNode } from "react";
import type { ReportData } from "./context/ReportContext";
import { mergeReportSdgSnapshotRows } from "./utils/reportSdgMerge";
import { findSdgById } from "@/utils/sdgData";
import { getReportProjectContextDisplay } from "@/utils/reportProjectContext";
import { REPORT_UI_SECTION_TOTAL, FLASH_CARD_STEP, canonicalReportStep, isMergedActivitiesStep, tabIsComplete, wizardStepToDataSections } from "./utils/reportWizardNav";
import { JOURNEY_STOPS, STRENGTH_CLASS, STRENGTH_LABEL, computeJourneyXP, journeyLevel, sectionStrength } from "./utils/impactJourney";
import { effectiveHoursFromLog, isLogCountedBeforeFacultyReview, sumNonRejectedLoggedHours } from "./utils/engagementMetrics";
import { distinctBeneficiaryTotal } from "./utils/activityReach";
import { V17ImpactFlashcard } from "./components/V17ImpactFlashcard";

export const REPORT_TAB_ITEMS: Array<{ step: number; label: string; flash?: boolean }> = [
    { step: 1, label: "1 Participation" },
    { step: 2, label: "2 Context" },
    { step: 3, label: "3 SDG mapping" },
    { step: 4, label: "4 Activities & outputs" },
    { step: 5, label: "5 Resources" },
    { step: 6, label: "6 Partnerships" },
    { step: 7, label: "7 Evidence" },
    { step: 8, label: "8 Reflection" },
    { step: 9, label: "9 Sustainability + review" },
    { step: 10, label: "Flash card", flash: true },
];

const SECTION_BRIDGES: Record<number, { kicker: string; title: string; note?: string }> = {
    1: {
        kicker: "START HERE · APPROVAL COMES ONCE, AT THE END",
        title: "Your crew, your hours, your proof",
        note: "No separate attendance sign-off any more — you log, you declare, and the whole report is verified once at the end by faculty, from your flash card.",
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
        title: "The last mile — what survives, and where it all travels",
        note: "Not all projects continue — a candid answer is stronger than an optimistic one. The consistency review below is what the CII score reads.",
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
    const acts = (Array.isArray(data.section4?.activity_blocks) ? data.section4.activity_blocks : []).filter(
        (block) => pickString(block.title, block.primary_category),
    );
    const outputs = acts.reduce((sum, block) => {
        const rows = Array.isArray(block.outputs) ? block.outputs : [];
        return sum + rows.filter((row) => String(row?.quantity ?? "").trim()).length;
    }, 0);
    const reachCount = distinctBeneficiaryTotal(data.section4);
    const reach = reachCount > 0 ? String(reachCount) : "";
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

/** Top-of-wizard hero — shown once, above the tab bar, for the life of the report. */
export function ReportMissionHero({ data, projectData }: { data: ReportData; projectData?: unknown }) {
    const a = chromeAgg(data, projectData);
    const requiredHours = data.required_hours || 16;
    const sdgLabel = a.sdgs.length
        ? a.sdgs
              .filter((row) => row.role === "primary")
              .map((row) => `SDG ${row.goalNumber}`)
              .join(" + ") || `${a.sdgs.length} SDG${a.sdgs.length === 1 ? "" : "s"}`
        : "—";
    return (
        <div className="cer-mission">
            <div>
                <div className="ey">YOUR COMMUNITY IMPACT MISSION</div>
                <h1>{a.title}</h1>
                <p>
                    {[a.context.partnerOrganization, a.context.projectLocation !== "N/A" ? a.context.projectLocation : "", a.context.timelineLabel !== "—" ? a.context.timelineLabel : ""]
                        .filter(Boolean)
                        .join(" · ")}
                    <br />
                    Your approved opportunity is already connected to this report — no repetitive data entry.
                </p>
                <div className="cer-bpills">
                    <div className="cer-bp">
                        <div className="v">{requiredHours}h</div>
                        <div className="kk">MINIMUM / MEMBER</div>
                    </div>
                    <div className="cer-bp">
                        <div className="v">{a.members}</div>
                        <div className="kk">CURRENT TEAM</div>
                    </div>
                    <div className="cer-bp">
                        <div className="v">{sdgLabel}</div>
                        <div className="kk">REGISTERED SDGs</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Top-of-wizard "Impact Journey" HUD — completion + 9-stop map + fun-meter XP/level. Purely
 * derived from data the real form already collects; never affects CII, validation or submit. */
export function ReportImpactJourney({
    data,
    activeStep,
    incompleteStepNums,
    sectionsCompleteCount,
    onGo,
}: {
    data: ReportData;
    activeStep: number;
    incompleteStepNums: Set<number>;
    sectionsCompleteCount: number;
    onGo: (step: number) => void;
}) {
    const xp = computeJourneyXP(data);
    const level = journeyLevel(xp);
    return (
        <div className="cer-journey">
            <div className="cer-journey-map">
                <div className="head">
                    <b>🗺️ Your Impact Journey — {REPORT_UI_SECTION_TOTAL} stops, one story</b>
                    <span>
                        {sectionsCompleteCount}/{REPORT_UI_SECTION_TOTAL} stops complete · tap any stop to jump there · Gold / Silver / Bronze show how strong each section reads (fun only, not CII)
                    </span>
                </div>
                <div className="cer-journey-path">
                    {JOURNEY_STOPS.map((s) => {
                        const stepDone = tabIsComplete(s.step, incompleteStepNums);
                        const grade = sectionStrength(s.step, data);
                        return (
                            <button
                                key={s.step}
                                type="button"
                                className={["cer-journey-stop", activeStep === s.step ? "on" : "", stepDone ? "done" : ""].filter(Boolean).join(" ")}
                                style={{ ["--c" as string]: s.color }}
                                onClick={() => onGo(s.step)}
                            >
                                <span className="orb">{s.icon}</span>
                                <b>{s.label}</b>
                                <span className={`cer-journey-grade ${STRENGTH_CLASS[grade]}`}>
                                    {grade ? STRENGTH_LABEL[grade] : "Not started"}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="cer-journey-xp">
                    <div className="lvl">{level.icon}</div>
                    <div className="cer-journey-xp-copy">
                        <b>Level {level.index + 1} · {level.name}</b>
                        <small>
                            {level.next
                                ? `${Math.max(level.next[0] - xp, 0)} XP to ${level.next[2]} — earn XP by logging sessions, attaching evidence, and finishing sections strongly.`
                                : "Top level reached — your report reads like a pro's."}
                        </small>
                        <div className="bar">
                            <i style={{ width: `${level.pct}%` }} />
                        </div>
                    </div>
                    <div className="pts">
                        <b>{xp} XP</b>
                        <small>FUN METER · NOT CII</small>
                    </div>
                </div>
            </div>
        </div>
    );
}

const ACHIEVEMENT_COPY: Record<number, (a: ReturnType<typeof chromeAgg>, requiredHours: number, data: ReportData) => { headline: string; body: string; badges: string[] }> = {
    1: (a, requiredHours) => ({
        headline: "READY TO BEGIN",
        body: "Your opportunity is connected. Build your participation record first.",
        badges: [`🎯 ${requiredHours}h target/member`, `🌍 ${a.sdgs.filter((row) => row.role === "primary").length || a.sdgs.length} registered SDG${(a.sdgs.filter((row) => row.role === "primary").length || a.sdgs.length) === 1 ? "" : "s"}`],
    }),
    2: (a) => ({
        headline: "PARTICIPATION RECORD STARTED",
        body: `${a.logs.length} evidence-backed session${a.logs.length === 1 ? "" : "s"} · ${Math.round(a.hours * 10) / 10} team-hours logged.`,
        badges: [`👥 ${a.members} team member${a.members === 1 ? "" : "s"}`, `📸 ${a.evidence} evidence files`],
    }),
    3: (a, _hours, data) => ({
        headline: "BASELINE ESTABLISHED",
        body: firstSentence(data.section2?.problem_statement || "") || "Your starting-point story is being built.",
        badges: [
            `👥 ${data.section2?.affected_count ? `≈${data.section2.affected_count} ` : ""}${data.section2?.affected_group || "—"} affected`,
            `🎓 ${data.section2?.discipline || "discipline pending"}`,
        ],
    }),
    4: (a) => {
        const registered = a.sdgs.filter((row) => row.role === "primary").length;
        const added = a.sdgs.filter((row) => row.role !== "primary").length;
        return {
            headline: "SDG STORY MAPPED",
            body: `${registered} registered + ${added} student-added SDG alignment${registered + added === 1 ? "" : "s"}.`,
            badges: [`🌍 ${a.sdgs.length} total SDG${a.sdgs.length === 1 ? "" : "s"}`, "🧭 contribution logic captured"],
        };
    },
    5: (a) => ({
        headline: "ACTIVITIES & OUTCOMES BUILT",
        body: `${a.acts.length} activities · ${a.outputs} countable outputs · ${a.reach || 0} estimated unique beneficiaries.`,
        badges: [`📈 ${a.measured.length} measurable outcome${a.measured.length === 1 ? "" : "s"}`, `🛠 ${a.acts.length} activities`],
    }),
    6: (a, _hours, data) => {
        const resources = data.section6?.resources || [];
        const timeOnly = data.section6?.use_resources === "no";
        return {
            headline: "RESOURCE STORY BUILT",
            body: timeOnly
                ? "This project ran primarily on student time and effort."
                : `${a.pkr ? `PKR ${a.pkr.toLocaleString()} mobilized · ` : ""}${resources.length} resource entr${resources.length === 1 ? "y" : "ies"}.`,
            badges: [`📦 ${resources.length} resources`, "💪 student contribution captured"],
        };
    },
    7: (a, _hours, data) => {
        const partners = (data.section7?.partners || []).filter((partner) => partner.name);
        const count = Math.max(partners.length, a.context.partnerOrganization ? 1 : 0);
        return {
            headline: "PARTNERSHIP STORY BUILT",
            body: `${count} partner relationship${count === 1 ? "" : "s"} documented.`,
            badges: [`🤝 ${a.context.partnerOrganization || "Partner"}`, "🔗 roles recorded"],
        };
    },
    8: (a) => ({
        headline: "EVIDENCE VAULT BUILT",
        body: `${a.evidence} evidence item${a.evidence === 1 ? "" : "s"} linked to the report.`,
        badges: [`🔐 consent captured`, `📎 evidence classified`],
    }),
    9: (a, _hours, data) => {
        const skills = data.section9?.skills_grown || [];
        return {
            headline: "LEARNING RECORD BUILT",
            body: a.competency
                ? `Overall competency ${a.competency}/5 · ${skills.length} skills selected.`
                : "Your learning evidence is ready to be completed.",
            badges: ["🎓 academic application", "🧠 reflective learning"],
        };
    },
};

/** 🏆 Recap of the previous section's real numbers — shown above the bridge from step 2 onward. */
export function ReportAchievementBanner({
    step,
    data,
    projectData,
}: {
    step: number;
    data: ReportData;
    projectData?: unknown;
}) {
    const uiStep = canonicalReportStep(step);
    const build = ACHIEVEMENT_COPY[uiStep];
    if (!build) return null;
    const a = chromeAgg(data, projectData);
    const { headline, body, badges } = build(a, data.required_hours || 16, data);
    return (
        <div className="cer-achievement">
            <div className="trophy">🏆</div>
            <div className="copy">
                <b>{headline}</b>
                <p>{body}</p>
            </div>
            <div className="badges">
                {badges.map((t) => (
                    <span key={t}>{t}</span>
                ))}
            </div>
        </div>
    );
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
    const { context, title, sdgs, members, acts, reach, evidence, competency, bestPct, pkr } = a;
    const loggedHours = sumNonRejectedLoggedHours(data.section1.attendance_logs || []);

    const pills: Array<[string, string]> = [];
    if (uiStep > 1 && loggedHours) pills.push([`${Math.round(loggedHours * 10) / 10}h`, "TEAM-HOURS LOGGED"]);
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
            <div className={`cer-bridge cer-bridge-s${uiStep}`}>
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
            {meta.note && uiStep !== 4 ? <div className="cer-note">{meta.note}</div> : null}
        </>
    );
}

const WRITING_GUIDES: Record<number, string[]> = {
    2: ["Short factual answers", "20–60 words for the main problem", "15–50 words for your academic lens"],
    3: ["Evidence-backed SDG logic", "30–80 words for registered contribution", "20–60 words per student-added SDG"],
    4: ["Impact over essays", "15–60 words for activity responsibilities", "40–100 words for the before→after story"],
    6: ["Partnership evidence", "15–60 words for partner contribution"],
    7: ["Evidence captions", "10–45 words is enough to explain what the evidence proves"],
    8: ["Reflection, not an essay", "5–30 words per prompt", "40–100 words personal reflection", "25–70 words academic application"],
    9: ["Sustainability with substance", "60–120 words for what continues / stops / transfers"],
};

const GLOBAL_DOMAINS = [
    "Medicine & Health",
    "Engineering",
    "Computing & AI",
    "Architecture & Design",
    "Law & Policy",
    "Business",
    "Arts & Media",
    "Education",
    "Environment",
    "Agriculture",
    "Social Sciences",
    "Sports",
    "Research",
    "Humanitarian",
];

export function ReportWritingGuide({ step }: { step: number }) {
    const chips = WRITING_GUIDES[canonicalReportStep(step)];
    if (!chips) return null;
    return (
        <div className="cer-wordguide">
            <b>Writing guide</b>
            {chips.map((chip) => (
                <span key={chip}>{chip}</span>
            ))}
        </div>
    );
}

export function ReportGlobalCoverage({ step }: { step: number }) {
    const uiStep = canonicalReportStep(step);
    if (uiStep === 4) {
        return (
            <div className="cer-global">
                <b>🌍 Global Community Engagement Library:</b> Section 4 is designed for students in any programme, country or discipline. Choose the closest structured option so CIEL PK can compare impact across institutions; use <b>Other / Custom</b> whenever your activity does not fit.
                <div className="domains">
                    {GLOBAL_DOMAINS.map((domain) => (
                        <span key={domain}>{domain}</span>
                    ))}
                </div>
            </div>
        );
    }
    if (uiStep === 5) {
        return (
            <div className="cer-global">
                <b>📦 Resource Source Distribution:</b> record cash, in-kind, time, expertise, technology, logistics, institutional support and community contributions. The summary automatically shows where project capacity came from.
            </div>
        );
    }
    return null;
}

export function ReportSectionLeadNote({ step }: { step: number }) {
    if (canonicalReportStep(step) !== 4) return null;
    return (
        <div className="cer-note">
            <span>
                <b>One section, two easy parts:</b> <b>Part A</b> — what you did (things you can count) · <b>Part B</b> — what changed because of it (before → after). Fill A, and B almost writes itself.
            </span>
        </div>
    );
}

const EXAMPLE_SPOTS: Record<number, [string, string, string]> = {
    1: [
        "Verified hours are the foundation of every claim in your report — effort, reach and value all start here.",
        "20 May 2026 · 09:00–12:00 · SOS Children’s Village · Training Workshop — “Delivered a digital-safety workshop to 35 students, facilitated two group exercises and collected participant feedback.” + attendance sheet, activity photo, feedback form.",
        "“Worked for 3 hours at NGO.” No time, no place, no proof — and remember: pooled team hours never satisfy your personal minimum.",
    ],
    2: [
        "A specific, evidence-aware baseline is what makes your outcomes believable later.",
        "“Classroom 4 had damaged lighting, limited learning displays and broken storage. Approximately 120 children used the space. We found this through a site visit, teacher interviews and direct observation.”",
        "“The community had many problems and needed help.”",
    ],
    3: [
        "CIEL maps your work to the UN framework without inflating claims: SDG → official target → indicator (optional) → your local metric → contribution logic.",
        "SDG 4 · Target 4.a · Local metric: 1 classroom improved · “Our project improved classroom lighting, learning displays and physical usability, supporting a safer, more functional learning environment.”",
        "Selecting five SDGs with no evidence. One well-argued SDG beats five decorative ones.",
    ],
    4: [
        "Reviewers look for the difference between doing things and changing things. Activity = what you did · Output = what you can count · Outcome = what changed.",
        "Activity: Repainted and reorganised Classroom 4. Outputs: 1 classroom improved, 14 displays installed, 6 storage units repaired. Reach: 120 students (class register, counted once). Outcome: usability up — baseline 2 of 6 storage units usable → endline 6 of 6, teacher-confirmed.",
        "“Improved education.” “Helped 90 families and improved food security.” (an output and an outcome merged, with no baseline)",
    ],
    5: [
        "Resources make your project’s real cost and mobilisation visible — including things you got for free.",
        "Materials · 12 litres paint · from a local hardware store (discounted) · “made the wall painting possible” · verified by invoice. Cash · PKR 10,000 · student self-funded · receipts attached.",
        "Typing “volunteer time” as a resource (your hours are already counted in Section 1) or listing money with no receipt and calling it verified.",
    ],
    6: [
        "Partnerships of all sizes count — an NGO, a small store, a professional, a community elder — when the role and contribution are real and verifiable.",
        "Imran Sheikh · Village Director · SOS Children’s Village · Role: community access + attendance verification · “Coordinated with teachers, gave classroom access and confirmed delivery of the upgraded space.”",
        "“SOS — partner.” A name with no role, no contribution and no contact that can be verified.",
    ],
    7: [
        "Your good work deserves to be seen. Five strong pieces of evidence beat twenty repetitive photographs — and visibility never changes your CII.",
        "Attendance sheets (participation) · before/after photos with consent (outputs) · teacher feedback summary (outcomes) · receipts (resources) · partner sign-off (verification).",
        "Twenty near-identical group photos; public images of children without consent; evidence that supports no specific claim.",
    ],
    8: [
        "Reflection shows the learning behind the service — and separates a real experience from a template.",
        "“I assumed the classroom needed more furniture, but teacher interviews showed lighting and storage were the urgent barriers. That changed our budget and taught me to validate assumptions before designing an intervention.”",
        "“I learned teamwork and communication. It was a great experience.”",
    ],
    9: [
        "Impact that outlives the project is the strongest signal — but only when it is credible. Small and true beats big and vague.",
        "“SOS retains the display templates and storage labels. The house supervisor runs a monthly classroom check; we handed over a one-page maintenance guide and trained two staff. Weekly tutoring stops unless SOS assigns a volunteer.”",
        "“The project will continue in the future.” or promising national scaling with nothing to back it.",
    ],
};

/** V12 example spotlight — why / strong example / avoid — on every report section. */
export function ReportExampleSpot({ step }: { step: number }) {
    const uiStep = canonicalReportStep(step);
    const spot = EXAMPLE_SPOTS[uiStep];
    const [open, setOpen] = useState(true);
    if (!spot) return null;
    return (
        <div className="cer-spot-wrap">
            <button type="button" className="cer-spot-toggle" onClick={() => setOpen((v) => !v)}>
                {open ? "Hide example ▴" : "Show me an example ▾"}
            </button>
            {open ? (
                <div className="cer-spot">
                    <div className="why"><b>Why this matters</b>{spot[0]}</div>
                    <div className="ex"><b>Strong example</b>{spot[1]}</div>
                    <div className="no"><b>Avoid this</b>{spot[2]}</div>
                </div>
            ) : null}
        </div>
    );
}

/** V12 live models that sit above the form on SDG, activities, resources, reflection, and sustainability. */
export function ReportSectionModel({ step, data }: { step: number; data: ReportData }) {
    const uiStep = canonicalReportStep(step);
    const a = chromeAgg(data);
    if (uiStep === 3) {
        const primary = a.sdgs.find((row) => row.role === "primary") || a.sdgs[0];
        const words = (data.section3?.contribution_intent_statement || "").trim().split(/\s+/).filter(Boolean).length;
        return (
            <div className="cer-model">
                <div className="n" style={{ ["--c" as string]: "#7c5cff" }}><b>1 · SDG</b><span>{primary ? `SDG ${primary.goalNumber}` : "Not mapped yet"}</span><small>registered · locked</small></div>
                <div className="n" style={{ ["--c" as string]: "#5b7cfa" }}><b>2 · Official target</b><span>{primary?.targetId || "Pick a target"}</span><small>from the UN list</small></div>
                <div className="n" style={{ ["--c" as string]: "#8ea2b3" }}><b>3 · UN indicator · optional</b><span>{primary?.indicatorId || "Optional"}</span><small>reference only — never blocks you</small></div>
                <div className="n" style={{ ["--c" as string]: "#2ec4b6" }}><b>4 · Local metric</b><span>{a.outputs ? `${a.outputs} countable outputs` : "your project metric"}</span><small>CIEL/project metric</small></div>
                <div className="n" style={{ ["--c" as string]: "#0f9d79" }}><b>5 · Contribution logic</b><span>{words} words written</span><small>how your work moved the target</small></div>
            </div>
        );
    }
    if (uiStep === 4) {
        return (
            <div className="cer-model">
                <div className="n" style={{ ["--c" as string]: "#ff766f" }}><b>Activity</b><span>{a.acts.length} logged</span><small>what your team did</small></div>
                <div className="n" style={{ ["--c" as string]: "#ffa062" }}><b>Output</b><span>{a.outputs} countable</span><small>what was produced — count it</small></div>
                <div className="n" style={{ ["--c" as string]: "#ffc247" }}><b>Reach</b><span>{a.reach || 0} people</span><small>each person counted once</small></div>
                <div className="n" style={{ ["--c" as string]: "#2ec4b6" }}><b>Outcome</b><span>{a.measured.length} measured{a.bestPct != null ? ` · best ${a.bestPct >= 0 ? "+" : ""}${a.bestPct}%` : ""}</span><small>what changed — baseline → endline</small></div>
            </div>
        );
    }
    if (uiStep === 5 && data.section6?.use_resources === "yes") {
        const resources = data.section6.resources || [];
        const byType = new Map<string, number>();
        resources.forEach((row) => {
            const key = pickString(row.type, row.type_other) || "Other";
            byType.set(key, (byType.get(key) || 0) + 1);
        });
        return (
            <div className="cer-resource-model">
                <b>What your project ran on</b>
                <div>
                    {byType.size
                        ? [...byType.entries()].map(([label, count]) => <span key={label}>{label} · {count}</span>)
                        : <span>Add resource entries and this fills itself.</span>}
                </div>
            </div>
        );
    }
    if (uiStep === 8) {
        const scores = Object.values(data.section9?.competency_scores || {}).filter((n) => typeof n === "number" && n > 0);
        const avg = scores.length ? (scores.reduce((sum, n) => sum + Number(n), 0) / scores.length).toFixed(1) : "—";
        return (
            <div className="cer-model">
                <div className="n" style={{ ["--c" as string]: "#6f62d9" }}><b>Competencies rated</b><span>{scores.length}/12</span><small>honest beats a row of 5s</small></div>
                <div className="n" style={{ ["--c" as string]: "#0f9d79" }}><b>Average self-rating</b><span>{avg}{avg === "—" ? "" : "/5"}</span><small>the rubric reads the reflection, not the score</small></div>
            </div>
        );
    }
    if (uiStep === 9) {
        const status = String(data.section10?.continuation_status || "");
        const rungs: Array<[string, string, string, boolean]> = [
            ["⏸️", "Stops when we leave", "Honest and fine — say what would be needed.", status === "no"],
            ["♻️", "Partly continues", "Some elements live on with support.", status === "partially" || status === "partial"],
            ["🌿", "Continues on its own", "Named owner + handover mechanism.", status === "yes"],
        ];
        return (
            <div className="cer-ladder">
                {rungs.map(([icon, title, body, on]) => (
                    <div key={title} className={on ? "on" : ""}>
                        <span className="e">{icon}</span>
                        <b>{title}</b>
                        <br />
                        {body}
                    </div>
                ))}
            </div>
        );
    }
    return null;
}

const OTHER_SLOT_RE = /^__o_(\d+)$/;

function finiteNumber(value: unknown): number {
    const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
}

function baselineSourceLabel(token: string, section: ReportData["section2"]): string {
    if (token === "Other") return (section?.baseline_evidence_other || "Other").trim() || "Other";
    const match = OTHER_SLOT_RE.exec(token);
    if (!match) return token;
    const typed = section?.baseline_other_entries?.[Number(match[1])];
    return (typed || "").trim() || "Other";
}

function gapLabel(gap: string, section: ReportData["section2"]): string {
    if (gap !== "Other") return gap;
    return (section?.system_gaps_other || "").trim() || "Other";
}

function stripChoiceLabel(value: unknown): string {
    return String(value ?? "")
        .replace(/^[^\p{L}\p{N}]+/u, "")
        .trim();
}

function isSummaryOtherChoice(value: unknown): boolean {
    const text = stripChoiceLabel(value);
    if (!text) return false;
    if (/^other(?:…|\.\.\.)?$/i.test(text)) return true;
    if (/^other\s+supporting/i.test(text)) return true;
    return /other\s*\/\s*custom/i.test(text);
}

function activityFamilyLabel(block: ReportData["section4"]["activity_blocks"][number]): string {
    const family = isSummaryOtherChoice(block.primary_category)
        ? pickString(block.other_category_text, block.primary_category)
        : pickString(block.primary_category);
    const sub = isSummaryOtherChoice(block.sub_category)
        ? pickString(block.other_sub_category_text, block.sub_category)
        : pickString(block.sub_category);
    return [stripChoiceLabel(family), stripChoiceLabel(sub)].filter(Boolean).join(" → ");
}

function resourceChoiceLabel(value: unknown, custom: unknown): string {
    const raw = pickString(value);
    if (!raw) return "";
    if (isSummaryOtherChoice(raw) || /other/i.test(stripChoiceLabel(raw))) return pickString(custom, raw);
    return raw;
}

function partnerRoleLabels(partner: ReportData["section7"]["partners"][number]): string[] {
    const other = pickString((partner as { role_other?: string }).role_other);
    const roles = Array.isArray(partner.role) ? partner.role : [];
    return roles
        .map((role) => (isSummaryOtherChoice(role) ? other : role))
        .map((role) => role.trim())
        .filter((role) => role && !isSummaryOtherChoice(role));
}

const CONTINUATION_TITLES: Record<string, string> = {
    yes: "Continues on its own",
    partially: "Partly continues",
    partial: "Partly continues",
    no: "Stops when we leave",
};

const VISIBILITY_TITLES: Record<string, string> = {
    public: "PUBLIC — EXTRA POINTS",
    limited: "INSTITUTIONAL",
    internal: "PRIVATE",
};

const INTEGRATION_TITLES: Record<string, string> = {
    "Voluntary extracurricular activity": "VOLUNTARY / EXTRACURRICULAR",
    "Course-linked assignment": "PART OF A COURSE",
    "Credit-bearing component": "FOR CREDIT",
    "Capstone / Thesis-linked project": "CAPSTONE / THESIS",
    "Research-integrated project": "RESEARCH PROJECT",
};

function cleanedList(values: string[] | undefined, otherText?: string): string[] {
    return (values || [])
        .map((item) => (isSummaryOtherChoice(item) ? pickString(otherText) : item))
        .map((item) => item.trim())
        .filter((item) => item && !isSummaryOtherChoice(item));
}

function partnerContributionLine(partner: ReportData["section7"]["partners"][number]): string {
    const line = pickString(partner.contribution_line);
    if (line) return line;
    return (partner.contribution || []).map((item) => item.trim()).filter(Boolean).join("; ");
}

function resourceVerifications(row: ReportData["section6"]["resources"][number]): string[] {
    const extra = pickString((row as { verification_other?: string }).verification_other);
    const listed = Array.isArray(row.verification)
        ? row.verification
        : typeof row.verification === "string" && row.verification
          ? [row.verification]
          : [];
    return listed
        .map((item) => (isSummaryOtherChoice(item) || /other verification/i.test(item) ? extra || stripChoiceLabel(item) : item))
        .map((item) => item.trim())
        .filter(Boolean);
}

function outcomeSummaryLabel(row: ReportData["section5"]["measurable_outcomes"][number]): string {
    if (isSummaryOtherChoice(row.metric)) return pickString(row.metric_other, row.metric) || "Outcome";
    return pickString(row.metric, row.outcome_sub_category, row.outcome_area) || "Outcome";
}

function StatChart({
    title,
    bars,
    tiles,
}: {
    title: string;
    bars?: Array<{
        label: string;
        value: number;
        max: number;
        color: string;
        suffix?: string;
        baseline?: number;
        display?: string;
    }>;
    tiles?: string[];
}) {
    if (!bars?.length && !tiles?.length) return null;
    return (
        <div className="cer-joy-stat">
            <div className="t">{title}</div>
            {bars?.map((bar, index) => {
                const width = bar.max ? Math.min(100, Math.round((bar.value / bar.max) * 100)) : 0;
                const baselineWidth =
                    bar.baseline != null && bar.max ? Math.min(100, Math.round((bar.baseline / bar.max) * 100)) : null;
                return (
                    <div className={baselineWidth != null ? "jbar two" : "jbar"} key={`${bar.label}-${index}`}>
                        <span>{bar.label}</span>
                        <div>
                            {baselineWidth != null ? <em style={{ width: `${baselineWidth}%` }} /> : null}
                            <i style={{ width: `${width}%`, background: bar.color }} />
                        </div>
                        <b>
                            {bar.display || (
                                <>
                                    {bar.value}
                                    {bar.suffix || ""}
                                </>
                            )}
                        </b>
                    </div>
                );
            })}
            {tiles?.length ? (
                <div className="jtiles">
                    {tiles.map((tile, index) => (
                        <span key={`${tile}-${index}`}>{tile}</span>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function SectionSummaryStats({
    uiStep,
    data,
    agg,
}: {
    uiStep: number;
    data: ReportData;
    agg: ReturnType<typeof chromeAgg>;
}) {
    if (uiStep === 2) {
        const gaps = data.section2?.system_gaps || [];
        const sources = data.section2?.baseline_evidence || [];
        const who = pickString(data.section2?.affected_group);
        return (
            <StatChart
                title="📊 Baseline at a glance"
                tiles={[
                    who ? `👥 ${who}` : "",
                    ...gaps.map((gap) => `⛔ ${gapLabel(gap, data.section2)}`),
                    ...sources.map((source) => `🔎 ${baselineSourceLabel(source, data.section2)}`),
                ].filter(Boolean)}
            />
        );
    }
    if (uiStep === 3) {
        const words = (data.section3?.contribution_intent_statement || "").trim().split(/\s+/).filter(Boolean).length;
        const added = agg.sdgs.filter((row) => row.role !== "primary").length;
        return (
            <StatChart
                title="📊 SDG pathway coverage"
                tiles={[
                    ...agg.sdgs.map((row) => `SDG ${row.goalNumber}${row.targetId ? ` · ${row.targetId}` : ""}`),
                    `✍️ ${words} words of contribution logic`,
                    `➕ ${added} student-added`,
                ]}
            />
        );
    }
    if (uiStep === 4) {
        const reachOf = (block: (typeof agg.acts)[number]) =>
            finiteNumber(block.beneficiaries_reached) || finiteNumber(block.unique_beneficiaries);
        const maxReach = Math.max(1, ...agg.acts.map(reachOf));
        const measuredMax = Math.max(
            1,
            ...agg.measured.map((row) => Math.max(finiteNumber(row.baseline), finiteNumber(row.endline))),
        );
        return (
            <>
                <StatChart
                    title="📊 Reach per activity · outputs counted"
                    bars={agg.acts.map((block) => ({
                        label: block.title || "Activity",
                        value: reachOf(block),
                        max: maxReach,
                        color: "#ff766f",
                        suffix: " reached",
                    }))}
                    tiles={[`📦 ${agg.outputs} countable outputs`, `🙋 ${agg.reach || 0} unique people`]}
                />
                {agg.measured.length ? (
                    <StatChart
                        title="📈 Measured change · baseline → endline"
                        bars={agg.measured.map((row) => {
                            const baseline = finiteNumber(row.baseline);
                            const endline = finiteNumber(row.endline);
                            const delta = endline - baseline;
                            const pct = baseline > 0 ? Math.round((delta / baseline) * 100) : null;
                            return {
                                label: outcomeSummaryLabel(row),
                                value: endline,
                                baseline,
                                max: measuredMax,
                                color: "#2ec4b6",
                                display: `${row.baseline || 0} → ${row.endline || 0}${pct != null ? ` (${pct >= 0 ? "+" : ""}${pct}%)` : ""}`,
                            };
                        })}
                    />
                ) : null}
            </>
        );
    }
    if (uiStep === 5) {
        const resources = (data.section6?.resources || []).filter((row) => pickString(row.type));
        const maxAmount = Math.max(1, ...resources.map((row) => finiteNumber(row.amount)));
        if (data.section6?.use_resources === "no") {
            return <StatChart title="📊 Resources · amount by entry" tiles={["💪 Ran on time & effort"]} />;
        }
        return (
            <StatChart
                title="📊 Resources · amount by entry"
                bars={resources.map((row) => ({
                    label: resourceChoiceLabel(row.type, row.type_other) || "Resource",
                    value: finiteNumber(row.amount),
                    max: maxAmount,
                    color: "#f4b400",
                    suffix: resourceChoiceLabel(row.unit, row.unit_other) ? ` ${resourceChoiceLabel(row.unit, row.unit_other)}` : "",
                }))}
                tiles={agg.pkr ? [`💵 PKR ${agg.pkr.toLocaleString()} traced`] : []}
            />
        );
    }
    if (uiStep === 6) {
        const partners =
            data.section7?.has_partners === "no"
                ? []
                : (data.section7?.partners || []).filter((partner) => pickString(partner.name));
        const roles = [...new Set(partners.flatMap((partner) => partnerRoleLabels(partner)))];
        return (
            <StatChart
                title="📊 Partnership network"
                tiles={[
                    ...new Set(
                        [
                            agg.context.partnerOrganization ? `🤝 ${agg.context.partnerOrganization}` : "",
                            ...partners.map((partner) => `🤝 ${partner.name}`),
                            ...roles.map((role) => `🔧 ${role}`),
                        ].filter(Boolean),
                    ),
                ]}
            />
        );
    }
    if (uiStep === 7) {
        const types = cleanedList(data.section8?.evidence_types, data.section8?.evidence_type_other);
        const visibility = VISIBILITY_TITLES[data.section8?.media_visible || ""] || "";
        return (
            <StatChart
                title="📊 Evidence on file"
                tiles={[
                    ...types.map((type) => `📎 ${type}`),
                    `${agg.evidence} evidence items`,
                    `🔐 consent ${agg.ethicsOk ? "confirmed" : "pending"}`,
                    visibility ? `👁 ${visibility}` : "",
                ].filter(Boolean)}
            />
        );
    }
    if (uiStep === 8) {
        const scores = data.section9?.competency_scores;
        const groups: Array<[string, number[]]> = [
            ["Cognitive", [scores?.cognitive_systemic, scores?.cognitive_critical, scores?.cognitive_evaluate].map((n) => Number(n) || 0)],
            ["Practical", [scores?.practical_design, scores?.practical_evidence, scores?.practical_engagement].map((n) => Number(n) || 0)],
            ["Social & civic", [scores?.social_empathy, scores?.social_diversity, scores?.social_collaboration].map((n) => Number(n) || 0)],
            ["Transformative", [scores?.transformative_longterm, scores?.transformative_benefits, scores?.transformative_sustainability].map((n) => Number(n) || 0)],
        ];
        return (
            <StatChart
                title="📊 Competency self-rating by group"
                bars={groups.map(([label, values]) => {
                    const rated = values.filter((value) => value > 0);
                    const avg = rated.length ? rated.reduce((sum, value) => sum + value, 0) / rated.length : 0;
                    return { label, value: Math.round(avg * 10) / 10, max: 5, color: "#6f62d9", suffix: "/5" };
                })}
            />
        );
    }
    if (uiStep === 9) {
        const status = String(data.section10?.continuation_status || "").toLowerCase();
        const score = status === "yes" ? 3 : status === "partially" || status === "partial" ? 2 : status === "no" ? 1 : 0;
        const mechanisms = cleanedList(data.section10?.mechanisms, data.section10?.mechanism_other);
        return (
            <StatChart
                title="📊 Continuity"
                bars={[{ label: "Continuation outlook", value: score, max: 3, color: "#0f9d79", suffix: "/3" }]}
                tiles={[
                    ...mechanisms,
                    data.section10?.scaling_potential || "",
                    data.section10?.policy_influence || "",
                ].filter(Boolean)}
            />
        );
    }
    return null;
}

function BannerShell({
    step,
    title,
    children,
    ai,
    stats,
}: {
    step: number;
    title: string;
    children?: ReactNode;
    ai?: string;
    stats?: ReactNode;
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
                {stats}
            </div>
            <div className="cer-bf">
                <b>This banner is what gets scored.</b> {BANNER_FOOT[step]}
            </div>
        </div>
    );
}

function participantKey(id: string): string {
    if (id.startsWith("lead:")) return id.slice("lead:".length);
    const member = /^member:\d+:(.+)$/.exec(id);
    return member?.[1] || id;
}

function sameParticipant(a?: string | null, b?: string | null): boolean {
    if (!a || !b) return false;
    return a === b || participantKey(a) === participantKey(b);
}

function clockLabel(value?: string): string {
    const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})/);
    if (!match) return "";
    let hour = Number(match[1]);
    const suffix = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${match[2]} ${suffix}`;
}

function sessionDateLabel(value?: string): string {
    const match = String(value || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return String(value || "").trim();
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function logHasEvidence(log: { evidence_file?: unknown; evidence_url?: unknown; evidence_urls?: unknown }): boolean {
    if (log.evidence_file) return true;
    if (typeof log.evidence_url === "string" && log.evidence_url.trim()) return true;
    return Array.isArray(log.evidence_urls) && log.evidence_urls.length > 0;
}

function Section1ExecutiveSummary({ data }: { data: ReportData }) {
    const required = data.required_hours || 16;
    const isTeam = data.section1?.participation_type === "team";
    const leadName = displayName(data.section1?.team_lead) || "You";
    const roster = [
        { id: data.section1?.team_lead?.id || "lead", name: leadName, master: true },
        ...(isTeam
            ? (data.section1?.team_members || []).map((member, index) => ({
                  id: member.id || member.participantId || `member-${index}`,
                  name: displayName(member) || `Member ${index + 1}`,
                  master: false,
              }))
            : []),
    ];
    const logs = (data.section1?.attendance_logs || []).filter((log) => isLogCountedBeforeFacultyReview(log));
    const ownerOnRoster = (owner?: string | null) =>
        Boolean(owner) && roster.some((person) => sameParticipant(owner, person.id));
    const hoursFor = (id: string, isLead: boolean) =>
        logs.reduce((sum, log) => {
            const owner = log.participantId;
            const mine = owner ? sameParticipant(owner, id) : isLead;
            const orphan = Boolean(owner) && !ownerOnRoster(owner);
            if (mine || (orphan && isLead)) return sum + effectiveHoursFromLog(log);
            return sum;
        }, 0);
    const rows = roster.map((person) => ({
        ...person,
        hours: Math.round(hoursFor(person.id, person.master) * 10) / 10,
    }));
    const totalHours = Math.round(rows.reduce((sum, row) => sum + row.hours, 0) * 10) / 10;
    const met = rows.filter((row) => row.hours >= required).length;
    const locations = [...new Set(logs.map((log) => String(log.location || "").trim()).filter(Boolean))];
    const types = [...new Set(logs.map((log) => String(log.activity_type || "").trim()).filter(Boolean))];
    const evidenceCount = logs.filter((log) => logHasEvidence(log)).length;
    const scale = Math.max(required, ...rows.map((row) => row.hours), 1);
    const typeLine = types.slice(0, 3).join(", ");
    const line = logs.length
        ? `${roster.length} registered student${roster.length === 1 ? "" : "s"} have logged ${totalHours.toFixed(1)} evidence-backed ${isTeam ? "team-hours" : "hours"} across ${logs.length} session${logs.length === 1 ? "" : "s"}${locations.length ? ` at ${locations.length} location${locations.length === 1 ? "" : "s"}` : ""}. ${met}/${roster.length} have reached the ${required}h minimum${typeLine ? `; recorded work includes ${typeLine}${types.length > 3 ? " and more" : ""}` : ""}.`
        : `The ${isTeam ? "team" : "student"} is registered, but no evidence-backed sessions have been saved yet.`;

    return (
        <div className="cer-s1sum">
            <div className="head">
                <b>SECTION 01 · PARTICIPATION INTELLIGENCE</b>
                <span>● LIVE · FLASHCARD + PDF SOURCE</span>
            </div>
            <div className="top">
                <div>
                    <h3>{isTeam ? "Team participation, without duplicate reporting" : "Individual participation record"}</h3>
                    <p>{line}</p>
                    <div className="facts">
                        <span>👑 {leadName} · Master Student</span>
                        <span>👥 {roster.length} member{roster.length === 1 ? "" : "s"}</span>
                        <span>⏱ {totalHours.toFixed(1)} {isTeam ? "team-hours" : "hours"}</span>
                        <span>✅ {met}/{roster.length} minimum met</span>
                        <span>📍 {locations.length} location{locations.length === 1 ? "" : "s"}</span>
                        <span>📎 {evidenceCount} session evidence</span>
                    </div>
                </div>
                <div className="score">
                    <b>
                        {met}/{roster.length}
                    </b>
                    <small>HOURS-READY</small>
                </div>
            </div>
            <div className="stat">
                <div className="t">📊 HOURS PER MEMBER VS THE {required}H MINIMUM</div>
                {rows.map((row) => (
                    <div className="bar" key={row.id}>
                        <span>{row.name}</span>
                        <div>
                            <i
                                style={{
                                    width: `${Math.min(100, Math.round((row.hours / scale) * 100))}%`,
                                    background: row.hours >= required ? "#15988b" : "#f2b23a",
                                }}
                            />
                        </div>
                        <b>{row.hours}h</b>
                    </div>
                ))}
                {logs.length ? (
                    <div className="tiles">
                        {logs.slice(0, 6).map((log, index) => {
                            const from = clockLabel(log.start_time);
                            const to = clockLabel(log.end_time);
                            const when = [sessionDateLabel(log.date), from && to ? `${from}–${to}` : from || to]
                                .filter(Boolean)
                                .join(" · ");
                            return <span key={log.id || `${log.date}-${index}`}>📅 {when}</span>;
                        })}
                    </div>
                ) : null}
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
        return <Section1ExecutiveSummary data={data} />;
    }

    if (step === 2) {
        return (
            <BannerShell step={2} title={baseline ? `“${baseline}”` : "Your baseline, in your words"} ai={ai} stats={<SectionSummaryStats uiStep={2} data={data} agg={a} />}>
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
                stats={<SectionSummaryStats uiStep={3} data={data} agg={a} />}
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
        const challengeTags = (Array.isArray(data.section5?.challenge_tags) ? data.section5.challenge_tags : []).filter(
            (tag) => !isSummaryOtherChoice(tag),
        );
        const broadest =
            [...a.acts.map((block) => pickString(block.geographic_reach))].filter(Boolean).slice(-1)[0] ||
            pickString(data.section4?.project_summary?.overall_geographic_reach) ||
            "—";
        const directMeasured = a.measured.some((row) =>
            (Array.isArray(row.confidence_level) ? row.confidence_level : []).some((level) =>
                /direct/i.test(String(level)),
            ),
        );
        return (
            <BannerShell
                step={4}
                title={`${a.acts.length} activities · ${a.outputs} outputs · ${a.reach || "—"} reached${a.measured.length ? ` → ${a.measured.length} measured change${a.measured.length === 1 ? "" : "s"}${a.bestPct != null ? ` · best ${a.bestPct >= 0 ? "+" : ""}${a.bestPct}%` : ""}` : ""}`}
                ai={ai}
                stats={<SectionSummaryStats uiStep={4} data={data} agg={a} />}
            >
                <div className="cer-scale">
                    {[
                        ["🛠️", String(a.acts.length), "ACTIVITIES"],
                        ["📦", String(a.outputs), "OUTPUTS"],
                        ["🫶", a.reach || "—", "REACHED"],
                        ["🗺️", broadest, "BROADEST REACH"],
                    ].map(([icon, value, label]) => (
                        <div key={label}>
                            <span>{icon}</span>
                            <b>{value}</b>
                            <small>{label}</small>
                        </div>
                    ))}
                </div>
                {a.acts.length ? (
                    <>
                        <div className="cer-bsec">PART A · WHAT WE DID</div>
                        {a.acts.map((block, i) => (
                            <div key={block.id || i} className="cer-row">
                                <b>
                                    {i + 1}. {block.title || "Unnamed"}
                                </b>
                                <span style={{ color: "#7a919a", flex: 1 }}>{activityFamilyLabel(block)}</span>
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
                        {a.measured.map((row, index) => {
                            const baseline = finiteNumber(row.baseline);
                            const endline = finiteNumber(row.endline);
                            const delta = endline - baseline;
                            const pct = baseline > 0 ? Math.round((delta / baseline) * 100) : null;
                            const confidence = (Array.isArray(row.confidence_level) ? row.confidence_level : [])
                                .map((level) => stripChoiceLabel(level))
                                .filter(Boolean)
                                .slice(0, 1);
                            return (
                                <div key={row.id || index} className="cer-row">
                                    <b style={{ flex: 1 }}>{outcomeSummaryLabel(row)}</b>
                                    <span>
                                        {row.baseline || 0} → <b>{row.endline || 0}</b>
                                    </span>
                                    <b style={{ color: "#0e7d74" }}>
                                        {delta >= 0 ? "+" : ""}
                                        {delta}
                                        {pct != null ? ` (${pct >= 0 ? "+" : ""}${pct}%)` : ""}
                                    </b>
                                    {confidence[0] ? <span className="cer-mtag">{confidence[0].toUpperCase()}</span> : null}
                                </div>
                            );
                        })}
                    </>
                ) : null}
                {challengeTags.length ? (
                    <>
                        <div className="cer-bsec">WHAT WAS HARD</div>
                        <div className="cer-mrow">
                            {challengeTags.map((tag) => (
                                <span key={tag} className="cer-mtag" style={{ background: "#fff6e8", color: "#9a6700" }}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </>
                ) : null}
                <div className="cer-mrow">
                    <span className="cer-mtag">🛠 {a.acts.length} ACTIVITIES</span>
                    <span className="cer-mtag">📦 {a.outputs} OUTPUTS</span>
                    <span className="cer-mtag">🫶 {a.reach || 0} REACHED</span>
                    <span className="cer-mtag">
                        📊 {a.measured.length} MEASURED{directMeasured ? " · DIRECT" : ""}
                    </span>
                    {a.bestPct != null ? (
                        <span className="cer-mtag">
                            📈 BEST {a.bestPct >= 0 ? "+" : ""}
                            {a.bestPct}%
                        </span>
                    ) : null}
                    {challengeTags.length ? <span className="cer-mtag">🧗 {challengeTags.length} LIMITS NAMED</span> : null}
                </div>
            </BannerShell>
        );
    }

    if (uiStep === 5) {
        const timeOnly = data.section6?.use_resources === "no";
        const resources = (data.section6?.resources || []).filter((row) => pickString(row.type));
        const hasVerification = resources.some((row) => resourceVerifications(row).length > 0);
        return (
            <BannerShell
                step={5}
                title={
                    timeOnly
                        ? "Ran on time & effort alone 💪"
                        : `${resources.length} resource entr${resources.length === 1 ? "y" : "ies"}${a.pkr ? ` · PKR ${a.pkr.toLocaleString()}` : ""}`
                }
                ai={ai}
                stats={<SectionSummaryStats uiStep={5} data={data} agg={a} />}
            >
                {timeOnly ? (
                    <div className="cer-quote">💪 Zero-budget project — declared proudly, not apologetically.</div>
                ) : (
                    resources.map((row, index) => {
                        const amount = finiteNumber(row.amount);
                        const unit = resourceChoiceLabel(row.unit, row.unit_other);
                        const sources = (row.sources || [])
                            .map((source) => resourceChoiceLabel(source, row.source_other))
                            .filter(Boolean);
                        return (
                            <div key={`${row.type}-${index}`} className="cer-row">
                                <b>
                                    {resourceChoiceLabel(row.type, row.type_other)}
                                    {amount ? ` — ${amount.toLocaleString()} ${unit}` : ""}
                                </b>
                                <span style={{ flex: 1, color: "#7a919a" }}>{sources.join(", ")}</span>
                                {resourceVerifications(row).slice(0, 2).map((tag) => (
                                    <span key={tag} className="cer-mtag">
                                        {tag.toUpperCase()}
                                    </span>
                                ))}
                            </div>
                        );
                    })
                )}
                <div className="cer-mrow">
                    {timeOnly ? <span className="cer-mtag">💪 ZERO-BUDGET · DECLARED</span> : <span className="cer-mtag">📦 {resources.length} ENTRIES</span>}
                    {!timeOnly && a.pkr ? <span className="cer-mtag">💵 PKR {a.pkr.toLocaleString()}</span> : null}
                    {!timeOnly && hasVerification ? <span className="cer-mtag">✅ VERIFICATION ON RECORD</span> : null}
                </div>
            </BannerShell>
        );
    }

    if (uiStep === 6) {
        const linked = a.context.partnerOrganization;
        const partners =
            data.section7?.has_partners === "no"
                ? []
                : (data.section7?.partners || []).filter((partner) => pickString(partner.name));
        const roles = [...new Set(partners.flatMap((partner) => partnerRoleLabels(partner)))];
        const leadQuote = partners.map(partnerContributionLine).find(Boolean) || "";
        const partnerCount = (linked ? 1 : 0) + partners.filter((partner) => partner.name !== linked).length;
        return (
            <BannerShell
                step={6}
                title={`${linked || partners[0]?.name || "Your partner"}${roles.length ? ` · ${roles.length} roles` : ""}`}
                ai={ai}
                stats={<SectionSummaryStats uiStep={6} data={data} agg={a} />}
            >
                {roles.length ? (
                    <div className="cer-mrow">
                        {roles.map((role) => (
                            <span key={role} className="cer-mtag">
                                {role}
                            </span>
                        ))}
                    </div>
                ) : null}
                {leadQuote ? <div className="cer-quote">“{leadQuote}”</div> : null}
                {partners.map((partner, index) => (
                    <div key={`${partner.name}-${index}`} className="cer-row">
                        <b>🤝 {partner.name}</b>
                        <span style={{ flex: 1, color: "#7a919a" }}>
                            {[resourceChoiceLabel(partner.type, partner.type_other), partnerRoleLabels(partner).join(", ")]
                                .filter(Boolean)
                                .join(" — ")}
                        </span>
                    </div>
                ))}
                <div className="cer-mrow">
                    <span className="cer-mtag">🤝 {roles.length} ROLES CONFIRMED</span>
                    <span className="cer-mtag">🏛️ {Math.max(partnerCount, partners.length)} PARTNERS</span>
                    {linked ? <span className="cer-mtag">🔗 LINKED SINCE §1</span> : null}
                </div>
            </BannerShell>
        );
    }

    if (uiStep === 7) {
        const types = cleanedList(data.section8?.evidence_types, data.section8?.evidence_type_other);
        const visibility = VISIBILITY_TITLES[data.section8?.media_visible || ""] || "";
        const noEvidence = data.section8?.has_evidence === "no";
        return (
            <BannerShell
                step={7}
                title={
                    noEvidence
                        ? "No extra evidence files"
                        : `${a.evidence} evidence file${a.evidence === 1 ? "" : "s"} on record`
                }
                ai={ai}
                stats={<SectionSummaryStats uiStep={7} data={data} agg={a} />}
            >
                {types.length ? (
                    <div className="cer-mrow">
                        {types.map((type) => (
                            <span key={type} className="cer-mtag">
                                {type}
                            </span>
                        ))}
                    </div>
                ) : null}
                <div className="cer-mrow">
                    <span className="cer-mtag">📸 {a.evidence} FILES ON RECORD</span>
                    <span className="cer-mtag">{a.ethicsOk ? "✅ CONSENT CONFIRMED" : "⏳ CONSENT PENDING"}</span>
                    {visibility ? (
                        <span className="cer-mtag">{data.section8?.media_visible === "public" ? "🌟" : "👁"} {visibility}</span>
                    ) : (
                        <span className="cer-mtag">👁 VISIBILITY PENDING</span>
                    )}
                </div>
            </BannerShell>
        );
    }

    if (uiStep === 8) {
        const skills = cleanedList(data.section9?.skills_grown, data.section9?.skills_grown_other);
        const integration = INTEGRATION_TITLES[data.section9?.academic_integration || ""] || stripChoiceLabel(data.section9?.academic_integration).toUpperCase();
        return (
            <BannerShell
                step={8}
                title={`${skills.length ? `${skills.length} skills grown` : "Your reflection"}${a.competency ? ` · ${a.competency}/5 self-rated` : ""}`}
                ai={ai}
                stats={<SectionSummaryStats uiStep={8} data={data} agg={a} />}
            >
                {skills.length ? (
                    <div className="cer-mrow">
                        {skills.map((skill) => (
                            <span key={skill} className="cer-mtag">
                                {skill}
                            </span>
                        ))}
                    </div>
                ) : null}
                {data.section9?.personal_learning ? <div className="cer-quote">{data.section9.personal_learning}</div> : null}
                {data.section9?.academic_application ? <div className="cer-quote">{data.section9.academic_application}</div> : null}
                <div className="cer-mrow">
                    <span className="cer-mtag">🌟 {skills.length} SKILLS GROWN</span>
                    <span className="cer-mtag">{a.competency ? `⭐ ${a.competency}/5 SELF-RATED` : "⏳ RATINGS PENDING"}</span>
                    {integration ? <span className="cer-mtag">🎓 {integration}</span> : null}
                </div>
            </BannerShell>
        );
    }

    if (uiStep !== 9) return null;

    const statusKey = String(data.section10?.continuation_status || "").toLowerCase();
    const statusTitle = CONTINUATION_TITLES[statusKey] || "";
    const mechs = cleanedList(data.section10?.mechanisms, data.section10?.mechanism_other);
    const scaling = pickString(data.section10?.scaling_potential);
    return (
        <BannerShell
            step={9}
            title={statusTitle ? `Continues: ${statusTitle}${mechs.length ? ` · ${mechs.length} mechanisms` : ""}` : "The last question"}
            ai={ai}
            stats={<SectionSummaryStats uiStep={9} data={data} agg={a} />}
        >
            {data.section10?.continuation_details ? <div className="cer-quote">{data.section10.continuation_details}</div> : null}
            {mechs.length ? (
                <div className="cer-mrow">
                    {mechs.map((item) => (
                        <span key={item} className="cer-mtag">
                            {item}
                        </span>
                    ))}
                </div>
            ) : null}
            <div className="cer-mrow">
                <span className="cer-mtag">{statusTitle ? `🌱 ${statusTitle.toUpperCase()}` : "⏳ STATUS PENDING"}</span>
                <span className="cer-mtag">🛡 {mechs.length} MECHANISMS</span>
                {scaling ? <span className="cer-mtag">📐 {scaling.toUpperCase()}</span> : null}
            </div>
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

function FlashHighlights({
    data,
    agg,
}: {
    data: ReportData;
    agg: ReturnType<typeof chromeAgg>;
}) {
    const lead = data.section1?.team_lead as { university?: string; universityName?: string; degree?: string; academicProgram?: string } | undefined;
    const logs = Array.isArray(data.section1?.attendance_logs) ? data.section1.attendance_logs : [];
    const dates = logs.map((log) => log.date).filter(Boolean).sort();
    const span = dates.length
        ? dates.length > 1
            ? `${sessionDateLabel(dates[0])} → ${sessionDateLabel(dates[dates.length - 1])}`
            : sessionDateLabel(dates[0])
        : "—";
    const locations = [...new Set(logs.map((log) => log.location).filter(Boolean))].slice(0, 2);
    const partners = data.section7?.partners || [];
    const cards: Array<[string, string, string, string]> = [
        ["🏛️", "Organization / partner", agg.context.partnerOrganization || "—", partners[0]?.name || ""],
        ["🎓", "University", pickString(lead?.universityName, lead?.university) || "—", pickString(lead?.academicProgram, lead?.degree)],
        ["🧑‍🏫", "Faculty verifier", data.section1?.faculty_supervisor_email ? "Reviewer on file" : "—", "Approves once, at the end"],
        ["🎯", "Who was affected", data.section2?.affected_group || "—", data.section2?.affected_count ? `≈ ${data.section2.affected_count}` : ""],
        ["📍", "Where", agg.context.projectLocation && agg.context.projectLocation !== "N/A" ? agg.context.projectLocation : "—", locations.join(" · ")],
        ["📅", "When", span, `${logs.length} session${logs.length === 1 ? "" : "s"} · ${Math.round(agg.hours * 10) / 10}h`],
        [
            "📦",
            "Resources",
            data.section6?.use_resources === "no" ? "Time & effort only" : agg.pkr ? `PKR ${agg.pkr.toLocaleString()} traced` : `${(data.section6?.resources || []).length} entries`,
            "",
        ],
        ["🌍", "SDGs", agg.sdgs.map((row) => `SDG ${row.goalNumber}`).join(" · ") || "—", ""],
        ["📈", "Best measured change", agg.bestPct != null ? `${agg.bestPct >= 0 ? "+" : ""}${agg.bestPct}%` : "—", ""],
        ["🌱", "Afterwards", data.section10?.continuation_status || "—", (data.section10?.mechanisms || []).slice(0, 2).join(" · ")],
    ];
    const briefs: Array<[string, string, string]> = [
        ["01", "Participation", `${agg.members} student${agg.members === 1 ? "" : "s"} · ${Math.round(agg.hours * 10) / 10}h · ${logs.length} sessions`],
        ["02", "Context", firstSentence(data.section2?.problem_statement || "") || "Baseline not written yet"],
        ["03", "SDGs", `${agg.sdgs.length} goal${agg.sdgs.length === 1 ? "" : "s"} mapped`],
        ["04", "Activities & outcomes", `${agg.acts.length} activities · ${agg.outputs} outputs · ${agg.measured.length} measured`],
        ["05", "Resources", data.section6?.use_resources === "no" ? "Time and effort only" : `${(data.section6?.resources || []).length} resource entries`],
        ["06", "Partnerships", `${partners.length} partner record${partners.length === 1 ? "" : "s"}`],
        ["07", "Evidence", `${agg.evidence} evidence items`],
        ["08", "Reflection", `${(data.section9?.skills_grown || []).length} skills${agg.competency ? ` · ${agg.competency}/5` : ""}`],
        ["09", "Sustainability", data.section10?.continuation_status || "Continuation not chosen yet"],
    ];
    return (
        <>
            <div className="cer-fchi">
                <div className="k">🔦 HIGHLIGHTS — WHO, WHERE, FOR WHOM, WITH WHAT</div>
                <div className="grid">
                    {cards.map(([icon, label, value, note]) => (
                        <div key={label}>
                            <span>
                                {icon} {label}
                            </span>
                            <b>{value}</b>
                            {note ? <small>{note}</small> : null}
                        </div>
                    ))}
                </div>
                <div className="foot">
                    These highlights also sit on the scored summary. Private contact details stay off the public card.
                </div>
            </div>
            <div className="cer-fcnine">
                <div className="k">🧩 ALL NINE SECTIONS — ONE LINE EACH</div>
                <div className="grid">
                    {briefs.map(([num, title, text]) => (
                        <div key={num}>
                            <b>
                                {num} · {title}
                            </b>
                            {text}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
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
    return (
        <V17ImpactFlashcard
            data={data}
            agg={chromeAgg(data, projectData)}
            sectionsComplete={sectionsComplete}
            sectionTotal={REPORT_UI_SECTION_TOTAL}
            missingLabels={missingLabels}
            canSend={canSend}
            onSend={onSend}
            sending={sending}
            status={flashStatus(data)}
        />
    );
}
