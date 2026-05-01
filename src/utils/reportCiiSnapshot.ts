export type ReportCiiSnapshot = {
    totalScore: number;
    level: string;
    rawScore?: number;
    penaltyApplied?: number;
    auditCapApplied?: number;
    breakdown?: Record<string, number>;
    suggestions?: string[];
};

export function deriveCiiLevel(score: number): string {
    if (score >= 91) return "Transformational Engagement";
    if (score >= 76) return "High Impact Engagement";
    if (score >= 61) return "Sustained Engagement";
    if (score >= 41) return "Structured Engagement";
    if (score >= 20) return "Standard Engagement";
    return "Introductory Engagement";
}

function coerceScore(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return Math.min(100, Math.max(0, value));
    }
    if (typeof value === "string") {
        const match = value.trim().match(/\d+(?:\.\d+)?/);
        if (!match) return null;
        const parsed = Number(match[0]);
        return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : null;
    }
    return null;
}

function readNumberAfter(text: string, pattern: RegExp): number | null {
    const match = text.match(pattern);
    if (!match?.[1]) return null;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
}

function clampScore(score: number): number {
    return Math.min(100, Math.max(0, score));
}

function readOptionalScore(record: Record<string, unknown>, keys: string[]): number | undefined {
    for (const key of keys) {
        const score = coerceScore(record[key]);
        if (score !== null) return score;
    }
    return undefined;
}

function normalizeCiiObject(raw: unknown): ReportCiiSnapshot | null {
    if (!raw || typeof raw !== "object") {
        const scalar = coerceScore(raw);
        return scalar === null ? null : { totalScore: scalar, level: deriveCiiLevel(scalar) };
    }

    const record = raw as Record<string, unknown>;
    const score =
        coerceScore(record.totalScore) ??
        coerceScore(record.total_score) ??
        coerceScore(record.score) ??
        coerceScore(record.cii_score) ??
        coerceScore(record.ciiScore) ??
        coerceScore(record.impact_score) ??
        coerceScore(record.impactScore);

    if (score === null) return null;

    const level = typeof record.level === "string" && record.level.trim()
        ? record.level.trim()
        : deriveCiiLevel(score);
    const rawScore = readOptionalScore(record, ["rawScore", "raw_score", "rawCiiScore", "raw_cii_score"]);
    const penaltyApplied = readOptionalScore(record, [
        "penaltyApplied",
        "penalty_applied",
        "penalty",
        "penalties",
        "penaltyDeduction",
        "penalty_deduction",
    ]);
    const auditCapApplied = readOptionalScore(record, ["auditCapApplied", "audit_cap_applied", "auditCap", "audit_cap"]);
    const breakdown = record.breakdown && typeof record.breakdown === "object"
        ? Object.fromEntries(
              Object.entries(record.breakdown as Record<string, unknown>)
                  .map(([key, value]) => [key, coerceScore(value)])
                  .filter((entry): entry is [string, number] => entry[1] !== null),
          )
        : undefined;
    const suggestions = Array.isArray(record.suggestions)
        ? record.suggestions.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : undefined;

    return { totalScore: score, level, rawScore, penaltyApplied, auditCapApplied, breakdown, suggestions };
}

function parseAdjustedCiiFromAuditText(text: unknown): ReportCiiSnapshot | null {
    if (typeof text !== "string" || !text.trim()) return null;

    const raw = readNumberAfter(text, /\bRaw\s+CII\s+Score\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:\/\s*100)?/i);
    const penalty =
        readNumberAfter(text, /\bPenalty\s+Applied\s*[:=-]?\s*(\d+(?:\.\d+)?)/i) ??
        readNumberAfter(text, /\bPenalties\s*(?:Applied|Deducted|Deduction)?\s*[:=-]?\s*(\d+(?:\.\d+)?)/i) ??
        readNumberAfter(text, /\bPenalty\s+Deduction\s*[:=-]?\s*(\d+(?:\.\d+)?)/i);
    const auditCap = readNumberAfter(text, /\bAudit\s+Cap\s+Applied\s*[:=-]?\s*(\d+(?:\.\d+)?)/i);
    const finalAdjusted =
        readNumberAfter(text, /\bFinal\s+Adjusted\s+CII\s+Score\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:\/\s*100)?/i) ??
        readNumberAfter(text, /\bAdjusted\s+CII\s+Score\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:\/\s*100)?/i) ??
        readNumberAfter(text, /\bFinal\s+CII\s+(?:Index\s+)?Score\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:\/\s*100)?/i);

    if (finalAdjusted !== null) {
        const totalScore = clampScore(finalAdjusted);
        return {
            totalScore,
            level: deriveCiiLevel(totalScore),
            rawScore: raw === null ? undefined : clampScore(raw),
            penaltyApplied: penalty === null ? undefined : penalty,
            auditCapApplied: auditCap === null ? undefined : auditCap,
        };
    }

    if (raw === null || penalty === null) return null;

    const adjustedBeforeCap = raw - penalty;
    const totalScore = clampScore(auditCap === null ? adjustedBeforeCap : Math.min(adjustedBeforeCap, auditCap));
    return {
        totalScore,
        level: deriveCiiLevel(totalScore),
        rawScore: clampScore(raw),
        penaltyApplied: penalty,
        auditCapApplied: auditCap === null ? undefined : auditCap,
    };
}

function parseCiiFromSummaryText(text: unknown): ReportCiiSnapshot | null {
    if (typeof text !== "string" || !text.trim()) return null;

    const patterns = [
        /\bCII\s+Index\s+Score\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:\/\s*100)?/i,
        /\bCII\s+Score\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:\/\s*100)?/i,
        /\bcalculated\s+CII\s+index\s+(?:score\s+)?(?:is|of)?\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:\/\s*100)?/i,
        /\bCII-style\s+total\s+(?:is\s+)?(?:on\s+\w+\s+side\s+)?\(?(\d+(?:\.\d+)?)\s*\/\s*100/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        const score = match?.[1] ? coerceScore(match[1]) : null;
        if (score !== null) {
            return { totalScore: score, level: deriveCiiLevel(score) };
        }
    }

    return null;
}

export function readPersistedCiiSnapshot(report: unknown): ReportCiiSnapshot | null {
    if (!report || typeof report !== "object") return null;

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

    const adjustedSnapshot = parseAdjustedCiiFromAuditText(section11.summary_text);

    for (const candidate of candidates) {
        const snapshot = normalizeCiiObject(candidate);
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

    return adjustedSnapshot ?? parseCiiFromSummaryText(section11.summary_text);
}
