// Frontend twin of ciel_backend/src/paths/merit-model/venture-merit-model.util.ts — same 7-criterion,
// 100-pt rubric, used as a fallback/preview scorer before (or when) the backend's real scores load.

export interface VentureMeritEntry {
    id?: string;
    ventureName?: string | null;
    stage?: string | null;
    tractionRows?: { date?: string; metric?: string; value?: string; note?: string }[] | null;
    evidenceInfo?: {
        customers?: number; revenueToDate?: number; pilotPartners?: number;
        testers?: number; lettersOfIntent?: number; preOrders?: number;
    } | null;
    ideaInfo?: { problem?: string; proofFact?: string; payerWho?: string; userWho?: string } | null;
    solutionInfo?: { advantage?: string; alternative?: string; marketWho?: string; marketSize?: string; marketSource?: string } | null;
    team?: { inviteStatus?: "pending" | "accepted" }[] | null;
    sdgMapping?: { entries?: unknown[]; howImpact?: string; indicators?: { indicator?: string; forGoal?: string; target12mo?: string; verifiedBy?: string }[] } | null;
    documents?: { type?: string }[] | null;
    teamConsent?: { consented?: boolean }[] | null;
    reviewPipeline?: { declarationWork?: boolean; declarationConsent?: boolean; supervisorStatus?: string | null } | null;
    academicSetup?: { ethicsApproval?: string; ipOwnership?: string } | null;
}

export interface VentureMeritCriterionScore { key: keyof VentureMeritScorecardCriteria; label: string; points: number; max: number; note: string; color: string }
interface VentureMeritScorecardCriteria { traction: unknown; market: unknown; problem: unknown; team: unknown; sdg: unknown; evidence: unknown; governance: unknown }
export interface VentureMeritScorecard { criteria: VentureMeritCriterionScore[]; total: number; grade: string; gradeColor: string; eligible: boolean }

export const VENTURE_MERIT_RUBRIC: { key: VentureMeritCriterionScore["key"]; label: string; max: number; color: string; description: string }[] = [
    { key: "traction", label: "1 · Traction & evidence of demand", max: 25, color: "#0f766e", description: "Logged traction entries plus real demand signals — customers, revenue, pilots, testers, letters of intent, pre-orders." },
    { key: "market", label: "2 · Market understanding & sizing rigor", max: 15, color: "#2563eb", description: "Who the market is, how big, and a credible (not guessed) source." },
    { key: "problem", label: "3 · Problem / solution clarity", max: 15, color: "#c98a04", description: "Problem, proof, payer, user, advantage and alternative all clearly stated." },
    { key: "team", label: "4 · Team strength", max: 10, color: "#7c3aed", description: "Headcount plus the fraction of teammates who accepted their invite." },
    { key: "sdg", label: "5 · SDG / impact rigor", max: 15, color: "#3F7E44", description: "SDGs mapped, indicators verifiable, impact narrative present." },
    { key: "evidence", label: "6 · Evidence & documentation", max: 10, color: "#db2777", description: "Supporting documents on file, ideally a full business plan." },
    { key: "governance", label: "7 · Governance / consent completeness", max: 10, color: "#dc2626", description: "Team consent, declarations, ethics approval and IP ownership all on record." },
];

export const VENTURE_MERIT_NEUTRALITY_NOTE =
    "The same rubric scores every venture, every stage, every sector — no bonus for a slicker deck. Filters change the pool, never the maths.";

const GRADE_BANDS: [number, string, string][] = [
    [85, "EXEMPLARY", "#16a34a"],
    [70, "STRONG", "#0f766e"],
    [55, "DEVELOPING", "#c98a04"],
];
export function ventureMeritGrade(total: number): [string, string] {
    for (const [min, label, color] of GRADE_BANDS) {
        if (total >= min) return [label, color];
    }
    return ["EMERGING", "#7a8095"];
}

const nonEmpty = (text?: string | null) => !!text?.trim();

/** Mirrors ciel_backend's scoreVenture() exactly — a deterministic function of already-stored data. */
export function computeVentureMeritScorecard(entry: VentureMeritEntry): VentureMeritScorecard {
    const traction = entry.tractionRows ?? [];
    const evidence = entry.evidenceInfo;
    const idea = entry.ideaInfo;
    const solution = entry.solutionInfo;
    const team = entry.team ?? [];
    const sdg = entry.sdgMapping;
    const documents = entry.documents ?? [];
    const consent = entry.teamConsent ?? [];
    const pipeline = entry.reviewPipeline;
    const academic = entry.academicSetup;

    const rowCount = traction.length;
    const rowPts = rowCount >= 6 ? 20 : rowCount >= 3 ? 15 : rowCount >= 1 ? 8 : 0;
    const demandSignals = [
        evidence?.customers, evidence?.revenueToDate, evidence?.pilotPartners,
        evidence?.testers, evidence?.lettersOfIntent, evidence?.preOrders,
    ].filter((v) => typeof v === "number" && v > 0).length;
    const tractionPts = Math.min(25, rowPts + Math.min(5, demandSignals));
    const tractionNote = rowCount ? `${rowCount} traction entr${rowCount === 1 ? "y" : "ies"} · ${demandSignals} demand signal${demandSignals === 1 ? "" : "s"}` : "No traction recorded yet";

    const marketPts =
        (nonEmpty(solution?.marketWho) ? 5 : 0) +
        (nonEmpty(solution?.marketSize) ? 5 : 0) +
        (solution?.marketSource && solution.marketSource !== "Educated guess — needs checking" ? 5 : 0);
    const marketNote = marketPts >= 15 ? "Market sized with a credible source" : marketPts > 0 ? "Market sizing partially evidenced" : "Market sizing not yet provided";

    const problemPts =
        (nonEmpty(idea?.problem) ? 3 : 0) +
        (nonEmpty(idea?.proofFact) ? 3 : 0) +
        (nonEmpty(idea?.payerWho) ? 2 : 0) +
        (nonEmpty(idea?.userWho) ? 2 : 0) +
        (nonEmpty(solution?.advantage) ? 3 : 0) +
        (nonEmpty(solution?.alternative) ? 2 : 0);
    const problemNote = problemPts >= 12 ? "Problem, proof and advantage all clearly stated" : problemPts > 0 ? "Problem/solution partially articulated" : "Problem/solution not yet described";

    const teamSize = team.length;
    const teamBasePts = teamSize >= 4 ? 8 : teamSize >= 2 ? 6 : teamSize >= 1 ? 3 : 0;
    const acceptedFraction = teamSize ? team.filter((m) => m.inviteStatus === "accepted").length / teamSize : 0;
    const teamPts = Math.min(10, teamBasePts + Math.round(acceptedFraction * 2));
    const teamNote = teamSize ? `${teamSize} team member${teamSize === 1 ? "" : "s"}` : "No team members added";

    const sdgEntries = sdg?.entries ?? [];
    const indicators = sdg?.indicators ?? [];
    const filledIndicators = indicators.filter((i) => i.indicator && i.forGoal && i.target12mo && i.verifiedBy).length;
    const sdgPts = (sdgEntries.length ? 5 : 0) + Math.min(5, filledIndicators * 3) + (nonEmpty(sdg?.howImpact) ? 5 : 0);
    const sdgNote = sdgEntries.length ? `${sdgEntries.length} SDG${sdgEntries.length === 1 ? "" : "s"} mapped · ${filledIndicators} verifiable indicator${filledIndicators === 1 ? "" : "s"}` : "No SDG mapping yet";

    const hasBusinessPlan = documents.some((d) => d.type === "Full business plan");
    const evidencePts = (documents.length ? 5 : 0) + (hasBusinessPlan ? 5 : 0);
    const evidenceNote = hasBusinessPlan ? "Full business plan on file" : documents.length ? "Some supporting documents, no full business plan" : "No supporting documents yet";

    const consentOk = !consent.length || consent.every((c) => c.consented);
    const governancePts =
        (consentOk ? 4 : 0) +
        (pipeline?.declarationWork && pipeline?.declarationConsent ? 3 : 0) +
        (nonEmpty(academic?.ethicsApproval) && nonEmpty(academic?.ipOwnership) ? 3 : 0);
    const governanceNote = governancePts >= 7 ? "Declarations and consent complete" : governancePts > 0 ? "Governance partially complete" : "Declarations/consent not yet complete";

    const total = tractionPts + marketPts + problemPts + teamPts + sdgPts + evidencePts + governancePts;
    const [grade, gradeColor] = ventureMeritGrade(total);
    const eligible = entry.reviewPipeline?.supervisorStatus === "approved";

    const byKey: Record<VentureMeritCriterionScore["key"], { points: number; note: string }> = {
        traction: { points: tractionPts, note: tractionNote },
        market: { points: marketPts, note: marketNote },
        problem: { points: problemPts, note: problemNote },
        team: { points: teamPts, note: teamNote },
        sdg: { points: sdgPts, note: sdgNote },
        evidence: { points: evidencePts, note: evidenceNote },
        governance: { points: governancePts, note: governanceNote },
    };
    const criteria = VENTURE_MERIT_RUBRIC.map((r) => ({ key: r.key, label: r.label, max: r.max, color: r.color, ...byKey[r.key] }));

    return { criteria, total, grade, gradeColor, eligible };
}
