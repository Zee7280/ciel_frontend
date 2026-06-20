/**
 * CII section max scores (total = 100). Keep in sync with
 * `ciel_backend/src/reports/cii-section-weights.constants.ts` and calculateCII + UI breakdowns.
 */
export const CII_SECTION_MAX = {
    participation: 10,
    context: 10,
    sdg: 10,
    outputs: 15,
    outcomes: 10,
    resources: 15,
    partnerships: 10,
    evidence: 10,
    learning: 5,
    sustainability: 5,
} as const;

export type CIIBreakdownKey = keyof typeof CII_SECTION_MAX;

export const CII_SECTION_LABELS: Record<CIIBreakdownKey, string> = {
    participation: "Identity & Participation",
    context: "Project Context & Discipline",
    sdg: "SDG Strategy & Intent",
    outputs: "Activities & Output Scale",
    outcomes: "Outcomes & Measurable Change",
    resources: "Resource Mobilization",
    partnerships: "Partnerships & Collaboration",
    evidence: "Evidence & Verification",
    learning: "Personal & Academic Reflection",
    sustainability: "Sustainability & Continuation",
};

export const CII_BREAKDOWN_ORDER: CIIBreakdownKey[] = [
    "participation",
    "context",
    "sdg",
    "outputs",
    "outcomes",
    "resources",
    "partnerships",
    "evidence",
    "learning",
    "sustainability",
];

export const CII_SECTION_SHORT_LABELS: Record<CIIBreakdownKey, string> = {
    participation: "Participation",
    context: "Context",
    sdg: "SDG Alignment",
    outputs: "Activities",
    outcomes: "Outcomes",
    resources: "Resources",
    partnerships: "Partnerships",
    evidence: "Evidence",
    learning: "Reflection",
    sustainability: "Sustainability",
};

export function ciiSectionWeightLabel(max: number): string {
    return `${max}%`;
}
