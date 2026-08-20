// Deterministic, rule-based scoring engine for FYP / Thesis flash cards — the "CIEL FYP Merit Model".
// Same spirit as courseworkMeritModel.ts: every point is computed from the student's own declared
// wizard fields, so a score is always explainable and reproducible (no AI call, no run-to-run
// variance) — but rigor and evidence are judged INSIDE the project's own route (scholar/maker/
// builder/storyteller/consultant), so a degree-show collection isn't measured like a lab thesis.

import { type FypEntry, fypRouteFor, normalizeFypTeamMembers, type FypRoute } from "./fypTypes";

export interface FypMeritRubricCriterion {
    key: "purpose" | "rigor" | "outcome" | "honesty" | "sdg" | "conn";
    label: string;
    max: number;
    color: string;
    description: string;
}

/** The public rubric — shown to students before they write, faculty/university while they review. */
export const FYP_MERIT_RUBRIC: FypMeritRubricCriterion[] = [
    { key: "purpose", label: "1 · Clarity of purpose", max: 15, color: "#2563eb", description: "Question / intention / problem stated so anyone can understand it; concrete objectives." },
    { key: "rigor", label: "2 · Rigor of process — route-adjusted", max: 20, color: "#0f766e", description: "Methods appropriate to the declared route, plus scale & period stated. Practice-based inquiry counts equal to a lab experiment." },
    { key: "outcome", label: "3 · Substance of outcome", max: 20, color: "#c98a04", description: "Findings or demonstrations present; the documented work itself counts as evidence for studio & media routes. Honesty never scores zero." },
    { key: "honesty", label: "4 · Scholarly honesty", max: 15, color: "#dc2626", description: "Limitation named with its effect, declared scope, a tested assumption, claims consistent with evidence." },
    { key: "sdg", label: "5 · SDG authenticity", max: 15, color: "#3F7E44", description: "A genuine link with target + explanation — or an honest \"no SDG applies,\" which scores respectably. Never punished for honesty." },
    { key: "conn", label: "6 · Completeness & connection", max: 15, color: "#7c3aed", description: "Thesis in repository, co-authors linked by email, supervisor named, route block filled (degree show / build status / screening / client)." },
];

export const FYP_MERIT_NEUTRALITY_NOTE =
    "After every run the model publishes the average score per route. If theses systematically beat collections, the rubric is wrong — not the collections. The model never scores English polish, project cost, or discipline prestige.";

/** Evidence-status points — mirrors the wizard's FYP_EVIDENCE_STATUS labels exactly. */
const EVIDENCE_POINTS: Record<string, number> = {
    "Measured / tested result": 12,
    "Qualitative evidence": 10,
    "The work itself is the evidence": 11,
    "Estimated / projected": 7,
    "Conceptual / proposed": 5,
    "Not measured yet": 3,
    "Not applicable": 4,
};

const clampPts = (n: number, max: number) => Math.max(0, Math.min(max, n));

export interface FypMeritCriterionResult extends FypMeritRubricCriterion {
    points: number;
    note: string;
}

export interface FypMeritConsistencyFlag {
    ok: boolean;
    message: string;
}

export interface FypMeritScorecard {
    route: FypRoute;
    criteria: FypMeritCriterionResult[];
    total: number;
    grade: string;
    gradeColor: string;
    consistency: FypMeritConsistencyFlag;
}

const GRADE_BANDS: [number, string, string][] = [
    [85, "EXEMPLARY", "#16a34a"],
    [70, "STRONG", "#0f766e"],
    [55, "DEVELOPING", "#c98a04"],
    [0, "EMERGING", "#7a8095"],
];

export function fypMeritGrade(total: number): [string, string] {
    for (const [min, label, color] of GRADE_BANDS) {
        if (total >= min) return [label, color];
    }
    return ["EMERGING", "#7a8095"];
}

const ROUTE_LABEL: Record<FypRoute, string> = {
    scholar: "scholar",
    maker: "maker",
    builder: "builder",
    storyteller: "storyteller",
    consultant: "consultant",
};

/** Computes the six-criterion scorecard for one FYP entry, deterministically, from its own wizard fields. */
export function computeFypMeritScorecard(entry: FypEntry): FypMeritScorecard {
    const pi = entry.projectInfo || {};
    const oi = entry.objectivesInfo || {};
    const meth = entry.methodology || {};
    const find = entry.findings || {};
    const sm = entry.sdgMapping || {};
    const rf = entry.reflectionInfo || {};
    const rd = entry.routeDetails || {};
    const route = fypRouteFor(pi.projectType);

    // ---- 1 · Clarity of purpose ----
    const aimText = oi.aim || "";
    const aimPts = aimText.trim().length > 12 ? 2 : aimText.trim() ? 1 : 0;
    const objsCount = (oi.objectives || []).filter((o) => o.trim()).length;
    const purposePts = clampPts(aimPts * 5 + Math.min(objsCount, 3) * 1.7, 15);
    const purposeNote = aimPts === 2 ? "Purpose anyone can understand, concrete objectives" : aimPts === 1 ? "Purpose present but loosely framed" : "Purpose unclear";

    // ---- 2 · Rigor of process (route-adjusted) ----
    const approachesFilled = (meth.approaches || []).length > 0;
    const methodsFilled = (meth.methods || []).length > 0;
    const fitPts = approachesFilled && methodsFilled ? 2 : approachesFilled || methodsFilled ? 1 : 0;
    const scalePts = meth.sampleScale?.trim() ? 1 : 0;
    const periodPts = meth.periodFrom || meth.periodTo ? 1 : 0;
    const rigorPts = clampPts(fitPts * 7 + scalePts * 3 + periodPts * 3, 20);
    const rigorNote =
        fitPts === 2
            ? `Method fits the ${ROUTE_LABEL[route]} route; scale & period declared`
            : fitPts === 1
              ? "Method only partly matches the route"
              : "Process thinly evidenced";

    // ---- 3 · Substance of outcome ----
    const findsCount = (find.findings || []).filter((f) => f.trim()).length;
    const evidenceStatus = find.evidenceStatus || "Not applicable";
    const outcomePts = clampPts((EVIDENCE_POINTS[evidenceStatus] ?? 3) + Math.min(findsCount, 3) * 2.7, 20);
    const outcomeNote = `${evidenceStatus} evidence · ${findsCount} finding${findsCount === 1 ? "" : "s"}/demonstration${findsCount === 1 ? "" : "s"}`;

    // ---- 4 · Scholarly honesty ----
    const limPts = find.limitationType?.trim() && find.limitationDetail?.trim() ? 2 : find.limitationType?.trim() ? 1 : 0;
    const scopePts = oi.scope?.trim() ? 1 : 0;
    const wrongPts = rf.wrongAssumption?.trim() ? 1 : 0;
    let honestyPts = limPts * 4 + scopePts * 2 + wrongPts * 3 + 2;
    const hasMetricValue = !!find.metricValue?.trim();
    const metricOk = hasMetricValue ? (find.numberRepresents ? 1 : 0) : 1;
    let consistency: FypMeritConsistencyFlag = { ok: true, message: "Consistency: claims match declared evidence." };
    const blockFieldsFilled = [rd.showMonth, rd.piecesShown, rd.juryExaminer].filter(Boolean).length;
    if (evidenceStatus === "Measured / tested result" && !metricOk) {
        honestyPts -= 3;
        consistency = { ok: false, message: 'Claims "measured" but no classified metric on record — 3 points deducted.' };
    } else if (route === "maker" && evidenceStatus === "The work itself is the evidence" && blockFieldsFilled === 0) {
        honestyPts -= 3;
        consistency = { ok: false, message: '"Work itself is evidence" claimed but no documentation/degree-show details — 3 points deducted.' };
    }
    const honestyPtsClamped = clampPts(honestyPts, 15);
    const honestyNote = limPts === 2 ? "Limitation named with its effect" : limPts === 1 ? "Limitation named briefly" : "No limitation acknowledged";

    // ---- 5 · SDG authenticity ----
    const primary = sm.entries?.[0];
    const hasTarget = (primary?.targets?.length ?? 0) > 0;
    const hasHow = !!primary?.how?.trim();
    const sdgState: "none" | "linked" | "forced" = sm.noSdgApplies ? "none" : primary && (hasTarget || hasHow) ? "linked" : "forced";
    const sdgPts = sdgState === "none" ? 9 : sdgState === "forced" ? 3 : clampPts(7 + (hasTarget ? 3 : 0) + (hasHow ? 5 : 0), 15);
    const sdgNote =
        sdgState === "none"
            ? 'Honest "no SDG applies" — respected, flagged for review'
            : sdgState === "forced"
              ? "SDG named without target or explanation — reads decorative"
              : `Genuine link${hasTarget ? " + target" : ""}${hasHow ? " + explained" : ""}`;

    // ---- 6 · Completeness & connection ----
    const repoPts = (entry.deliverables || []).some((d) => d.label === "Full thesis (PDF)") ? 1 : 0;
    const linkedPts = normalizeFypTeamMembers(pi.teamMembers).some((m) => m.name?.trim()) ? 1 : 0;
    const confPts = entry.status === "submitted" ? 1 : 0;
    const blkPts = route === "scholar" ? 0 : Math.min(2, blockFieldsFilledForRoute(route, rd));
    const connPts = clampPts(repoPts * 4 + linkedPts * 3 + confPts * 4 + blkPts * 2, 15);
    const connNote = `${repoPts ? "Repository ✓" : "No repository"}${linkedPts ? " · co-authors linked ✓" : ""}${confPts ? " · sent for supervisor sign-off ✓" : " · not yet submitted"}${blkPts === 2 ? " · route block complete ✓" : blkPts === 1 ? " · route block partial" : ""}`;

    const criteria: FypMeritCriterionResult[] = [
        { ...FYP_MERIT_RUBRIC[0], points: purposePts, note: purposeNote },
        { ...FYP_MERIT_RUBRIC[1], points: rigorPts, note: rigorNote },
        { ...FYP_MERIT_RUBRIC[2], points: outcomePts, note: outcomeNote },
        { ...FYP_MERIT_RUBRIC[3], points: honestyPtsClamped, note: honestyNote },
        { ...FYP_MERIT_RUBRIC[4], points: sdgPts, note: sdgNote },
        { ...FYP_MERIT_RUBRIC[5], points: connPts, note: connNote },
    ];
    const total = Math.round(criteria.reduce((s, c) => s + c.points, 0));
    const [grade, gradeColor] = fypMeritGrade(total);

    return { route, criteria, total, grade, gradeColor, consistency };
}

function blockFieldsFilledForRoute(route: FypRoute, rd: NonNullable<FypEntry["routeDetails"]>): number {
    if (route === "maker") return [rd.showMonth, rd.piecesShown, rd.juryExaminer].filter(Boolean).length >= 2 ? 2 : [rd.showMonth, rd.piecesShown, rd.juryExaminer].some(Boolean) ? 1 : 0;
    if (route === "builder") return [rd.buildStatus, rd.testersCount, rd.iterationsCount].filter(Boolean).length >= 2 ? 2 : [rd.buildStatus, rd.testersCount, rd.iterationsCount].some(Boolean) ? 1 : 0;
    if (route === "storyteller") return [rd.screeningMonth, rd.audienceReached, rd.runtimeFormat].filter(Boolean).length >= 2 ? 2 : [rd.screeningMonth, rd.audienceReached, rd.runtimeFormat].some(Boolean) ? 1 : 0;
    if (route === "consultant") return [rd.clientOrg, rd.engagementBasis, rd.recommendationStatus].filter(Boolean).length >= 2 ? 2 : [rd.clientOrg, rd.engagementBasis, rd.recommendationStatus].some(Boolean) ? 1 : 0;
    return 0;
}

/** Why the top-ranked entries lead — derived from their own highest-scoring criteria, not a canned line. */
export function whyFypLeads(sc: FypMeritScorecard): string {
    const ranked = [...sc.criteria].sort((a, b) => b.points / b.max - a.points / a.max);
    const top = ranked.slice(0, 2).map((c) => c.label.replace(/^\d+ · /, "").toLowerCase());
    return `Leads on ${top.join(" and ")} — ${sc.consistency.ok ? "claims match its declared evidence" : "though see the consistency flag below"}.`;
}
