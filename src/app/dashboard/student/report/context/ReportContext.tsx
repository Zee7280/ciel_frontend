"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ValidationError, validateSection2, validateSection3, validateSection4, validateSection5, validateSection8, validateSection12 } from '../utils/validation';

// Define the shape of the report data matches the 12 sections
export interface ReportData {
    project_id: string;
    // Section 1
    section1: {
        problem_statement: string;
    };
    // Section 2
    section2: {
        participation_type: 'individual' | 'team';
        team_lead: {
            name: string;
            cnic: string;
            mobile: string;
            email: string;
            university: string;
            degree: string;
            year: string;
            consent?: boolean;
        };
        team_members: Array<{
            name: string;
            cnic: string;
            mobile: string;
            university: string;
            program: string;
            role: string;
            hours: string;
        }>;
        privacy_consent: boolean;
    };
    // Section 3
    section3: {
        primary_sdg_explanation: string;
        secondary_sdgs: Array<{
            sdg_id: string; // Goal ID 1-17
            target_id?: string;
            indicator_id?: string;
            justification: string;
            evidence_files: File[];
        }>;
    };
    // Section 4
    section4: {
        activity_description: string;
        has_financial_resources: 'yes' | 'no';
        personal_funds: string; // stored as string to handle empty/partial inputs
        personal_funds_purpose: string[];
        raised_funds: string;
        raised_funds_source: string[];
        evidence_files: File[];
    };
    // Section 5
    section5: {
        observed_change: string;
        metrics: Array<{ metric: string; baseline: string; endline: string; unit: string }>;
    };
    // Section 6
    section6: {
        used_resources: 'yes' | 'no';
        resources: Array<{ type: string; amount: string; source: string; purpose: string }>;
        evidence_files: File[];
    };
    // Section 7
    section7: {
        has_partners: 'yes' | 'no';
        partners: Array<{ name: string; type: string; role: string; contribution: string }>;
        formalization: string[]; // MOU, Letter, etc.
        formalization_files: File[];
    };
    // Section 8
    section8: {
        evidence_types: string[];
        evidence_files: File[];
        description: string;
        media_usage: 'public' | 'limited' | 'internal';
        consent_authentic: boolean;
        consent_informed: boolean;
        consent_no_harm: boolean;
        partner_verified: boolean;
        partner_verification_files: File[];
    };
    // Section 10
    section10: {
        personal_learning: string;
        sustainability_status: 'yes' | 'partially' | 'no';
        sustainability_plan: string; // continuation or improvement plan
    };
    // Section 12
    section12: {
        student_declaration: boolean;
        partner_verification: boolean;
        partner_verification_files: File[];
    };
}

const defaultReportData: ReportData = {
    project_id: '',
    section1: { problem_statement: '' },
    section2: {
        participation_type: 'individual',
        team_lead: { name: '', cnic: '', mobile: '', email: '', university: '', degree: '', year: '' },
        team_members: [],
        privacy_consent: false
    },
    section3: { primary_sdg_explanation: '', secondary_sdgs: [] },
    section4: {
        activity_description: '',
        has_financial_resources: 'no',
        personal_funds: '',
        personal_funds_purpose: [],
        raised_funds: '',
        raised_funds_source: [],
        evidence_files: []
    },
    section5: { observed_change: '', metrics: [{ metric: '', baseline: '', endline: '', unit: '#' }] },
    section6: { used_resources: 'no', resources: [], evidence_files: [] },
    section7: { has_partners: 'no', partners: [], formalization: [], formalization_files: [] },
    section8: {
        evidence_types: [],
        evidence_files: [],
        description: '',
        media_usage: 'public',
        consent_authentic: false,
        consent_informed: false,
        consent_no_harm: false,
        partner_verified: false,
        partner_verification_files: []
    },
    section10: { personal_learning: '', sustainability_status: 'yes', sustainability_plan: '' },
    section12: { student_declaration: false, partner_verification: false, partner_verification_files: [] }
};

interface ReportContextType {
    data: ReportData;
    updateSection: (section: Exclude<keyof ReportData, 'project_id'>, payload: any) => void;
    setProjectId: (id: string) => void;
    activeStep: number;
    nextStep: () => void;
    prevStep: () => void;
    setStep: (step: number) => void;
    validationErrors: Record<string, ValidationError[]>;
    validateCurrentSection: () => boolean;
    clearValidationErrors: (section: string) => void;
    getFieldError: (fieldPath: string) => string | undefined;
    setFullData: (data: ReportData) => void;
    isReadOnly: boolean;
    setReadOnly: (readonly: boolean) => void;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function ReportProvider({ children }: { children: React.ReactNode }) {
    const [data, setData] = useState<ReportData>(defaultReportData);
    const [activeStep, setActiveStep] = useState(1);
    const [validationErrors, setValidationErrors] = useState<Record<string, ValidationError[]>>({});
    const [isReadOnly, setReadOnly] = useState(false);

    const updateSection = (section: keyof Omit<ReportData, 'project_id'>, payload: any) => {
        if (isReadOnly) return; // Prevent updates via updateSection in read-only mode

        setData(prev => ({
            ...prev,
            [section]: { ...(prev[section] as object), ...payload }
        }));

        // Clear validation errors for this section when data changes
        clearValidationErrors(section);
    };

    const setFullData = (newData: ReportData) => {
        setData(newData);
    };

    const setProjectId = (id: string) => {
        setData(prev => ({ ...prev, project_id: id }));
    }

    const clearValidationErrors = (section: string) => {
        setValidationErrors(prev => ({
            ...prev,
            [section]: []
        }));
    };

    const validateCurrentSection = (): boolean => {
        // Validation implicitly passes in read-only mode to allow navigation without errors
        if (isReadOnly) return true;

        let validationResult;
        const sectionKey = `section${activeStep}`;

        // Map step numbers to validation functions
        switch (activeStep) {
            case 2:
                validationResult = validateSection2(data.section2);
                break;
            case 3:
                validationResult = validateSection3(data.section3);
                break;
            case 4:
                validationResult = validateSection4(data.section4);
                break;
            case 5:
                validationResult = validateSection5(data.section5);
                break;
            case 8:
                validationResult = validateSection8(data.section8);
                break;
            case 12:
                validationResult = validateSection12(data.section12);
                break;
            default:
                // Sections without validation always pass
                return true;
        }

        if (!validationResult.isValid) {
            setValidationErrors(prev => ({
                ...prev,
                [sectionKey]: validationResult.errors
            }));
            return false;
        }

        // Clear errors if validation passed
        clearValidationErrors(sectionKey);
        return true;
    };

    const getFieldError = (fieldPath: string): string | undefined => {
        const sectionKey = `section${activeStep}`;
        const errors = validationErrors[sectionKey] || [];
        const error = errors.find(e => e.field === fieldPath || e.field.endsWith(`.${fieldPath}`));
        return error?.message;
    };

    const nextStep = () => setActiveStep(prev => Math.min(prev + 1, 12));
    const prevStep = () => setActiveStep(prev => Math.max(prev - 1, 1));
    const setStep = (step: number) => setActiveStep(step);

    return (
        <ReportContext.Provider value={{
            data,
            updateSection,
            setProjectId,
            activeStep,
            nextStep,
            prevStep,
            setStep,
            validationErrors,
            validateCurrentSection,
            clearValidationErrors,
            getFieldError,
            setFullData,
            isReadOnly,
            setReadOnly
        }}>
            {children}
        </ReportContext.Provider>
    );
}

export function useReportForm() {
    const context = useContext(ReportContext);
    if (context === undefined) {
        throw new Error('useReportForm must be used within a ReportProvider');
    }
    return context;
}
