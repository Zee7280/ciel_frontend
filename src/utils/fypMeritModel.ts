// Deterministic, rule-based scoring engine for FYP / Thesis flash cards — the "CIEL FYP Merit Model".
// Same spirit as courseworkMeritModel.ts: every point is computed from the student's own declared
// wizard fields, so a score is always explainable and reproducible (no AI call, no run-to-run
// variance) — but rigor and evidence are judged INSIDE the project's own route (scholar/maker/
// builder/storyteller/consultant), so a degree-show collection isn't measured like a lab thesis.

import { type FypEntry, fypRouteFor, normalizeFypTeamMembers, type FypRoute } from "./fypTypes";

export interface FypMeritRubricCriterion {
    key: "purpose" | "rigor" | "outcome" | "honesty" | "sdg" | "pot" | "conn";
    label: string;
    max: number;
    color: string;
    description: string;
}

/** The public rubric — shown to students before they write, faculty/university while they review. */
export const FYP_MERIT_RUBRIC: FypMeritRubricCriterion[] = [
    { key: "purpose", label: "1 · Purpose & originality", max: 15, color: "#2563eb", description: "A question anyone can grasp, concrete objectives — and the freshness of the idea itself: genuinely new angle > fresh take > incremental." },
    { key: "rigor", label: "2 · Rigor of process — route-adjusted", max: 15, color: "#0f766e", description: "Methods appropriate to the declared route + scale & period stated. Practice-based inquiry counts equal to a lab experiment." },
    { key: "outcome", label: "3 · Substance of outcome", max: 20, color: "#c98a04", description: "Findings or demonstrations present; the documented work itself counts as evidence for studio & media routes. Honesty never scores zero." },
    { key: "honesty", label: "4 · Scholarly honesty", max: 15, color: "#dc2626", description: "Limitation named with its effect, declared scope, a tested assumption, claims consistent with evidence." },
    { key: "sdg", label: "5 · SDG authenticity", max: 15, color: "#3F7E44", description: "A genuine link with target + explanation — or an honest \"no SDG applies,\" which scores respectably. Never punished for honesty." },
    { key: "pot", label: "6 · Potential & continuation", max: 10, color: "#db2777", description: "Forward motion the record can prove: a declared next step, external engagement (jury, client, industry, community), evidence strong enough to build on." },
    { key: "conn", label: "7 · Completeness & connection", max: 10, color: "#7c3aed", description: "Thesis in repository, co-authors linked by email, supervisor named, route block filled." },
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

/** Evidence tiers strong enough to build on, for the Potential criterion's bonus. */
const STRONG_EVIDENCE = new Set(["Measured / tested result", "The work itself is the evidence"]);

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
    /** Supervisor approval is the one hard requirement — matches the backend's eligibility gate
     * (supervisorApprovalStatus === "approved") exactly. Still scored for feedback either way, but
     * excluded from AI picks / showcase until approved. No loopholes. */
    eligible: boolean;
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

/** Computes the seven-criterion scorecard for one FYP entry, deterministically, from its own wizard fields. */
export function computeFypMeritScorecard(entry: FypEntry): FypMeritScorecard {
    const pi = entry.projectInfo || {};
    const bg = entry.background || {};
    const oi = entry.objectivesInfo || {};
    const meth = entry.methodology || {};
    const find = entry.findings || {};
    const sm = entry.sdgMapping || {};
    const rf = entry.reflectionInfo || {};
    const rd = entry.routeDetails || {};
    const route = fypRouteFor(pi.projectType);

    // ---- 1 · Purpose & originality ----
    const aimText = oi.aim || "";
    const aimPts = aimText.trim().length > 12 ? 2 : aimText.trim() ? 1 : 0;
    const objsCount = (oi.objectives || []).filter((o) => o.trim()).length;
    // Originality has no dedicated wizard field — a genuinely under-explored gap or a
    // newly-possible fix is the closest honest, student-declared signal we have for it.
    const novSignal = (bg.whyUrgent || []).some((w) => /long-ignored gap|new tech makes/i.test(w));
    const novPts = novSignal ? 2 : aimText.trim() ? 1 : 0;
    const purposePts = clampPts(aimPts * 4 + Math.min(objsCount, 3) * 1.2 + novPts * 2.6, 15);
    const purposeNote = `${novPts === 2 ? "A genuinely fresh angle — " : novPts === 1 ? "A solid take — " : "An incremental take — "}${aimPts === 2 ? "purpose anyone can understand, concrete objectives" : "purpose loosely framed"}`;

    // ---- 2 · Rigor of process (route-adjusted) ----
    const approachesFilled = (meth.approaches || []).length > 0;
    const methodsFilled = (meth.methods || []).length > 0;
    const fitPts = approachesFilled && methodsFilled ? 2 : approachesFilled || methodsFilled ? 1 : 0;
    const scalePts = meth.sampleScale?.trim() ? 1 : 0;
    const periodPts = meth.periodFrom || meth.periodTo ? 1 : 0;
    const rigorPts = clampPts(fitPts * 5.5 + scalePts * 2 + periodPts * 2, 15);
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
    // Prefer the structured metrics[] array; fall back to the deprecated flat fields for older records.
    const hasMeasuredMetric =
        (find.metrics || []).some((m) => m.status === "Measured" && m.value?.trim()) ||
        (!!find.metricValue?.trim() && find.numberRepresents === "Measured result");
    let consistency: FypMeritConsistencyFlag = { ok: true, message: "Consistency: claims match declared evidence." };
    const blockFieldsFilled = [rd.showMonth, rd.piecesShown, rd.juryExaminer].filter(Boolean).length;
    if (evidenceStatus === "Measured / tested result" && !hasMeasuredMetric) {
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

    // ---- 6 · Potential & continuation ----
    const fwdPts = rf.whatsNext && rf.whatsNext !== "It ends here — and that's okay" ? 1 : 0;
    // No dedicated field for "external engagement" either — a co-supervisor, jury/examiner, or
    // named client are the concrete, student-declared traces of a real outside party being involved.
    const extPts = !!(pi.coSupervisorName?.trim() || rd.juryExaminer?.trim() || rd.clientOrg?.trim() || rd.engagementBasis) ? 1 : 0;
    const evidenceBonus = STRONG_EVIDENCE.has(evidenceStatus) ? 3 : evidenceStatus === "Qualitative evidence" ? 2 : 1;
    const potPts = clampPts(fwdPts * 3 + extPts * 4 + evidenceBonus, 10);
    const potNote = `${fwdPts ? "Next step declared" : "No next step declared"}${extPts ? " · external engagement (jury / client / industry) ✓" : ""}${STRONG_EVIDENCE.has(evidenceStatus) ? " · evidence strong enough to build on" : ""}`;

    // ---- 7 · Completeness & connection ----
    const repoPts = (entry.deliverables || []).some((d) => d.label === "Full thesis (PDF)") ? 1 : 0;
    const linkedPts = normalizeFypTeamMembers(pi.teamMembers).some((m) => m.name?.trim()) ? 1 : 0;
    const confPts = entry.supervisorApprovalStatus === "approved" ? 1 : 0;
    const blkPts = route === "scholar" ? (rd.discussion || rd.conclusion ? 2 : 0) : Math.min(2, blockFieldsFilledForRoute(route, rd));
    const connPts = clampPts(repoPts * 3 + linkedPts * 2 + confPts * 3 + blkPts * 1, 10);
    const connNote = `${repoPts ? "Repository ✓" : "No repository"}${linkedPts ? " · co-authors linked ✓" : ""}${confPts ? " · supervisor confirmed ✓" : " · awaiting supervisor"}${blkPts === 2 ? " · route block complete ✓" : blkPts === 1 ? " · route block partial" : ""}`;

    const critFor = (key: FypMeritRubricCriterion["key"]) => FYP_MERIT_RUBRIC.find((c) => c.key === key)!;
    const criteria: FypMeritCriterionResult[] = [
        { ...critFor("purpose"), points: purposePts, note: purposeNote },
        { ...critFor("rigor"), points: rigorPts, note: rigorNote },
        { ...critFor("outcome"), points: outcomePts, note: outcomeNote },
        { ...critFor("honesty"), points: honestyPtsClamped, note: honestyNote },
        { ...critFor("sdg"), points: sdgPts, note: sdgNote },
        { ...critFor("pot"), points: potPts, note: potNote },
        { ...critFor("conn"), points: connPts, note: connNote },
    ];
    const total = Math.round(criteria.reduce((s, c) => s + c.points, 0));
    const [grade, gradeColor] = fypMeritGrade(total);
    // Supervisor approval is the one hard requirement — mirrors the backend's eligibility gate exactly.
    const eligible = entry.supervisorApprovalStatus === "approved";

    return { route, criteria, total, grade, gradeColor, consistency, eligible };
}

function blockFieldsFilledForRoute(route: FypRoute, rd: NonNullable<FypEntry["routeDetails"]>): number {
    if (route === "maker") return [rd.showMonth, rd.piecesShown, rd.juryExaminer].filter(Boolean).length >= 2 ? 2 : [rd.showMonth, rd.piecesShown, rd.juryExaminer].some(Boolean) ? 1 : 0;
    if (route === "builder") return [rd.buildStatus, rd.testersCount, rd.iterationsCount].filter(Boolean).length >= 2 ? 2 : [rd.buildStatus, rd.testersCount, rd.iterationsCount].some(Boolean) ? 1 : 0;
    if (route === "storyteller") return [rd.screeningMonth, rd.audienceReached, rd.runtimeFormat].filter(Boolean).length >= 2 ? 2 : [rd.screeningMonth, rd.audienceReached, rd.runtimeFormat].some(Boolean) ? 1 : 0;
    if (route === "consultant") return [rd.clientOrg, rd.engagementBasis, rd.recommendationStatus].filter(Boolean).length >= 2 ? 2 : [rd.clientOrg, rd.engagementBasis, rd.recommendationStatus].some(Boolean) ? 1 : 0;
    return 0;
}

const CRITERION_PHRASE: Record<FypMeritRubricCriterion["key"], (entry: FypEntry, sc: FypMeritScorecard) => string> = {
    outcome: (entry) => {
        const evs = entry.findings?.evidenceStatus || "Not applicable";
        const fnd = (entry.findings?.findings || []).filter((f) => f.trim()).length;
        if (evs === "Measured / tested result") return `its results are proven, not promised — ${fnd} finding${fnd === 1 ? "" : "s"} backed by tested evidence`;
        if (evs === "The work itself is the evidence") return "the finished work stands as its own evidence — fully documented";
        return `its outcomes are substantive and honestly classified as ${evs.toLowerCase()}`;
    },
    purpose: (entry, sc) => {
        const purpose = sc.criteria.find((c) => c.key === "purpose")!;
        return purpose.note.startsWith("A genuinely fresh angle")
            ? "the idea itself is genuinely fresh — an under-explored angle in this cohort"
            : "its purpose is sharply framed, with concrete objectives anyone can follow";
    },
    sdg: (entry, sc) => {
        const sdg = sc.criteria.find((c) => c.key === "sdg")!;
        return sdg.note.startsWith('Honest "no SDG')
            ? 'it declares "no SDG applies" honestly rather than decorating — integrity the rubric rewards'
            : "its sustainability link is argued, targeted and verified — not a badge, a claim with evidence";
    },
    honesty: () => "it shows rare scholarly honesty: limits and scope declared, an assumption openly tested",
    rigor: (entry, sc) => `its method discipline is true to the ${ROUTE_LABEL[sc.route]} route — right tools, stated scale, declared period`,
    pot: (entry, sc) => {
        const pot = sc.criteria.find((c) => c.key === "pot")!;
        return pot.note.includes("external engagement")
            ? "it already has forward motion — external partners (jury, client or industry) are engaged, not hypothetical"
            : "it names a realistic next step and its evidence is strong enough to build on";
    },
    conn: () => "the record is complete and fully connected — repository, co-authors, supervisor, route details",
};

/** Why the top-ranked entries lead — two-part reasoning (why picked + value to CIEL), derived
 * from the entry's own top-scoring criteria, not a canned line. */
export function whyFypLeads(entry: FypEntry, sc: FypMeritScorecard): string {
    const ranked = [...sc.criteria].sort((a, b) => b.points / b.max - a.points / a.max);
    const first = CRITERION_PHRASE[ranked[0].key](entry, sc);
    const second = CRITERION_PHRASE[ranked[1].key](entry, sc);
    const pot = sc.criteria.find((c) => c.key === "pot")!;
    const purpose = sc.criteria.find((c) => c.key === "purpose")!;
    const sdg = sc.criteria.find((c) => c.key === "sdg")!;
    const value = pot.note.includes("external engagement")
        ? `Bridges the university to ${sc.route === "consultant" ? "industry" : "real partners"} — exactly the showcase story that makes CIEL credible to employers and funders.`
        : purpose.note.startsWith("A genuinely fresh")
          ? "A repository first: future cohorts will cite this record instead of starting from zero — compounding value for the platform."
          : !sdg.note.startsWith('Honest "no SDG')
            ? "A verified SDG datapoint the university can cite to HEC and rankings — the currency CIEL trades in."
            : `An honest benchmark for its route — the kind of baseline record that keeps the whole ranking trustworthy.`;
    return `Why picked: Above all, ${first}. It backs this with a second strength: ${second}. Value to CIEL: ${value}`;
}

const NEXT_COURSE_BY_ROUTE: Record<FypRoute, string> = {
    scholar: "publication or a funded master's continuation",
    maker: "exhibition circuit, industry commissions, or production at scale",
    builder: "deployment pilot — a natural Enterprise Path continuation",
    storyteller: "festival circuit and public-broadcast licensing",
    consultant: "client implementation and a case-study publication",
};

/** A one-line "most likely future course" for a top-of-cohort pick, based on route + evidence quality. */
export function fypPotential(entry: FypEntry, sc: FypMeritScorecard): string {
    const evs = entry.findings?.evidenceStatus || "Not applicable";
    const base =
        evs === "Measured / tested result" ? "proven at thesis scale"
        : evs === "The work itself is the evidence" ? "a finished, documented body of work"
        : evs === "Qualitative evidence" ? "documented change ready for a measured follow-up"
        : evs === "Estimated / projected" ? "a credible projection awaiting a real-world pilot"
        : "early-stage — one pilot from evidence";
    return `${base} — most likely future course: ${NEXT_COURSE_BY_ROUTE[sc.route]}.`;
}
