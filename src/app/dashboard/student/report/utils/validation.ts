/**
 * Validation utility for Student Report Form
 * Provides comprehensive validation for all 12 sections
 */

export interface ValidationError {
    field: string;
    message: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

// Email regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// CNIC regex (13 digits or formatted: 12345-1234567-1)
const CNIC_REGEX = /^(\d{13}|\d{5}-\d{7}-\d{1})$/;
// Mobile regex (03XXXXXXXXX)
const MOBILE_REGEX = /^03\d{9}$/;

/**
 * Section 2: Team Validation
 */
export function validateSection2(data: any): ValidationResult {
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

    if (!data.team_lead.degree) {
        errors.push({ field: 'team_lead.degree', message: 'Degree program is required' });
    }

    if (!data.team_lead.year) {
        errors.push({ field: 'team_lead.year', message: 'Academic year is required' });
    }


    // Team Members Validation (only validate if they exist)
    if (data.participation_type === 'team' && data.team_members && data.team_members.length > 0) {
        if (data.team_members.length > 19) {
            errors.push({ field: 'team_members', message: 'Maximum 19 team members allowed' });
        }

        // Validate each existing team member
        data.team_members.forEach((member: any, index: number) => {
            // Only validate if member has some data
            const hasData = member.name || member.cnic || member.mobile;

            if (hasData) {
                if (!member.name || member.name.trim().length < 3) {
                    errors.push({ field: `team_members[${index}].name`, message: `Team member ${index + 1} name is required` });
                }
                if (member.mobile && !MOBILE_REGEX.test(member.mobile.replace(/-/g, ''))) {
                    errors.push({ field: `team_members[${index}].mobile`, message: `Team member ${index + 1} mobile number is invalid` });
                }
                if (member.cnic && !CNIC_REGEX.test(member.cnic.replace(/-/g, ''))) {
                    errors.push({ field: `team_members[${index}].cnic`, message: `Team member ${index + 1} CNIC is invalid` });
                }
            }
        });
    }

    // Consent validation
    if (!data.team_lead?.consent) {
        errors.push({ field: 'team_lead.consent', message: 'You must consent to privacy terms to continue' });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Section 3: SDG Mapping Validation
 */
export function validateSection3(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (!data.primary_sdg_explanation || data.primary_sdg_explanation.trim().length < 50) {
        errors.push({ field: 'primary_sdg_explanation', message: 'Primary SDG explanation must be at least 50 characters' });
    }

    // Secondary SDGs are optional, but if they exist, validate them
    if (data.secondary_sdgs && data.secondary_sdgs.length > 0) {
        data.secondary_sdgs.forEach((sdg: any, index: number) => {
            if (!sdg.sdg_id || parseInt(sdg.sdg_id) < 1 || parseInt(sdg.sdg_id) > 17) {
                errors.push({ field: `secondary_sdgs[${index}].sdg_id`, message: `SDG ${index + 1} must be between 1 and 17` });
            }
            if (!sdg.justification || sdg.justification.trim().length < 30) {
                errors.push({ field: `secondary_sdgs[${index}].justification`, message: `SDG ${index + 1} justification must be at least 30 characters` });
            }
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Section 4: Activities Validation
 */
export function validateSection4(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (!data.activity_description || data.activity_description.trim().length < 50) {
        errors.push({ field: 'activity_description', message: 'Activity description must be at least 50 characters' });
    }

    if (data.has_financial_resources === 'yes') {
        const personalFunds = parseFloat(data.personal_funds) || 0;
        const raisedFunds = parseFloat(data.raised_funds) || 0;

        if (personalFunds === 0 && raisedFunds === 0) {
            errors.push({ field: 'financial_resources', message: 'Please specify personal funds OR raised funds amount' });
        }

        if (personalFunds > 0 && (!data.personal_funds_purpose || data.personal_funds_purpose.length === 0)) {
            errors.push({ field: 'personal_funds_purpose', message: 'Please specify how personal funds were used' });
        }

        if (raisedFunds > 0 && (!data.raised_funds_source || data.raised_funds_source.length === 0)) {
            errors.push({ field: 'raised_funds_source', message: 'Please specify the source of raised funds' });
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Section 5: Outcomes Validation
 */
export function validateSection5(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (!data.observed_change || data.observed_change.trim().length < 100) {
        errors.push({ field: 'observed_change', message: 'Observed change description must be at least 100 characters' });
    }

    if (!data.metrics || data.metrics.length === 0) {
        errors.push({ field: 'metrics', message: 'At least one metric is required' });
    } else {
        data.metrics.forEach((metric: any, index: number) => {
            if (!metric.metric || metric.metric.trim().length === 0) {
                errors.push({ field: `metrics[${index}].metric`, message: `Metric ${index + 1} name is required` });
            }
            if (!metric.baseline || metric.baseline.trim().length === 0) {
                errors.push({ field: `metrics[${index}].baseline`, message: `Metric ${index + 1} baseline value is required` });
            }
            if (!metric.endline || metric.endline.trim().length === 0) {
                errors.push({ field: `metrics[${index}].endline`, message: `Metric ${index + 1} endline value is required` });
            }
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Section 8: Evidence Validation
 */
export function validateSection8(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (!data.evidence_files || data.evidence_files.length === 0) {
        errors.push({ field: 'evidence_files', message: 'At least one evidence file is required' });
    }

    if (!data.consent_authentic) {
        errors.push({ field: 'consent_authentic', message: 'You must certify that evidence is authentic' });
    }

    if (!data.consent_informed) {
        errors.push({ field: 'consent_informed', message: 'You must have informed consent for all media' });
    }

    if (!data.consent_no_harm) {
        errors.push({ field: 'consent_no_harm', message: 'You must certify that evidence causes no harm' });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Section 12: Declaration Validation
 */
export function validateSection12(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (!data.student_declaration) {
        errors.push({ field: 'student_declaration', message: 'You must accept the declaration to submit the report' });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Master validation function - validates all sections
 */
export function validateAllSections(reportData: any): ValidationResult {
    const allErrors: ValidationError[] = [];

    // Validate each section
    const section2Result = validateSection2(reportData.section2);
    const section3Result = validateSection3(reportData.section3);
    const section4Result = validateSection4(reportData.section4);
    const section5Result = validateSection5(reportData.section5);
    const section8Result = validateSection8(reportData.section8);
    const section12Result = validateSection12(reportData.section12);

    // Collect all errors
    allErrors.push(
        ...section2Result.errors.map(e => ({ ...e, field: `section2.${e.field}` })),
        ...section3Result.errors.map(e => ({ ...e, field: `section3.${e.field}` })),
        ...section4Result.errors.map(e => ({ ...e, field: `section4.${e.field}` })),
        ...section5Result.errors.map(e => ({ ...e, field: `section5.${e.field}` })),
        ...section8Result.errors.map(e => ({ ...e, field: `section8.${e.field}` })),
        ...section12Result.errors.map(e => ({ ...e, field: `section12.${e.field}` }))
    );

    return {
        isValid: allErrors.length === 0,
        errors: allErrors
    };
}
