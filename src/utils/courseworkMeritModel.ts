// Deterministic, rule-based scoring engine for coursework flash cards — the "CIEL Merit Model".
// Replaces the earlier LLM-based "AI Curator": same six-criterion public rubric, but every point
// is computed from the student's own declared wizard fields, so a score is always explainable and
// reproducible (no OpenAI call, no run-to-run variance). See courseProjectTypes.ts for field shapes.

import { type CourseProjectEntry, stripEmoji } from "./courseProjectTypes";

export interface MeritRubricCriterion {
    key: "purpose" | "rigor" | "results" | "sdg" | "honesty" | "refl";
    label: string;
    max: number;
    color: string;
    description: string;
}

/** The public rubric — shown to students before they write, faculty while they review, university on publish. */
export const MERIT_RUBRIC: MeritRubricCriterion[] = [
    { key: "purpose", label: "1 · Clarity of purpose", max: 15, color: "#2563eb", description: "A stated aim, concrete objectives, a real issue/question/opportunity named. Form §2–3." },
    { key: "rigor", label: "2 · Rigor of process", max: 20, color: "#0f766e", description: "Activities & method appropriate to the declared format + scale/scope stated. Practice-based inquiry counts equal to lab testing. §4." },
    { key: "results", label: "3 · Substance of results", max: 20, color: "#c98a04", description: "Output + insight present; evidence ladder: measured > qualitative > estimated > target > conceptual > not-yet. Honesty never scores zero. §5." },
    { key: "sdg", label: "4 · SDG authenticity", max: 20, color: "#3F7E44", description: "Primary SDG + target chosen, connection explained, integration level declared. Self-started or emergent links earn a bonus. §6." },
    { key: "honesty", label: "5 · Honesty & consistency", max: 15, color: "#dc2626", description: "Limitation named with its effect; numbers correctly classified; claims consistent with evidence (a \"central & demonstrated\" claim needs measurement behind it). §5–7." },
    { key: "refl", label: "6 · Reflection & transfer", max: 10, color: "#7c3aed", description: "What was learned, skills claimed, advice to the next class, a realistic next step. §7." },
];

export const MERIT_NEUTRALITY_NOTE =
    "The model never scores English polish, word count, discipline prestige, or production budget. Expectations are format-adjusted — an essay is not penalised for having no lab data, an artwork is not penalised for having no survey. What's rewarded everywhere: clear purpose, honest evidence, real SDG thinking.";

/** Evidence-status points — mirrors the wizard's EVIDENCE_STATUS labels exactly (no emoji, evidenceStatus is stored plain). */
const EVIDENCE_POINTS: Record<string, number> = {
    "Actual measured result": 12,
    "Qualitative evidence": 10,
    "Estimated / projected": 7,
    "Proposed target": 6,
    "Conceptual recommendation": 5,
    "Not measured yet": 3,
    "Not applicable": 4,
};

function integrationPoints(raw?: string): number {
    const s = stripEmoji(raw || "").toLowerCase();
    if (!s) return 0;
    if (/central to the work and demonstrated|real\s*—/.test(s)) return 8;
    if (/clearly connected|real, but not measured/.test(s)) return 6;
    if (/partially integrated|bit of both/.test(s)) return 4;
    if (/indirectly connected/.test(s)) return 3;
    if (/identified retrospectively|mostly on paper/.test(s)) return 3;
    return 2;
}

function originPoints(raw?: string): number {
    const s = stripEmoji(raw || "").toLowerCase();
    if (!s) return 0;
    if (/introduced by the student|our own idea/.test(s)) return 4;
    if (/emerged during/.test(s)) return 3;
    if (/identified when reviewing/.test(s)) return 3;
    if (/suggested by the instructor/.test(s)) return 2;
    if (/built into the course/.test(s)) return 1;
    if (/built into the assignment/.test(s)) return 1;
    return 1;
}

const clampPts = (n: number, max: number) => Math.max(0, Math.min(max, n));

export interface MeritCriterionResult extends MeritRubricCriterion {
    points: number;
    note: string;
}

export interface MeritConsistencyFlag {
    ok: boolean;
    message: string;
}

export interface MeritScorecard {
    criteria: MeritCriterionResult[];
    total: number;
    grade: string;
    gradeColor: string;
    consistency: MeritConsistencyFlag;
}

const GRADE_BANDS: [number, string, string][] = [
    [85, "EXEMPLARY", "#16a34a"],
    [70, "STRONG", "#0f766e"],
    [55, "DEVELOPING", "#c98a04"],
    [0, "EMERGING", "#7a8095"],
];

export function meritGrade(total: number): [string, string] {
    for (const [min, label, color] of GRADE_BANDS) {
        if (total >= min) return [label, color];
    }
    return ["EMERGING", "#7a8095"];
}

/** Computes the six-criterion scorecard for one coursework entry, deterministically, from its own wizard fields. */
export function computeMeritScorecard(entry: CourseProjectEntry): MeritScorecard {
    const inc = entry.moduleInclusion || {};
    const ai = entry.assignmentInfo || {};
    const am = entry.aimsInfo || {};
    const pr = entry.processInfo || {};
    const re = entry.resultsInfo || {};
    const sm = entry.sdgMapping || {};
    const rf = entry.reflectionInfo || {};
    const primary = sm.entries?.[0];

    // ---- 1 · Clarity of purpose ----
    // Formats that skip formal aims (inc.aim=false) substitute "what were you asked to do" as the aim proxy —
    // the wizard's own format notes explain this ("your aim becomes your central argument", etc.).
    const aimText = inc.aim ? am.aimStatement : ai.whatAsked;
    const aimPts = aimText && aimText.trim().length > 12 ? 2 : aimText?.trim() ? 1 : 0;
    const objsCount = inc.aim ? (am.objectives || []).filter((o) => o.trim()).length : ai.whatAsked?.trim() ? 2 : 0;
    const issuePts = ai.realWorldIssue?.trim() ? 1 : 0;
    const purposePts = clampPts(aimPts * 4 + Math.min(objsCount, 3) * 1.5 + issuePts * 2.5, 15);
    const purposeNote = aimPts === 2 ? "Clear aim, concrete objectives, real issue named" : aimPts === 1 ? "Aim present but loosely framed" : "Aim missing or vague";

    // ---- 2 · Rigor of process (format-adjusted: a module the format skips can't be marked low) ----
    const actsFilled = (pr.activities || []).filter(Boolean).length > 0;
    const methsFilled = (pr.methods || []).filter((m) => m && !/not applicable/i.test(m)).length > 0;
    const actOk = !inc.act || actsFilled;
    const methOk = !inc.meth || methsFilled;
    const fitPts = actOk && methOk ? 2 : actOk || methOk ? 1 : 0;
    const scalePts = !inc.meth || pr.sampleScale?.trim() ? 1 : 0;
    const rigorPts = clampPts(fitPts * 7 + scalePts * 4 + 2, 20);
    const rigorNote =
        fitPts === 2
            ? `Method & activities fit the declared format${scalePts ? "; scale/scope stated" : ""}`
            : fitPts === 1
              ? "Process only partly matches the declared format"
              : "Process poorly evidenced";

    // ---- 3 · Substance of results ----
    const outputPts = (re.outputs || []).length > 0 || re.outputDescription?.trim() ? 1 : 0;
    const findingsCount = inc.find ? (re.findings || []).filter((f) => f.trim()).length : 2;
    const insightPts = findingsCount >= 2 ? 2 : findingsCount === 1 ? 1 : 0;
    const evidenceStatus = re.evidenceStatus || "Not applicable";
    const resultsPts = clampPts((EVIDENCE_POINTS[evidenceStatus] ?? 3) + outputPts * 3 + insightPts * 2.5, 20);
    const resultsNote = `${evidenceStatus}${re.measurableImpact ? " — " + re.measurableImpact : ""}`;

    // ---- 4 · SDG authenticity ----
    const sdgHasTarget = (primary?.targets?.length ?? 0) > 0 ? 1 : 0;
    const sdgHasHow = primary?.how?.trim() ? 1 : 0;
    const integPts = integrationPoints(rf.integrationLevel || rf.sdgLinkHonesty);
    const origPts = originPoints(sm.origin);
    const sdgPts = clampPts((primary ? 5 : 0) + sdgHasTarget * 3 + sdgHasHow * 4 + integPts + origPts - 4, 20);
    const sdgNote = primary
        ? `SDG ${primary.goalNumber}${sdgHasTarget ? " + target" : ""}${sdgHasHow ? " + explained link" : ""} · ${stripEmoji(rf.integrationLevel || rf.sdgLinkHonesty || "").toLowerCase() || "integration not declared"} · ${stripEmoji(sm.origin || "").toLowerCase() || "origin not declared"}`
        : "No SDG selected yet";

    // ---- 5 · Honesty & consistency ----
    const limPts = !inc.lim ? 2 : re.limitationType?.trim() && re.limitationDetail?.trim() ? 2 : re.limitationType?.trim() ? 1 : 0;
    const hasMetricValue = !!re.metricValue?.trim();
    const numOkPts = hasMetricValue ? (re.numberRepresents ? 1 : 0) : 1;
    let honestyPts = limPts * 4 + numOkPts * 4 + 3;
    const integrationText = stripEmoji(rf.integrationLevel || rf.sdgLinkHonesty || "");
    const claimsHigh = /central to the work and demonstrated|real\s*—/i.test(integrationText);
    const evidenceLow = ["Not measured yet", "Conceptual recommendation", "Proposed target"].includes(evidenceStatus);
    let consistency: MeritConsistencyFlag;
    if (claimsHigh && evidenceLow) {
        honestyPts -= 4;
        consistency = { ok: false, message: `Consistency check: claims "central & demonstrated" integration but evidence is ${evidenceStatus.toLowerCase()} — 4 points deducted.` };
    } else {
        consistency = { ok: true, message: "Consistency check passed: claims match the declared evidence." };
    }
    const honestyPtsClamped = clampPts(honestyPts, 15);
    const honestyNote = limPts === 2 ? "Limitation named with its effect" : limPts === 1 ? "Limitation named briefly" : !inc.lim ? "Not applicable to this format" : "No limitation acknowledged";

    // ---- 6 · Reflection & transfer ----
    const learnPts = rf.lessonLearned && rf.lessonLearned.trim().length > 20 ? 2 : rf.lessonLearned?.trim() ? 1 : 0;
    const advicePts = rf.adviceNextSemester?.trim() ? 1 : 0;
    const nextPts = rf.nextSteps?.trim() || rf.whatsNext?.trim() ? 1 : 0;
    const skillsCount = (rf.skills || []).filter(Boolean).length;
    const reflPts = clampPts(learnPts * 3 + advicePts * 2 + nextPts * 1 + Math.min(skillsCount, 4) * 0.5, 10);
    const reflNote = learnPts === 2 ? "Substantive learning + advice to the next class" : learnPts === 1 ? "Some reflection present" : "Reflection thin";

    const criteria: MeritCriterionResult[] = [
        { ...MERIT_RUBRIC[0], points: purposePts, note: purposeNote },
        { ...MERIT_RUBRIC[1], points: rigorPts, note: rigorNote },
        { ...MERIT_RUBRIC[2], points: resultsPts, note: resultsNote },
        { ...MERIT_RUBRIC[3], points: sdgPts, note: sdgNote },
        { ...MERIT_RUBRIC[4], points: honestyPtsClamped, note: honestyNote },
        { ...MERIT_RUBRIC[5], points: reflPts, note: reflNote },
    ];
    const total = Math.round(criteria.reduce((s, c) => s + c.points, 0));
    const [grade, gradeColor] = meritGrade(total);

    return { criteria, total, grade, gradeColor, consistency };
}
