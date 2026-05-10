/**
 * Ordered definitions for Section 9 self-assessment (1–5 scale).
 * Keeps print + verify UI aligned with the form in Section9Reflection.
 */
export type CompetencyScoreDefinition = {
    key: string;
    label: string;
    group: string;
};

export const COMPETENCY_SCORE_DEFINITIONS: CompetencyScoreDefinition[] = [
    {
        group: "Cognitive",
        key: "cognitive_systemic",
        label: "Understanding interconnected social, environmental & economic issues",
    },
    {
        group: "Cognitive",
        key: "cognitive_critical",
        label: "Critical and ethical reasoning",
    },
    {
        group: "Cognitive",
        key: "cognitive_evaluate",
        label: "Ability to evaluate impact",
    },
    {
        group: "Practical",
        key: "practical_design",
        label: "Project design & implementation",
    },
    {
        group: "Practical",
        key: "practical_evidence",
        label: "Evidence-based reporting",
    },
    {
        group: "Practical",
        key: "practical_engagement",
        label: "Community engagement",
    },
    {
        group: "Social & civic",
        key: "social_empathy",
        label: "Responsibility & empathy",
    },
    {
        group: "Social & civic",
        key: "social_diversity",
        label: "Awareness of diversity & inclusion",
    },
    {
        group: "Social & civic",
        key: "social_collaboration",
        label: "Collaborative problem-solving",
    },
    {
        group: "Transformative",
        key: "transformative_longterm",
        label: "Long-term thinking",
    },
    {
        group: "Transformative",
        key: "transformative_benefits",
        label: "Understanding benefits & possible downsides",
    },
    {
        group: "Transformative",
        key: "transformative_sustainability",
        label: "Sustainability-oriented decision making",
    },
];

const DEF_KEYS = new Set(COMPETENCY_SCORE_DEFINITIONS.map((d) => d.key));

export function formatCompetencyKeyFallback(key: string): string {
    return key.replace(/_/g, " ");
}

/** Numeric score or null if missing / not numeric */
export function pickNumericCompetencyValue(raw: unknown): number | null {
    if (raw === null || raw === undefined) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}

export function resolveExtraCompetencyKeys(record: Record<string, unknown>): string[] {
    return Object.keys(record)
        .filter((k) => !DEF_KEYS.has(k))
        .sort((a, b) => a.localeCompare(b));
}
