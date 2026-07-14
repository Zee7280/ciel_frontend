export type ReportCiiSnapshot = {
    totalScore: number;
    level: string;
    rawScore?: number;
    penaltyApplied?: number;
    auditCapApplied?: number;
    breakdown?: Record<string, number>;
    suggestions?: string[];
    evaluation_framework_version?: string;
    cii_score_max?: number;
};

export const CII_SCORE_MAX_BY_FRAMEWORK: Record<string, number> = {
    "v8.2": 100,
    "v1.2": 100,
};

export function resolveCiiScoreMaxFromReport(report: unknown): number {
    if (!report || typeof report !== "object") return 100;
    const record = report as Record<string, unknown>;
    const section11 =
        record.section11 && typeof record.section11 === "object"
            ? (record.section11 as Record<string, unknown>)
            : {};
    const ciiIndex =
        (record.cii_index && typeof record.cii_index === "object"
            ? (record.cii_index as Record<string, unknown>)
            : null) ??
        (section11.cii_index && typeof section11.cii_index === "object"
            ? (section11.cii_index as Record<string, unknown>)
            : null);

    const explicitMax = coerceScore(ciiIndex?.cii_score_max, 100);
    if (explicitMax !== null) return explicitMax;

    const framework = pickFrameworkVersion(section11) ?? pickFrameworkVersion(ciiIndex);
    if (framework && CII_SCORE_MAX_BY_FRAMEWORK[framework]) {
        return CII_SCORE_MAX_BY_FRAMEWORK[framework];
    }
    return 100;
}

function pickFrameworkVersion(record: Record<string, unknown> | null): string | null {
    if (!record) return null;
    const raw =
        (typeof record.evaluation_framework_version === "string" && record.evaluation_framework_version.trim()) ||
        (typeof record.framework_version === "string" && record.framework_version.trim()) ||
        "";
    return raw || null;
}

export function deriveCiiLevel(score: number): string {
    if (score >= 91) return "Transformational Engagement";
    if (score >= 76) return "High Impact Engagement";
    if (score >= 61) return "Sustained Engagement";
    if (score >= 41) return "Structured Engagement";
    if (score >= 20) return "Standard Engagement";
    return "Introductory Engagement";
}

function coerceScore(value: unknown, maxScore = 100): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return Math.min(maxScore, Math.max(0, value));
    }
    if (typeof value === "string") {
        const match = value.trim().match(/\d+(?:\.\d+)?/);
        if (!match) return null;
        const parsed = Number(match[0]);
        return Number.isFinite(parsed) ? Math.min(maxScore, Math.max(0, parsed)) : null;
    }
    return null;
}

function readNumberAfter(text: string, pattern: RegExp): number | null {
    const match = text.match(pattern);
    if (!match?.[1]) return null;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
}

function clampScore(score: number, maxScore = 100): number {
    return Math.min(maxScore, Math.max(0, score));
}

function readOptionalScore(record: Record<string, unknown>, keys: string[], maxScore = 100): number | undefined {
    for (const key of keys) {
        const score = coerceScore(record[key], maxScore);
        if (score !== null) return score;
    }
    return undefined;
}

function normalizeCiiObject(raw: unknown, maxScore = 100): ReportCiiSnapshot | null {
    if (!raw || typeof raw !== "object") {
        const scalar = coerceScore(raw, maxScore);
        return scalar === null ? null : { totalScore: scalar, level: deriveCiiLevel(scalar), cii_score_max: maxScore };
    }

    const record = raw as Record<string, unknown>;
    const recordMax = coerceScore(record.cii_score_max, 100) ?? maxScore;
    const score =
        coerceScore(record.totalScore, recordMax) ??
        coerceScore(record.total_score, recordMax) ??
        coerceScore(record.score, recordMax) ??
        coerceScore(record.cii_score, recordMax) ??
        coerceScore(record.ciiScore, recordMax) ??
        coerceScore(record.impact_score, recordMax) ??
        coerceScore(record.impactScore, recordMax);

    if (score === null) return null;

    const framework = pickFrameworkVersion(record);
    const resolvedMax =
        recordMax ||
        (framework && CII_SCORE_MAX_BY_FRAMEWORK[framework]) ||
        maxScore;
    const level = typeof record.level === "string" && record.level.trim()
        ? record.level.trim()
        : deriveCiiLevel(score);
    const rawScore = readOptionalScore(record, ["rawScore", "raw_score", "rawCiiScore", "raw_cii_score"], resolvedMax);
    const penaltyApplied = readOptionalScore(record, [
        "penaltyApplied",
        "penalty_applied",
        "penalty",
        "penalties",
        "penaltyDeduction",
        "penalty_deduction",
    ], resolvedMax);
    const auditCapApplied = readOptionalScore(record, ["auditCapApplied", "audit_cap_applied", "auditCap", "audit_cap"], resolvedMax);
    const breakdown = record.breakdown && typeof record.breakdown === "object"
        ? Object.fromEntries(
              Object.entries(record.breakdown as Record<string, unknown>)
                  .map(([key, value]) => [key, coerceScore(value, resolvedMax)])
                  .filter((entry): entry is [string, number] => entry[1] !== null),
          )
        : undefined;
    const suggestions = Array.isArray(record.suggestions)
        ? record.suggestions.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : undefined;

    return {
        totalScore: score,
        level,
        rawScore,
        penaltyApplied,
        auditCapApplied,
        breakdown,
        suggestions,
        evaluation_framework_version: framework ?? undefined,
        cii_score_max: resolvedMax,
    };
}

function parseAdjustedCiiFromAuditText(text: unknown, maxScore = 100): ReportCiiSnapshot | null {
    if (typeof text !== "string" || !text.trim()) return null;

    const raw = readNumberAfter(text, /\bRaw\s+CII\s+Score\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:\/\s*100)?/i);
    const penalty =
        readNumberAfter(text, /\bPenalty\s+Applied\s*[:=-]?\s*(\d+(?:\.\d+)?)/i) ??
        readNumberAfter(text, /\bPenalties\s*(?:Applied|Deducted|Deduction)?\s*[:=-]?\s*(\d+(?:\.\d+)?)/i) ??
        readNumberAfter(text, /\bPenalty\s+Deduction\s*[:=-]?\s*(\d+(?:\.\d+)?)/i);
    const auditCap = readNumberAfter(text, /\bAudit\s+Cap\s+Applied\s*[:=-]?\s*(\d+(?:\.\d+)?)/i);
    const finalAdjusted =
        readNumberAfter(text, /\bFinal\s+Adjusted\s+CII\s+Score\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:\/\s*(?:100|108))?/i) ??
        readNumberAfter(text, /\bAdjusted\s+CII\s+Score\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:\/\s*(?:100|108))?/i) ??
        readNumberAfter(text, /\bFinal\s+CII\s+(?:Index\s+)?Score\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:\/\s*(?:100|108))?/i);

    if (finalAdjusted !== null) {
        const totalScore = clampScore(finalAdjusted, maxScore);
        return {
            totalScore,
            level: deriveCiiLevel(totalScore),
            rawScore: raw === null ? undefined : clampScore(raw, maxScore),
            penaltyApplied: penalty === null ? undefined : penalty,
            auditCapApplied: auditCap === null ? undefined : auditCap,
            cii_score_max: maxScore,
        };
    }

    if (raw === null || penalty === null) return null;

    const adjustedBeforeCap = raw - penalty;
    const totalScore = clampScore(auditCap === null ? adjustedBeforeCap : Math.min(adjustedBeforeCap, auditCap), maxScore);
    return {
        totalScore,
        level: deriveCiiLevel(totalScore),
        rawScore: clampScore(raw, maxScore),
        penaltyApplied: penalty,
        auditCapApplied: auditCap === null ? undefined : auditCap,
        cii_score_max: maxScore,
    };
}

function parseCiiFromSummaryText(text: unknown, maxScore = 100): ReportCiiSnapshot | null {
    if (typeof text !== "string" || !text.trim()) return null;

    const patterns = [
        /\bFinal\s+CII\s+Score\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:\/\s*(?:100|108))?/i,
        /\bCII\s+Index\s+Score\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:\/\s*(?:100|108))?/i,
        /\bCII\s+Score\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:\/\s*(?:100|108))?/i,
        /\bcalculated\s+CII\s+index\s+(?:score\s+)?(?:is|of)?\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:\/\s*(?:100|108))?/i,
        /\bCII-style\s+total\s+(?:is\s+)?(?:on\s+\w+\s+side\s+)?\(?(\d+(?:\.\d+)?)\s*\/\s*(?:100|108)/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        const score = match?.[1] ? coerceScore(match[1], maxScore) : null;
        if (score !== null) {
            return { totalScore: score, level: deriveCiiLevel(score), cii_score_max: maxScore };
        }
    }

    return null;
}

export function readPersistedCiiSnapshot(report: unknown): ReportCiiSnapshot | null {
    if (!report || typeof report !== "object") return null;

    const maxScore = resolveCiiScoreMaxFromReport(report);

    const record = report as Record<string, unknown>;
    const section11 = record.section11 && typeof record.section11 === "object"
        ? (record.section11 as Record<string, unknown>)
        : {};

    const candidates = [
        record.cii_index,
        record.ciiIndex,
        record.cii,
        section11.cii_index,
        section11.ciiIndex,
        record.cii_score,
        record.ciiScore,
        record.impact_score,
        record.impactScore,
    ];

    const adjustedSnapshot = parseAdjustedCiiFromAuditText(section11.summary_text, maxScore);

    for (const candidate of candidates) {
        const snapshot = normalizeCiiObject(candidate, maxScore);
        if (snapshot) {
            return adjustedSnapshot
                ? {
                      ...snapshot,
                      totalScore: adjustedSnapshot.totalScore,
                      level: adjustedSnapshot.level,
                      rawScore: adjustedSnapshot.rawScore ?? snapshot.rawScore,
                      penaltyApplied: adjustedSnapshot.penaltyApplied ?? snapshot.penaltyApplied,
                      auditCapApplied: adjustedSnapshot.auditCapApplied ?? snapshot.auditCapApplied,
                  }
                : snapshot;
        }
    }

    return adjustedSnapshot ?? parseCiiFromSummaryText(section11.summary_text, maxScore);
}
