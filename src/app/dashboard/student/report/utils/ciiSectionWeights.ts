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
    participation: "§1 Identity & Participation",
    context: "§2 Project Context & Discipline",
    sdg: "§3 SDG Strategy & Intent",
    outputs: "§4A Activities & Output Scale",
    outcomes: "§4B Outcomes & Measurable Change",
    resources: "§5 Resource Mobilization",
    partnerships: "§6 Partnerships & Collaboration",
    evidence: "§7 Evidence & Verification",
    learning: "§8 Personal & Academic Reflection",
    sustainability: "§9 Sustainability & Continuation",
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
    participation: "§1 Participation",
    context: "§2 Context",
    sdg: "§3 SDG Alignment",
    outputs: "§4A Activities",
    outcomes: "§4B Outcomes",
    resources: "§5 Resources",
    partnerships: "§6 Partnerships",
    evidence: "§7 Evidence",
    learning: "§8 Reflection",
    sustainability: "§9 Sustainability",
};

export function ciiSectionWeightLabel(max: number): string {
    return `${max}%`;
}
