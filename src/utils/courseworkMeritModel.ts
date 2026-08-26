// Deterministic, rule-based scoring engine for coursework flash cards — the "CIEL Merit Model".
// Replaces the earlier LLM-based "AI Curator": same seven-criterion public rubric, but every point
// is computed from the student's own declared wizard fields, so a score is always explainable and
// reproducible (no OpenAI call, no run-to-run variance). See courseProjectTypes.ts for field shapes.

import { type CourseProjectEntry, type CourseProjectResultsInfo, courseProjectMetricLine, stripEmoji } from "./courseProjectTypes";

export interface MeritRubricCriterion {
    key: "purpose" | "rigor" | "results" | "sdg" | "honesty" | "refl" | "ver";
    label: string;
    max: number;
    color: string;
    description: string;
}

/** The public rubric v3 — sustainability weighted strongest by design, plus a Verifiability criterion for the attached real work. Shown to students before they write, faculty while they review, university on publish. */
export const MERIT_RUBRIC: MeritRubricCriterion[] = [
    { key: "sdg", label: "1 · Sustainability & SDG authenticity — the anchor", max: 25, color: "#3F7E44", description: "Primary SDG + target, connection explained, integration level declared. Self-started or emergent links earn a bonus; honest \"not applicable\" scores respectably. §6." },
    { key: "results", label: "2 · Substance of results — is it real & fruitful?", max: 20, color: "#c98a04", description: "Output + insight present; evidence ladder: measured > qualitative > estimated > target > conceptual > not-yet. Honesty never scores zero. §5." },
    { key: "purpose", label: "3 · Clarity & quality of the idea", max: 14, color: "#2563eb", description: "A stated aim anyone can grasp, concrete objectives, a real issue/question/opportunity — concise beats padded. §2–3." },
    { key: "rigor", label: "4 · Rigor of process — pathway-adjusted", max: 13, color: "#0f766e", description: "Activities & method appropriate to the declared format + scale stated. A deep study and a brief class exercise are judged against their own scale. §4." },
    { key: "honesty", label: "5 · Honesty & consistency", max: 15, color: "#dc2626", description: "Limitation named with its effect; numbers correctly classified; claims consistent with evidence (a \"central & demonstrated\" claim needs measurement behind it). §5–7." },
    { key: "refl", label: "6 · Reflection & transfer", max: 8, color: "#7c3aed", description: "What was learned, skills claimed, advice to the next class, a realistic next step. §7." },
    { key: "ver", label: "7 · Verifiability", max: 5, color: "#0e7490", description: "The actual assignment attached (📎) and evidence files on the metrics. Optional to attach — but the real work always outranks a claim about it, and attached cards rank with higher confidence. §5." },
];

export const MERIT_NEUTRALITY_NOTE =
    "The model never scores English polish, word count, discipline prestige, or production budget. Expectations are format-adjusted — an essay is not penalised for having no lab data, an artwork is not penalised for having no survey. What's rewarded everywhere: clear purpose, honest evidence, real SDG thinking.";

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

/** Computes the seven-criterion scorecard for one coursework entry, deterministically, from its own wizard fields. */
export function computeMeritScorecard(entry: CourseProjectEntry): MeritScorecard {
    const inc = entry.moduleInclusion || {};
    const ai = entry.assignmentInfo || {};
    const am = entry.aimsInfo || {};
    const pr = entry.processInfo || {};
    const re = entry.resultsInfo || {};
    const sm = entry.sdgMapping || {};
    const rf = entry.reflectionInfo || {};
    const primary = sm.entries?.[0];

    // ---- 3 · Clarity & quality of the idea — 14 ----
    // Formats that skip formal aims (inc.aim=false) substitute "what were you asked to do" as the aim proxy —
    // the wizard's own format notes explain this ("your aim becomes your central argument", etc.).
    const aimText = inc.aim ? am.aimStatement : ai.whatAsked;
    const aimPts = aimText && aimText.trim().length > 12 ? 2 : aimText?.trim() ? 1 : 0;
    const objsCount = inc.aim ? (am.objectives || []).filter((o) => o.trim()).length : ai.whatAsked?.trim() ? 2 : 0;
    const issuePts = ai.realWorldIssue?.trim() ? 1 : 0;
    const purposePts = clampPts(aimPts * 4 + Math.min(objsCount, 3) * 1.3 + issuePts * 2.3, 14);
    const purposeNote = aimPts === 2 ? "Clear aim, concrete objectives, real issue named" : aimPts === 1 ? "Aim present but loosely framed" : "Aim missing or vague";

    // ---- 4 · Rigor of process — 13 (pathway-adjusted: a module the format skips can't be marked low) ----
    const actsFilled = (pr.activities || []).filter(Boolean).length > 0;
    const methsFilled = (pr.methods || []).filter((m) => m && !/not applicable/i.test(m)).length > 0;
    const actOk = !inc.act || actsFilled;
    const methOk = !inc.meth || methsFilled;
    const fitPts = actOk && methOk ? 2 : actOk || methOk ? 1 : 0;
    const scalePts = !inc.meth || pr.sampleScale?.trim() ? 1 : 0;
    const rigorPts = clampPts(fitPts * 4.5 + scalePts * 3 + 1, 13);
    const rigorNote =
        fitPts === 2
            ? `Method & activities fit the declared format${scalePts ? "; scale stated" : ""}`
            : fitPts === 1
              ? "Process only partly matches the declared format"
              : "Process poorly evidenced";

    // ---- 2 · Substance of results — 20 ----
    const outputPts = (re.outputs || []).length > 0 || re.outputDescription?.trim() ? 1 : 0;
    const findingsCount = inc.find ? (re.findings || []).filter((f) => f.trim()).length : 2;
    const insightPts = findingsCount >= 2 ? 2 : findingsCount === 1 ? 1 : 0;
    const evidenceStatus = effectiveEvidenceLabel(re);
    const resultsPts = clampPts((EVIDENCE_POINTS[evidenceStatus] ?? 3) + outputPts * 3 + insightPts * 2.5, 20);
    const topMetricLine = (re.metrics || []).map(courseProjectMetricLine).filter(Boolean)[0];
    const resultsNote = `${evidenceStatus}${topMetricLine ? " — " + topMetricLine : re.measurableImpact ? " — " + re.measurableImpact : ""}`;

    // ---- 1 · Sustainability & SDG authenticity — 25 (the anchor) ----
    const sdgHasTarget = (primary?.targets?.length ?? 0) > 0 ? 1 : 0;
    const sdgHasHow = primary?.how?.trim() ? 1 : 0;
    const integPts = integrationPoints(rf.integrationLevel || rf.sdgLinkHonesty);
    const origPts = originPoints(sm.origin);
    const sdgPts = sm.notApplicable
        ? 15
        : clampPts((primary ? 6 : 0) + sdgHasTarget * 4 + sdgHasHow * 5 + integPts + origPts - 2, 25);
    const sdgNote = sm.notApplicable
        ? "Honestly declared not applicable — flagged for teacher confirmation, record counts fully"
        : primary
          ? `SDG ${primary.goalNumber}${sdgHasTarget ? " + target" : ""}${sdgHasHow ? " + explained link" : ""} · ${stripEmoji(rf.integrationLevel || rf.sdgLinkHonesty || "").toLowerCase() || "integration not declared"} · ${stripEmoji(sm.origin || "").toLowerCase() || "origin not declared"}`
          : "No SDG selected yet";

    // ---- 5 · Honesty & consistency — 15 ----
    const limPts = !inc.lim ? 2 : re.limitationType?.trim() && (re.limitationDetail?.trim() || re.limitationInterpretation?.trim()) ? 2 : re.limitationType?.trim() ? 1 : 0;
    const hasMetrics = (re.metrics?.length ?? 0) > 0 || !!re.metricValue?.trim();
    const metricsClassified = re.metrics?.length ? re.metrics.every((m) => !!m.status) : !!re.numberRepresents;
    const numOkPts = hasMetrics ? (metricsClassified ? 1 : 0) : 1;
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

    // ---- 6 · Reflection & transfer — 8 ----
    const learnPts = rf.lessonLearned && rf.lessonLearned.trim().length > 20 ? 2 : rf.lessonLearned?.trim() ? 1 : 0;
    const advicePts = rf.adviceNextSemester?.trim() ? 1 : 0;
    const nextPts = rf.nextSteps?.trim() || rf.whatsNext?.trim() ? 1 : 0;
    const skillsCount = (rf.skills || []).filter(Boolean).length;
    const reflPts = clampPts(learnPts * 2.5 + advicePts * 1.5 + nextPts * 1 + Math.min(skillsCount, 4) * 0.4, 8);
    const reflNote = learnPts === 2 ? "Substantive learning + advice to the next class" : learnPts === 1 ? "Some reflection present" : "Reflection thin";

    // ---- 7 · Verifiability — 5 ----
    const hasMainFile = !!entry.assignmentFileUrl;
    const hasExtraFiles = (entry.evidenceUrls?.length ?? 0) > 0;
    const verPts = clampPts((hasMainFile ? 3 : 0) + (hasExtraFiles ? 2 : 0), 5);
    const verNote = hasMainFile
        ? `📎 Assignment attached — reviewers can open the actual work${hasExtraFiles ? " · evidence files on metrics" : ""}`
        : hasExtraFiles
          ? "Evidence files attached, assignment not"
          : "Card-only record — no files attached (optional, but attached work ranks with higher confidence)";

    const critFor = (key: MeritRubricCriterion["key"]) => MERIT_RUBRIC.find((c) => c.key === key)!;
    const criteria: MeritCriterionResult[] = [
        { ...critFor("sdg"), points: sdgPts, note: sdgNote },
        { ...critFor("results"), points: resultsPts, note: resultsNote },
        { ...critFor("purpose"), points: purposePts, note: purposeNote },
        { ...critFor("rigor"), points: rigorPts, note: rigorNote },
        { ...critFor("honesty"), points: honestyPtsClamped, note: honestyNote },
        { ...critFor("refl"), points: reflPts, note: reflNote },
        { ...critFor("ver"), points: verPts, note: verNote },
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
    sdg: (entry) => (entry.sdgMapping?.notApplicable ? "an honestly declared non-claim, not decorative SDG name-dropping" : isFounderOrigin(entry.sdgMapping?.origin) ? "a self-started, authentic sustainability core" : "an authentic, explained sustainability core"),
    results: (entry) => (effectiveEvidenceLabel(entry.resultsInfo || {}).includes("measured result") ? "real measured results — fruitful, not decorative" : "substantive, honestly-classified results"),
    purpose: () => "a concise, real idea anyone can grasp",
    rigor: () => "rigor true to its own format",
    honesty: () => "honest limits & correctly classified numbers",
    refl: () => "reflection that transfers to the next cohort",
    ver: () => "the actual assignment attached — every claim openable and checkable",
};

/** Why the top-ranked entries lead — derived from their own two highest-scoring criteria, not a canned line. */
export function whyItLeads(entry: CourseProjectEntry, sc: MeritScorecard): string {
    const ranked = [...sc.criteria].sort((a, b) => b.points / b.max - a.points / a.max);
    const [top1, top2] = ranked;
    const attachedSuffix = entry.assignmentFileUrl ? ". The attached work lets reviewers verify, not trust" : "";
    return `${CRITERION_PHRASE[top1.key](entry)}, with ${CRITERION_PHRASE[top2.key](entry)}${attachedSuffix}.`;
}

const CRITERION_SHORT: Record<MeritRubricCriterion["key"], string> = {
    sdg: "sustainability & SDG authenticity",
    results: "substance of results",
    purpose: "clarity of the idea",
    rigor: "pathway-adjusted rigor",
    honesty: "honesty & consistency",
    refl: "reflection",
    ver: "verifiability",
};

const CRITERION_TIER: Record<MeritRubricCriterion["key"], [string, string, string]> = {
    sdg: [
        "the SDG core is targeted, explained and central — authenticity, not name-dropping",
        "the SDG link is genuine, though its target could be sharper",
        "the SDG connection is thin",
    ],
    results: [
        "results are measured and defended — numbers that survive questioning",
        "results are substantive, though partly qualitative",
        "results lean on claims",
    ],
    purpose: [
        "the idea is sharp enough to state in one sentence and still matter",
        "a clear idea, loosely framed",
        "the idea needs a tighter question",
    ],
    rigor: [
        "process rigor is exemplary for its own format — on its own pathway, it excels",
        "the process fits its format, with room to deepen",
        "the method is under-explained",
    ],
    honesty: [
        "limits are named with their effects — the honesty this rubric prizes most",
        "honest overall, with one soft claim",
        "claims outrun the evidence",
    ],
    refl: [
        "reflection the next cohort can actually use",
        "reflection present, transfer thin",
        "reflection is cursory",
    ],
    ver: [
        "every attached file checked against the claims — openable, checkable truth",
        "evidence supports most claims",
        "verifiability is the weak link",
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
    sdg: {
        emoji: "🌍",
        title: "Sustainability & SDG authenticity",
        exemplary: "Named SDG + specific target, central to the project design; the claimed link would survive an expert asking “how, exactly?”",
        solid: "Genuine SDG connection, but the target is vague or the link is partial",
        developing: "SDG is name-dropped — the project would be identical without it",
    },
    results: {
        emoji: "📊",
        title: "Substance of results",
        exemplary: "Measured outcomes with baseline → endline, honestly counted, defensible under questioning",
        solid: "Substantive results, but partly qualitative or missing a baseline",
        developing: "Claims of impact without measurement",
    },
    purpose: {
        emoji: "💡",
        title: "Clarity of the idea",
        exemplary: "Statable in one sharp sentence and still meaningful; original for its context",
        solid: "A clear idea, loosely framed or partly borrowed",
        developing: "Unfocused — the reader must guess what the project is",
    },
    rigor: {
        emoji: "🔬",
        title: "Rigor — pathway-adjusted",
        exemplary: "Exemplary process for its OWN format: an artwork judged on craft, a prototype on iteration, a paper on method — never on each other’s scale",
        solid: "Process fits the format with thin patches (skipped iteration, small sample, light sourcing)",
        developing: "Method under-explained; the “how” is missing",
    },
    honesty: {
        emoji: "🤝",
        title: "Honesty & consistency",
        exemplary: "Limitations named WITH their effects; numbers consistent everywhere; nothing inflated",
        solid: "Honest overall; one soft or optimistic claim",
        developing: "Claims outrun the evidence, or sections contradict each other",
    },
    refl: {
        emoji: "🪞",
        title: "Reflection",
        exemplary: "Lessons the next cohort could act on; growth stated with proof",
        solid: "Reflection present but generic; transfer value thin",
        developing: "Cursory — “I learned a lot”",
    },
    ver: {
        emoji: "🔍",
        title: "Verifiability",
        exemplary: "Attached files match the claims — openable, checkable truth",
        solid: "Most claims supported; some evidence indirect",
        developing: "Evidence missing, mismatched or unverifiable",
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
