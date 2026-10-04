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

export type CiiV45ScoreStatus = "RESUBMISSION_REQUIRED" | "ADMIN_REVIEW_REQUIRED" | "FINAL";

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
}

export interface CiiV45ExtraMileUplift {
    assessmentStatus: "ASSESSED" | "PROCESSING_REQUIRED";
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
}

export interface CiiV45IntegrityPenalty {
    points: number;
    issues: CiiV45IntegrityIssue[];
}

export interface CiiV45ExceptionalFeature {
    verified: boolean;
    explanation?: string;
    evidenceIds?: string[];
}

export type CiiV45DeductionLedgerEntry = Record<string, unknown>;

/** Shape the AI actually returns — anchors/claims/evidence/narrative only, no score fields. */
export interface CiiV45EvaluatorPayload {
    frameworkVersion: "4.5";
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
}

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
    baseCII: number | null;
    extraMileUplift: CiiV45ExtraMileUplift;
    diagnosticCII: number | null;
    scoreStatus: CiiV45ScoreStatus;
    needsAdminReview: boolean;
    finalCII: number | null;
    recommendedBadge: CiiV45Badge | null;
    diagnosticBadge: CiiV45Badge | null;
    finalBadge: CiiV45Badge | null;
    qualityGates: { L4: boolean; L5: boolean; L6: boolean };
    publicationEligible: boolean;
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

/** Fixed dimensions/criteria/weights — base 100. Criterion IDs are exact and immutable. */
export const CII_V45_DIMENSIONS: CiiV45DimensionDef[] = [
    {
        id: "1",
        name: "Participation & Verified Effort",
        maxPoints: 10,
        criteria: [
            { key: "role", weight: 2.5, label: "Individual responsibility" },
            { key: "quality", weight: 2.5, label: "Meaningful involvement" },
            { key: "hoursConsistency", weight: 2.5, label: "Hours log reliability" },
            { key: "continuity", weight: 2.5, label: "Regularity & follow-through" },
        ],
    },
    {
        id: "2",
        name: "Community Need & Starting Point",
        maxPoints: 10,
        criteria: [
            { key: "specificity", weight: 2, label: "Problem specificity" },
            { key: "communityGrounding", weight: 2, label: "Beneficiary identification" },
            { key: "baseline", weight: 2, label: "Starting condition / baseline" },
            { key: "context", weight: 2, label: "Contextual understanding" },
            { key: "discipline", weight: 2, label: "Academic / disciplinary link" },
        ],
    },
    {
        id: "3",
        name: "SDG Contribution",
        maxPoints: 5,
        criteria: [
            { key: "alignment", weight: 1.5, label: "SDG goal/target fit" },
            { key: "logic", weight: 1.5, label: "Need-to-SDG logic chain" },
            { key: "coherence", weight: 1.5, label: "Consistency with report" },
            { key: "focus", weight: 0.5, label: "SDG selectivity" },
        ],
    },
    {
        id: "4A",
        name: "Activities & Outputs",
        maxPoints: 15,
        criteria: [
            { key: "delivery", weight: 3, label: "Planned vs actual delivery" },
            { key: "rigor", weight: 3, label: "Method and care" },
            { key: "ownership", weight: 3, label: "Individual contribution" },
            { key: "outputQuality", weight: 3, label: "Output quality" },
            { key: "appropriateScale", weight: 3, label: "Scale and depth" },
        ],
    },
    {
        id: "4B",
        name: "Outcomes & Measured Change",
        maxPoints: 15,
        criteria: [
            { key: "clarity", weight: 3, label: "Outcome vs output clarity" },
            { key: "change", weight: 4, label: "Credible change" },
            { key: "measurement", weight: 3, label: "Measurement source/method" },
            { key: "communityValue", weight: 3, label: "Value to beneficiaries" },
            { key: "attribution", weight: 2, label: "Attribution honesty" },
        ],
    },
    {
        id: "5",
        name: "Resources & Stewardship",
        maxPoints: 10,
        criteria: [
            { key: "stewardship", weight: 2.5, label: "Resource mobilisation & use" },
            { key: "traceability", weight: 2.5, label: "Resource traceability" },
            { key: "appropriateness", weight: 2.5, label: "Fit to need" },
            { key: "deliveryContribution", weight: 2.5, label: "What resources enabled" },
        ],
    },
    {
        id: "6",
        name: "Partnership & Collaboration",
        maxPoints: 10,
        criteria: [
            { key: "relevance", weight: 2.5, label: "Right stakeholders" },
            { key: "roleClarity", weight: 2.5, label: "Partner's actual contribution" },
            { key: "collaboration", weight: 2.5, label: "Co-design / co-delivery" },
            { key: "ownership", weight: 2.5, label: "Community ownership" },
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
            { key: "learning", weight: 1.5, label: "Personal learning" },
            { key: "academicApplication", weight: 1, label: "Discipline applied" },
            { key: "ethicalUnderstanding", weight: 1, label: "Ethics & community awareness" },
            { key: "improvement", weight: 1.5, label: "Concrete next steps" },
        ],
    },
    {
        id: "9",
        name: "Sustainability & Handover",
        maxPoints: 5,
        criteria: [
            { key: "continuation", weight: 1.5, label: "Continuation plan" },
            { key: "owner", weight: 1.5, label: "Named responsibility" },
            { key: "handover", weight: 1.5, label: "Handover / closure" },
            { key: "realism", weight: 0.5, label: "Scaling realism" },
        ],
    },
];

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
    return dimensionById(dimensionId)?.criteria.find((c) => c.key === key)?.label || key;
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
