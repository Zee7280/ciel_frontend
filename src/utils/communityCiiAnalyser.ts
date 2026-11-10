/**
 * Composite Impact Index (CII) v4.5 — client-side twin of
 * `ciel_backend/src/reports/cii-v4-5.constants.ts`. Static tables + types only (dimension/
 * criteria definitions, badge bands, anchor factors) — the actual score is always computed
 * server-side and delivered on `report.ciiV45` / `report.ciiV45Lock`. The AI never returns a
 * numeric score or badge — only per-criterion anchors, claims, evidence audit and narrative
 * text; all arithmetic/bands/gates are server-owned. Keep in sync with the backend file.
 */

// --- Shared literal types (mirrors cii-v4-5.constants.ts) ---

export type CiiV45Anchor = 0 | 1 | 2 | 3 | 4 | "P";

export type CiiV45VerificationStatus =
    | "VERIFIED"
    | "SYSTEM_VERIFIED"
    | "AI_REPORT"
    | "ADMIN_VERIFIED"
    | "NARRATIVE_ONLY"
    | "PROCESSING_REQUIRED"
    | "NOT_APPLICABLE"
    | "CONTRADICTED";

export type CiiV45ProcessingStatus =
    | "INSPECTED"
    | "UNREADABLE"
    | "CORRUPTED"
    | "CONVERSION_FAILED"
    | "INACCESSIBLE"
    | "DUPLICATE";

export type CiiV45SupportStatus =
    | "SUPPORTED"
    | "PARTIALLY_SUPPORTED"
    | "UNSUPPORTED"
    | "CONTRADICTED"
    | "PROCESSING_REQUIRED";

export type CiiV45Privacy = "PUBLIC" | "RESTRICTED" | "PRIVATE";

export type CiiV45Dimension = "1" | "2" | "3" | "4A" | "4B" | "5" | "6" | "7" | "8" | "9";

export type CiiV45UpliftCategory = "effort" | "resources" | "partnerships" | "outcomes";

export type CiiV45ScoreStatus = "RESUBMISSION_REQUIRED" | "ADMIN_REVIEW_REQUIRED" | "ADMIN_EVIDENCE_REQUIRED" | "FINAL";

// --- Evaluator payload / result shapes (mirrors backend CiiV45* interfaces) ---

export interface CiiV45CriterionScore {
    criterion: string;
    anchor: CiiV45Anchor;
    qualityAnchor: CiiV45Anchor;
    verificationStatus: CiiV45VerificationStatus;
    sourceRefs: string[];
    evidenceIds: string[];
    reasoningSummary: string;
    deductionReason?: string | null;
}

export interface CiiV45SectionScore {
    dimension: CiiV45Dimension;
    criterionScores: CiiV45CriterionScore[];
}

export interface CiiV45IndividualHours {
    studentId: string;
    hours: number | null;
    requiredHours: number;
    verified: boolean;
    recordComplete?: boolean;
}

export interface CiiV45Gap {
    type: string;
    material: boolean;
    mandatory?: boolean;
    field?: string;
}

export interface CiiV45InputCompleteness {
    gaps: CiiV45Gap[];
    individualHours: CiiV45IndividualHours[];
    mandatoryFieldsComplete: boolean;
}

export interface CiiV45Claim {
    claimId: string;
    text?: string;
    material: boolean;
    evidenceIds: string[];
    supportStatus: CiiV45SupportStatus;
}

export interface CiiV45EvidenceAudit {
    evidenceId: string;
    fileName?: string;
    fileType?: string;
    privacy: CiiV45Privacy;
    material: boolean;
    processingStatus: CiiV45ProcessingStatus;
    claimIds: string[];
    actualContentSummary?: string;
    matchConfidence?: number | null;
    supportStatus: CiiV45SupportStatus;
    evidenceStrength?: string;
    independence?: string;
    explanation?: string;
}

export interface CiiV45UpliftItem {
    category: CiiV45UpliftCategory;
    points: number;
    studentId?: string;
    beyondBaseJustification?: string;
    evidenceIds?: string[];
    adminVerified?: boolean;
}

export interface CiiV45ExtraMileUplift {
    assessmentStatus: "ASSESSED" | "PROCESSING_REQUIRED" | "PENDING_ADMIN";
    items: CiiV45UpliftItem[];
    total?: number | null;
    knownTotal?: number;
}

export interface CiiV45IntegrityIssue {
    origin: "STUDENT";
    confirmed: boolean;
    claimId?: string;
    evidenceIds: string[];
    reason: string;
    adminVerified?: boolean;
}

export interface CiiV45IntegrityPenalty {
    points: number;
    issues: CiiV45IntegrityIssue[];
}

export interface CiiV45ExceptionalFeature {
    verified: boolean;
    explanation?: string;
    evidenceIds?: string[];
    adminVerified?: boolean;
}

export interface CiiV45AdminEvidenceAssessment {
    status: "PENDING" | "ASSESSED";
    assessorId?: string;
    assessedAt?: string;
    criteria?: Array<{
        criterion: string;
        anchor: Exclude<CiiV45Anchor, "P">;
        reasoningSummary: string;
        evidenceIds: string[];
    }>;
}

export type CiiV45DeductionLedgerEntry = Record<string, unknown>;

/** Shape the AI actually returns — anchors/claims/evidence/narrative only, no score fields. */
export interface CiiV45EvaluatorPayload {
    frameworkVersion: "4.5" | "5.0";
    reportId: string;
    inputFingerprint: string;
    inputCompleteness: CiiV45InputCompleteness;
    claimInventory: CiiV45Claim[];
    evidenceAudit: CiiV45EvidenceAudit[];
    sectionScores: CiiV45SectionScore[];
    deductionLedger: CiiV45DeductionLedgerEntry[];
    extraMileUplift: CiiV45ExtraMileUplift;
    integrityPenalty: CiiV45IntegrityPenalty;
    exceptionalFeature: CiiV45ExceptionalFeature | null;
    adminReviewReasons: string[];
    strengths: string[];
    developmentPriorities: string[];
    analysisSummary: string;
    evidenceSummary: string;
    studentFeedback: string;
    sectionAnalyses?: Array<{
        dimension: Exclude<CiiV45Dimension, "7">;
        summary: string;
        strengths: string[];
        limitations: string[];
        adminFlags: string[];
    }>;
}

export interface CiiV45Band {
    level: number;
    min: number;
    max: number;
    name: string;
    assetKey: string;
}

export interface CiiV45Badge extends CiiV45Band {
    code: string;
    numericLevel: number;
    gateCapped: boolean;
}

export interface CiiV45CriterionResult extends CiiV45CriterionScore {
    maximumPoints: number;
    score: number | null;
    /** R3: the mark the AI anchor earns, kept as the baseline when an Admin edit replaces `score`. */
    aiScore?: number | null;
    /** R3: true when `score` is an Admin-reviewed mark. */
    adminEdited?: boolean;
    adminEdit?: { reason: string; sourceRef?: string | null; actorId: string; at: string };
}

/** R3 Admin review of AI criterion marks (stored on the analysis; absent on a fresh AI run). */
export interface CiiV45AdminModeration {
    revision: number;
    edits: Record<string, { points: number; reason: string; sourceRef?: string | null; actorId: string; at: string }>;
    log: Array<{
        dimension: string;
        criterion: string;
        from: number | null;
        to: number | null;
        aiScore: number | null;
        reason: string;
        sourceRef?: string | null;
        actorId: string;
        at: string;
    }>;
}

/** The Admin's sourced confirmations behind a published L6 (sustained impact). */
export interface CiiV45L6Confirmations {
    observedRetention: boolean;
    communityOwnership: boolean;
    externalCorroboration: boolean;
    sourceRef: string;
    confirmedByAdminId?: string;
    confirmedAt?: string;
}

export type CiiV45L6Status = "NOT_REQUIRED" | "PENDING_QUALIFICATION" | "QUALIFIED";

export interface CiiV45L6Assessment {
    status: CiiV45L6Status;
    reasons: string[];
    minimums: { cii: number; measuredChange: number; sustainability: number; manualEvidence: number };
}

export type CiiV45BadgeStatus = "AWARDED" | "L6_PENDING_QUALIFICATION";

export interface CiiV45SectionResult {
    dimension: CiiV45Dimension;
    name: string;
    maximumPoints: number;
    criterionScores: CiiV45CriterionResult[];
    /** null if any criterion in this dimension is pending ('P'). */
    score: number | null;
    /** Sum of known (non-pending) criteria, even when `score` is null. */
    knownPoints: number;
}

export interface CiiV45Result extends Omit<CiiV45EvaluatorPayload, "sectionScores" | "extraMileUplift"> {
    sectionScores: CiiV45SectionResult[];
    knownBasePoints: number;
    aiReportScore?: number | null;
    adminEvidenceScore?: number | null;
    baseCII: number | null;
    extraMileUplift: CiiV45ExtraMileUplift;
    adminEvidenceAssessment?: CiiV45AdminEvidenceAssessment;
    diagnosticCII: number | null;
    scoreStatus: CiiV45ScoreStatus;
    needsAdminReview: boolean;
    finalCII: number | null;
    recommendedBadge: CiiV45Badge | null;
    diagnosticBadge: CiiV45Badge | null;
    finalBadge: CiiV45Badge | null;
    qualityGates: { L4: boolean; L5: boolean; L6: boolean };
    publicationEligible: boolean;
    /** Rubric the analysis was scored under (R3 current; R2/R1 on older analyses; absent before R2). */
    rubricVersion?: string;
    /** R3: the band the CII lands in, whether or not it is awarded yet. */
    candidateBadge?: CiiV45Badge | null;
    badgeStatus?: CiiV45BadgeStatus | null;
    l6Assessment?: CiiV45L6Assessment;
    l6Qualification?: CiiV45L6Confirmations;
    /** R3: the AI's own total before any Admin criterion edit (null while a criterion is pending). */
    aiProposalScore?: number | null;
    moderated?: boolean;
    adminModeration?: CiiV45AdminModeration;
    rounding: string;
    evidenceInspection?: { inspected: unknown[]; notInspected: unknown[] } | null;
    computedAt?: string;
    runHistory?: Array<{
        score: number | null;
        status: CiiV45ScoreStatus;
        at: string;
        model?: string | null;
        inspectedImages?: number;
        notInspectedFiles?: number;
    }>;
}

/** Admin Accept & Publish decision for the CII v4.5 score — immutable once locked. */
export interface CiiV45Lock {
    locked: boolean;
    hash: string;
    lockedAt: string;
    lockedByAdminId: string;
    adminNote?: string;
    inputFingerprint: string;
    scoreStatusAtLock: "FINAL";
    aiRecommendedScore?: number;
    adminApprovedScore?: number;
    scoreWasModerated?: boolean;
    scoreModerationReason?: string;
    finalBadge?: CiiV45Badge | null;
    /** R3 fields (absent on pre-R3 locks). */
    rubricVersion?: string;
    candidateBadge?: CiiV45Badge | null;
    badgeStatus?: CiiV45BadgeStatus | null;
    l6Qualification?: CiiV45L6Confirmations | null;
}

// --- Fixed dimensions / criteria / weights (base 100) ---

export interface CiiV45CriterionDef {
    key: string;
    weight: number;
    /** Short, plain-English display label — not the full rubric prose. */
    label: string;
}

export interface CiiV45DimensionDef {
    id: CiiV45Dimension;
    name: string;
    maxPoints: number;
    criteria: CiiV45CriterionDef[];
}

/** Fixed dimensions/criteria/weights — base 100 (rubric R3: 38 AI criteria + 7 Admin criteria). Criterion IDs are exact and immutable. */
export const CII_V45_DIMENSIONS: CiiV45DimensionDef[] = [
    {
        id: "1",
        name: "Participation & Individual Effort",
        maxPoints: 10,
        criteria: [
            { key: "hoursRequirement", weight: 4, label: "Individual hours requirement" },
            { key: "attendanceValidity", weight: 2, label: "Attendance validity & traceability" },
            { key: "contributionAgency", weight: 2, label: "Individual contribution & agency" },
            { key: "participationAccount", weight: 2, label: "Meaningful participation account" },
        ],
    },
    {
        id: "2",
        name: "Community Need & Starting Point",
        maxPoints: 10,
        criteria: [
            { key: "needAndVoice", weight: 3, label: "Community-defined need & voice" },
            { key: "startingPosition", weight: 2, label: "Starting position & target population" },
            { key: "objectivesPathway", weight: 3, label: "Objectives & change pathway" },
            { key: "inclusionSafeguarding", weight: 2, label: "Inclusion & safeguarding" },
        ],
    },
    {
        id: "3",
        name: "SDG Contribution",
        maxPoints: 5,
        criteria: [
            { key: "sdgConnection", weight: 2, label: "Substantive SDG connection" },
            { key: "outcomeLinkedContribution", weight: 2, label: "Outcome-linked contribution" },
            { key: "boundedClaims", weight: 1, label: "Bounded & consistent claims" },
        ],
    },
    {
        id: "4A",
        name: "Activities & Outputs",
        maxPoints: 15,
        criteria: [
            { key: "completedDelivery", weight: 4, label: "Completed delivery" },
            { key: "outputsUnits", weight: 4, label: "Outputs with correct units" },
            { key: "reachDeduplication", weight: 4, label: "Reach & deduplication" },
            { key: "equitableAccess", weight: 3, label: "Equitable access & completion" },
        ],
    },
    {
        id: "4B",
        name: "Measured Change",
        maxPoints: 15,
        criteria: [
            { key: "observedChange", weight: 4, label: "Observed change from a comparable start" },
            { key: "objectiveAttainment", weight: 2, label: "Objective attainment" },
            { key: "measurementQuality", weight: 3, label: "Measurement quality & uncertainty" },
            { key: "credibleContribution", weight: 2, label: "Credible contribution" },
            { key: "communityConfirmation", weight: 2, label: "Community confirmation & unintended effects" },
            { key: "evaluationImprovement", weight: 2, label: "Evaluation-led improvement" },
        ],
    },
    {
        id: "5",
        name: "Resources & Stewardship",
        maxPoints: 10,
        criteria: [
            { key: "resourceAccount", weight: 3, label: "Complete relevant resource account" },
            { key: "arithmeticTraceability", weight: 2, label: "Arithmetic & traceability" },
            { key: "proportionateAllocation", weight: 2, label: "Proportionate allocation & accountability" },
            { key: "resourceEfficiency", weight: 2, label: "Resource efficiency & value judgement" },
            { key: "responsibleMaterials", weight: 1, label: "Responsible material use" },
        ],
    },
    {
        id: "6",
        name: "Partnership & Collaboration",
        maxPoints: 5,
        criteria: [
            { key: "activeRole", weight: 2, label: "Partner's active role" },
            { key: "reciprocity", weight: 2, label: "Reciprocity & shared influence" },
            { key: "feedbackLearning", weight: 1, label: "Partner feedback & joint learning" },
        ],
    },
    {
        id: "7",
        name: "Evidence, Ethics & Verification",
        maxPoints: 15,
        criteria: [
            { key: "participation", weight: 2, label: "Attendance proof" },
            { key: "activities", weight: 3, label: "Delivery proof" },
            { key: "reach", weight: 2, label: "Beneficiary count proof" },
            { key: "outcomes", weight: 3, label: "Change proof" },
            { key: "resourcesPartners", weight: 2, label: "Resources & partner proof" },
            { key: "ethics", weight: 2, label: "Consent, dignity, privacy" },
            { key: "coverage", weight: 1, label: "Evidence traceability" },
        ],
    },
    {
        id: "8",
        name: "Reflection & Academic Growth",
        maxPoints: 5,
        criteria: [
            { key: "personalCivicLearning", weight: 2, label: "Specific personal & civic learning" },
            { key: "academicApplication", weight: 1, label: "Academic application" },
            { key: "competencyDevelopment", weight: 1, label: "Supported competency development" },
            { key: "ethicalJudgement", weight: 1, label: "Ethical judgement & improvement" },
        ],
    },
    {
        id: "9",
        name: "Sustainability & Handover",
        maxPoints: 10,
        criteria: [
            { key: "retainedBenefits", weight: 2, label: "Realistic retained benefits" },
            { key: "ownershipHandover", weight: 2, label: "Ownership, capacity & handover" },
            { key: "maintenanceFeasibility", weight: 1, label: "Maintenance & resource feasibility" },
            { key: "followUpRetention", weight: 3, label: "Follow-up & observed retention" },
            { key: "adaptationReplication", weight: 2, label: "Adaptation, replication & learning" },
        ],
    },
];

/**
 * Rubric revisions. R3 (CIEL-CII-2026.11-R3, current) is the table above. R2 re-cut Dimensions 6 and
 * 9 only; R1 is the original. Analyses stored under an older rubric keep their criterion keys and
 * their section `maximumPoints` travel with the stored result, so only display labels are needed
 * for them here.
 */
export const CII_V45_RUBRIC_VERSION = "CIEL-CII-2026.11-R3";
export const CII_V45_R2_RUBRIC_VERSION = "CIEL-CII-2026.11-R2";
const LEGACY_CRITERION_LABELS: Record<string, Record<string, string>> = {
    "1": {
        role: "Individual responsibility",
        quality: "Meaningful involvement",
        hoursCompletion: "Hours requirement met",
        continuity: "Regularity & follow-through",
    },
    "2": {
        specificity: "Problem specificity",
        communityGrounding: "Beneficiary identification",
        baseline: "Starting condition / baseline",
        context: "Contextual understanding",
        discipline: "Academic / disciplinary link",
    },
    "3": {
        alignment: "Primary SDG fit",
        logic: "Need-to-SDG logic chain",
        coherence: "Consistency with report",
        focus: "SDG selectivity",
    },
    "4A": {
        delivery: "Planned vs actual delivery",
        rigor: "Method and care",
        ownership: "Individual contribution",
        outputQuality: "Output quality",
        appropriateScale: "Scale and depth",
    },
    "4B": {
        clarity: "Outcome vs output clarity",
        change: "Credible change",
        measurement: "Measurement source/method",
        communityValue: "Value to beneficiaries",
        attribution: "Attribution honesty",
    },
    "5": {
        stewardship: "Resource mobilisation & use",
        traceability: "Resource traceability",
        appropriateness: "Fit to need",
        deliveryContribution: "What resources enabled",
    },
    "6": {
        relevance: "Right stakeholders",
        roleClarity: "Partner's actual contribution",
        collaboration: "Co-design / co-delivery",
        ownership: "Community ownership",
    },
    "8": {
        learning: "Personal learning",
        ethicalUnderstanding: "Ethics & community awareness",
        improvement: "Concrete next steps",
    },
    "9": {
        continuation: "Continuation plan",
        owner: "Named responsibility",
        handover: "Handover / closure",
        realism: "Scaling realism",
    },
};

/** R3 badge policy (mirrors the backend `CII_V45_L6_POLICY`): the CII alone picks the band; a 90+
 * candidate is awarded L6 only with these minima and the Admin's three sourced confirmations. */
export const CII_V45_L6_POLICY = {
    version: "CIEL-BADGES-2026.11-R2",
    minimumCii: 90,
    minimumMeasuredChange: 12,
    minimumSustainability: 8,
    minimumManualEvidence: 12,
} as const;

/** True when a stored analysis was scored under the current (R3) rubric: criterion marks can be
 * reviewed and the L6 qualification applies. Older analyses keep the rules they were approved under. */
export function isR3Analysis(result: { rubricVersion?: string | null } | null | undefined): boolean {
    return result?.rubricVersion === CII_V45_RUBRIC_VERSION;
}

export const CII_V45_BASE_MAX = CII_V45_DIMENSIONS.reduce((sum, d) => sum + d.maxPoints, 0); // 100
export const CII_V45_BONUS_MAX = 5;
export const CII_V45_MAX = 100;

/** 0=Missing, 1=Basic, 2=Sound, 3=Strong, 4=Exceptional. */
export const CII_V45_ANCHOR_FACTORS = [0, 0.5, 0.7, 0.85, 1] as const;

export const CII_V45_ANCHOR_NAMES = ["Missing", "Basic", "Sound", "Strong", "Exceptional"] as const;

/** Six contiguous locked bands (CIEL PK CII v4.5 badge manifest). */
export const CII_V45_BANDS: CiiV45Band[] = [
    { level: 1, min: 0, max: 49, name: "Participation Acknowledgement", assetKey: "L1" },
    { level: 2, min: 50, max: 59, name: "Foundation Stage Contributor", assetKey: "L2" },
    { level: 3, min: 60, max: 69, name: "Emerging Community Contributor", assetKey: "L3" },
    { level: 4, min: 70, max: 79, name: "Developing Impact Contributor", assetKey: "L4" },
    { level: 5, min: 80, max: 89, name: "Distinguished Impact Contributor", assetKey: "L5" },
    { level: 6, min: 90, max: 100, name: "Transformative Impact Contributor", assetKey: "L6" },
];

export function dimensionById(id: CiiV45Dimension): CiiV45DimensionDef | undefined {
    return CII_V45_DIMENSIONS.find((d) => d.id === id);
}

export function criterionLabel(dimensionId: CiiV45Dimension, key: string): string {
    const resolved = dimensionId === "1" && (key === "hoursConsistency" || key === "hoursCompletion") ? "hoursRequirement" : key;
    return (
        dimensionById(dimensionId)?.criteria.find((c) => c.key === key)?.label ||
        LEGACY_CRITERION_LABELS[dimensionId]?.[key] ||
        dimensionById(dimensionId)?.criteria.find((c) => c.key === resolved)?.label ||
        key
    );
}

/**
 * Maps a (possibly null) score onto the six locked bands and walks the badge down to the
 * highest level whose cumulative quality gate actually passes — mirrors the backend's
 * `resolveBadgeForScore` in `cii-v4-5.constants.ts` so this UI's own badge chip (and any
 * client-side preview of a moderated score) never disagrees with the server's gate-capping.
 */
export function resolveBadgeForScore(
    score: number | null,
    qualityGates: { L4: boolean; L5: boolean; L6: boolean } | undefined,
): CiiV45Badge | null {
    const numeric = score === null ? null : [...CII_V45_BANDS].reverse().find((b) => score >= b.min) || null;
    let badge: CiiV45Band | null = numeric;
    const gates = qualityGates ?? { L4: false, L5: false, L6: false };
    while (badge && badge.level >= 4 && !gates[`L${badge.level}` as "L4" | "L5" | "L6"]) {
        badge = CII_V45_BANDS.find((b) => b.level === badge!.level - 1) || null;
    }
    return badge
        ? {
              ...badge,
              code: `L${badge.level}`,
              numericLevel: numeric!.level,
              gateCapped: badge.level !== numeric!.level,
          }
        : null;
}

/** Lightweight badge lookup by score alone (no quality-gate walk) — for display contexts where
 * only the raw band name/level is needed (e.g. a "this score would land in L4" hint) and the
 * gate-aware badge object from the server/`resolveBadgeForScore` isn't available yet. */
export function badgeForScore(score: number | null): CiiV45Band | null {
    if (score === null) return null;
    return [...CII_V45_BANDS].reverse().find((b) => score >= b.min) || null;
}

/** R3: the numeric band is the candidate; L6 is only awarded when qualified. A 90+ candidate without
 * qualification has no badge, only the status `L6_PENDING_QUALIFICATION` (never replaced by L5).
 * Mirrors the backend `resolveCiiV45BadgeR3`. */
export function resolveBadgeForScoreR3(
    score: number | null,
    l6Qualified: boolean,
): { badge: CiiV45Badge | null; candidate: CiiV45Badge | null; status: CiiV45BadgeStatus | null } {
    const numeric = score === null ? null : [...CII_V45_BANDS].reverse().find((b) => score >= b.min) || null;
    if (!numeric) return { badge: null, candidate: null, status: null };
    const candidate: CiiV45Badge = { ...numeric, code: `L${numeric.level}`, numericLevel: numeric.level, gateCapped: false };
    if (numeric.level === 6 && !l6Qualified) return { badge: null, candidate, status: "L6_PENDING_QUALIFICATION" };
    return { badge: candidate, candidate, status: "AWARDED" };
}

/** R3 L6 qualification check (mirrors the backend `assessCiiV45L6`) for the live approval preview. */
export function assessL6(
    score: number | null,
    sections: ReadonlyArray<{ dimension: string; score: number | null }>,
    confirmations?: Partial<CiiV45L6Confirmations> | null,
): CiiV45L6Assessment {
    const P = CII_V45_L6_POLICY;
    const minimums = {
        cii: P.minimumCii,
        measuredChange: P.minimumMeasuredChange,
        sustainability: P.minimumSustainability,
        manualEvidence: P.minimumManualEvidence,
    };
    if (score === null || score < P.minimumCii) return { status: "NOT_REQUIRED", reasons: [], minimums };
    const pts = (id: string) => sections.find((s) => s.dimension === id)?.score ?? 0;
    const reasons: string[] = [];
    if (pts("4B") < P.minimumMeasuredChange) reasons.push(`Measured Change below ${P.minimumMeasuredChange}/15`);
    if (pts("9") < P.minimumSustainability) reasons.push(`Sustainability below ${P.minimumSustainability}/10`);
    if (pts("7") < P.minimumManualEvidence) reasons.push(`Manual evidence below ${P.minimumManualEvidence}/15`);
    if (confirmations?.observedRetention !== true) reasons.push("Observed retained benefits not confirmed");
    if (confirmations?.communityOwnership !== true) reasons.push("Community ownership or adoption not confirmed");
    if (confirmations?.externalCorroboration !== true) reasons.push("Corroboration outside the student team not confirmed");
    if (!String(confirmations?.sourceRef ?? "").trim()) reasons.push("Qualification source reference missing");
    return { status: reasons.length ? "PENDING_QUALIFICATION" : "QUALIFIED", reasons, minimums };
}

/** Plain-language badge line that never invents a badge: the awarded name, or the pending status. */
export function badgeStatusLabel(
    status: CiiV45BadgeStatus | null | undefined,
    awardedName?: string | null,
    candidateName?: string | null,
): string {
    if (status === "L6_PENDING_QUALIFICATION") return `${candidateName || "L6"} · L6 pending qualification`;
    return awardedName || "Pending";
}

