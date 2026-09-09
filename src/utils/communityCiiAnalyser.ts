/**
 * Composite Impact Index (CII) v2 — client-side twin of
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
        key: "participation",
        title: "Participation Quality & Individual Commitment",
        weight: 8,
        rationale:
            "Minimum hours are a mandatory compliance gate, not a scored achievement. This section differentiates students by the quality, continuity, evidence and clarity of their own contribution.",
        criteria: [
            { key: "role_clarity", label: "Individual role clarity & responsibility", weight: 2, evidenceHint: "Activity responsibilities + member record" },
            { key: "participation_quality", label: "Quality & realism of participation", weight: 2, evidenceHint: "Session ledger + timestamps" },
            { key: "attendance_consistency", label: "Evidence-backed attendance consistency", weight: 2, evidenceHint: "Attendance register + session proof" },
            { key: "engagement_continuity", label: "Depth / continuity of engagement", weight: 2, evidenceHint: "Session pattern + activity history" },
        ],
    },
    {
        id: 2,
        key: "context",
        title: "Community Context, Voice, Need & Baseline",
        weight: 10,
        rationale:
            "A universal community-service score must start with whether the intervention responds to a real, evidenced need and whether community or beneficiary voice is visible.",
        criteria: [
            { key: "need_specificity", label: "Specificity & significance of the community need", weight: 2, evidenceHint: "Baseline narrative + site audit" },
            { key: "beneficiary_voice", label: "Community / beneficiary voice & reciprocity", weight: 2, evidenceHint: "Partner input + feedback" },
            { key: "baseline_evidence", label: "Evidence-informed baseline", weight: 3, evidenceHint: "Before photos + attendance records" },
            { key: "contextual_understanding", label: "Local / contextual understanding", weight: 1.5, evidenceHint: "Need assessment" },
            { key: "disciplinary_lens", label: "Academic / disciplinary lens where relevant", weight: 1.5, evidenceHint: "Academic application field" },
        ],
    },
    {
        id: 3,
        key: "sdg",
        title: "SDG Relevance & Contribution Logic",
        weight: 6,
        rationale: "SDG alignment should be technically defensible but must not dominate the score. Correct logic matters more than selecting many goals.",
        criteria: [
            { key: "sdg_alignment", label: "Correct primary SDG / target alignment", weight: 2, evidenceHint: "Opportunity SDG + target" },
            { key: "contribution_logic", label: "Need → activity → output → outcome → SDG logic", weight: 2, evidenceHint: "Contribution narrative" },
            { key: "activity_output_outcome_alignment", label: "Activity / output / outcome alignment", weight: 1.5, evidenceHint: "Activities + outcomes" },
            { key: "sdg_restraint", label: "Restraint / no SDG inflation", weight: 0.5, evidenceHint: "Full SDG set" },
        ],
    },
    {
        id: 4,
        key: "execution",
        title: "Execution, Outputs & Outcomes · What We Did → What Changed",
        weight: 32,
        rationale:
            "This is the largest component because CIEL PK must distinguish attendance from genuine delivery and delivery from demonstrated community value.",
        criteria: [
            { key: "planned_vs_actual", label: "Planned intention → actual execution", weight: 4, evidenceHint: "Activity records" },
            { key: "delivery_rigor", label: "Rigor & quality of delivery", weight: 5, evidenceHint: "Activity descriptions + photos" },
            { key: "execution_ownership", label: "Execution ownership & depth of engagement", weight: 4, evidenceHint: "Session ledger + responsibilities" },
            { key: "output_counting_integrity", label: "Outputs & counting integrity", weight: 4, evidenceHint: "Output records + partner register" },
            { key: "depth_or_scale", label: "Depth OR verified scale", weight: 3, evidenceHint: "Unique reach + session history" },
            { key: "measurable_outcomes", label: "Outcomes / measurable change", weight: 8, evidenceHint: "Attendance registers + condition checklist" },
            { key: "beneficiary_value", label: "Beneficiary value, inclusion & appropriateness", weight: 2, evidenceHint: "Beneficiary narrative + feedback" },
            { key: "adaptation_honesty", label: "Adaptation, limitations & attribution honesty", weight: 2, evidenceHint: "Limitations narrative" },
        ],
    },
    {
        id: 5,
        key: "resources",
        title: "Resource Stewardship & Efficiency",
        weight: 6,
        rationale:
            "A zero-budget project can earn full core marks. This section scores whether available time, skills, money or in-kind inputs were appropriate, traceable and efficiently used — not how wealthy the project was.",
        criteria: [
            { key: "resource_stewardship", label: "Stewardship / efficient use of available resources", weight: 2, evidenceHint: "Resource pathway + outputs" },
            { key: "resource_traceability", label: "Traceability & verification", weight: 1.5, evidenceHint: "Receipts + handover records" },
            { key: "resource_appropriateness", label: "Appropriateness / proportionality", weight: 1.5, evidenceHint: "Resource ledger + activity need" },
            { key: "resource_delivery_link", label: "Resource → delivery link", weight: 1, evidenceHint: "Enabled-by statements" },
        ],
    },
    {
        id: 6,
        key: "partnerships",
        title: "Community Collaboration, Reciprocity & Ownership",
        weight: 6,
        rationale: "Formal partner count is not the objective. One deep, reciprocal community relationship can outrank several superficial logos.",
        criteria: [
            { key: "stakeholder_relevance", label: "Relevance & reciprocity of stakeholder relationship", weight: 1.5, evidenceHint: "Partner/community identity + role" },
            { key: "stakeholder_role_clarity", label: "Clarity of stakeholder / partner role", weight: 1.5, evidenceHint: "Partner roles" },
            { key: "collaboration_quality", label: "Quality of collaboration / co-design", weight: 1.5, evidenceHint: "Coordination evidence" },
            { key: "verification_ownership", label: "Verification, ownership & continuation involvement", weight: 1.5, evidenceHint: "Verification letter + handover" },
        ],
    },
    {
        id: 7,
        key: "evidence",
        title: "Evidence, Verification & Integrity",
        weight: 15,
        rationale:
            "High-tier recognition requires claims that can be checked. Evidence quality must match the claim type: photos prove occurrence, registers prove participation, receipts prove resources and before/after data support outcome claims.",
        criteria: [
            { key: "evidence_participation", label: "Evidence supports participation / hours", weight: 2, evidenceHint: "Attendance evidence" },
            { key: "evidence_activities", label: "Evidence supports activities / outputs", weight: 3, evidenceHint: "Activity/output evidence" },
            { key: "evidence_beneficiaries", label: "Evidence supports beneficiaries / scale", weight: 2.5, evidenceHint: "Beneficiary reach evidence" },
            { key: "evidence_outcomes", label: "Evidence supports outcomes / change", weight: 4, evidenceHint: "Before/after outcome evidence" },
            { key: "evidence_resource_traceability", label: "Resource / stakeholder traceability", weight: 1.5, evidenceHint: "Resource/stakeholder evidence" },
            { key: "ethics_integrity", label: "Ethics, consent, consistency & integrity", weight: 2, evidenceHint: "Evidence declarations + consistency scan" },
        ],
    },
    {
        id: 8,
        key: "learning",
        title: "Reflection, Learning & Academic Application",
        weight: 5,
        rationale: "Community service should produce learning as well as activity. Reflection is scored for specificity and self-awareness, not for polished language.",
        criteria: [
            { key: "personal_learning", label: "Specific, honest personal learning", weight: 1.5, evidenceHint: "Personal reflection" },
            { key: "academic_application", label: "Application of discipline / knowledge where relevant", weight: 1, evidenceHint: "Academic application" },
            { key: "ethical_understanding", label: "Ethical / community understanding", weight: 1.5, evidenceHint: "Reflection narrative" },
            { key: "self_awareness", label: "Self-awareness, challenge & future improvement", weight: 1, evidenceHint: "Future-action reflection" },
        ],
    },
    {
        id: 9,
        key: "sustainability",
        title: "Sustainability, Handover & Continuation",
        weight: 6,
        rationale:
            'Not every project must continue forever. High scores come from honest continuation logic, local ownership and realistic handover — not from automatically selecting "sustainable".',
        criteria: [
            { key: "continuation_assessment", label: "Realistic continuation assessment", weight: 1.5, evidenceHint: "Sustainability narrative" },
            { key: "named_ownership", label: "Named ownership / handover", weight: 1.5, evidenceHint: "Handover record" },
            { key: "continuation_mechanism", label: "Continuation mechanism / follow-up", weight: 1.5, evidenceHint: "Handover + follow-up" },
            { key: "scaling_realism", label: "Scaling / system influence realism", weight: 1.5, evidenceHint: "Scaling statement" },
        ],
    },
];

export const CII_V2_BASE_MAX = CII_V2_SECTIONS.reduce((sum, s) => sum + s.weight, 0); // 94
export const CII_V2_BONUS_MAX = 6;
export const CII_V2_MAX = CII_V2_BASE_MAX + CII_V2_BONUS_MAX; // 100

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
    key: "effort" | "resources" | "partners";
    name: string;
    max: number;
    tiers: CiiV2BonusTier[];
}

export const CII_V2_BONUS_CHANNELS: CiiV2BonusChannel[] = [
    {
        key: "effort",
        name: "Extra verified effort above the opportunity minimum",
        max: 2,
        tiers: [
            { label: "≤ 1.00× required hours", amount: 0 },
            { label: "1.01–1.24×", amount: 0.25 },
            { label: "1.25–1.49×", amount: 0.5 },
            { label: "1.50–1.99×", amount: 1 },
            { label: "2.00–2.49×", amount: 1.5 },
            { label: "≥ 2.50×", amount: 2 },
        ],
    },
    {
        key: "resources",
        name: "Verified resource mobilisation / external leverage",
        max: 2,
        tiers: [
            { label: "None / unverified", amount: 0 },
            { label: "One modest verified contribution", amount: 0.5 },
            { label: "Multiple relevant inputs OR removes a delivery constraint", amount: 1 },
            { label: "Diverse, verified support materially expands delivery", amount: 1.5 },
            { label: "Exceptional verified leverage enabling major expansion / continuation", amount: 2 },
        ],
    },
    {
        key: "partners",
        name: "Verified partnership-building / external collaboration",
        max: 2,
        tiers: [
            { label: "No additional partnership-building", amount: 0 },
            { label: "Student activates one relevant stakeholder", amount: 0.5 },
            { label: "Partner actively contributes to delivery / verification", amount: 1 },
            { label: "Co-design/co-delivery + documented contribution", amount: 1.5 },
            { label: "Sustained ownership / replication or multi-stakeholder coordination", amount: 2 },
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
    bonus: { effort: number; resources: number; partners: number; total: number };
    integrityPenalty: number;
    final: number;
    numericLevel: number;
    level: CiiV2Level;
    gateCap: number;
    gateExplanation: string;
    evidence: CiiV2EvidenceRow[];
    evidenceAverage: number;
    bonusWhy?: { effort?: string; resources?: string; partners?: string };
    integrityWhy?: string;
    redFlags?: string[];
    needsAdminReview?: boolean;
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
