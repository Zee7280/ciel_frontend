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
 * Section 1: Participation (Was Section 2)
 */
export function validateSection1(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Team Lead Validation
    if (!data.team_lead.name || data.team_lead.name.trim().length < 3) {
        errors.push({ field: 'team_lead.name', message: 'Full name must be at least 3 characters' });
    }
    if (!data.team_lead.cnic) {
        errors.push({ field: 'team_lead.cnic', message: 'CNIC is required' });
    } else if (!CNIC_REGEX.test(data.team_lead.cnic.replace(/-/g, ''))) {
        errors.push({ field: 'team_lead.cnic', message: 'CNIC must be 13 digits (format: 12345-1234567-1)' });
    }
    if (!data.team_lead.mobile) {
        errors.push({ field: 'team_lead.mobile', message: 'Mobile number is required' });
    } else if (!MOBILE_REGEX.test(data.team_lead.mobile.replace(/-/g, ''))) {
        errors.push({ field: 'team_lead.mobile', message: 'Mobile number must start with 03 and be 11 digits' });
    }
    if (!data.team_lead.email || !EMAIL_REGEX.test(data.team_lead.email)) {
        errors.push({ field: 'team_lead.email', message: 'Please enter a valid email address' });
    }
    if (!data.team_lead.university) {
        errors.push({ field: 'team_lead.university', message: 'University is required' });
    }
    if (!data.team_lead.degree) {
        errors.push({ field: 'team_lead.degree', message: 'Degree / Program is required' });
    }
    if (!data.team_lead.role) {
        errors.push({ field: 'team_lead.role', message: 'Your role is required' });
    }
    if (!data.team_lead.hours || isNaN(parseFloat(data.team_lead.hours)) || parseFloat(data.team_lead.hours) <= 0) {
        errors.push({ field: 'team_lead.hours', message: 'Please enter valid hours' });
    }

    // Team Members Validation
    if (data.participation_type === 'team') {
        if (!data.team_members || data.team_members.length === 0) {
            errors.push({ field: 'team_members', message: 'Please add at least one team member' });
        } else if (data.team_members.length > 19) {
            errors.push({ field: 'team_members', message: 'Maximum 19 team members allowed' });
        }

        data.team_members.forEach((member: any, index: number) => {
            if (!member.name || member.name.trim().length < 3) {
                errors.push({ field: `team_members.${index}.name`, message: `Member ${index + 1} name is required (min 3 chars)` });
            }
            if (member.cnic && member.cnic.trim() !== '' && !CNIC_REGEX.test(member.cnic.replace(/-/g, ''))) {
                errors.push({ field: `team_members.${index}.cnic`, message: `Member ${index + 1} CNIC is invalid` });
            }
            if (!member.hours || isNaN(parseFloat(member.hours)) || parseFloat(member.hours) <= 0) {
                errors.push({ field: `team_members.${index}.hours`, message: `Member ${index + 1} hours are required` });
            }
        });
    }

    if (!data.privacy_consent) {
        errors.push({ field: 'privacy_consent', message: 'You must consent to privacy terms' });
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
    } else if (words > 160) {
        errors.push({ field: 'problem_statement', message: `Problem statement is too long (${words}/150 words target)` });
    }

    if (!data.discipline) {
        errors.push({ field: 'discipline', message: 'Academic discipline is required' });
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
    if (!data.primary_sdg_explanation || data.primary_sdg_explanation.trim().length < 50) {
        errors.push({ field: 'primary_sdg_explanation', message: 'Please provide a detailed explanation (min 50 chars)' });
    }

    if (data.secondary_sdgs && data.secondary_sdgs.length > 0) {
        data.secondary_sdgs.forEach((sdg: any, index: number) => {
            if (!sdg.sdg_id) {
                errors.push({ field: `secondary_sdgs.${index}.sdg_id`, message: 'Please select an SDG goal' });
            }
            if (!sdg.justification || sdg.justification.trim().length < 20) {
                errors.push({ field: `secondary_sdgs.${index}.justification`, message: 'Please provide justification (min 20 chars)' });
            }
        });
    }

    return { isValid: errors.length === 0, errors };
}

/**
 * Section 4: Activities
 */
export function validateSection4(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    if (!data.activity_type) {
        errors.push({ field: 'activity_type', message: 'Activity type is required' });
    }
    if (!data.delivery_mode) {
        errors.push({ field: 'delivery_mode', message: 'Delivery mode is required' });
    }
    if (!data.total_sessions || isNaN(parseInt(data.total_sessions)) || parseInt(data.total_sessions) <= 0) {
        errors.push({ field: 'total_sessions', message: 'Total sessions must be greater than 0' });
    }
    if (!data.duration_val || isNaN(parseFloat(data.duration_val)) || parseFloat(data.duration_val) <= 0) {
        errors.push({ field: 'duration_val', message: 'Total duration must be greater than 0' });
    }
    if (!data.total_beneficiaries || isNaN(parseInt(data.total_beneficiaries)) || parseInt(data.total_beneficiaries) <= 0) {
        errors.push({ field: 'total_beneficiaries', message: 'Total beneficiaries must be greater than 0' });
    }

    if (!data.my_role) {
        errors.push({ field: 'my_role', message: 'Your role is required' });
    }
    if (!data.my_hours || isNaN(parseFloat(data.my_hours)) || parseFloat(data.my_hours) <= 0) {
        errors.push({ field: 'my_hours', message: 'Your hours are required' });
    }
    if (!data.beneficiary_categories || data.beneficiary_categories.length === 0) {
        errors.push({ field: 'beneficiary_categories', message: 'Select at least one beneficiary category' });
    }

    return { isValid: errors.length === 0, errors };
}

/**
 * Section 5: Outcomes
 */
export function validateSection5(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    if (!data.observed_change || data.observed_change.trim().length < 30) {
        errors.push({ field: 'observed_change', message: 'Observed change description is required (min 30 chars)' });
    }
    if (!data.outcome_area) {
        errors.push({ field: 'outcome_area', message: 'Outcome area is required' });
    }
    if (!data.metric) {
        errors.push({ field: 'metric', message: 'Specific metric is required' });
    }
    if (data.baseline === undefined || data.baseline === '') {
        errors.push({ field: 'baseline', message: 'Baseline value is required' });
    }
    if (data.endline === undefined || data.endline === '') {
        errors.push({ field: 'endline', message: 'Endline value is required' });
    }
    if (!data.confidence_level) {
        errors.push({ field: 'confidence_level', message: 'Confidence level is required' });
    }
    return { isValid: errors.length === 0, errors };
}

/**
 * Section 6: Resources
 */
export function validateSection6(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    if (data.use_resources === 'yes') {
        if (!data.resources || data.resources.length === 0) {
            errors.push({ field: 'resources', message: 'Please list at least one resource' });
        } else {
            data.resources.forEach((res: any, index: number) => {
                if (!res.type) errors.push({ field: `resources.${index}.type`, message: 'Resource type is required' });
                if (!res.amount) errors.push({ field: `resources.${index}.amount`, message: 'Amount is required' });
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
    if (data.has_partners === 'yes') {
        if (!data.partners || data.partners.length === 0) {
            errors.push({ field: 'partners', message: 'Please list at least one partner' });
        } else {
            data.partners.forEach((partner: any, index: number) => {
                if (!partner.name) errors.push({ field: `partners.${index}.name`, message: 'Partner name is required' });
                if (!partner.type) errors.push({ field: `partners.${index}.type`, message: 'Partner type is required' });
            });
        }
    }
    return { isValid: errors.length === 0, errors };
}

/**
 * Section 8: Evidence
 */
export function validateSection8(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    if (!data.evidence_files || data.evidence_files.length === 0) {
        errors.push({ field: 'evidence_files', message: 'At least one evidence file is required' });
    }
    if (!data.ethical_compliance?.authentic || !data.ethical_compliance?.informed_consent || !data.ethical_compliance?.no_harm || !data.ethical_compliance?.privacy_respected) {
        errors.push({ field: 'ethical_compliance', message: 'You must agree to all ethical compliance statements' });
    }
    return { isValid: errors.length === 0, errors };
}

/**
 * Section 9: Reflection
 */
export function validateSection9(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    if (!data.academic_application || data.academic_application.trim().length < 20) {
        errors.push({ field: 'academic_application', message: 'Please describe academic application (min 20 chars)' });
    }
    if (!data.personal_learning || data.personal_learning.trim().length < 20) {
        errors.push({ field: 'personal_learning', message: 'Please describe personal learning (min 20 chars)' });
    }
    if (!data.strongest_competency) {
        errors.push({ field: 'strongest_competency', message: 'Select your strongest competency area' });
    }
    return { isValid: errors.length === 0, errors };
}

/**
 * Section 10: Sustainability
 */
export function validateSection10(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    if (!data.continuation_details || data.continuation_details.trim().length < 30) {
        errors.push({ field: 'continuation_details', message: 'Please provide detailed continuation plan (min 30 chars)' });
    }
    if (data.continuation_status !== 'no' && (!data.mechanisms || data.mechanisms.length === 0)) {
        errors.push({ field: 'mechanisms', message: 'Select at least one sustainability mechanism' });
    }
    return { isValid: errors.length === 0, errors };
}
