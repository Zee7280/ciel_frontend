/**
 * Validation utility for Student Report Form
 * Updated for the 11-Section Community Engagement Report
 */

export interface ValidationError {
    field: string;
    message: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CNIC_REGEX = /^(\d{13}|\d{5}-\d{7}-\d{1})$/;
const MOBILE_REGEX = /^03\d{9}$/;

/** Community report narrative textareas — default rule; specific fields can tighten it below. */
export const REPORT_TEXT_MIN_WORDS = 20;
export const REPORT_TEXT_MAX_WORDS = 200;
export const REPORT_TEXT_RANGE_LABEL = "20–200 words";

/** Per-field word-count overrides for narrative fields with a tighter, field-specific target. */
export const FIELD_WORD_POLICY: Record<string, { min: number; max: number }> = {
    problem_statement: { min: 20, max: 60 },
    discipline_contribution: { min: 15, max: 50 },
    contribution_intent_statement: { min: 30, max: 80 },
    student_contribution_intent_statement: { min: 20, max: 60 },
    justification_text: { min: 20, max: 60 },
    observed_change: { min: 40, max: 100 },
    challenges: { min: 15, max: 60 },
    continuation_details: { min: 60, max: 120 },
    description: { min: 15, max: 200 },
    evidence_caption: { min: 10, max: 200 },
};

export function wordRangeLabel(min: number, max: number): string {
    return `${min}–${max} words`;
}

function isCustomActivityChoice(value: unknown): boolean {
    const text = String(value || '').trim();
    if (!text) return false;
    if (/^other$/i.test(text)) return true;
    return /other\s*\/\s*custom/i.test(text);
}

export function countWords(str: string): number {
    return str.trim().split(/\s+/).filter(w => w.length > 0).length;
}

export function reportTextWordMeter(
    count: number,
    min: number = REPORT_TEXT_MIN_WORDS,
    max: number = REPORT_TEXT_MAX_WORDS,
): {
    ok: boolean;
    over: boolean;
    barClass: string;
    textClass: string;
    widthPct: number;
} {
    const over = count > max;
    const ok = count >= min && !over;
    return {
        ok,
        over,
        barClass: count < min ? "bg-amber-400" : over ? "bg-red-500" : "bg-emerald-500",
        textClass: ok ? "text-emerald-600" : over ? "text-red-500" : "text-slate-400",
        widthPct: Math.min((count / max) * 100, 100),
    };
}

function pushWordRange(
    errors: ValidationError[],
    field: string,
    value: unknown,
    label: string,
    required = true,
    policyKeyOverride?: string,
) {
    const policyKey = policyKeyOverride
        || (field.includes(".") ? field.slice(field.lastIndexOf(".") + 1) : field);
    const { min, max } = FIELD_WORD_POLICY[policyKey] || { min: REPORT_TEXT_MIN_WORDS, max: REPORT_TEXT_MAX_WORDS };
    const rangeLabel = wordRangeLabel(min, max);
    const text = typeof value === "string" ? value : "";
    if (!text.trim()) {
        if (required) {
            errors.push({
                field,
                message: `${label} must be ${rangeLabel} (0 current)`,
            });
        }
        return;
    }
    const n = countWords(text);
    if (n < min || n > max) {
        errors.push({
            field,
            message: `${label} must be ${rangeLabel} (${n} current)`,
        });
    }
}

/**
 * Section 1: Participation
 * Enforce individual hour requirements
 */
export function validateSection1(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const hasPrivacyConsent = Boolean(data.privacy_consent || data.review_checked?.[2]);
    // The 3-item declaration replaces the old mid-flow attendance-verification request — the
    // whole report is verified once, at the end, by faculty. All three boxes must be ticked.
    const declarationComplete = Array.isArray(data.review_checked) && data.review_checked.length >= 3
        ? data.review_checked.slice(0, 3).every(Boolean)
        : false;

    if (!declarationComplete) {
        errors.push({ field: 'review_checked', message: 'Please complete all three declaration checkboxes.' });
    }

    // Older drafts store the consent only in the final review checklist.
    if (!hasPrivacyConsent) {
        errors.push({ field: 'privacy_consent', message: 'You must provide privacy consent to proceed.' });
    }

    return { isValid: errors.length === 0, errors };
}


/**
 * Section 2: Project Context
 */
export function validateSection2(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    pushWordRange(errors, 'problem_statement', data.problem_statement, 'Problem statement');

    if (!String(data.affected_group || '').trim()) {
        errors.push({ field: 'affected_group', message: 'Who was affected is required' });
    }
    const affectedCount = Number(String(data.affected_count || '').replace(/,/g, ''));
    if (!String(data.affected_count || '').trim() || !Number.isFinite(affectedCount) || affectedCount <= 0) {
        errors.push({ field: 'affected_count', message: 'Enter the approximate number affected' });
    }
    if (!Array.isArray(data.system_gaps) || data.system_gaps.length === 0) {
        errors.push({ field: 'system_gaps', message: 'Choose at least one thing that was missing' });
    }

    if (!data.discipline) {
        errors.push({ field: 'discipline', message: 'Academic discipline is required' });
    } else if (data.discipline === 'Other…' && !String(data.discipline_other || '').trim()) {
        errors.push({ field: 'discipline_other', message: 'Please name your discipline' });
    }

    pushWordRange(errors, 'discipline_contribution', data.discipline_contribution, 'Discipline contribution explanation');

    if (!data.baseline_evidence || data.baseline_evidence.length === 0) {
        errors.push({ field: 'baseline_evidence', message: 'At least one baseline evidence type is required' });
    }

    // "Other" system-gap chip reveals a required free-text field (Section2ProjectContext.tsx) that
    // was never actually enforced here — a blank box passed submit silently.
    if (Array.isArray(data.system_gaps) && data.system_gaps.includes('Other') && !String(data.system_gaps_other || '').trim()) {
        errors.push({ field: 'system_gaps_other', message: 'Please specify the "Other" system gap' });
    }

    const hasOtherToken = Array.isArray(data.baseline_evidence) && (data.baseline_evidence as string[]).some((s) => /^__o_(\d+)$/.test(String(s)));
    const hasLegacyOther = Array.isArray(data.baseline_evidence) && (data.baseline_evidence as string[]).includes("Other");
    if (hasOtherToken || hasLegacyOther) {
        const entries: string[] =
            Array.isArray((data as { baseline_other_entries?: string[] }).baseline_other_entries) &&
            (data as { baseline_other_entries?: string[] }).baseline_other_entries!.length > 0
                ? (data as { baseline_other_entries: string[] }).baseline_other_entries
                : [String((data as { baseline_evidence_other?: string }).baseline_evidence_other || "")];
        for (let i = 0; i < entries.length; i++) {
            if (!String(entries[i] || "").trim()) {
                errors.push({
                    field: `baseline_other_entries.${i}`,
                    message: `Other evidence source #${i + 1} is required`,
                });
            }
        }
    }

    return { isValid: errors.length === 0, errors };
}

/**
 * Section 3: SDG Mapping
 */
export function validateSection3(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const hasStudentMappingSelection = Boolean(
        data.primary_sdg?.goal_number ||
        data.primary_sdg?.target_id ||
        data.primary_sdg?.target_code ||
        data.primary_sdg?.indicator_id ||
        data.primary_sdg?.indicator_code
    );

    pushWordRange(errors, 'contribution_intent_statement', data.contribution_intent_statement, 'Contribution logic');

    const forbiddenPhrases = ["achieved", "solved", "eliminated"];
    forbiddenPhrases.forEach(phrase => {
        if (data.contribution_intent_statement?.toLowerCase().includes(phrase.toLowerCase())) {
            errors.push({ field: 'contribution_intent_statement', message: `Avoid outcome claims like "${phrase}". Focus on intent.` });
        }
    });

    if (hasStudentMappingSelection) {
        pushWordRange(errors, 'student_contribution_intent_statement', data.student_contribution_intent_statement, 'Student contribution logic');

        forbiddenPhrases.forEach(phrase => {
            if (data.student_contribution_intent_statement?.toLowerCase().includes(phrase.toLowerCase())) {
                errors.push({ field: 'student_contribution_intent_statement', message: `Avoid outcome claims like "${phrase}". Focus on intent.` });
            }
        });
    }

    if (data.secondary_sdgs && data.secondary_sdgs.length > 0) {
        data.secondary_sdgs.forEach((sdg: any, index: number) => {
            pushWordRange(errors, `secondary_sdgs.${index}.justification_text`, sdg.justification_text, 'Justification');
        });
    }

    return { isValid: errors.length === 0, errors };
}

/**
 * Section 4: Activities & Outputs
 */
export function validateSection4(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (!data.activity_blocks || data.activity_blocks.length === 0) {
        errors.push({ field: 'activity_blocks', message: 'At least one activity block is required' });
    } else {
        data.activity_blocks.forEach((block: any, index: number) => {
            if (!block.title?.trim()) errors.push({ field: `activity_blocks.${index}.title`, message: `Activity ${index + 1}: Title is required` });
            if (!block.primary_category) errors.push({ field: `activity_blocks.${index}.primary_category`, message: `Activity ${index + 1}: Activity family is required` });
            if (isCustomActivityChoice(block.primary_category) && !String(block.other_category_text || '').trim()) {
                errors.push({ field: `activity_blocks.${index}.other_category_text`, message: `Activity ${index + 1}: Name the custom activity family` });
            }
            if (block.primary_category && !isCustomActivityChoice(block.primary_category) && !block.sub_category) {
                errors.push({ field: `activity_blocks.${index}.sub_category`, message: `Activity ${index + 1}: Sub-category is required` });
            }
            if (isCustomActivityChoice(block.sub_category) && !String(block.other_sub_category_text || '').trim()) {
                errors.push({ field: `activity_blocks.${index}.other_sub_category_text`, message: `Activity ${index + 1}: Describe the custom sub-category` });
            }
            if (!block.status) errors.push({ field: `activity_blocks.${index}.status`, message: `Activity ${index + 1}: Status is required` });

            pushWordRange(errors, `activity_blocks.${index}.description`, block.description, `Activity ${index + 1} description`);

            const hasOutput = (block.outputs || []).some((out: any) => String(out?.title || '').trim() && String(out?.quantity ?? '').trim());
            const hasReach = String(block.beneficiaries_reached ?? '').trim() && String(block.unique_beneficiaries ?? block.beneficiaries_reached ?? '').trim();
            if (!hasOutput && !hasReach) {
                errors.push({ field: `activity_blocks.${index}.outputs`, message: `Activity ${index + 1}: Add a countable output or a beneficiary reach` });
            }
        });
    }

    return { isValid: errors.length === 0, errors };
}

/**
 * Section 5: Outcomes & Results
 */
export function validateSection5(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    pushWordRange(errors, 'observed_change', data.observed_change, 'Observed change narrative');

    if (!data.measurable_outcomes || data.measurable_outcomes.length === 0) {
        errors.push({ field: 'measurable_outcomes', message: 'At least one measurable outcome is required' });
    } else {
        data.measurable_outcomes.forEach((outcome: any, index: number) => {
            if (!outcome.outcome_area) errors.push({ field: `measurable_outcomes.${index}.outcome_area`, message: 'Outcome category is required' });
            if (!outcome.outcome_sub_category && outcome.outcome_area !== 'Other') errors.push({ field: `measurable_outcomes.${index}.outcome_sub_category`, message: 'Outcome sub-category is required' });
            if (!outcome.metric_category) errors.push({ field: `measurable_outcomes.${index}.metric_category`, message: 'Metric category is required' });
            if (!outcome.metric) errors.push({ field: `measurable_outcomes.${index}.metric`, message: 'Primary metric unit is required' });
            if (/^other$/i.test(String(outcome.metric || '').trim()) && !String(outcome.metric_other || '').trim()) {
                errors.push({ field: `measurable_outcomes.${index}.metric_other`, message: 'Please specify the custom metric unit' });
            }
            if (outcome.baseline === '') errors.push({ field: `measurable_outcomes.${index}.baseline`, message: 'Baseline value is required' });
            if (outcome.endline === '') errors.push({ field: `measurable_outcomes.${index}.endline`, message: 'Endline value is required' });
            if (!outcome.unit) errors.push({ field: `measurable_outcomes.${index}.unit`, message: 'Unit of measurement is required' });
            if (!outcome.confidence_level || outcome.confidence_level.length === 0) errors.push({ field: `measurable_outcomes.${index}.confidence_level`, message: 'At least one confidence level is required' });
            
            pushWordRange(errors, `measurable_outcomes.${index}.measurement_explanation`, outcome.measurement_explanation, 'Measurement explanation');
        });
    }

    pushWordRange(errors, 'challenges', data.challenges, 'Challenges description');

    return { isValid: errors.length === 0, errors };
}

/**
 * Section 6: Resources
 */
export function validateSection6(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (data.use_resources === 'yes') {
        if (!data.resources?.length) {
            errors.push({ field: 'resources', message: 'Please list the resources used' });
        } else {
            data.resources.forEach((res: any, index: number) => {
                // One clear line beats a 50-word minimum — just require it's said.
                if (!String(res.purpose || '').trim()) {
                    errors.push({ field: `resources.${index}.purpose`, message: 'Say what this resource made possible' });
                }

                if (['Other (Specify)', 'Other / Custom'].includes(res.type) && !String(res.type_other || '').trim()) {
                    errors.push({ field: `resources.${index}.type_other`, message: 'Please specify the resource type' });
                }

                if (['Other (Specify)', 'Other…'].includes(res.unit) && !String(res.unit_other || '').trim()) {
                    errors.push({ field: `resources.${index}.unit_other`, message: 'Please specify the unit' });
                }

                const sources = Array.isArray(res.sources) ? res.sources : [];
                if (sources.some((item: string) => item === 'Other (Specify)' || item === 'Other / Custom Source') && !String(res.source_other || '').trim()) {
                    errors.push({ field: `resources.${index}.source_other`, message: 'Please specify the source' });
                }
            });
        }
    }
    
    return { isValid: errors.length === 0, errors };
}

/**
 * Section 7: Partnerships
 */
export function validateSection7(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Require explicit selection — empty string means user hasn't chosen yet
    if (!data.has_partners) {
        errors.push({ field: 'has_partners', message: 'Please confirm whether this project had active partners' });
        return { isValid: false, errors };
    }

    // If 'no', bypass all further validation
    if (data.has_partners === 'no') {
        return { isValid: true, errors: [] };
    }

    // has_partners === 'yes' — must have at least one partner
    if (!data.partners?.length) {
        errors.push({ field: 'partners', message: 'Please list your external partners' });
        return { isValid: false, errors };
    }

    // Validate individual partner fields
    data.partners.forEach((p: any, index: number) => {
        if (!p.name?.trim()) {
            errors.push({ field: `partners.${index}.name`, message: `Partner ${index + 1}: Organization name is required` });
        }
        if (!p.type) {
            errors.push({ field: `partners.${index}.type`, message: `Partner ${index + 1}: Partner type is required` });
        }
        // "Others (please specify)" reveals a required free-text field (Section7Partnerships.tsx)
        // that was never actually enforced here — selecting it and leaving it blank passed submit.
        if ((p.type === 'Others (please specify)' || p.type === '✏️ Other') && !String(p.type_other || '').trim()) {
            errors.push({ field: `partners.${index}.type_other`, message: `Partner ${index + 1}: Please specify the "Other" partner type` });
        }
        const roleList = Array.isArray(p.role) ? p.role : (p.role ? [String(p.role)] : []);
        if (!roleList.length) {
            errors.push({ field: `partners.${index}.role`, message: `Partner ${index + 1}: At least one role in project is required` });
        }
        if (!p.contribution?.length) {
            errors.push({ field: `partners.${index}.contribution`, message: `Partner ${index + 1}: At least one contribution type is required` });
        }
    });

    return { isValid: errors.length === 0, errors };
}

/**
 * Section 8: Evidence & Ethics
 */
export function validateSection8(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (data.has_evidence !== 'yes' && data.has_evidence !== 'no') {
        errors.push({ field: 'has_evidence', message: 'Tell us whether you have more evidence to add' });
    }

    if (data.has_evidence === 'yes') {
        if (!data.evidence_files?.length) {
            errors.push({ field: 'evidence_files', message: 'Add at least one evidence file' });
        }
        if (!data.evidence_types?.length) {
            errors.push({ field: 'evidence_types', message: 'Choose at least one evidence type' });
        }
        const types: string[] = Array.isArray(data.evidence_types) ? data.evidence_types : [];
        if (types.some((type) => /other supporting document/i.test(String(type))) && !String(data.evidence_type_other || '').trim()) {
            errors.push({ field: 'evidence_type_other', message: 'Say what kind of document this is' });
        }
        pushWordRange(errors, 'description', data.description, 'Evidence explanation', true, 'evidence_caption');
    }

    if (!data.media_visible) {
        errors.push({ field: 'media_visible', message: 'Choose Public, Institutional, or Private' });
    }
    const ethics = data.ethical_compliance || {};
    if (!ethics.authentic || !ethics.informed_consent || !ethics.no_harm || !ethics.privacy_respected) {
        errors.push({ field: 'ethical_compliance', message: 'Confirm this evidence was gathered responsibly' });
    }
    return { isValid: errors.length === 0, errors };
}

/**
 * Section 9: Reflection
 */
export function validateSection9(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (!data.academic_integration) {
        errors.push({ field: 'academic_integration', message: 'Please select an academic integration level' });
    }
    if (!Array.isArray(data.skills_grown) || data.skills_grown.length === 0) {
        errors.push({ field: 'skills_grown', message: 'Tap at least one skill you grew' });
    }
    if ((data.skills_grown || []).some((skill: string) => String(skill).replace(/^✏️\s*/, '').trim().toLowerCase() === 'other') && !String(data.skills_grown_other || '').trim()) {
        errors.push({ field: 'skills_grown_other', message: 'Name the other skill you grew' });
    }
    if (!String(data.reflection_biggest_learning || '').trim()) {
        errors.push({ field: 'reflection_biggest_learning', message: 'Say the biggest thing you learned' });
    }
    if (!String(data.reflection_moment || '').trim()) {
        errors.push({ field: 'reflection_moment', message: 'Name a moment that changed how you see things' });
    }
    if (!String(data.reflection_discipline_help || '').trim()) {
        errors.push({ field: 'reflection_discipline_help', message: 'Name an academic skill you actually applied' });
    }

    pushWordRange(errors, 'personal_learning', data.personal_learning, 'Personal growth statement');
    pushWordRange(errors, 'academic_application', data.academic_application, 'Academic application explanation');

    const scoreKeys = [
        'cognitive_systemic', 'cognitive_critical', 'cognitive_evaluate',
        'practical_design', 'practical_evidence', 'practical_engagement',
        'social_empathy', 'social_diversity', 'social_collaboration',
        'transformative_longterm', 'transformative_benefits', 'transformative_sustainability',
    ];
    const scores = data.competency_scores || {};
    if (!scoreKeys.every((key) => Number(scores[key]) >= 1)) {
        errors.push({ field: 'competency_scores', message: 'Rate all 12 competencies' });
    }

    return { isValid: errors.length === 0, errors };
}

/**
 * Section 10: Sustainability
 */
export function validateSection10(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    if (!data.continuation_status) {
        errors.push({ field: 'continuation_status', message: 'Sustainability continuation status is required' });
    }
    pushWordRange(errors, 'continuation_details', data.continuation_details, 'Continuation explanation');

    if (!data.mechanisms?.length) {
        errors.push({ field: 'mechanisms', message: 'Identify at least one sustainability mechanism' });
    }
    if ((data.mechanisms || []).some((item: string) => String(item).replace(/^✏️\s*/, '').trim().toLowerCase() === 'other') && !String(data.mechanism_other || '').trim()) {
        errors.push({ field: 'mechanism_other', message: 'Say what else keeps it going' });
    }
    if (!data.scaling_potential) {
        errors.push({ field: 'scaling_potential', message: 'Scaling potential is required' });
    }
    if (!data.policy_influence) {
        errors.push({ field: 'policy_influence', message: 'Say whether this project influenced a long-term system' });
    }
    return { isValid: errors.length === 0, errors };
}

/** Labels for data sections 1–10. UI merges 4+5 into one tab and renumbers 6–10 as 5–9. */
export const REPORT_SECTION_LABELS: Record<number, string> = {
    1: 'Participation',
    2: 'Context',
    3: 'SDG Mapping',
    4: 'Activities & Outputs (Part A)',
    5: 'Activities & Outputs (Part B)',
    6: 'Resources',
    7: 'Partnerships',
    8: 'Evidence',
    9: 'Reflection',
    10: 'Sustainability',
};

export type SectionIncompleteInfo = {
    section: number;
    label: string;
    errors: ValidationError[];
};

/**
 * Returns each of sections 1–10 that still fail validation, with field-level messages
 * (used on the summary step and before submit).
 */
export function getIncompleteSectionsSummary(data: {
    section1: any;
    section2: any;
    section3: any;
    section4: any;
    section5: any;
    section6: any;
    section7: any;
    section8: any;
    section9: any;
    section10: any;
}): SectionIncompleteInfo[] {
    const rows: Array<{ section: number; result: ValidationResult }> = [
        { section: 1, result: validateSection1(data.section1) },
        { section: 2, result: validateSection2(data.section2) },
        { section: 3, result: validateSection3(data.section3) },
        { section: 4, result: validateSection4(data.section4) },
        { section: 5, result: validateSection5(data.section5) },
        { section: 6, result: validateSection6(data.section6) },
        { section: 7, result: validateSection7(data.section7) },
        { section: 8, result: validateSection8(data.section8) },
        { section: 9, result: validateSection9(data.section9) },
        { section: 10, result: validateSection10(data.section10) },
    ];
    return rows
        .filter((r) => !r.result.isValid)
        .map((r) => ({
            section: r.section,
            label: REPORT_SECTION_LABELS[r.section] || `Section ${r.section}`,
            errors: r.result.errors,
        }));
}
