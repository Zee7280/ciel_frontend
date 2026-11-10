/**
 * R3 "CIEL-answerable question registry": a curated subset of the internal 440-question bank whose
 * questions a single approved project (or a deduplicated set of approved records) can actually
 * answer. It is a reference list for the Admin reviewer. It never feeds the CII, never proves an
 * answer, and carries no AI-proposed answers (the live scorer does not return any yet).
 *
 * Pure module, no imports, so the node:test suite can load it directly.
 */

export const CII_ANSWERABLE_REGISTRY_URL = "/ciel-cii-answerable-registry.json";

export type AnswerableScope = "project" | "portfolio";

export interface AnswerableQuestion {
    id: string;
    scope: AnswerableScope;
    /** CII rubric dimension the question informs: 1, 2, 3, 4A, 4B, 5, 6, 7, 8 or 9. */
    dimension: string;
    question: string;
    minimumData: string;
    answerRule: string;
}

export interface AnswerableRegistry {
    version: string;
    questionBankVersion: string;
    note: string;
    items: AnswerableQuestion[];
}

const DIMENSION_ORDER = ["1", "2", "3", "4A", "4B", "5", "6", "7", "8", "9"];

/** Validates the fetched file; anything malformed is rejected so the panel shows nothing rather than guesses. */
export function parseAnswerableRegistry(raw: unknown): AnswerableRegistry | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.version !== "string" || !Array.isArray(r.items)) return null;
    const items: AnswerableQuestion[] = [];
    for (const it of r.items) {
        if (!it || typeof it !== "object") return null;
        const q = it as Record<string, unknown>;
        if (
            typeof q.id !== "string" ||
            (q.scope !== "project" && q.scope !== "portfolio") ||
            typeof q.dimension !== "string" ||
            !DIMENSION_ORDER.includes(q.dimension) ||
            typeof q.question !== "string"
        ) {
            return null;
        }
        items.push({
            id: q.id,
            scope: q.scope,
            dimension: q.dimension,
            question: q.question,
            minimumData: typeof q.minimumData === "string" ? q.minimumData : "",
            answerRule: typeof q.answerRule === "string" ? q.answerRule : "",
        });
    }
    return {
        version: r.version,
        questionBankVersion: typeof r.questionBankVersion === "string" ? r.questionBankVersion : "",
        note: typeof r.note === "string" ? r.note : "",
        items,
    };
}

export function registrySummary(items: AnswerableQuestion[]) {
    return {
        candidates: items.length,
        project: items.filter((i) => i.scope === "project").length,
        portfolio: items.filter((i) => i.scope === "portfolio").length,
    };
}

/** Rubric order (1, 2, 3, 4A, 4B, 5, 6, 7, 8, 9), questions keep their bank order inside a dimension. */
export function groupByDimension(items: AnswerableQuestion[]): Array<{ dimension: string; items: AnswerableQuestion[] }> {
    return DIMENSION_ORDER.map((dimension) => ({ dimension, items: items.filter((i) => i.dimension === dimension) })).filter((g) => g.items.length > 0);
}
