"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ValidationError, validateSection1, validateSection2, validateSection3, validateSection4, validateSection5, validateSection6, validateSection7, validateSection8, validateSection9, validateSection10 } from '../utils/validation';

// Define the shape of the report data matches the 11 sections (plus summary)
export interface ReportData {
    project_id: string;
    // Section 1: Participation (Was Section 2)
    section1: {
        participation_type: 'individual' | 'team';
        team_lead: {
            name: string;
            cnic: string;
            mobile: string;
            email: string;
            university: string;
            degree: string;
            year: string;
            role: string;
            hours: string;
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
        engagement_score?: number; // Calculated
    };
    // Section 2: Project Context (Was Section 1)
    section2: {
        problem_statement: string;
        discipline: string;
        baseline_evidence: string;
    };
    // Section 3: SDG Mapping (Unchanged)
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
    // Section 4: Activities (Expanded)
    section4: {
        activity_type: string;
        delivery_mode: string;
        total_sessions: string;
        duration_val: string;
        duration_unit: string;
        total_beneficiaries: string;
        // Individual contributions (if team)
        my_role: string;
        my_hours: string;
        my_sessions: string;
        my_beneficiaries: string;
        my_output: string;
        beneficiary_categories: string[]; // Multi-select
    };
    // Section 5: Outcomes (Detailed Metrics)
    section5: {
        observed_change: string;
        outcome_area: string;
        metric: string;
        baseline: string;
        endline: string;
        unit: string;
        confidence_level: string;
        challenges: string;
    };
    // Section 6: Resources (Structured Table)
    section6: {
        use_resources: 'yes' | 'no';
        resources: Array<{
            type: string;
            amount: string;
            unit: string;
            source: string;
            purpose: string;
            verification: string;
        }>;
        evidence_files: File[];
    };
    // Section 7: Partnerships (Structured Table)
    section7: {
        has_partners: 'yes' | 'no';
        partners: Array<{
            name: string;
            type: string;
            role: string;
            contribution: string[]; // Multi-select
            verification: string;
        }>;
        formalization_status: string[]; // MOU, Letter, etc.
        formalization_files: File[];
    };
    // Section 8: Evidence (Expanded)
    section8: {
        evidence_types: string[];
        evidence_files: File[];
        description: string;
        ethical_compliance: {
            authentic: boolean;
            informed_consent: boolean;
            no_harm: boolean;
            privacy_respected: boolean;
        };
        media_visible: 'public' | 'limited' | 'internal';
        partner_verification: boolean;
        partner_verification_files: File[];
    };
    // Section 9: Reflection (New)
    section9: {
        academic_integration: string;
        personal_learning: string;
        academic_application: string;
        sustainability_reflection: string;
        competency_scores: {
            cognitive: number;
            practical: number;
            social: number;
            transformative: number;
        };
        strongest_competency: string;
    };
    // Section 10: Sustainability (Renamed from Section 10 Reflection)
    section10: {
        continuation_status: 'yes' | 'partially' | 'no';
        continuation_details: string; // Explanation based on status
        mechanisms: string[];
        scaling_potential: string;
        policy_influence: string;
    };
    // Section 11: Summary (Intelligence Layer - mostly read-only/calculated, strictly strictly read-only so maybe empty here or just status)
    section11: {};
}

const defaultReportData: ReportData = {
    project_id: '',
    section1: {
        participation_type: 'individual',
        team_lead: { name: '', cnic: '', mobile: '', email: '', university: '', degree: '', year: '', role: '', hours: '' },
        team_members: [],
        privacy_consent: false
    },
    section2: { problem_statement: '', discipline: '', baseline_evidence: '' },
    section3: { primary_sdg_explanation: '', secondary_sdgs: [] },
    section4: {
        activity_type: '',
        delivery_mode: '',
        total_sessions: '',
        duration_val: '',
        duration_unit: 'Hours',
        total_beneficiaries: '',
        my_role: '',
        my_hours: '',
        my_sessions: '',
        my_beneficiaries: '',
        my_output: '',
        beneficiary_categories: []
    },
    section5: {
        observed_change: '',
        outcome_area: '',
        metric: '',
        baseline: '',
        endline: '',
        unit: '#',
        confidence_level: '',
        challenges: ''
    },
    section6: { use_resources: 'no', resources: [], evidence_files: [] },
    section7: { has_partners: 'no', partners: [], formalization_status: [], formalization_files: [] },
    section8: {
        evidence_types: [],
        evidence_files: [],
        description: '',
        ethical_compliance: { authentic: false, informed_consent: false, no_harm: false, privacy_respected: false },
        media_visible: 'public',
        partner_verification: false,
        partner_verification_files: []
    },
    section9: {
        academic_integration: '',
        personal_learning: '',
        academic_application: '',
        sustainability_reflection: '',
        competency_scores: { cognitive: 0, practical: 0, social: 0, transformative: 0 },
        strongest_competency: ''
    },
    section10: {
        continuation_status: 'yes',
        continuation_details: '',
        mechanisms: [],
        scaling_potential: '',
        policy_influence: 'No'
    },
    section11: {}
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

    const setFullData = (newData: Partial<ReportData>) => {
        setData(prev => {
            const merged = { ...defaultReportData, ...newData };
            // Ensure each section is also merged with its defaults to prevent undefined sub-properties
            if (newData.section1) merged.section1 = { ...defaultReportData.section1, ...newData.section1 };
            if (newData.section2) merged.section2 = { ...defaultReportData.section2, ...newData.section2 };
            if (newData.section3) merged.section3 = { ...defaultReportData.section3, ...newData.section3 };
            if (newData.section4) merged.section4 = { ...defaultReportData.section4, ...newData.section4 };
            if (newData.section5) merged.section5 = { ...defaultReportData.section5, ...newData.section5 };
            if (newData.section6) merged.section6 = { ...defaultReportData.section6, ...newData.section6 };
            if (newData.section7) merged.section7 = { ...defaultReportData.section7, ...newData.section7 };
            if (newData.section8) merged.section8 = { ...defaultReportData.section8, ...newData.section8 };
            if (newData.section9) merged.section9 = { ...defaultReportData.section9, ...newData.section9 };
            if (newData.section10) merged.section10 = { ...defaultReportData.section10, ...newData.section10 };
            return merged;
        });
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

        let validationResult: { isValid: boolean; errors: ValidationError[] } = { isValid: true, errors: [] };
        const sectionKey = `section${activeStep}`;

        // Map step numbers to validation functions - Update as per new structure
        // Note: You will need to import and map the new validation functions appropriately
        // For now, defaulting to basic check or existing placeholders where ID matches
        switch (activeStep) {
            case 1: // Participation - Updated to validateSection1
                validationResult = validateSection1(data.section1);
                break;
            case 2: // Context - Updated to validateSection2
                validationResult = validateSection2(data.section2);
                break;
            case 3: // SDG - Updated to validateSection3
                validationResult = validateSection3(data.section3);
                break;
            case 4: // Activities - Updated to validateSection4
                validationResult = validateSection4(data.section4);
                break;
            case 5: // Outcomes - Updated to validateSection5
                validationResult = validateSection5(data.section5);
                break;
            case 6: // Resources - New validateSection6
                validationResult = validateSection6(data.section6);
                break;
            case 7: // Partnerships - New validateSection7
                validationResult = validateSection7(data.section7);
                break;
            case 8: // Evidence - Updated validateSection8
                validationResult = validateSection8(data.section8);
                break;
            case 9: // Reflection - New validateSection9
                validationResult = validateSection9(data.section9);
                break;
            case 10: // Sustainability - New validateSection10
                validationResult = validateSection10(data.section10);
                break;
            case 11: // Summary - No validation
                return true;
            default:
                return true;
        }

        /* 
           TODO: Re-enable validation once util functions are updated to match new schema 
        */

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

    const nextStep = () => setActiveStep(prev => Math.min(prev + 1, 11)); // Max 11 steps
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
