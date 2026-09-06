// Deterministic, rule-based scoring engine for coursework flash cards — the "CIEL Merit Model".
// Implements the "CIEL PK Universal Coursework Quality Rubric" (design reference:
// CIEL_PK_Coursework_Form_v6_Universal_Rubric_Evidence.html) as a deterministic stand-in for its
// AI-graded 0-5 performance levels: every point is computed from the student's own declared wizard
// fields, so a score is always explainable and reproducible (no LLM call, no run-to-run variance).
// Mirrors ciel_backend/src/paths/merit-model/merit-model.util.ts's scorecard() — keep both in sync.
// See courseProjectTypes.ts for field shapes.

import { type CourseProjectEntry, type CourseProjectResultsInfo, courseProjectMetricLine, stripEmoji } from "./courseProjectTypes";

export interface MeritRubricCriterion {
    key: "task" | "knowledge" | "method" | "output" | "analysis" | "sustainability" | "reflection";
    label: string;
    max: number;
    color: string;
    description: string;
}

/** The Universal Quality Rubric — same criteria + weights across disciplines, expected depth
 * calibrated to academic level. Evidence & integrity are verification safeguards under this
 * rubric, not bonus-point categories — there's no separate Verifiability line; a claims-vs-evidence
 * consistency check is still surfaced via `consistency`, but never scored. Shown to students before
 * they write, faculty while they review, university on publish. */
export const MERIT_RUBRIC: MeritRubricCriterion[] = [
    { key: "task", label: "1 · Task / purpose & alignment", max: 10, color: "#7c3aed", description: "Task is understood; purpose is clear; the work addresses the stated task with appropriate scope. §2–3." },
    { key: "knowledge", label: "2 · Knowledge, context & contribution", max: 15, color: "#c98a04", description: "Appropriate disciplinary knowledge applied accurately, contributing real insight — not just description. §2, §5." },
    { key: "method", label: "3 · Method / process & disciplinary rigor", max: 20, color: "#0f766e", description: "Method/process fits the task and is competently executed with reasonable depth; scale stated. §4." },
    { key: "output", label: "4 · Quality of output / execution", max: 15, color: "#ea580c", description: "Competent, coherent and fit-for-purpose output — resolved, accurate and complete for its format. §5." },
    { key: "analysis", label: "5 · Analysis, findings & application", max: 20, color: "#2563eb", description: "Sound analysis; conclusions follow from the work; evidence ladder: measured > qualitative > estimated > target > conceptual > not-yet. §5." },
    { key: "sustainability", label: "6 · Sustainability & SDG integration", max: 15, color: "#3F7E44", description: "Primary SDG + target, connection explained, integration level declared. Self-started or emergent links earn a bonus; honest \"not applicable\" scores respectably. §6." },
    { key: "reflection", label: "7 · Reflection, limitations & learning", max: 5, color: "#db2777", description: "Specific learning and relevant limitations explained — what was learned, and what could and couldn't be concluded. §7." },
];

export const MERIT_NEUTRALITY_NOTE =
    "The model never scores English polish, word count, discipline prestige, or production budget. Expectations are format-adjusted — an essay is not penalised for having no lab data, an artwork is not penalised for having no survey. What's rewarded everywhere: clear purpose, honest evidence, real SDG thinking.";

/** Band calibration: 0–39 Insufficient · 40–54 Basic · 55–64 Developing · 65–74 Good · 75–84 Very
 * Good · 85–94 Excellent · 95–100 Outstanding. 90+ is not routine — it requires the strongest
 * criteria to themselves land at Excellent/Outstanding, which these formulas don't hand out for free. */

/** Evidence-status points — mirrors the wizard's old single evidence-status labels (still used as the scoring input, now derived from the multi-metric builder). */
const EVIDENCE_POINTS: Record<string, number> = {
    "Actual measured result": 12,
    "Qualitative evidence": 10,
    "Estimated / projected": 7,
    "Proposed target": 6,
    "Conceptual recommendation": 5,
    "Not measured yet": 3,
    "Not applicable": 4,
};

/** Derives one of the classic evidence-ladder labels from the multi-metric builder (or falls back to the pre-multi-metric single field, for entries submitted before this system existed) — keeps the scoring formula below unchanged while sourcing from real declared data either way. */
function effectiveEvidenceLabel(re: CourseProjectResultsInfo): string {
    const metrics = re.metrics || [];
    if (metrics.length) {
        if (metrics.some((m) => m.status === "Actual — measured")) return "Actual measured result";
        if (metrics.some((m) => m.status === "Target — intended future result")) return "Proposed target";
        if (metrics.some((m) => m.status === "Estimated / projected")) return "Estimated / projected";
        if (metrics.some((m) => m.status === "Proposed — not yet tested")) return "Conceptual recommendation";
        return "Qualitative evidence";
    }
    if (re.measured) {
        if (/Not yet/.test(re.measured)) return "Not measured yet";
        if (/No —/.test(re.measured)) return "Not applicable";
        if (/Yes|Partly/.test(re.measured)) return "Qualitative evidence";
    }
    return re.evidenceStatus || "Not applicable";
}

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
    /** Only "approved" entries are eligible for Merit Model ranking/AI picks/showcase — mirrors the FYP eligibility gate. */
    eligible: boolean;
}

const GRADE_BANDS: [number, string, string][] = [
    [95, "OUTSTANDING", "#16a34a"],
    [85, "EXCELLENT", "#22c55e"],
    [75, "VERY GOOD", "#0f766e"],
    [65, "GOOD", "#2563eb"],
    [55, "DEVELOPING", "#c98a04"],
    [40, "BASIC", "#ea580c"],
    [0, "INSUFFICIENT", "#dc2626"],
];

export function meritGrade(total: number): [string, string] {
    for (const [min, label, color] of GRADE_BANDS) {
        if (total >= min) return [label, color];
    }
    return ["INSUFFICIENT", "#dc2626"];
}

/** Computes the seven-criterion Universal Quality Rubric scorecard for one coursework entry,
 * deterministically, from its own wizard fields — a stand-in for the design's AI-graded 0-5
 * performance levels. Mirrors the backend's scorecard() in merit-model.util.ts; keep both in sync. */
export function computeMeritScorecard(entry: CourseProjectEntry): MeritScorecard {
    const inc = entry.moduleInclusion || {};
    const ai = entry.assignmentInfo || {};
    const am = entry.aimsInfo || {};
    const pr = entry.processInfo || {};
    const re = entry.resultsInfo || {};
    const sm = entry.sdgMapping || {};
    const rf = entry.reflectionInfo || {};
    const primary = sm.entries?.[0];
    const discipline = entry.studentInfo?.disciplineName?.trim();

    // Formats that skip formal aims (inc.aim=false) substitute "what were you asked to do" as the aim proxy —
    // the wizard's own format notes explain this ("your aim becomes your central argument", etc.).
    const aimText = inc.aim ? am.aimStatement : ai.whatAsked;
    const aimPts = aimText && aimText.trim().length > 12 ? 2 : aimText?.trim() ? 1 : 0;
    const objsCount = inc.aim ? (am.objectives || []).filter((o) => o.trim()).length : ai.whatAsked?.trim() ? 2 : 0;
    const issuePts = ai.realWorldIssue?.trim() ? 1 : 0;

    const actsFilled = (pr.activities || []).filter(Boolean).length > 0;
    const methsFilled = (pr.methods || []).filter((m) => m && !/not applicable/i.test(m)).length > 0;
    const actOk = !inc.act || actsFilled;
    const methOk = !inc.meth || methsFilled;
    const fitPts = actOk && methOk ? 2 : actOk || methOk ? 1 : 0;
    const scalePts = !inc.meth || pr.sampleScale?.trim() ? 1 : 0;

    const outputPts = (re.outputs || []).length > 0 || re.outputDescription?.trim() ? 1 : 0;
    const findingsCount = inc.find ? (re.findings || []).filter((f) => f.trim()).length : 2;
    const insightPts = findingsCount >= 2 ? 2 : findingsCount === 1 ? 1 : 0;
    const evidenceStatus = effectiveEvidenceLabel(re);
    const topMetricLine = (re.metrics || []).map(courseProjectMetricLine).filter(Boolean)[0];

    const sdgHasTarget = (primary?.targets?.length ?? 0) > 0 ? 1 : 0;
    const sdgHasHow = primary?.how?.trim() ? 1 : 0;
    const integPts = integrationPoints(rf.integrationLevel || rf.sdgLinkHonesty);
    const origPts = originPoints(sm.origin);

    const limPts = !inc.lim ? 2 : re.limitationType?.trim() && (re.limitationDetail?.trim() || re.limitationInterpretation?.trim()) ? 2 : re.limitationType?.trim() ? 1 : 0;
    const hasMetrics = (re.metrics?.length ?? 0) > 0 || !!re.metricValue?.trim();
    const metricsClassified = re.metrics?.length ? re.metrics.every((m) => !!m.status) : !!re.numberRepresents;
    const numOkPts = hasMetrics ? (metricsClassified ? 1 : 0) : 1;

    const learnPts = rf.lessonLearned && rf.lessonLearned.trim().length > 20 ? 2 : rf.lessonLearned?.trim() ? 1 : 0;
    const advicePts = rf.adviceNextSemester?.trim() ? 1 : 0;
    const nextPts = rf.nextSteps?.trim() || rf.whatsNext?.trim() ? 1 : 0;
    const skillsCount = (rf.skills || []).filter(Boolean).length;

    // ---- 1 · Task / purpose & alignment — 10 ----
    const taskPts = clampPts(aimPts * 4 + issuePts * 3 + Math.min(objsCount, 2) * 1.5, 10);
    const taskNote = aimPts === 2 ? "Clear task, real issue named, scope defined" : aimPts === 1 ? "Task/purpose present but loosely framed" : "Task or purpose unclear";

    // ---- 2 · Knowledge, context & contribution — 15 ----
    const knowledgePts = clampPts(insightPts * 6 + (discipline ? 4 : 0) + outputPts * 5, 15);
    const knowledgeNote = discipline
        ? `Grounded in ${discipline.toLowerCase()}${insightPts === 2 ? " with a real contribution" : ""}`
        : insightPts === 2
          ? "Contributes real insight; discipline not named"
          : "Limited disciplinary grounding or contribution";

    // ---- 3 · Method / process & disciplinary rigor — 20 ----
    const methodPts = clampPts(fitPts * 8 + scalePts * 5 + numOkPts * 5, 20);
    const methodNote =
        fitPts === 2
            ? `Method & activities fit the declared format${scalePts ? "; scale stated" : ""}`
            : fitPts === 1
              ? "Process only partly matches the declared format"
              : "Process poorly evidenced";

    // ---- 4 · Quality of output / execution — 15 ----
    const outputQualityPts = clampPts(outputPts * 9 + insightPts * 3, 15);
    const outputQualityNote = outputPts ? "Output produced and described" : "No output described yet";

    // ---- 5 · Analysis, findings & application — 20 ----
    const analysisPts = clampPts((EVIDENCE_POINTS[evidenceStatus] ?? 3) + insightPts * 5 + outputPts * 3 + numOkPts * 2, 20);
    const analysisNote = `${evidenceStatus}${topMetricLine ? " — " + topMetricLine : re.measurableImpact ? " — " + re.measurableImpact : ""}`;

    // ---- 6 · Sustainability & SDG integration — 15 ----
    // Same shape as the earlier 25-point SDG formula, rescaled to this rubric's 15-point weight.
    const sustainabilityPts = sm.notApplicable ? 9 : clampPts(((primary ? 6 : 0) + sdgHasTarget * 4 + sdgHasHow * 5 + integPts + origPts - 2) * 0.6, 15);
    const sustainabilityNote = sm.notApplicable
        ? "Honestly declared not applicable — flagged for teacher confirmation, record counts fully"
        : primary
          ? `SDG ${primary.goalNumber}${sdgHasTarget ? " + target" : ""}${sdgHasHow ? " + explained link" : ""} · ${stripEmoji(rf.integrationLevel || rf.sdgLinkHonesty || "").toLowerCase() || "integration not declared"} · ${stripEmoji(sm.origin || "").toLowerCase() || "origin not declared"}`
          : "No SDG selected yet";

    // ---- 7 · Reflection, limitations & learning — 5 ----
    const reflectionPts = clampPts(learnPts * 1.3 + limPts * 1.0 + advicePts * 0.5 + nextPts * 0.5 + Math.min(skillsCount, 3) * 0.2, 5);
    const reflectionNote =
        learnPts === 2 && limPts === 2
            ? "Substantive learning with limitations honestly named"
            : learnPts === 1 || limPts === 1
              ? "Some reflection or limitation present"
              : "Reflection thin";

    // Evidence & integrity are verification safeguards under this rubric, not a scored criterion —
    // the claims-vs-evidence consistency check is surfaced for the reviewer, but never moves the total.
    const integrationText = stripEmoji(rf.integrationLevel || rf.sdgLinkHonesty || "");
    const claimsHigh = /central to the work and demonstrated|real\s*—/i.test(integrationText);
    const evidenceLow = ["Not measured yet", "Conceptual recommendation", "Proposed target"].includes(evidenceStatus);
    const consistency: MeritConsistencyFlag = claimsHigh && evidenceLow
        ? { ok: false, message: `Consistency check: claims "central & demonstrated" integration but evidence is ${evidenceStatus.toLowerCase()} — noted for reviewer, not scored.` }
        : { ok: true, message: "Consistency check passed: claims match the declared evidence." };

    const critFor = (key: MeritRubricCriterion["key"]) => MERIT_RUBRIC.find((c) => c.key === key)!;
    const criteria: MeritCriterionResult[] = [
        { ...critFor("task"), points: taskPts, note: taskNote },
        { ...critFor("knowledge"), points: knowledgePts, note: knowledgeNote },
        { ...critFor("method"), points: methodPts, note: methodNote },
        { ...critFor("output"), points: outputQualityPts, note: outputQualityNote },
        { ...critFor("analysis"), points: analysisPts, note: analysisNote },
        { ...critFor("sustainability"), points: sustainabilityPts, note: sustainabilityNote },
        { ...critFor("reflection"), points: reflectionPts, note: reflectionNote },
    ];
    const total = Math.round(criteria.reduce((s, c) => s + c.points, 0));
    const [grade, gradeColor] = meritGrade(total);
    // Faculty approval is the eligibility gate for ranking/showcase — see the "faculty approve → live" flow.
    const eligible = entry.facultyApprovalStatus === "approved";

    return { criteria, total, grade, gradeColor, consistency, eligible };
}

/** True when the sustainability link was self-started by the student/team rather than assigned — mirrors originPoints()'s own detection regex. */
function isFounderOrigin(origin?: string): boolean {
    return /introduced by the student|our own idea/i.test(stripEmoji(origin || "").toLowerCase());
}

const CRITERION_PHRASE: Record<MeritRubricCriterion["key"], (entry: CourseProjectEntry) => string> = {
    task: () => "a clear task and purpose anyone can grasp",
    knowledge: () => "real disciplinary grounding and contribution",
    method: () => "a method and process that fit the work",
    output: () => "a concrete, well-executed output",
    analysis: (entry) => (effectiveEvidenceLabel(entry.resultsInfo || {}).includes("measured result") ? "analysis backed by real measured results — fruitful, not decorative" : "substantive, honestly-classified findings"),
    sustainability: (entry) => (entry.sdgMapping?.notApplicable ? "an honestly declared non-claim, not decorative SDG name-dropping" : isFounderOrigin(entry.sdgMapping?.origin) ? "a self-started, authentic sustainability core" : "an authentic, explained sustainability core"),
    reflection: () => "reflection and limitations that transfer to the next cohort",
};

/** Why the top-ranked entries lead — derived from their own two highest-scoring criteria, not a canned line. */
export function whyItLeads(entry: CourseProjectEntry, sc: MeritScorecard): string {
    const ranked = [...sc.criteria].sort((a, b) => b.points / b.max - a.points / a.max);
    const [top1, top2] = ranked;
    const attachedSuffix = entry.assignmentFileUrl ? ". The attached work lets reviewers verify, not trust" : "";
    return `${CRITERION_PHRASE[top1.key](entry)}, with ${CRITERION_PHRASE[top2.key](entry)}${attachedSuffix}.`;
}

const CRITERION_SHORT: Record<MeritRubricCriterion["key"], string> = {
    task: "task / purpose & alignment",
    knowledge: "knowledge, context & contribution",
    method: "method / process rigor",
    output: "quality of output / execution",
    analysis: "analysis, findings & application",
    sustainability: "sustainability & SDG integration",
    reflection: "reflection & limitations",
};

const CRITERION_TIER: Record<MeritRubricCriterion["key"], [string, string, string]> = {
    task: [
        "the task and purpose are precise, coherent and well justified",
        "the purpose is identifiable but scope or alignment is uneven",
        "the task is only partly understood; purpose is generic or incomplete",
    ],
    knowledge: [
        "strong synthesis of relevant theory, precedent or context — a clear contribution",
        "some relevant concepts applied, with limited integration",
        "minimal disciplinary grounding; mostly unsupported description",
    ],
    method: [
        "systematic, well controlled and well justified process with strong disciplinary rigor",
        "method/process fits the task and is competently executed",
        "process is missing, weak or largely unexplained",
    ],
    output: [
        "highly resolved, accurate and fit-for-purpose output",
        "competent, coherent output with some quality or completeness issues",
        "incomplete or weakly resolved output",
    ],
    analysis: [
        "analysis is measured and defended — numbers that survive questioning",
        "sound analysis; conclusions follow from the work",
        "mostly descriptive; claims are unsupported or conclusions don't follow",
    ],
    sustainability: [
        "the SDG core is targeted, explained and central — authenticity, not name-dropping",
        "the SDG link is genuine, though its target could be sharper",
        "the SDG connection is thin",
    ],
    reflection: [
        "specific learning and limitations explained with real insight",
        "some learning and limitations identified, thin on significance",
        "reflection is cursory; limitations absent or token",
    ],
};

export type RubricBand = "EXEMPLARY" | "SOLID" | "DEVELOPING";

export function rubricBand(points: number, max: number): RubricBand {
    const r = max ? points / max : 0;
    if (r >= 0.85) return "EXEMPLARY";
    if (r >= 0.62) return "SOLID";
    return "DEVELOPING";
}

export function rubricBandIndex(points: number, max: number): 0 | 1 | 2 {
    const b = rubricBand(points, max);
    return b === "EXEMPLARY" ? 0 : b === "SOLID" ? 1 : 2;
}

export const RUBRIC_SCALE: Record<
    MeritRubricCriterion["key"],
    { emoji: string; title: string; exemplary: string; solid: string; developing: string }
> = {
    task: {
        emoji: "🎯",
        title: "Task / purpose & alignment",
        exemplary: "Purpose, scope and choices are precise, coherent and well justified",
        solid: "Purpose is identifiable but scope or alignment is uneven",
        developing: "Task is only partly understood; purpose is generic or incomplete",
    },
    knowledge: {
        emoji: "📚",
        title: "Knowledge, context & contribution",
        exemplary: "Strong synthesis of relevant theory, precedent or context; clear contribution",
        solid: "Some relevant concepts applied, with limited integration",
        developing: "Minimal disciplinary grounding; mostly unsupported description",
    },
    method: {
        emoji: "🔬",
        title: "Method / process & disciplinary rigor",
        exemplary: "Systematic, well controlled and well justified process with strong disciplinary rigor",
        solid: "Method/process fits the task and is competently executed with reasonable depth",
        developing: "Process is missing, weak, inappropriate or largely unexplained",
    },
    output: {
        emoji: "🛠️",
        title: "Quality of output / execution",
        exemplary: "Highly resolved, accurate, polished or technically strong output",
        solid: "Functional but uneven; important quality or completeness issues remain",
        developing: "Incomplete, weakly resolved or not fit for stated purpose",
    },
    analysis: {
        emoji: "📊",
        title: "Analysis, findings & application",
        exemplary: "Strong synthesis; findings well supported, limitations handled, application convincing",
        solid: "Sound analysis; conclusions follow from the work",
        developing: "Mostly descriptive; claims are unsupported or conclusions don't follow",
    },
    sustainability: {
        emoji: "🌍",
        title: "Sustainability & SDG integration",
        exemplary: "Named SDG + specific target, central to the project design; the claimed link would survive an expert asking “how, exactly?”",
        solid: "Genuine SDG connection, but the target is vague or the link is partial",
        developing: "SDG is name-dropped — the project would be identical without it",
    },
    reflection: {
        emoji: "🪞",
        title: "Reflection, limitations & learning",
        exemplary: "Critical reflection shows how choices, limits and learning affect interpretation or future work",
        solid: "Specific learning and relevant limitations are explained",
        developing: "Generic reflection; limitations absent or token",
    },
};

/** Full “why this rank” verdict — same formula at faculty, university and CIEL scope. */
export function whyThisRank(
    entry: CourseProjectEntry,
    sc: MeritScorecard,
    index: number,
    pool: { entry: CourseProjectEntry; scorecard: MeritScorecard }[],
    avg: number,
): string {
    const ratios = sc.criteria.map((c) => ({ c, r: c.max ? c.points / c.max : 0 }));
    const ordered = [...ratios].sort((a, b) => b.r - a.r);
    const t1 = ordered[0];
    const t2 = ordered[1];
    const wk = ordered[ordered.length - 1];
    const nEx = ratios.filter((x) => x.r >= 0.85).length;
    const diff = sc.total - avg;
    const files = (entry.assignmentFileUrl ? 1 : 0) + (entry.evidenceUrls?.length ?? 0);
    const fmt = stripEmoji(entry.assignmentInfo?.formats?.[0] || entry.assignmentInfo?.format || "work").toLowerCase();

    const parts: string[] = [];
    parts.push(
        `Why #${index + 1} of ${pool.length}: ${nEx} of 7 criteria land in the Exemplary band. The rank is carried by ${CRITERION_SHORT[t1.c.key]} — ${CRITERION_TIER[t1.c.key][rubricBandIndex(t1.c.points, t1.c.max)]} (${Math.round(t1.c.points * 10) / 10}/${t1.c.max}) — reinforced by ${CRITERION_SHORT[t2.c.key]}: ${CRITERION_TIER[t2.c.key][rubricBandIndex(t2.c.points, t2.c.max)]} (${Math.round(t2.c.points * 10) / 10}/${t2.c.max}).`,
    );
    parts.push(
        `Against the cohort: ${diff >= 0 ? "+" : ""}${diff} points versus the scoped average of ${avg} — ${diff >= 8 ? "a decisive margin" : diff >= 3 ? "a clear margin" : diff >= 0 ? "narrowly above the field" : "below the field on total, ranked on what it did earn"}.`,
    );
    parts.push(
        files
            ? `The evidence holds: ${files} file${files === 1 ? "" : "s"} re-read at ranking time — they match the claimed ${fmt}; nothing here rests on an unverifiable claim.`
            : `The evidence holds: this is a card-only record — ranked on declared fields; attached work would raise verifiability.`,
    );
    if (index < pool.length - 1) {
        const nx = pool[index + 1];
        const d = sc.total - nx.scorecard.total;
        const gaps = sc.criteria.map((c, j) => ({
            key: c.key,
            gap: c.points - nx.scorecard.criteria[j].points,
        }));
        const g = [...gaps].sort((a, b) => b.gap - a.gap)[0];
        parts.push(
            d > 0
                ? `Versus the next card — “${nx.entry.projectTitle || "Untitled"}” (${nx.scorecard.total}): the ${d}-point gap is earned almost entirely on ${CRITERION_SHORT[g.key]} (+${Math.round(g.gap)}) — not on volume, polish or discipline prestige.`
                : `Level on points with “${nx.entry.projectTitle || "Untitled"}” — placed higher on credibility of evidence, the declared tie-breaker.`,
        );
    }
    parts.push(
        `What holds it at #${index + 1}: ${CRITERION_TIER[wk.c.key][rubricBandIndex(wk.c.points, wk.c.max)]} (${Math.round(wk.c.points * 10) / 10}/${wk.c.max})${index === 0 ? " — even the top card is told its weakest link, because a rubric that only praises is not a rubric" : ""}.`,
    );
    return parts.join(" ");
}

/** 🔮 What's the most likely next step for this piece of work — forecast from its own evidence ladder and declared format. */
export function courseworkPotential(entry: CourseProjectEntry): string {
    const re = entry.resultsInfo || {};
    const sm = entry.sdgMapping || {};
    const fmt = stripEmoji(entry.assignmentInfo?.formats?.[0] || entry.assignmentInfo?.format || "").toLowerCase();
    const evs = effectiveEvidenceLabel(re);
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
