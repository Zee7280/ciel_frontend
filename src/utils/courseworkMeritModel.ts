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

/** The public rubric v2 — sustainability weighted strongest by design. Shown to students before they write, faculty while they review, university on publish. */
export const MERIT_RUBRIC: MeritRubricCriterion[] = [
    { key: "sdg", label: "1 · Sustainability & SDG authenticity — the anchor", max: 25, color: "#3F7E44", description: "Primary SDG + target, connection explained, integration level declared. Self-started or emergent links earn a bonus; decorative name-dropping scores near zero. §6." },
    { key: "results", label: "2 · Substance of results — is it real & fruitful?", max: 20, color: "#c98a04", description: "Output + insight present; evidence ladder: measured > qualitative > estimated > target > conceptual > not-yet. Honesty never scores zero. §5." },
    { key: "purpose", label: "3 · Clarity & quality of the idea", max: 15, color: "#2563eb", description: "A stated aim anyone can grasp, concrete objectives, a real issue/question/opportunity — concise beats padded. §2–3." },
    { key: "rigor", label: "4 · Rigor of process — pathway-adjusted", max: 15, color: "#0f766e", description: "Activities & method appropriate to the declared format + scale stated. Practice-based inquiry counts equal to lab testing. §4." },
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
    const rigorPts = clampPts(fitPts * 5.5 + scalePts * 3 + 1, 15);
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
    const sdgPts = clampPts((primary ? 6 : 0) + sdgHasTarget * 4 + sdgHasHow * 5 + integPts + origPts - 2, 25);
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

    const critFor = (key: MeritRubricCriterion["key"]) => MERIT_RUBRIC.find((c) => c.key === key)!;
    const criteria: MeritCriterionResult[] = [
        { ...critFor("sdg"), points: sdgPts, note: sdgNote },
        { ...critFor("results"), points: resultsPts, note: resultsNote },
        { ...critFor("purpose"), points: purposePts, note: purposeNote },
        { ...critFor("rigor"), points: rigorPts, note: rigorNote },
        { ...critFor("honesty"), points: honestyPtsClamped, note: honestyNote },
        { ...critFor("refl"), points: reflPts, note: reflNote },
    ];
    const total = Math.round(criteria.reduce((s, c) => s + c.points, 0));
    const [grade, gradeColor] = meritGrade(total);

    return { criteria, total, grade, gradeColor, consistency };
}

/** True when the sustainability link was self-started by the student/team rather than assigned — mirrors originPoints()'s own detection regex. */
function isFounderOrigin(origin?: string): boolean {
    return /introduced by the student|our own idea/i.test(stripEmoji(origin || "").toLowerCase());
}

const CRITERION_PHRASE: Record<MeritRubricCriterion["key"], (entry: CourseProjectEntry) => string> = {
    sdg: (entry) => (isFounderOrigin(entry.sdgMapping?.origin) ? "a self-started, authentic sustainability core" : "an authentic, explained sustainability core"),
    results: (entry) => ((entry.resultsInfo?.evidenceStatus || "").includes("measured result") ? "real measured results — fruitful, not decorative" : "substantive, honestly-classified results"),
    purpose: () => "a concise, real idea anyone can grasp",
    rigor: () => "rigor true to its own format",
    honesty: () => "honest limits & correctly classified numbers",
    refl: () => "reflection that transfers to the next cohort",
};

/** Why the top-ranked entries lead — derived from their own two highest-scoring criteria, not a canned line. */
export function whyItLeads(entry: CourseProjectEntry, sc: MeritScorecard): string {
    const ranked = [...sc.criteria].sort((a, b) => b.points / b.max - a.points / a.max);
    const [top1, top2] = ranked;
    return `${CRITERION_PHRASE[top1.key](entry)}, with ${CRITERION_PHRASE[top2.key](entry)}.`;
}

/** 🔮 What's the most likely next step for this piece of work — forecast from its own evidence ladder and declared format. */
export function courseworkPotential(entry: CourseProjectEntry): string {
    const re = entry.resultsInfo || {};
    const sm = entry.sdgMapping || {};
    const fmt = stripEmoji(entry.assignmentInfo?.formats?.[0] || entry.assignmentInfo?.format || "").toLowerCase();
    const evs = re.evidenceStatus || "";
    const base =
        evs === "Actual measured result" ? "already proven at classroom scale"
        : evs === "Proposed target" ? "a costed plan sitting one approval from implementation"
        : evs === "Qualitative evidence" ? "documented change, ready for a measured follow-up"
        : evs === "Estimated / projected" ? "a credible projection ready for a real-world pilot"
        : "an idea one pilot away from becoming evidence";
    const next =
        /software|app/.test(fmt) ? "a natural FYP or Enterprise Path continuation"
        : /design|model|prototype/.test(fmt) ? "prototype-to-pilot with a partner site next term"
        : /artwork|exhibition|campaign|media/.test(fmt) ? "university-wide showcase and public-awareness scaling"
        : /practical|audit|lab|field/.test(fmt) ? "protocol adoption across other departments"
        : "handover to administration or the next cohort for implementation";
    const founder = isFounderOrigin(sm.origin) ? " Founder-type initiative: flag to the Enterprise Path." : "";
    return `${base} — most likely future course: ${next}.${founder}`;
}
