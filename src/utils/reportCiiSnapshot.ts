export type ReportCiiSnapshot = {
    totalScore: number;
    level: string;
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

    return { totalScore: score, level, breakdown, suggestions };
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

    for (const candidate of candidates) {
        const snapshot = normalizeCiiObject(candidate);
        if (snapshot) return snapshot;
    }

    return parseCiiFromSummaryText(section11.summary_text);
}
