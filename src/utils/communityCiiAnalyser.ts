/**
 * Composite Impact Index (CII) v3.1 — client-side twin of
 * `ciel_backend/src/reports/cii-v2.constants.ts`. Static tables only (section/criteria
 * definitions, badge levels, bonus tiers) — the actual score is always computed
 * server-side and delivered on `report.ciiV2` / `report.ciiV2Lock`. Keep in sync with
 * the backend file.
 */

export interface CiiV2Criterion {
    key: string;
    label: string;
    weight: number;
    evidenceHint: string;
}

export interface CiiV2Section {
    id: number;
    key: string;
    title: string;
    weight: number;
    rationale: string;
    criteria: CiiV2Criterion[];
}

export const CII_V2_ANCHORS = ["Missing / Invalid", "Basic", "Sound", "Strong", "Exceptional"] as const;

export const CII_V2_SECTIONS: CiiV2Section[] = [
  {
    id: 1,
    key: 'participation',
    title: 'Participation & Verified Effort',
    weight: 8,
    rationale:
      'Evaluate individual role, verified hours, continuity, participation quality, attendance realism and repeated engagement. Required hours are compliance, not exceptional marks.',
    criteria: [
      { key: 'role_clarity', label: 'Individual role clarity & responsibility', weight: 2, evidenceHint: 'Activity responsibilities + member record' },
      { key: 'participation_quality', label: 'Quality & realism of participation', weight: 2, evidenceHint: 'Session ledger + timestamps' },
      { key: 'attendance_consistency', label: 'Evidence-backed attendance consistency', weight: 2, evidenceHint: 'Attendance register + session proof' },
      { key: 'engagement_continuity', label: 'Depth / continuity of engagement', weight: 2, evidenceHint: 'Session pattern + activity history' },
    ],
  },
  {
    id: 2,
    key: 'context',
    title: 'Community Need & Starting Point',
    weight: 10,
    rationale:
      'Evaluate actual community need, beneficiary group, community/beneficiary voice, starting situation, local context and discipline relevance. Formal research-grade baseline is not mandatory for Sound.',
    criteria: [
      { key: 'need_specificity', label: 'Specificity & significance of the community need', weight: 2, evidenceHint: 'Baseline narrative + site audit' },
      { key: 'beneficiary_voice', label: 'Community / beneficiary voice & reciprocity', weight: 2, evidenceHint: 'Partner input + feedback' },
      { key: 'baseline_context', label: 'Starting situation / baseline context', weight: 2, evidenceHint: 'Before photos + observed conditions' },
      { key: 'contextual_understanding', label: 'Local / contextual understanding', weight: 2, evidenceHint: 'Need assessment' },
      { key: 'disciplinary_relevance', label: 'Academic / disciplinary relevance', weight: 2, evidenceHint: 'Academic application field' },
    ],
  },
  {
    id: 3,
    key: 'sdg',
    title: 'SDG Contribution',
    weight: 7,
    rationale:
      'Evaluate Need → Activity → Output → Outcome → SDG. One correctly justified SDG is stronger than several weakly connected SDGs.',
    criteria: [
      { key: 'sdg_alignment', label: 'Correct primary SDG / target alignment', weight: 2, evidenceHint: 'Opportunity SDG + target' },
      { key: 'contribution_logic', label: 'Need → activity → output → outcome → SDG logic', weight: 2, evidenceHint: 'Contribution narrative' },
      { key: 'activity_output_outcome_alignment', label: 'Activity / output / outcome alignment', weight: 2, evidenceHint: 'Activities + outcomes' },
      { key: 'sdg_restraint', label: 'Restraint / no SDG inflation', weight: 1, evidenceHint: 'Full SDG set' },
    ],
  },
  {
    id: 4,
    key: 'activities',
    title: 'Activities & Outputs',
    weight: 15,
    rationale:
      'WHAT WAS ACTUALLY DONE AND PRODUCED. Small scale does not cap the score; large scale does not automatically increase it.',
    criteria: [
      { key: 'planned_vs_actual', label: 'Planned intention → actual execution', weight: 3, evidenceHint: 'Activity records' },
      { key: 'delivery_rigor', label: 'Rigor & quality of delivery', weight: 3, evidenceHint: 'Activity descriptions + photos' },
      { key: 'execution_ownership', label: 'Execution ownership & depth of engagement', weight: 3, evidenceHint: 'Session ledger + responsibilities' },
      { key: 'output_quality_integrity', label: 'Outputs & counting integrity', weight: 3, evidenceHint: 'Output records + partner register' },
      { key: 'depth_or_scale', label: 'Depth OR verified scale', weight: 3, evidenceHint: 'Unique reach + session history' },
    ],
  },
  {
    id: 5,
    key: 'outcomes',
    title: 'Outcomes & Measured Change',
    weight: 15,
    rationale:
      'WHAT CHANGED BECAUSE OF THE WORK. A credible narrative outcome without formal measurement may receive Sound. Formal measurement primarily supports Strong/Exceptional.',
    criteria: [
      { key: 'outcome_clarity', label: 'Outcome clarity', weight: 3, evidenceHint: 'Before/after narrative' },
      { key: 'measurable_change', label: 'Measurable / demonstrated change', weight: 4, evidenceHint: 'Registers + assessment data' },
      { key: 'outcome_source_quality', label: 'Outcome source quality', weight: 3, evidenceHint: 'Data source / feedback instrument' },
      { key: 'beneficiary_value', label: 'Beneficiary value, inclusion & appropriateness', weight: 3, evidenceHint: 'Beneficiary narrative + feedback' },
      { key: 'attribution_honesty', label: 'Attribution honesty & limitations', weight: 2, evidenceHint: 'Limitations narrative' },
    ],
  },
  {
    id: 6,
    key: 'resources',
    title: 'Resources & Stewardship',
    weight: 8,
    rationale:
      'Judge HOW WELL AVAILABLE RESOURCES WERE USED, not HOW RICH THE PROJECT WAS. Zero-budget projects may receive full marks.',
    criteria: [
      { key: 'resource_stewardship', label: 'Stewardship / efficient use of available resources', weight: 2, evidenceHint: 'Resource pathway + outputs' },
      { key: 'resource_traceability', label: 'Traceability & verification', weight: 2, evidenceHint: 'Receipts + handover records' },
      { key: 'resource_appropriateness', label: 'Appropriateness / proportionality', weight: 2, evidenceHint: 'Resource ledger + activity need' },
      { key: 'resource_delivery_link', label: 'Resource → delivery link', weight: 2, evidenceHint: 'Enabled-by statements' },
    ],
  },
  {
    id: 7,
    key: 'partnerships',
    title: 'Partnership & Collaboration',
    weight: 8,
    rationale:
      'One meaningful partner can score strongly. Multiple logos do not automatically receive more marks.',
    criteria: [
      { key: 'stakeholder_relevance', label: 'Relevance & reciprocity of stakeholder relationship', weight: 2, evidenceHint: 'Partner/community identity + role' },
      { key: 'stakeholder_role_clarity', label: 'Clarity of stakeholder / partner role', weight: 2, evidenceHint: 'Partner roles' },
      { key: 'collaboration_quality', label: 'Quality of collaboration / co-design', weight: 2, evidenceHint: 'Coordination evidence' },
      { key: 'ownership_verification', label: 'Verification, ownership & continuation involvement', weight: 2, evidenceHint: 'Verification letter + handover' },
    ],
  },
  {
    id: 8,
    key: 'evidence',
    title: 'Evidence, Ethics & Verification',
    weight: 15,
    rationale:
      'Score only AFTER the complete evidence audit. Do not count files — judge what those files actually prove.',
    criteria: [
      { key: 'participation_evidence', label: 'Evidence supports participation / hours', weight: 2, evidenceHint: 'Attendance evidence' },
      { key: 'activity_output_evidence', label: 'Evidence supports activities / outputs', weight: 3, evidenceHint: 'Activity/output evidence' },
      { key: 'beneficiary_scale_evidence', label: 'Evidence supports beneficiaries / scale', weight: 2, evidenceHint: 'Beneficiary reach evidence' },
      { key: 'outcome_evidence', label: 'Evidence supports outcomes / change', weight: 3, evidenceHint: 'Before/after outcome evidence' },
      { key: 'resource_partner_evidence', label: 'Resource / partner evidence', weight: 2, evidenceHint: 'Resource/stakeholder evidence' },
      { key: 'ethics_integrity', label: 'Ethics, consent, consistency & integrity', weight: 2, evidenceHint: 'Evidence declarations + consistency scan' },
      { key: 'evidence_coverage_traceability', label: 'Evidence coverage & traceability', weight: 1, evidenceHint: 'Claim-to-file mapping' },
    ],
  },
  {
    id: 9,
    key: 'learning',
    title: 'Reflection & Academic Growth',
    weight: 7,
    rationale:
      'Score specificity and self-awareness, not polished language. External evidence is not required for genuine personal reflection.',
    criteria: [
      { key: 'personal_learning', label: 'Specific, honest personal learning', weight: 2, evidenceHint: 'Personal reflection' },
      { key: 'academic_application', label: 'Application of discipline / knowledge where relevant', weight: 1.5, evidenceHint: 'Academic application' },
      { key: 'ethical_understanding', label: 'Ethical / community understanding', weight: 1.5, evidenceHint: 'Reflection narrative' },
      { key: 'self_awareness', label: 'Self-awareness, challenge & future improvement', weight: 2, evidenceHint: 'Future-action reflection' },
    ],
  },
  {
    id: 10,
    key: 'sustainability',
    title: 'Sustainability & Handover',
    weight: 7,
    rationale:
      'Not every project must continue forever. An honest No or Partial with clear reasoning may score higher than an unsupported Yes.',
    criteria: [
      { key: 'continuation_assessment', label: 'Realistic continuation assessment', weight: 2, evidenceHint: 'Sustainability narrative' },
      { key: 'named_ownership', label: 'Named ownership / handover', weight: 2, evidenceHint: 'Handover record' },
      { key: 'continuation_mechanism', label: 'Continuation mechanism / follow-up', weight: 2, evidenceHint: 'Handover + follow-up' },
      { key: 'scaling_realism', label: 'Scaling / system influence realism', weight: 1, evidenceHint: 'Scaling statement' },
    ],
  },
];

export const CII_V2_BASE_MAX = CII_V2_SECTIONS.reduce((sum, s) => sum + s.weight, 0); // 100
export const CII_V2_BONUS_MAX = 5;
export const CII_V2_MAX = 100;

export interface CiiV2Level {
    level: number;
    min: number;
    max: number;
    name: string;
    quality: string;
    icon: string;
}

export const CII_V2_LEVELS: CiiV2Level[] = [
    { level: 7, min: 92, max: 100, name: "Transformative Impact Contributor", quality: "PHENOMENAL", icon: "🏆" },
    { level: 6, min: 84, max: 91.999, name: "Distinguished Impact Contributor", quality: "EXCELLENT", icon: "💎" },
    { level: 5, min: 75, max: 83.999, name: "Strong Impact Contributor", quality: "VERY GOOD", icon: "⭐" },
    { level: 4, min: 67, max: 74.999, name: "Developing Impact Contributor", quality: "GOOD", icon: "🌟" },
    { level: 3, min: 58, max: 66.999, name: "Emerging Community Contributor", quality: "AVERAGE", icon: "🌱" },
    { level: 2, min: 48, max: 57.999, name: "Foundation Stage Contributor", quality: "FOUNDATION", icon: "🔹" },
    { level: 1, min: 0, max: 47.999, name: "Participation Acknowledgement", quality: "BASIC", icon: "🔸" },
];

export interface CiiV2BonusTier {
    label: string;
    amount: number;
}

export interface CiiV2BonusChannel {
    key: "effort" | "resources" | "partners" | "outcome";
    name: string;
    max: number;
    tiers: CiiV2BonusTier[];
}

export const CII_V2_BONUS_CHANNELS: CiiV2BonusChannel[] = [
    {
        key: "effort",
        name: "Extra verified effort above the opportunity minimum",
        max: 1.25,
        tiers: [
            { label: "≤ 1.24×", amount: 0 },
            { label: "1.25–1.49×", amount: 0.25 },
            { label: "1.50–1.99×", amount: 0.5 },
            { label: "2.00–2.49×", amount: 0.75 },
            { label: "≥ 2.50×", amount: 1.25 },
        ],
    },
    {
        key: "resources",
        name: "Exceptional resource mobilisation",
        max: 1.25,
        tiers: [
            { label: "None", amount: 0 },
            { label: "Useful additional verified contribution", amount: 0.25 },
            { label: "Multiple meaningful resources / notable initiative", amount: 0.5 },
            { label: "Resources materially strengthen delivery", amount: 0.75 },
            { label: "Significant external leverage", amount: 1 },
            { label: "Exceptional verified mobilisation", amount: 1.25 },
        ],
    },
    {
        key: "partners",
        name: "Exceptional partnership building",
        max: 1.25,
        tiers: [
            { label: "None", amount: 0 },
            { label: "Activates one useful stakeholder", amount: 0.25 },
            { label: "One genuine participating partner", amount: 0.5 },
            { label: "Partner meaningfully contributes", amount: 0.75 },
            { label: "Co-delivery / sustained collaboration", amount: 1 },
            { label: "Continuation / multi-stakeholder coordination", amount: 1.25 },
        ],
    },
    {
        key: "outcome",
        name: "Exceptional outcome contribution",
        max: 1.25,
        tiers: [
            { label: "None", amount: 0 },
            { label: "Clearly above-normal verified result", amount: 0.25 },
            { label: "Meaningful measurable improvement", amount: 0.5 },
            { label: "Strong verified beneficiary change", amount: 0.75 },
            { label: "Unusually strong verified impact", amount: 1 },
            { label: "Exceptional evidence-backed outcome", amount: 1.25 },
        ],
    },
];

export function sectionById(id: number): CiiV2Section | undefined {
    return CII_V2_SECTIONS.find((s) => s.id === id);
}

export function criterionLabel(sectionId: number, key: string): string {
    return sectionById(sectionId)?.criteria.find((c) => c.key === key)?.label || key;
}

export function levelByNumber(level: number): CiiV2Level {
    return CII_V2_LEVELS.find((l) => l.level === level) || CII_V2_LEVELS[CII_V2_LEVELS.length - 1];
}

// --- Server-delivered score shape (mirrors ciel_backend CiiV2Result) ---

export interface CiiV2CriterionResult {
    key: string;
    label: string;
    weight: number;
    anchor: number;
    points: number;
    note?: string;
}

export interface CiiV2SectionResult {
    id: number;
    key: string;
    title: string;
    weight: number;
    score: number;
    good?: string;
    limit?: string;
    criteria: CiiV2CriterionResult[];
}

export interface CiiV2EvidenceRow {
    id: string;
    file: string;
    claim: string;
    type: string;
    match: number;
    verdict: "MATCH" | "PARTIAL" | "MISMATCH";
    why: string;
}

export interface CiiV2Result {
    sections: CiiV2SectionResult[];
    individualCore: number;
    projectQuality: number;
    base: number;
    bonus: { effort: number; resources: number; partners: number; outcome?: number; total: number };
    integrityPenalty: number;
    final: number;
    numericLevel: number;
    level: CiiV2Level;
    gateCap: number;
    gateExplanation: string;
    evidence: CiiV2EvidenceRow[];
    evidenceAverage: number;
    bonusWhy?: { effort?: string; resources?: string; partners?: string; outcome?: string };
    integrityWhy?: string;
    redFlags?: string[];
    integrityChecks?: Array<{ level: "hold" | "review"; title: string; detail: string; source?: string }>;
    incomplete?: boolean;
    studentFeedback?: string;
    frameworkVersion?: string;
    computedAt?: string;
}

export interface CiiV2Lock {
    locked: boolean;
    hash: string;
    lockedAt: string;
    lockedByFacultyId: string;
    facultyNote?: string;
}

export function verdictTone(verdict: CiiV2EvidenceRow["verdict"]): { bg: string; fg: string } {
    if (verdict === "MATCH") return { bg: "#e7f7ef", fg: "#176b5e" };
    if (verdict === "PARTIAL") return { bg: "#fff3dc", fg: "#886210" };
    return { bg: "#fff0f2", fg: "#a34758" };
}

export function anchorTone(anchor: number): { bg: string; fg: string } {
    const tones = [
        { bg: "#fff0f2", fg: "#a44b59" },
        { bg: "#fff6e9", fg: "#936719" },
        { bg: "#eef5f7", fg: "#496b75" },
        { bg: "#edf5ff", fg: "#31658e" },
        { bg: "#e8f7ef", fg: "#176b61" },
    ];
    return tones[Math.min(4, Math.max(0, Math.round(anchor)))];
}
