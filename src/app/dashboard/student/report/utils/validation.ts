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

/**
 * Section 1: Participation (Was Section 2)
 */
export function validateSection1(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Team Lead Validation
    if (!data.team_lead.name || data.team_lead.name.trim().length < 3) {
        errors.push({ field: 'team_lead.name', message: 'Full name must be at least 3 characters' });
    }
    if (!data.team_lead.cnic || !CNIC_REGEX.test(data.team_lead.cnic.replace(/-/g, ''))) {
        errors.push({ field: 'team_lead.cnic', message: 'CNIC must be 13 digits (format: 12345-1234567-1)' });
    }
    if (!data.team_lead.mobile || !MOBILE_REGEX.test(data.team_lead.mobile.replace(/-/g, ''))) {
        errors.push({ field: 'team_lead.mobile', message: 'Mobile number must start with 03 and be 11 digits' });
    }
    if (!data.team_lead.email || !EMAIL_REGEX.test(data.team_lead.email)) {
        errors.push({ field: 'team_lead.email', message: 'Please enter a valid email address' });
    }
    if (!data.team_lead.university) {
        errors.push({ field: 'team_lead.university', message: 'University is required' });
    }

    // Team Members Validation
    if (data.participation_type === 'team' && data.team_members && data.team_members.length > 0) {
        if (data.team_members.length > 19) {
            errors.push({ field: 'team_members', message: 'Maximum 19 team members allowed' });
        }
        data.team_members.forEach((member: any, index: number) => {
            const hasData = member.name || member.cnic || member.mobile;
            if (hasData) {
                if (!member.name || member.name.trim().length < 3) {
                    errors.push({ field: `team_members.${index}.name`, message: `Member ${index + 1} name is required` });
                }
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
    if (!data.problem_statement || data.problem_statement.trim().length < 50) {
        errors.push({ field: 'problem_statement', message: 'Problem statement must be at least 50 characters' });
    }
    if (!data.discipline) {
        errors.push({ field: 'discipline', message: 'Discipline selection is required' });
    }
    return { isValid: errors.length === 0, errors };
}

/**
 * Section 3: SDG Mapping
 */
export function validateSection3(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    if (!data.primary_sdg_explanation || data.primary_sdg_explanation.trim().length < 20) {
        errors.push({ field: 'primary_sdg_explanation', message: 'Please explain the primary SDG connection (min 20 chars)' });
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
    if (!data.total_sessions || isNaN(parseInt(data.total_sessions)) || parseInt(data.total_sessions) <= 0) {
        errors.push({ field: 'total_sessions', message: 'Total sessions must be greater than 0' });
    }
    if (!data.duration_val || isNaN(parseFloat(data.duration_val)) || parseFloat(data.duration_val) <= 0) {
        errors.push({ field: 'duration_val', message: 'Duration must be greater than 0' });
    }
    return { isValid: errors.length === 0, errors };
}

/**
 * Section 5: Outcomes
 */
export function validateSection5(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    if (!data.observed_change || data.observed_change.trim().length < 20) {
        errors.push({ field: 'observed_change', message: 'Observed change description is required' });
    }
    return { isValid: errors.length === 0, errors };
}

/**
 * Section 6: Resources
 */
export function validateSection6(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    if (data.use_resources === 'yes' && (!data.resources || data.resources.length === 0)) {
        errors.push({ field: 'resources', message: 'Please list at least one resource if you selected Yes' });
    }
    return { isValid: errors.length === 0, errors };
}

/**
 * Section 7: Partnerships
 */
export function validateSection7(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    if (data.has_partners === 'yes' && (!data.partners || data.partners.length === 0)) {
        errors.push({ field: 'partners', message: 'Please list at least one partner if you selected Yes' });
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
    if (!data.ethical_compliance?.authentic || !data.ethical_compliance?.informed_consent) {
        errors.push({ field: 'ethical_compliance', message: 'You must agree to all ethical compliance statements' });
    }
    return { isValid: errors.length === 0, errors };
}

/**
 * Section 9: Reflection
 */
export function validateSection9(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    if (!data.academic_integration && !data.academic_application) {
        errors.push({ field: 'academic_application', message: 'Please describe the academic connection' });
    }
    return { isValid: errors.length === 0, errors };
}

/**
 * Section 10: Sustainability
 */
export function validateSection10(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    if (!data.continuation_details || data.continuation_details.trim().length < 20) {
        errors.push({ field: 'continuation_details', message: 'Please provide details on project continuation' });
    }
    return { isValid: errors.length === 0, errors };
}
