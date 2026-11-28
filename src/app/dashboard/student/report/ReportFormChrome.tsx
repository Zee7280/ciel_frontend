"use client";

import clsx from "clsx";
import type { ReportData } from "./context/ReportContext";
import { isRegisteredReportSdg, mergeReportSdgSnapshotRows, reportSdgContributionText } from "./utils/reportSdgMerge";
import { findSdgById } from "@/utils/sdgData";
import { getReportProjectContextDisplay } from "@/utils/reportProjectContext";
import { REPORT_UI_SECTION_TOTAL, FLASH_CARD_STEP, canonicalReportStep, tabIsComplete, wizardStepToDataSections } from "./utils/reportWizardNav";
import { JOURNEY_STOPS } from "./utils/impactJourney";
import { displayReportHours, effectiveHoursFromLog, isLogCountedBeforeFacultyReview, sumNonRejectedLoggedHours } from "./utils/engagementMetrics";
import { distinctBeneficiaryTotal } from "./utils/activityReach";
import ImpactPackage from "./impact-package/ImpactPackage";

import { isReportReturnedForRevision } from "@/utils/reportRevisionState";
import { hasPublicSharePermission, isPublicMediaVisibility, mediaVisibilityTitle } from "./utils/mediaVisibility";

import { safeguardingBannerLine } from "./utils/riskSafeguarding";

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
        const text = value.replace(/,/g, "").trim();
        // A blank field is "not measured", never 0 (Number("") is 0).
        if (!text) return null;
        const n = Number(text);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function countSectionMediaUrls(data: ReportData): number {
    const keys = [
        "section1",
        "section2",
        "section3",
        "section4",
        "section5",
        "section6",
        "section7",
        "section8",
        "section9",
        "section10",
    ] as const;
    let n = 0;
    for (const key of keys) {
        const rec = asRecord(data[key]);
        if (!Array.isArray(rec.media_urls)) continue;
        n += rec.media_urls.filter((item) => (typeof item === "string" ? Boolean(item.trim()) : Boolean(item))).length;
    }
    return n;
}

function firstSentence(text: string): string {
    const trimmed = (text || "").trim();
    if (!trimmed) return "";
    const match = trimmed.match(/^[^.!?]*[.!?]/);
    return (match ? match[0] : trimmed).trim();
}

/** The opportunity's linked partner, or "" when the context only has its "N/A" placeholder. */
function linkedPartnerName(context: { partnerOrganization?: string }): string {
    const name = String(context.partnerOrganization || "").trim();
    return /^(n\/?a|none|—|-)$/i.test(name) ? "" : name;
}

function displayName(person: { name?: string; fullName?: string } | undefined): string {
    return pickString(person?.fullName, person?.name);
}

function chromeAgg(data: ReportData, projectData?: unknown) {
    const context = getReportProjectContextDisplay({ ...asRecord(projectData), opportunity: projectData, ...data });
    const title = pickString(asRecord(projectData).title, data.project_title) || "Community engagement";
    const sdgs = mergeReportSdgSnapshotRows({ ...asRecord(projectData), ...data }, data.section3);
    const logs = Array.isArray(data.section1?.attendance_logs) ? data.section1.attendance_logs : [];
    const metricHours = pickNumber(data.section1?.metrics?.total_verified_hours) || 0;
    const rosterHours =
        (pickNumber(data.section1?.team_lead?.hours) || 0) +
        (Array.isArray(data.section1?.team_members)
            ? data.section1.team_members.reduce((sum, member) => sum + (pickNumber(member.hours) || 0), 0)
            : 0);
    const individualHours = Array.isArray(data.section1?.metrics?.individual_metrics)
        ? data.section1.metrics.individual_metrics.reduce(
              (sum, row) => sum + (pickNumber((row as { individual_hours?: unknown })?.individual_hours) || 0),
              0,
          )
        : 0;
    // Stored metric is an approved-only recount; the non-rejected logged hours can be higher (same rule as the certificate).
    const loggedOrMetric = displayReportHours(metricHours, logs);
    const hours = loggedOrMetric > 0 ? loggedOrMetric : individualHours > 0 ? individualHours : rosterHours;
    const members =
        (data.section1?.participation_type === "team"
            ? 1 + (Array.isArray(data.section1.team_members) ? data.section1.team_members.length : 0)
            : 1) || 1;
    const acts = (Array.isArray(data.section4?.activity_blocks) ? data.section4.activity_blocks : []).filter(
        (block) => pickString(block.title, block.primary_category),
    );
    const outputs = acts.reduce((sum, block) => {
        const rows = Array.isArray(block.outputs) ? block.outputs : [];
        return sum + rows.filter((row) => String(row?.quantity ?? "").trim()).length;
    }, 0);
    const reachCount = distinctBeneficiaryTotal(data.section4) || pickNumber(data.section2?.affected_count) || 0;
    const reach = reachCount > 0 ? String(reachCount) : "";
    const outcomes = Array.isArray(data.section5?.measurable_outcomes) ? data.section5.measurable_outcomes : [];
    // A measured change needs a name and both numbers; a half-filled row (before only) is not one.
    const measured = outcomes.filter((o) => pickString(o.metric, o.outcome_area) && pickNumber(o.baseline) != null && pickNumber(o.endline) != null);
    const pcts = measured
        .map((o) => {
            const b = pickNumber(o.baseline);
            const e = pickNumber(o.endline);
            if (b == null || e == null || b === 0) return null;
            return Math.round(((e - b) / b) * 100);
        })
        .filter((n): n is number => n != null);
    const bestPct = pcts.length ? Math.max(...pcts) : null;
    const evidenceFiles = Array.isArray(data.section8?.evidence_files) ? data.section8.evidence_files.length : 0;
    const evidenceUrls = Array.isArray(data.evidence_urls) ? data.evidence_urls.length : 0;
    const logEvidence = logs.filter((log) => logHasEvidence(log)).length;
    const evidence = Math.max(evidenceFiles + evidenceUrls, logEvidence, countSectionMediaUrls(data));
    const competencyScores = Object.values(data.section9?.competency_scores || {});
    const ratedCompetency = competencyScores.filter((n) => typeof n === "number" && n > 0);
    const competency =
        ratedCompetency.length > 0
            ? (ratedCompetency.reduce((sum, n) => sum + (Number(n) || 0), 0) / ratedCompetency.length).toFixed(1)
            : "";
    const ethicsOk = isPublicMediaVisibility(data.section8?.media_visible)
        ? hasPublicSharePermission(data.section8)
        : true;
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

/** Top-of-wizard hero — shown once, above the tab bar, for the life of the report. Also carries the
 * running totals and the section help button (previously a second card below the progress bar). */
export function ReportMissionHero({
    data,
    projectData,
    step,
    onOpenHelp,
}: {
    data: ReportData;
    projectData?: unknown;
    step?: number;
    onOpenHelp?: () => void;
}) {
    const a = chromeAgg(data, projectData);
    const requiredHours = data.required_hours || 16;
    const uiStep = step != null ? canonicalReportStep(step) : null;
    const { sdgs, acts, reach, evidence, competency, bestPct, pkr } = a;
    const loggedHours = sumNonRejectedLoggedHours(data.section1?.attendance_logs || []);
    // Running totals that unlock as sections fill in. Team size is already shown as CURRENT TEAM.
    const progressPills: Array<[string, string]> = [];
    if (uiStep != null) {
        if (uiStep > 1 && loggedHours) progressPills.push([`${Math.round(loggedHours * 10) / 10}h`, "TEAM-HOURS LOGGED"]);
        if (uiStep > 2 && data.section2?.problem_statement) progressPills.push(["📍", "BASELINE SET"]);
        if (uiStep > 3 && sdgs.length) progressPills.push([String(sdgs.length), "SDGs MAPPED"]);
        if (uiStep > 4 && acts.length) progressPills.push([String(acts.length), "ACTIVITIES"]);
        if (uiStep > 4 && reach) progressPills.push([reach, "REACHED"]);
        if (uiStep > 4 && bestPct != null) progressPills.push([`${bestPct >= 0 ? "+" : ""}${bestPct}%`, "BEST MEASURED CHANGE"]);
        if (uiStep > 5 && pkr) progressPills.push([`PKR ${pkr.toLocaleString()}`, "RESOURCES TRACED"]);
        if (uiStep > 7 && evidence) progressPills.push([String(evidence), "EVIDENCE FILES"]);
        if (uiStep > 8 && competency) progressPills.push([`${competency}/5`, "COMPETENCY"]);
    }
    // Every SDG registered on the opportunity: primary first, then supporting ("SDG 12 + SDG 11"),
    // the same set the flashcard shows under SDG alignment.
    const registeredSdgNumbers = [
        ...a.sdgs.filter((row) => row.role === "primary"),
        ...a.sdgs.filter((row) => row.role !== "primary"),
    ]
        .map((row) => String(row.goalNumber ?? "").trim())
        .filter((n, i, all) => n && all.indexOf(n) === i);
    const sdgLabel = registeredSdgNumbers.length ? registeredSdgNumbers.map((n) => `SDG ${n}`).join(" + ") : "—";
    return (
        <div className="cer-mission">
            <div>
                <div className="ey">YOUR COMMUNITY IMPACT MISSION</div>
                <h1>{a.title}</h1>
                <p>
                    {[linkedPartnerName(a.context), a.context.projectLocation !== "N/A" ? a.context.projectLocation : "", a.context.timelineLabel !== "—" ? a.context.timelineLabel : ""]
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
                    {progressPills.map(([value, label]) => (
                        <div key={label} className="cer-bp">
                            <div className="v">{value}</div>
                            <div className="kk">{label}</div>
                        </div>
                    ))}
                    {onOpenHelp && uiStep != null && uiStep < FLASH_CARD_STEP ? (
                        <button type="button" className="cer-hchip" onClick={onOpenHelp}>
                            How to fill this section — with examples
                        </button>
                    ) : null}
                </div>
                {uiStep != null && uiStep > 3 && sdgs.length ? (
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
            </div>
        </div>
    );
}

/** Top-of-wizard "Impact Journey" HUD — completion + 9-stop map. Purely
 * derived from data the real form already collects; never affects CII, validation or submit. */
export function ReportImpactJourney({
    data: _data,
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
    void _data;
    return (
        <div className="cer-journey">
            <div className="cer-journey-map">
                <div className="head">
                    <b>Report progress</b>
                    <span>
                        {sectionsCompleteCount} of {REPORT_UI_SECTION_TOTAL} sections complete · click a section to open it
                    </span>
                </div>
                <div className="cer-journey-path">
                    {JOURNEY_STOPS.map((s) => {
                        const stepDone = tabIsComplete(s.step, incompleteStepNums);
                        const isOn = activeStep === s.step;
                        const status = stepDone ? "Complete" : isOn ? "Current" : "To do";
                        return (
                            <button
                                key={s.step}
                                type="button"
                                className={["cer-journey-stop", isOn ? "on" : "", stepDone ? "done" : ""].filter(Boolean).join(" ")}
                                onClick={() => onGo(s.step)}
                            >
                                <span className="orb">{String(s.step).padStart(2, "0")}</span>
                                <b>{s.label}</b>
                                <span className={`cer-journey-grade ${stepDone ? "cer-grade-done" : isOn ? "cer-grade-current" : "cer-grade-none"}`}>
                                    {status}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

const WRITING_GUIDES: Record<number, string[]> = {
    2: ["Short factual answers", "10–60 words for the main problem", "15–50 words for your academic lens"],
    3: ["Evidence-backed SDG logic", "30–80 words for registered contribution", "10–60 words per student-added SDG"],
    4: ["Impact over essays", "15–60 words per activity", "8–100 words for what changed", "15–60 words for challenges"],
    6: ["Partnership evidence", "One line on what each partner contributed"],
    7: ["Evidence captions", "Optional, up to 45 words to explain what the evidence proves"],
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
                <b>📦 Resource Source Distribution:</b> record cash, in-kind, time, expertise, technology, logistics, institutional support and community contributions. The chart below shows where project capacity came from.
            </div>
        );
    }
    return null;
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
    // Step 5: the "What your project ran on" model is the donut inside Section 5, right after 5.1
    // (one model per step — see Section6Resources).
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

function participantKey(id: string): string {
    if (id.startsWith("lead:")) return id.slice("lead:".length);
    const member = /^member:[^:]+:(.+)$/.exec(id);
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
    // Only hours from sessions that carry a photo / document are "evidence-backed" (V19 item 06/08).
    const evidenceBackedHours =
        Math.round(logs.filter((log) => logHasEvidence(log)).reduce((sum, log) => sum + effectiveHoursFromLog(log), 0) * 10) / 10;
    const scale = Math.max(required, ...rows.map((row) => row.hours), 1);
    const typeLine = types.slice(0, 3).join(", ");
    const hoursPhrase =
        evidenceCount === logs.length
            ? `${totalHours.toFixed(1)} evidence-backed ${isTeam ? "team-hours" : "hours"}`
            : `${totalHours.toFixed(1)} ${isTeam ? "team-hours" : "hours"} (${evidenceBackedHours.toFixed(1)} evidence-backed; ${logs.length - evidenceCount} session${logs.length - evidenceCount === 1 ? "" : "s"} still without evidence)`;
    const line = logs.length
        ? `${roster.length} registered student${roster.length === 1 ? "" : "s"} have logged ${hoursPhrase} across ${logs.length} session${logs.length === 1 ? "" : "s"}${locations.length ? ` at ${locations.length} location${locations.length === 1 ? "" : "s"}` : ""}. ${met}/${roster.length} have reached the ${required}h minimum${typeLine ? `; recorded work includes ${typeLine}${types.length > 3 ? " and more" : ""}` : ""}.`
        : `The ${isTeam ? "team" : "student"} is registered, but no sessions have been saved yet.`;

    return (
        <div className="cer-s1sum">
            <div className="head">
                <b>Section 1 · Participation</b>
                <span>Live · flashcard + PDF source</span>
            </div>
            <div className="top">
                <div>
                    <h3>{isTeam ? "Team participation, without duplicate reporting" : "Individual participation record"}</h3>
                    <p>{line}</p>
                    <div className="facts">
                        <span>{leadName} · Lead</span>
                        <span>{roster.length} member{roster.length === 1 ? "" : "s"}</span>
                        <span>{totalHours.toFixed(1)} {isTeam ? "team-hours" : "hours"}</span>
                        <span>{met}/{roster.length} minimum met</span>
                        <span>{locations.length} location{locations.length === 1 ? "" : "s"}</span>
                        <span>{evidenceCount} session evidence</span>
                    </div>
                </div>
                <div className="score">
                    <b>
                        {met}/{roster.length}
                    </b>
                    <small>Hours ready</small>
                </div>
            </div>
            <div className="stat">
                <div className="t">Hours per member vs the {required}h minimum</div>
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

function plural(n: number, one: string, many = `${one}s`): string {
    return `${n} ${n === 1 ? one : many}`;
}

/** Reach counted in Section 4 itself (the baseline's affected count is not "reached"). */
function sectionFourReach(data: ReportData): number {
    return distinctBeneficiaryTotal(data.section4) || 0;
}

/**
 * Plain-language summary of a wizard step, built only from the answers on screen — the same
 * figures the banner tiles show — so it can never drift from the data the way a saved AI text can.
 */
export function liveSectionSummary(uiStep: number, data: ReportData, a: ReturnType<typeof chromeAgg>): string {
    if (uiStep === 2) {
        const who = pickString(data.section2?.affected_group);
        const count = pickString(data.section2?.affected_count);
        const gaps = (data.section2?.system_gaps || []).filter(Boolean).length;
        const sources = (data.section2?.baseline_evidence || []).filter(Boolean).length;
        const problem = firstSentence(data.section2?.problem_statement || "");
        if (!problem && !who && !gaps && !sources) return "No baseline has been written yet.";
        return [
            who ? `Affected group: ${count ? `about ${count} ` : ""}${who}.` : "Affected group not named yet.",
            `${plural(gaps, "system gap")} and ${plural(sources, "baseline evidence source")} recorded.`,
            problem ? `Baseline: ${problem}` : "Baseline statement not written yet.",
            safeguardingBannerLine(data.section2),
        ].join(" ");
    }
    if (uiStep === 3) {
        const registered = a.sdgs.filter(isRegisteredReportSdg);
        const added = a.sdgs.filter((s) => !isRegisteredReportSdg(s));
        const written = a.sdgs.filter((row) => reportSdgContributionText(row, data.section3));
        const label = (rows: typeof a.sdgs) =>
            rows.map((row) => `SDG ${row.goalNumber}${row.targetId ? ` (${row.targetId})` : ""}`).join(", ");
        if (!a.sdgs.length) return "No SDG mapping saved yet.";
        return [
            registered.length ? `Registered goal${registered.length === 1 ? "" : "s"}: ${label(registered)}.` : "No registered goal on the opportunity.",
            added.length ? `Student-mapped: ${label(added)}.` : "No student-mapped goals added.",
            written.length
                ? `Contribution logic written for ${written.length} of ${a.sdgs.length} goal${a.sdgs.length === 1 ? "" : "s"}${written.length < a.sdgs.length ? ` (missing: ${label(a.sdgs.filter((row) => !reportSdgContributionText(row, data.section3)))})` : ""}.`
                : "Contribution logic not written yet.",
        ].join(" ");
    }
    if (uiStep === 4) {
        const reach = sectionFourReach(data);
        const challengeTagList = (Array.isArray(data.section5?.challenge_tags) ? data.section5.challenge_tags : []).filter(
            (tag) => !isSummaryOtherChoice(tag),
        );
        const noChallenges = challengeTagList.some((tag) => /^no significant challenges$/i.test(String(tag).trim()));
        const challenges = noChallenges ? 0 : challengeTagList.length;
        if (!a.acts.length && !a.measured.length) return "No activities or measured outcomes saved yet.";
        return [
            `${plural(a.acts.length, "activity", "activities")} with ${plural(a.outputs, "countable output")}, reaching ${reach ? `${reach} unique ${reach === 1 ? "person" : "people"}` : "no recorded beneficiaries yet"}.`,
            a.measured.length
                ? `${plural(a.measured.length, "measured change")}${a.bestPct != null ? `, best ${a.bestPct >= 0 ? "+" : ""}${a.bestPct}%` : ""}.`
                : "No baseline → endline measurement yet.",
            noChallenges ? "No significant challenges reported." : challenges ? `${plural(challenges, "limitation")} named.` : "",
        ]
            .filter(Boolean)
            .join(" ");
    }
    if (uiStep === 5) {
        if (data.section6?.use_resources === "no") return "Declared as a zero-budget project: it ran on time and effort alone.";
        const resources = (data.section6?.resources || []).filter((row) => pickString(row.type));
        if (!resources.length) return "No resources recorded yet.";
        const verified = resources.filter((row) => resourceVerifications(row).length > 0).length;
        return `${plural(resources.length, "resource entry", "resource entries")}${a.pkr ? `, PKR ${a.pkr.toLocaleString()} in cash` : ""}; ${verified} with verification on record.`;
    }
    if (uiStep === 6) {
        if (data.section7?.has_partners === "no") return "No external partners declared for this project.";
        const partners = (data.section7?.partners || []).filter((partner) => pickString(partner.name));
        const linked = linkedPartnerName(a.context);
        const roles = [...new Set(partners.flatMap((partner) => partnerRoleLabels(partner)))];
        if (!partners.length) return linked ? `Linked partner: ${linked}. No partner roles recorded yet.` : "No partners recorded yet.";
        return `${plural(partners.length, "partner")} named (${partners.map((p) => p.name).join(", ")})${linked ? `; linked partner ${linked}` : ""}; ${plural(roles.length, "role")} confirmed.`;
    }
    if (uiStep === 7) {
        if (data.section8?.has_evidence === "no") return "No extra evidence files declared for this section.";
        const types = cleanedList(data.section8?.evidence_types, data.section8?.evidence_type_other);
        const visibility = mediaVisibilityTitle(data.section8?.media_visible) || "Restricted";
        const share = isPublicMediaVisibility(data.section8?.media_visible)
            ? a.ethicsOk
                ? "public share permission confirmed"
                : "public share permission still pending"
            : "not shown publicly";
        return `${plural(a.evidence, "evidence file")} on record${types.length ? ` (${types.join(", ")})` : ""}; visibility ${visibility}, ${share}.`;
    }
    if (uiStep === 8) {
        const skills = cleanedList(data.section9?.skills_grown, data.section9?.skills_grown_other);
        const integration =
            INTEGRATION_TITLES[data.section9?.academic_integration || ""] || stripChoiceLabel(data.section9?.academic_integration);
        if (!skills.length && !a.competency && !integration) return "No reflection saved yet.";
        return [
            skills.length ? `${plural(skills.length, "skill")} grown: ${skills.join(", ")}.` : "No skills selected yet.",
            a.competency ? `Average self-rating ${a.competency}/5.` : "Competency ratings pending.",
            integration ? `Academic integration: ${integration}.` : "",
        ]
            .filter(Boolean)
            .join(" ");
    }
    if (uiStep === 9) {
        const status = CONTINUATION_TITLES[String(data.section10?.continuation_status || "").toLowerCase()] || "";
        const mechs = cleanedList(data.section10?.mechanisms, data.section10?.mechanism_other);
        const scaling = pickString(data.section10?.scaling_potential);
        if (!status && !mechs.length) return "Continuation not answered yet.";
        return [
            status ? `Continuation: ${status}.` : "Continuation status pending.",
            mechs.length ? `${plural(mechs.length, "mechanism")}: ${mechs.join(", ")}.` : "No continuity mechanisms named.",
            scaling ? `Scaling: ${scaling}.` : "",
        ]
            .filter(Boolean)
            .join(" ");
    }
    return "";
}

const COMPILED_SUMMARY_TITLES: Record<number, string> = {
    1: "Participation",
    2: "Project context",
    3: "SDG mapping",
    4: "Activities & outcomes",
    5: "Resources",
    6: "Partnerships",
    7: "Evidence",
    8: "Reflection",
    9: "Sustainability",
};

export type CompiledSummaryRow = { step: number; title: string; text: string };

/**
 * The one report summary shown before submit: a line per section, written from the current answers
 * (no AI call). Sections no longer carry their own summary cards.
 */
export function compiledReportSummary(data: ReportData, projectData?: unknown): CompiledSummaryRow[] {
    const a = chromeAgg(data, projectData);
    const participation = a.hours > 0 || a.logs.length
        ? `${plural(a.members, "participant")} · ${plural(a.hours, "verified hour")} across ${plural(a.logs.length, "logged session")}.`
        : "No attendance logged yet.";
    return Object.keys(COMPILED_SUMMARY_TITLES).map((key) => {
        const step = Number(key);
        return {
            step,
            title: COMPILED_SUMMARY_TITLES[step],
            text: step === 1 ? participation : liveSectionSummary(step, data, a) || "Not answered yet.",
        };
    });
}

export function ReportCompiledSummary({
    data,
    projectData,
    incompleteSections,
    onEdit,
}: {
    data: ReportData;
    projectData?: unknown;
    /** Data-section numbers still incomplete (same set the stepper uses). */
    incompleteSections?: Set<number>;
    /** Jump to a wizard step to change its answers; omitted when the report is read-only. */
    onEdit?: (step: number) => void;
}) {
    const rows = compiledReportSummary(data, projectData);
    const needsWork = (step: number) => wizardStepToDataSections(step).some((n) => incompleteSections?.has(n));
    const open = rows.filter((row) => needsWork(row.step)).length;
    return (
        <section data-ciel-compiled-summary className="cer-ipkg-below mb-5 mt-4 overflow-hidden rounded-2xl border border-[#d9e6e2] bg-white shadow-sm">
            <header className="flex flex-wrap items-end justify-between gap-2 border-b border-[#e6efec] bg-gradient-to-r from-[#e9f7f4] to-white px-5 py-4">
                <div>
                    <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-[#0e7d74]">Before you submit</p>
                    <h2 className="text-lg font-extrabold text-[#0f2f2c]">Report summary — compiled from all sections</h2>
                    <p className="mt-0.5 text-xs text-slate-500">Written from your answers. Read it once; to change a line, edit that section.</p>
                </div>
                <span
                    className={clsx(
                        "rounded-full px-3 py-1 text-[11px] font-bold",
                        open ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700",
                    )}
                >
                    {open ? `${plural(open, "section")} need${open === 1 ? "s" : ""} attention` : "All sections complete"}
                </span>
            </header>
            <ol className="divide-y divide-[#eef3f1]">
                {rows.map((row) => {
                    const pending = needsWork(row.step);
                    return (
                        <li key={row.step} className="grid grid-cols-[32px_1fr_auto] items-start gap-3 px-5 py-3">
                            <span
                                className={clsx(
                                    "flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-extrabold",
                                    pending ? "bg-amber-100 text-amber-800" : "bg-[#0e7d74] text-white",
                                )}
                            >
                                {row.step}
                            </span>
                            <div className="min-w-0">
                                <p className="text-[12.5px] font-bold text-[#0f2f2c]">
                                    {row.title}
                                    {pending ? <span className="ml-2 text-[10.5px] font-semibold text-amber-700">· needs attention</span> : null}
                                </p>
                                <p className="mt-0.5 break-words text-[12.5px] leading-relaxed text-slate-600">{row.text}</p>
                            </div>
                            {onEdit ? (
                                <button
                                    type="button"
                                    onClick={() => onEdit(row.step)}
                                    className="rounded-lg px-2 py-1 text-[11px] font-bold text-[#0e7d74] hover:bg-[#e9f7f4]"
                                >
                                    Edit
                                </button>
                            ) : (
                                <span />
                            )}
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

/** Live summary card shown above the form: Section 1 only (sections 2–9 have no summary card). */
export function ReportLiveBanner({ step, data }: { step: number; data: ReportData; projectData?: unknown }) {
    if (canonicalReportStep(step) !== 1) return null;
    return <Section1ExecutiveSummary data={data} />;
}

/**
 * Who sent the report back. Admin "request revision" stores status=revision + admin_status=rejected;
 * a partner reject sets partner_status=rejected; faculty uses faculty_status revision_requested.
 */
export function reportRevisionReviewer(data: Pick<ReportData, "faculty_status" | "admin_status" | "admin_approval_status" | "partner_status">): string {
    const fac = String(data.faculty_status || "").toLowerCase();
    const adm = String(data.admin_status || data.admin_approval_status || "").toLowerCase();
    const partner = String(data.partner_status || "").toLowerCase();
    if (fac.includes("revision") || fac.includes("changes")) return "Your faculty supervisor";
    if (adm === "rejected") return "CIEL PK";
    if (partner === "rejected") return "The partner organisation";
    return "CIEL PK";
}

/** The reviewer's written comments that came back with the revision request. */
export function reportRevisionNote(data: Pick<ReportData, "feedback" | "admin_feedback" | "faculty_remarks">): string {
    return String(data.feedback || data.admin_feedback || data.faculty_remarks || "").trim();
}

/**
 * Shown on every step of the report (sections and flash card) while a reviewer has sent the report
 * back. Before this, the only trace of a revision request on the report page was that the form was
 * editable again — the student could not see that CIEL PK had returned it, or why.
 */
export function ReportRevisionNotice({
    data,
    onFlash,
    teamMemberOnly,
    onGoFlash,
}: {
    data: ReportData;
    /** True on the flash-card step, where the Resubmit button sits below. */
    onFlash?: boolean;
    /** Attendance-only team members read the notice but cannot resubmit. */
    teamMemberOnly?: boolean;
    onGoFlash?: () => void;
}) {
    if (!isReportReturnedForRevision(data)) return null;
    const reviewer = reportRevisionReviewer(data);
    const note = reportRevisionNote(data);
    const next = teamMemberOnly
        ? "Only the Team Lead can update the report and resubmit it."
        : onFlash
          ? "Update the parts mentioned below, then press Resubmit report on this flash card."
          : "Update the parts mentioned below, then open the flash card and press Resubmit report.";
    return (
        <div className="cer-life cer-life-rev" role="status" data-testid="report-revision-notice">
            <div className="cer-life-row">
                <div>
                    <p className="cer-life-k">✏️ {reviewer} sent this report back for changes</p>
                    <p className="cer-life-t">Your earlier submission is no longer under review. {next}</p>
                    {note ? (
                        <div className="cer-life-note">
                            <b>Comments from {reviewer === "CIEL PK" ? "CIEL PK" : reviewer.replace(/^(Your|The) /, "").toLowerCase()}</b>
                            <p>{note}</p>
                        </div>
                    ) : (
                        <p className="cer-life-t">No written comments were attached. Check your notifications or email for the details.</p>
                    )}
                </div>
                {!onFlash && !teamMemberOnly && onGoFlash ? (
                    <button type="button" className="cer-pay" onClick={onGoFlash}>
                        Go to flash card to resubmit
                    </button>
                ) : null}
            </div>
        </div>
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
    paymentHref,
}: {
    data: ReportData;
    projectData?: unknown;
    sectionsComplete: number;
    missingLabels: string[];
    canSend?: boolean;
    onSend?: () => void;
    sending?: boolean;
    paymentHref?: string;
}) {
    void sectionsComplete;
    void missingLabels;
    void paymentHref;
    return (
        <ImpactPackage
            data={data}
            projectData={projectData}
            audience="student"
            // "Generate my Package" → "Submit package" uses the footer's own gate and confirmation.
            submit={{ canSend: canSend === true, onSend, sending: sending === true }}
        />
    );
}
