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
 * Validation is currently bypassed as per request
 */
export function validateSection1(data: any): ValidationResult {
    return { isValid: true, errors: [] };
}

/**
 * Section 2: Project Context
 */
export function validateSection2(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    const words = countWords(data.problem_statement || '');
    if (words < 100) {
        errors.push({ field: 'problem_statement', message: `Problem statement is too short (${words}/100 words min)` });
    } else if (words > 150) {
        errors.push({ field: 'problem_statement', message: `Problem statement is too long (${words}/150 words max)` });
    }

    if (!data.discipline) {
        errors.push({ field: 'discipline', message: 'Academic discipline is required' });
    }

    const discWords = countWords(data.discipline_contribution || '');
    if (discWords === 0) {
        errors.push({ field: 'discipline_contribution', message: 'Discipline contribution explanation is required' });
    } else if (discWords > 60) {
        errors.push({ field: 'discipline_contribution', message: `Explanation is too long (${discWords}/60 words max)` });
    }

    if (!data.baseline_evidence) {
        errors.push({ field: 'baseline_evidence', message: 'Baseline evidence type is required' });
    }

    return { isValid: errors.length === 0, errors };
}

/**
 * Section 3: SDG Mapping
 */
export function validateSection3(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const intentWords = countWords(data.contribution_intent_statement || '');

    if (intentWords < 80) {
        errors.push({ field: 'contribution_intent_statement', message: `Contribution logic is too short (${intentWords}/80 words min)` });
    } else if (intentWords > 120) {
        errors.push({ field: 'contribution_intent_statement', message: `Contribution logic is too long (${intentWords}/120 words max)` });
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
            if (justWords < 100 || justWords > 150) {
                errors.push({ field: `secondary_sdgs.${index}.justification_text`, message: `Justification must be 100-150 words (${justWords} current)` });
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

    if (changeWords < 80 || changeWords > 120) {
        errors.push({ field: 'observed_change', message: `Observed change narrative must be 80-120 words (${changeWords} current)` });
    }

    if (!data.metric) errors.push({ field: 'metric', message: 'Primary metric is required' });
    if (data.baseline === '') errors.push({ field: 'baseline', message: 'Baseline value is required' });
    if (data.endline === '') errors.push({ field: 'endline', message: 'Endline value is required' });

    const challengeWords = countWords(data.challenges || '');
    if (challengeWords > 150) {
        errors.push({ field: 'challenges', message: `Challenges description too long (${challengeWords}/150 words max)` });
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
    if (data.has_partners === 'yes' && !data.partners?.length) {
        errors.push({ field: 'partners', message: 'Please list your external partners' });
    }
    return { isValid: errors.length === 0, errors };
}

/**
 * Section 8: Evidence & Ethics
 */
export function validateSection8(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    if (!data.evidence_files?.length) {
        errors.push({ field: 'evidence_files', message: 'At least one evidence file is mandatory' });
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
    if (appWords < 80) errors.push({ field: 'academic_application', message: `Academic application needs more detail (${appWords}/80 words min)` });

    const personalWords = countWords(data.personal_learning || '');
    if (personalWords < 60) errors.push({ field: 'personal_learning', message: `Personal growth statement too brief (${personalWords}/60 words min)` });

    if (!data.strongest_competency) errors.push({ field: 'strongest_competency', message: 'Identify your strongest growth area' });

    return { isValid: errors.length === 0, errors };
}

/**
 * Section 10: Sustainability
 */
export function validateSection10(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const detailWords = countWords(data.continuation_details || '');
    if (detailWords < 30) errors.push({ field: 'continuation_details', message: `Sustainability roadmap needs more detail (${detailWords}/30 words min)` });

    if (data.continuation_status !== 'no' && !data.mechanisms?.length) {
        errors.push({ field: 'mechanisms', message: 'Identify at least one sustainability mechanism' });
    }
    return { isValid: errors.length === 0, errors };
}
