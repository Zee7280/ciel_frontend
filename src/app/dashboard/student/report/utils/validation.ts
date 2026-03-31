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

function countWords(str: string): number {
    return str.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Section 1: Participation
 * Enforce individual hour requirements
 */
export function validateSection1(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (data.metrics?.hec_compliance === 'below') {
        errors.push({ 
            field: 'metrics.hec_compliance', 
            message: 'Must meet the required engagement hours (at least equal to the goal) to be eligible for report submission.' 
        });
    }

    if (!data.privacy_consent) {
        errors.push({ field: 'privacy_consent', message: 'You must provide privacy consent to proceed.' });
    }

    return { isValid: errors.length === 0, errors };
}


/**
 * Section 2: Project Context
 */
export function validateSection2(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    const words = countWords(data.problem_statement || '');
    if (words < 100) {
        errors.push({ field: 'problem_statement', message: `Problem statement is too short (${words}/100 words min)` });
    } else if (words > 200) {
        errors.push({ field: 'problem_statement', message: `Problem statement is too long (${words}/200 words max)` });
    }

    if (!data.discipline) {
        errors.push({ field: 'discipline', message: 'Academic discipline is required' });
    }

    const discWords = countWords(data.discipline_contribution || '');
    if (discWords < 100) {
        errors.push({ field: 'discipline_contribution', message: `Discipline contribution explanation is too short (${discWords}/100 words min)` });
    } else if (discWords > 200) {
        errors.push({ field: 'discipline_contribution', message: `Explanation is too long (${discWords}/200 words max)` });
    }

    if (!data.baseline_evidence || data.baseline_evidence.length === 0) {
        errors.push({ field: 'baseline_evidence', message: 'At least one baseline evidence type is required' });
    }

    return { isValid: errors.length === 0, errors };
}

/**
 * Section 3: SDG Mapping
 */
export function validateSection3(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const intentWords = countWords(data.contribution_intent_statement || '');

    if (intentWords < 100) {
        errors.push({ field: 'contribution_intent_statement', message: `Contribution logic is too short (${intentWords}/100 words min)` });
    } else if (intentWords > 200) {
        errors.push({ field: 'contribution_intent_statement', message: `Contribution logic is too long (${intentWords}/200 words max)` });
    }

    const forbiddenPhrases = ["achieved", "solved", "eliminated"];
    forbiddenPhrases.forEach(phrase => {
        if (data.contribution_intent_statement?.toLowerCase().includes(phrase.toLowerCase())) {
            errors.push({ field: 'contribution_intent_statement', message: `Avoid outcome claims like "${phrase}". Focus on intent.` });
        }
    });

    if (data.secondary_sdgs && data.secondary_sdgs.length > 0) {
        data.secondary_sdgs.forEach((sdg: any, index: number) => {
            const justWords = countWords(sdg.justification_text || '');
            if (justWords < 100 || justWords > 200) {
                errors.push({ field: `secondary_sdgs.${index}.justification_text`, message: `Justification must be 100-200 words (${justWords} current)` });
            }
        });
    }

    return { isValid: errors.length === 0, errors };
}

/**
 * Section 4: Activities & Outputs
 */
export function validateSection4(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    if (!data.activities?.length) errors.push({ field: 'activities', message: 'At least one activity is required' });
    if (!data.outputs?.length) errors.push({ field: 'outputs', message: 'At least one output is required' });
    if (!data.total_beneficiaries) errors.push({ field: 'total_beneficiaries', message: 'Total beneficiaries is required' });
    return { isValid: errors.length === 0, errors };
}

/**
 * Section 5: Outcomes & Results
 */
export function validateSection5(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const changeWords = countWords(data.observed_change || '');

    if (changeWords < 100 || changeWords > 200) {
        errors.push({ field: 'observed_change', message: `Observed change narrative must be 100-200 words (${changeWords} current)` });
    }

    if (!data.measurable_outcomes || data.measurable_outcomes.length === 0) {
        errors.push({ field: 'measurable_outcomes', message: 'At least one measurable outcome is required' });
    } else {
        data.measurable_outcomes.forEach((outcome: any, index: number) => {
            if (!outcome.outcome_area) errors.push({ field: `measurable_outcomes.${index}.outcome_area`, message: 'Outcome category is required' });
            if (!outcome.metric) errors.push({ field: `measurable_outcomes.${index}.metric`, message: 'Primary metric is required' });
            if (outcome.baseline === '') errors.push({ field: `measurable_outcomes.${index}.baseline`, message: 'Baseline value is required' });
            if (outcome.endline === '') errors.push({ field: `measurable_outcomes.${index}.endline`, message: 'Endline value is required' });
            if (!outcome.unit) errors.push({ field: `measurable_outcomes.${index}.unit`, message: 'Unit of measurement is required' });
            if (!outcome.confidence_level) errors.push({ field: `measurable_outcomes.${index}.confidence_level`, message: 'Confidence level is required' });
        });
    }

    const challengeWords = countWords(data.challenges || '');
    if (challengeWords < 100) {
        errors.push({ field: 'challenges', message: `Challenges description too short (${challengeWords}/100 words min)` });
    } else if (challengeWords > 200) {
        errors.push({ field: 'challenges', message: `Challenges description too long (${challengeWords}/200 words max)` });
    }

    return { isValid: errors.length === 0, errors };
}

/**
 * Section 6: Resources
 */
export function validateSection6(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    if (data.use_resources === 'yes' && !data.resources?.length) {
        errors.push({ field: 'resources', message: 'Please list the resources used' });
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
        if (!p.role) {
            errors.push({ field: `partners.${index}.role`, message: `Partner ${index + 1}: Role in project is required` });
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

    // Only run full validation when user has explicitly opted in to providing evidence.
    // If has_evidence is 'no' OR not yet set (undefined), bypass completely.
    if (data.has_evidence !== 'yes') {
        return { isValid: true, errors: [] };
    }

    if (!data.evidence_files?.length) {
        errors.push({ field: 'evidence_files', message: 'At least one evidence file is mandatory' });
    }
    if (!data.evidence_types?.length) {
        errors.push({ field: 'evidence_types', message: 'At least one evidence type is mandatory' });
    }
    const wordCount = (data.description || '').trim().split(/\s+/).filter((w: string) => w.length > 0).length;
    if (wordCount < 100 || wordCount > 200) {
        errors.push({ field: 'description', message: `Description must be between 100 and 200 words (Currently ${wordCount})` });
    }
    if (!data.media_visible) {
        errors.push({ field: 'media_visible', message: 'Media visibility preference is required' });
    }
    const ethics = data.ethical_compliance || {};
    if (!ethics.authentic || !ethics.informed_consent || !ethics.no_harm || !ethics.privacy_respected) {
        errors.push({ field: 'ethical_compliance', message: 'All ethical compliance checks must be accepted' });
    }
    return { isValid: errors.length === 0, errors };
}

/**
 * Section 9: Reflection
 */
export function validateSection9(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const appWords = countWords(data.academic_application || '');
    if (appWords < 100 || appWords > 200) errors.push({ field: 'academic_application', message: `Academic application must be 100-200 words (${appWords} current)` });

    const personalWords = countWords(data.personal_learning || '');
    if (personalWords < 100 || personalWords > 200) errors.push({ field: 'personal_learning', message: `Personal growth statement must be 100-200 words (${personalWords} current)` });

    if (!data.strongest_competency) errors.push({ field: 'strongest_competency', message: 'Identify your strongest growth area' });

    return { isValid: errors.length === 0, errors };
}

/**
 * Section 10: Sustainability
 */
export function validateSection10(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const detailWords = countWords(data.continuation_details || '');
    if (detailWords < 100 || detailWords > 200) errors.push({ field: 'continuation_details', message: `Sustainability roadmap must be 100-200 words (${detailWords} current)` });

    if (data.continuation_status !== 'no' && !data.mechanisms?.length) {
        errors.push({ field: 'mechanisms', message: 'Identify at least one sustainability mechanism' });
    }
    return { isValid: errors.length === 0, errors };
}
