"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ValidationError, validateSection1, validateSection2, validateSection3, validateSection4, validateSection5, validateSection6, validateSection7, validateSection8, validateSection9, validateSection10 } from '../utils/validation';
import { calculateEngagementMetrics } from '../utils/engagementMetrics';

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
            verified?: boolean;
        };
        team_members: Array<{
            name: string;
            cnic: string;
            mobile: string;
            university: string;
            program: string;
            role: string;
            hours: string;
            verified?: boolean;
        }>;
        attendance_logs: Array<{
            id: string;
            date: string;
            start_time: string;
            end_time: string;
            location: string;
            activity_type: string;
            description: string;
            evidence_file?: File;
            hours: number;
        }>;
        metrics: {
            total_verified_hours: number;
            total_active_days: number;
            engagement_span: number;
            attendance_frequency: number;
            weekly_continuity: number;
            eis_score: number;
            engagement_category: string;
            hec_compliance: 'below' | 'recognized' | 'advanced' | 'full';
        };
        privacy_consent: boolean;
        verified_summary?: string; // System-generated narrative
    };
    // Section 2: Project Context (Was Section 1)
    section2: {
        problem_statement: string;
        discipline: string;
        discipline_contribution: string;
        baseline_evidence: string;
        baseline_evidence_other?: string;
        problem_category?: string;
        primary_beneficiary?: string;
        summary_text?: string;
    };
    // Section 3: SDG Contribution Mapping
    section3: {
        primary_sdg: {
            goal_number: number | null;
            goal_title: string;
            target_code: string;
            indicator_code: string;
        };
        contribution_intent_statement: string;
        secondary_sdgs: Array<{
            goal_number: number;
            justification_text: string;
            status: 'provisional' | 'validated' | 'rejected';
        }>;
        validation_status: 'pending' | 'validated' | 'weak';
        summary_stage: 'preliminary' | 'validated';
        summary_text?: string;
    };
    // Section 4: Activities & Outputs (Expanded)
    section4: {
        activities: Array<{
            type: string;
            other_text?: string;
        }>;
        delivery_mode: string;
        total_sessions: string;
        primary_change_area: string;
        outputs: Array<{
            type: string;
            other_text?: string;
            count: string;
        }>;
        beneficiary_categories: string[];
        beneficiary_other?: string;
        total_beneficiaries: string;
        primary_change_area_other?: string;

        // Team-specific details (populated if team project)
        team_contributions: Array<{
            member_id: string;
            name: string;
            role: string;
            other_role?: string;
            hours: string;
            sessions: string;
            beneficiaries: string;
        }>;

        summary_text?: string; // Auto-generated
    };
    // Section 5: Outcomes (Detailed Metrics)
    section5: {
        observed_change: string;
        measurable_outcomes: Array<{
            id: string;
            outcome_area: string;
            outcome_area_other?: string;
            metric: string;
            metric_other?: string;
            baseline: string;
            endline: string;
            unit: string;
            unit_other?: string;
            confidence_level: string;
        }>;
        challenges: string;
        summary_text?: string;
    };
    // Section 6: Resources (Structured Table)
    section6: {
        use_resources: 'yes' | 'no' | '';
        resources: Array<{
            type: string;
            type_other?: string;
            amount: string;
            unit: string;
            unit_other?: string;
            sources: string[];       // multi-select
            source_other?: string;
            purpose: string;
            verification: string;
        }>;
        evidence_files: File[];
        summary_text?: string;
    };
    // Section 7: Partnerships (Structured Table)
    section7: {
        has_partners: 'yes' | 'no' | '';
        partners: Array<{
            name: string;
            type: string;
            type_other?: string;
            role: string;
            contribution: string[]; // Multi-select
            verification: string;
        }>;
        formalization_status: string[]; // MOU, Letter, etc.
        formalization_files: File[];
        summary_text?: string;
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
        media_visible: 'public' | 'limited' | 'internal' | '';
        partner_verification: boolean;
        partner_verification_type?: string;
        partner_verification_files: File[];
        summary_text?: string;
    };
    // Section 9: Reflection (New)
    section9: {
        academic_integration: string;
        personal_learning: string;
        academic_application: string;
        sustainability_reflection: string;
        competency_scores: {
            cognitive_systemic: number;
            cognitive_critical: number;
            cognitive_evaluate: number;
            practical_design: number;
            practical_evidence: number;
            practical_engagement: number;
            social_empathy: number;
            social_diversity: number;
            social_collaboration: number;
            transformative_longterm: number;
            transformative_benefits: number;
            transformative_sustainability: number;
        };
        summary_text?: string;
    };
    // Section 10: Sustainability (Renamed from Section 10 Reflection)
    section10: {
        continuation_status: 'yes' | 'partially' | 'no' | '';
        continuation_details: string; // Explanation based on status
        mechanisms: string[];
        scaling_potential: string;
        policy_influence: string;
        summary_text?: string;
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
        attendance_logs: [],
        metrics: {
            total_verified_hours: 0,
            total_active_days: 0,
            engagement_span: 0,
            attendance_frequency: 0,
            weekly_continuity: 0,
            eis_score: 0,
            engagement_category: 'Introductory Engagement',
            hec_compliance: 'below'
        },
        privacy_consent: false,
        verified_summary: ''
    },
    section2: {
        problem_statement: '',
        discipline: '',
        discipline_contribution: '',
        baseline_evidence: '',
        baseline_evidence_other: '',
        problem_category: '',
        primary_beneficiary: '',
        summary_text: ''
    },
    section3: {
        primary_sdg: {
            goal_number: null,
            goal_title: '',
            target_code: '',
            indicator_code: ''
        },
        contribution_intent_statement: '',
        secondary_sdgs: [],
        validation_status: 'pending',
        summary_stage: 'preliminary',
        summary_text: ''
    },
    section4: {
        activities: [],
        delivery_mode: '',
        total_sessions: '',
        primary_change_area: '',
        outputs: [],
        beneficiary_categories: [],
        total_beneficiaries: '',
        team_contributions: [],
        summary_text: ''
    },
    section5: {
        observed_change: '',
        measurable_outcomes: [{
            id: 'outcome-0',
            outcome_area: '',
            metric: '',
            baseline: '',
            endline: '',
            unit: '',
            confidence_level: ''
        }],
        challenges: '',
        summary_text: ''
    },
    section6: {
        use_resources: '',
        resources: [],
        evidence_files: [],
        summary_text: ''
    },

    section7: {
        has_partners: 'no',
        partners: [],
        formalization_status: [],
        formalization_files: []
    },
    section8: {
        evidence_types: [],
        evidence_files: [],
        description: '',
        ethical_compliance: {
            authentic: false,
            informed_consent: false,
            no_harm: false,
            privacy_respected: false
        },
        media_visible: '',
        partner_verification: false,
        partner_verification_type: '',
        partner_verification_files: [],
        summary_text: ''
    },
    section9: {
        academic_integration: '',
        personal_learning: '',
        academic_application: '',
        sustainability_reflection: '',
        competency_scores: {
            cognitive_systemic: 0,
            cognitive_critical: 0,
            cognitive_evaluate: 0,
            practical_design: 0,
            practical_evidence: 0,
            practical_engagement: 0,
            social_empathy: 0,
            social_diversity: 0,
            social_collaboration: 0,
            transformative_longterm: 0,
            transformative_benefits: 0,
            transformative_sustainability: 0
        },
        summary_text: ''
    },
    section10: {
        continuation_status: '',
        continuation_details: '',
        mechanisms: [],
        scaling_potential: '',
        policy_influence: '',
        summary_text: ''
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
    saveReport: (silent?: boolean) => Promise<boolean>;
    isParticipationUnlocked: boolean;
    setParticipationUnlocked: (unlocked: boolean) => void;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function ReportProvider({ children }: { children: React.ReactNode }) {
    const [data, setData] = useState<ReportData>(defaultReportData);
    const [activeStep, setActiveStep] = useState(1);
    const [validationErrors, setValidationErrors] = useState<Record<string, ValidationError[]>>({});
    const [isReadOnly, setReadOnly] = useState(false);
    const [isParticipationUnlocked, setParticipationUnlocked] = useState(false);

    // Auto-calculate Section 1 metrics whenever attendance logs change
    useEffect(() => {
        const metrics = calculateEngagementMetrics(data.section1.attendance_logs);

        // Deep compare or just check if meaningful change occurred to avoid loop
        if (JSON.stringify(metrics) !== JSON.stringify(data.section1.metrics)) {
            setData(prev => ({
                ...prev,
                section1: {
                    ...prev.section1,
                    metrics
                }
            }));
        }
    }, [data.section1.attendance_logs]);

    const clearValidationErrors = useCallback((section: string) => {
        setValidationErrors(prev => ({
            ...prev,
            [section]: []
        }));
    }, []);

    const updateSection = useCallback((section: keyof Omit<ReportData, 'project_id'>, payload: any) => {
        if (isReadOnly) return; // Prevent updates via updateSection in read-only mode

        setData(prev => ({
            ...prev,
            [section]: { ...(prev[section] as object), ...payload }
        }));

        // Clear validation errors for this section when data changes
        clearValidationErrors(section);
    }, [isReadOnly, clearValidationErrors]);

    const setFullData = useCallback((newData: Partial<ReportData>) => {
        if (!newData || Object.keys(newData).length === 0) return;

        setData(prev => {
            const merged = { ...prev, ...newData };
            // Ensure each section is also merged with its defaults to prevent undefined sub-properties
            if (newData.section1) merged.section1 = { ...defaultReportData.section1, ...prev.section1, ...newData.section1 };
            if (newData.section2) merged.section2 = { ...defaultReportData.section2, ...prev.section2, ...newData.section2 };
            if (newData.section3) merged.section3 = { ...defaultReportData.section3, ...prev.section3, ...newData.section3 };
            if (newData.section4) merged.section4 = { ...defaultReportData.section4, ...prev.section4, ...newData.section4 };
            if (newData.section5) merged.section5 = { ...defaultReportData.section5, ...prev.section5, ...newData.section5 };
            if (newData.section6) merged.section6 = { ...defaultReportData.section6, ...prev.section6, ...newData.section6 };
            if (newData.section7) merged.section7 = { ...defaultReportData.section7, ...prev.section7, ...newData.section7 };
            if (newData.section8) merged.section8 = { ...defaultReportData.section8, ...prev.section8, ...newData.section8 };
            if (newData.section9) merged.section9 = { ...defaultReportData.section9, ...prev.section9, ...newData.section9 };
            if (newData.section10) merged.section10 = { ...defaultReportData.section10, ...prev.section10, ...newData.section10 };
            if (newData.section11) merged.section11 = { ...defaultReportData.section11, ...prev.section11, ...newData.section11 };
            return merged;
        });
    }, []);

    const setProjectId = useCallback((id: string) => {
        setData(prev => ({ ...prev, project_id: id }));
    }, []);

    const validateCurrentSection = useCallback((): boolean => {
        // Validation implicitly passes in read-only mode to allow navigation without errors
        if (isReadOnly) return true;

        let validationResult: { isValid: boolean; errors: ValidationError[] } = { isValid: true, errors: [] };
        const sectionKey = `section${activeStep}`;

        switch (activeStep) {
            case 1: validationResult = validateSection1(data.section1); break;
            case 2: validationResult = validateSection2(data.section2); break;
            case 3: validationResult = validateSection3(data.section3); break;
            case 4: validationResult = validateSection4(data.section4); break;
            case 5: validationResult = validateSection5(data.section5); break;
            case 6: validationResult = validateSection6(data.section6); break;
            case 7: validationResult = validateSection7(data.section7); break;
            case 8: validationResult = validateSection8(data.section8); break;
            case 9: validationResult = validateSection9(data.section9); break;
            case 10: validationResult = validateSection10(data.section10); break;
            case 11: return true;
            default: return true;
        }

        if (!validationResult.isValid) {
            setValidationErrors(prev => ({
                ...prev,
                [sectionKey]: validationResult.errors
            }));
            return false;
        }

        clearValidationErrors(sectionKey);
        return true;
    }, [isReadOnly, activeStep, data, clearValidationErrors]);

    const getFieldError = useCallback((fieldPath: string): string | undefined => {
        const sectionKey = `section${activeStep}`;
        const errors = validationErrors[sectionKey] || [];
        const error = errors.find(e => e.field === fieldPath || e.field.endsWith(`.${fieldPath}`));
        return error?.message;
    }, [activeStep, validationErrors]);

    const nextStep = useCallback(() => setActiveStep(prev => Math.min(prev + 1, 11)), []);
    const prevStep = useCallback(() => setActiveStep(prev => Math.max(prev - 1, 1)), []);
    const setStep = useCallback((step: number) => setActiveStep(step), []);

    const saveReport = useCallback(async (silent: boolean = false): Promise<boolean> => {
        if (isReadOnly) return false;

        try {
            const { authenticatedFetch } = await import('@/utils/api');
            const { toast } = await import('sonner');

            // Fallback: read project_id from URL if not yet set in state
            let projectId = data.project_id;
            if (!projectId && typeof window !== 'undefined') {
                const params = new URLSearchParams(window.location.search);
                projectId = params.get('projectId') || params.get('project') || '';
            }

            if (!projectId) {
                if (!silent) toast.error('Project ID missing — cannot save. Please reload the page.');
                return false;
            }

            const res = await authenticatedFetch(`/api/v1/student/reports`, {
                method: 'POST',
                body: JSON.stringify({
                    ...data,
                    project_id: projectId,
                    status: 'draft'
                })
            });

            if (!res || !res.ok) throw new Error('Save failed');
            if (!silent) toast.success('Progress saved!');
            return true;
        } catch (error) {
            console.error('Context Save Error:', error);
            const { toast } = await import('sonner');
            if (!silent) toast.error('Failed to save progress. Please try again.');
            return false;
        }
    }, [isReadOnly, data]);

    const contextValue = useMemo(() => ({
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
        setReadOnly,
        saveReport,
        isParticipationUnlocked,
        setParticipationUnlocked
    }), [
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
        saveReport,
        isParticipationUnlocked
    ]);

    return (
        <ReportContext.Provider value={contextValue}>
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
