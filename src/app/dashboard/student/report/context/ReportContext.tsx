"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ValidationError, validateSection1, validateSection2, validateSection3, validateSection4, validateSection5, validateSection6, validateSection7, validateSection8, validateSection9, validateSection10, getIncompleteSectionsSummary, type SectionIncompleteInfo } from '../utils/validation';
import { calculateEngagementMetrics } from '../utils/engagementMetrics';

// Define the shape of the report data matches the 11 sections (plus summary)
export interface ReportData {
    project_id: string;
    /** Short official name from opportunity / API; preferred over long problem statements on certificates. */
    project_title?: string;
    status?: string;
    admin_status?: string;
    partner_status?: string;
    /** When backend sends project/report payment state separately from `status`. */
    report_status?: string;
    payment_verified?: boolean;
    // Section 1: Participation (Was Section 2)
    section1: {
        participation_type: 'individual' | 'team';
        team_lead: {
            id?: string;
            name: string;
            fullName?: string;
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
            id?: string;
            name: string;
            fullName?: string;
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
            participantId?: string;
            /** Backend / report payload (snake_case). Null = legacy row (counts toward verified hours). */
            approval_status?: string | null;
            assigned_approver_type?: string | null;
            assigned_approver_user_id?: string | null;
            opportunity_creator_kind?: string | null;
        }>;
        metrics: {
            total_verified_hours: number;
            total_active_days: number;
            engagement_span: number;
            attendance_frequency: number;
            weekly_continuity: number;
            eis_score: number;
            engagement_category: string;
            hec_compliance: 'below' | 'recognized' | 'advanced' | 'full' | 'non-compliant';
            individual_metrics?: any[];
            redFlags?: string[];
            isNonCompliant?: boolean;
        };
        privacy_consent: boolean;
        review_checked?: boolean[];
        verified_summary?: string; // System-generated narrative
        faculty_supervisor_email?: string;
    };
    // Section 2: Project Context (Was Section 1)
    section2: {
        problem_statement: string;
        discipline: string;
        discipline_contribution: string;
        baseline_evidence: string[];
        baseline_evidence_other?: string;
        problem_category?: string;
        primary_beneficiary?: string;
        summary_text?: string;
    };
    // Section 3: SDG Contribution Mapping
    section3: {
        primary_sdg: {
            goal_number: number | string | null;
            goal_title?: string;
            target_id: string;
            indicator_id: string;
        };
        contribution_intent_statement: string;
        student_contribution_intent_statement: string;
        secondary_sdgs: Array<{
            goal_number: number | string | null;
            target_id?: string;
            indicator_id?: string;
            justification_text: string;
            status: 'provisional' | 'validated' | 'rejected';
        }>;
        validation_status: 'pending' | 'validated' | 'weak';
        summary_stage: 'preliminary' | 'validated';
        summary_text?: string;
    };
    section4: {
        activity_blocks: Array<{
            id: string;
            title: string;
            primary_category: string;
            sub_category: string;
            other_category_text?: string;
            description: string;
            status: string; // Completed, Partially Completed, Ongoing
            
            // 4.2 Delivery
            delivery_mode: string;
            implementation_models: string[];
            sessions_count: string;
            delivery_explanation: string;
            
            // 4.3 Outputs
            outputs: Array<{
                title: string;
                type: string;
                quantity: string;
                unit: string;
                verification_note: string;
                is_shared: boolean;
            }>;
            
            // 4.4 Beneficiaries
            serves_beneficiaries: boolean;
            beneficiaries_reached: string;
            beneficiary_categories: string[];
            relevance_types: string[];
            overlap_status: string;
            beneficiary_description: string;
            
            // 4.5 Location
            geographic_reach: string;
            geographic_sub_category: string;
            site_note: string;
        }>;
        project_summary: {
            distinct_total_beneficiaries: string;
            counting_method: string;
            overall_overlap: string;
            overall_delivery_mode: string;
            overall_implementation_model: string[];
            overall_geographic_reach: string;
            project_implementation_explanation: string;
        };
        summary_text?: string;
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
            metric_category: string;
            outcome_sub_category: string;
            baseline: string;
            endline: string;
            unit: string;
            unit_other?: string;
            confidence_level: string[];
            measurement_explanation?: string;
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
            verification: string[];  // 6.2.6 multi-select
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
            role: string[]; // Multi-select — role in project
            contribution: string[]; // Multi-select
            verification: string;
        }>;
        formalization_status: string[]; // MOU, Letter, etc.
        formalization_files: File[];
        summary_text?: string;
    };
    // Section 8: Evidence (Expanded)
    section8: {
        has_evidence: 'yes' | 'no' | '';
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
    section11: {
        summary_text?: string;
        is_ai_generated?: boolean;
    };
    required_hours?: number;
}


const defaultReportData: ReportData = {
    project_id: '',
    project_title: '',
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
        review_checked: [false, false, false],
        verified_summary: '',
        faculty_supervisor_email: ''
    },
    section2: {
        problem_statement: '',
        discipline: '',
        discipline_contribution: '',
        baseline_evidence: [],
        baseline_evidence_other: '',
        problem_category: '',
        primary_beneficiary: '',
        summary_text: ''
    },
    section3: {
        primary_sdg: {
            goal_number: null,
            target_id: '',
            indicator_id: ''
        },
        contribution_intent_statement: '',
        student_contribution_intent_statement: '',
        secondary_sdgs: [],
        validation_status: 'pending',
        summary_stage: 'preliminary',
        summary_text: ''
    },
    section4: {
        activity_blocks: [],
        project_summary: {
            distinct_total_beneficiaries: '',
            counting_method: '',
            overall_overlap: '',
            overall_delivery_mode: '',
            overall_implementation_model: [],
            overall_geographic_reach: '',
            project_implementation_explanation: ''
        },
        summary_text: ''
    },

    section5: {
        observed_change: '',
        measurable_outcomes: [{
            id: 'outcome-0',
            outcome_area: '',
            outcome_sub_category: '',
            metric_category: '',
            metric: '',
            baseline: '',
            endline: '',
            unit: '',
            confidence_level: [],
            measurement_explanation: ''
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
        has_evidence: '',
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
    section11: {
        summary_text: ''
    },
    required_hours: 16
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
    setRequiredHours: (hours: number) => void;
    isEligibleForSubmission: boolean;
    /** Sections 1–10 pass validation (summary step excluded). */
    areAllSectionsComplete: boolean;
    /** Hours + all sections valid — final submit allowed. */
    canSubmitReport: boolean;
    /** Sections 1–10 that fail validation, with messages (for summary / submit UX). */
    incompleteSectionsSummary: SectionIncompleteInfo[];
    /**
     * Intelligence strip (CII / hours / beneficiaries / SDG) may be shown only after
     * payment is recorded and an admin has verified (or legacy `status` indicates full clearance).
     */
    showVerifiedImpactScores: boolean;
}


const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function ReportProvider({ children }: { children: React.ReactNode }) {
    const [data, setData] = useState<ReportData>(defaultReportData);
    const [activeStep, setActiveStep] = useState(1);
    const [validationErrors, setValidationErrors] = useState<Record<string, ValidationError[]>>({});
    const [isReadOnly, setReadOnly] = useState(false);
    const [isParticipationUnlocked, setParticipationUnlocked] = useState(false);
    
    // Eligibility for Submission (Progress vs Submission Mode)
    const isEligibleForSubmission = useMemo(() => {
        const metHours = (data.section1.metrics?.total_verified_hours || 0) >= (data.required_hours || 16);
        return metHours;
    }, [data.section1.metrics?.total_verified_hours, data.required_hours]);

    const areAllSectionsComplete = useMemo(() => {
        const checks = [
            validateSection1(data.section1),
            validateSection2(data.section2),
            validateSection3(data.section3),
            validateSection4(data.section4),
            validateSection5(data.section5),
            validateSection6(data.section6),
            validateSection7(data.section7),
            validateSection8(data.section8),
            validateSection9(data.section9),
            validateSection10(data.section10),
        ];
        return checks.every((r) => r.isValid);
    }, [data]);

    const canSubmitReport = useMemo(
        () => isEligibleForSubmission && areAllSectionsComplete,
        [isEligibleForSubmission, areAllSectionsComplete],
    );

    const incompleteSectionsSummary = useMemo(
        () => getIncompleteSectionsSummary(data),
        [data],
    );

    const showVerifiedImpactScores = useMemo(() => {
        const st = String(data.status || '').toLowerCase();
        const rs = String(data.report_status || '').toLowerCase();
        const adm = String(data.admin_status || '').toLowerCase();
        const reportFullyVerified =
            st === 'verified' || st === 'approved' || st === 'finalized';
        const adminDone =
            adm === 'verified' || adm === 'approved' || reportFullyVerified;
        const paymentCleared =
            st === 'paid' ||
            rs === 'paid' ||
            data.payment_verified === true ||
            // End-state report implies fee + review completed in this product flow
            reportFullyVerified;
        return adminDone && paymentCleared;
    }, [data.status, data.report_status, data.admin_status, data.payment_verified]);

    // Auto-calculate Section 1 metrics whenever attendance logs change
    useEffect(() => {
        const teamSize = (data.section1.participation_type === 'team' ? data.section1.team_members.length : 0) + 1;
        const metrics = calculateEngagementMetrics(data.section1.attendance_logs, data.required_hours, teamSize);

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
    }, [data.section1.attendance_logs, data.required_hours]);


    const clearValidationErrors = useCallback((section: string) => {
        setValidationErrors(prev => ({
            ...prev,
            [section]: []
        }));
    }, []);

    const updateSection = useCallback((section: keyof Omit<ReportData, 'project_id'>, payload: any) => {
        // Intelligence layer (Section 11) is allowed to be updated even in read-only mode
        // to show/persist AI summaries generated after submission.
        if (isReadOnly && section !== 'section11') return;

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
            // Section 6: resource verification is multi-select (string[]); normalize legacy string values
            if (merged.section6?.resources?.length) {
                merged.section6 = {
                    ...merged.section6,
                    resources: merged.section6.resources.map((r: any) => ({
                        ...r,
                        verification: Array.isArray(r.verification)
                            ? r.verification
                            : r.verification != null && String(r.verification).trim() !== ''
                                ? [String(r.verification)]
                                : [],
                    })),
                };
            }
            // Section 7: partner role is multi-select (string[]); normalize legacy string values
            if (merged.section7?.partners?.length) {
                merged.section7 = {
                    ...merged.section7,
                    partners: merged.section7.partners.map((p: any) => ({
                        ...p,
                        role: Array.isArray(p.role)
                            ? p.role
                            : p.role != null && String(p.role).trim() !== ''
                                ? [String(p.role)]
                                : [],
                    })),
                };
            }
            return merged;
        });
    }, []);

    const setProjectId = useCallback((id: string) => {
        setData(prev => ({ ...prev, project_id: id }));
    }, []);

    const setRequiredHours = useCallback((hours: number) => {
        setData(prev => ({ ...prev, required_hours: hours }));
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

            const res = await authenticatedFetch(`/api/v1/student/reports/draft`, {
                method: 'POST',
                body: JSON.stringify({
                    ...data,
                    project_id: projectId,
                    status: 'continue'
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
        setParticipationUnlocked,
        setRequiredHours,
        isEligibleForSubmission,
        areAllSectionsComplete,
        canSubmitReport,
        incompleteSectionsSummary,
        showVerifiedImpactScores
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
        isParticipationUnlocked,
        setParticipationUnlocked,
        setRequiredHours,
        isEligibleForSubmission,
        areAllSectionsComplete,
        canSubmitReport,
        incompleteSectionsSummary,
        showVerifiedImpactScores
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
