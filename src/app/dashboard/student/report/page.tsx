"use client"
import React, { Suspense } from 'react';
import { useReportForm, ReportProvider } from './context/ReportContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { authenticatedFetch } from '@/utils/api';
import { toast } from 'sonner';
import { ChevronRight, Save, Loader2, ArrowLeft, Lock, Download, CheckCircle2 } from 'lucide-react';
import { Button } from './components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./components/ui/dialog";
import clsx from 'clsx';
import { canStudentAccessReportForProjectPayload } from '@/utils/studentJoinApplication';

// Import New Sections
import Section1Participation from './components/Section1Participation';
import Section2ProjectContext from './components/Section2ProjectContext'; // Renamed
import Section3SDGMapping from './components/Section3SDGMapping';
import Section4Activities from './components/Section4Activities';
import Section5Outcomes from './components/Section5Outcomes';
import Section6Resources from './components/Section6Resources';
import Section7Partnerships from './components/Section7Partnerships';
import Section8Evidence from './components/Section8Evidence';
import Section9Reflection from './components/Section9Reflection'; // New
import Section10Sustainability from './components/Section10Sustainability'; // Renamed
import Section11Summary from './components/Section11Summary'; // New
import PreReportGuide from './components/PreReportGuide';

function ReportFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const projectId = searchParams.get('project') || searchParams.get('projectId');
    const {
        activeStep,
        nextStep,
        prevStep,
        validateCurrentSection,
        validationErrors,
        data,
        setFullData,
        setStep,
        setProjectId,
        updateSection,
        setReadOnly,
        isReadOnly,
        isEligibleForSubmission,
        areAllSectionsComplete,
        canSubmitReport
    } = useReportForm();

    const [isSaving, setIsSaving] = React.useState(false);
    const [aiStatus, setAiStatus] = React.useState<string | null>(null);
    const [projectDetails, setProjectDetails] = React.useState<any>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [showGuide, setShowGuide] = React.useState(true);

    // Initial Load
    React.useEffect(() => {
        if (!projectId) {
            router.push('/dashboard/student');
            return;
        }
        setProjectId(projectId);
        fetchProjectAndReport();
    }, [projectId]);

    const fetchProjectAndReport = async () => {
        try {
            setIsLoading(true);
            const [projectRes, reportRes] = await Promise.all([
                authenticatedFetch(`/api/v1/student/projects/${projectId}`),
                authenticatedFetch(`/api/v1/student/reports/${projectId}`)
            ]);

            if (projectRes && projectRes.ok) {
                const projectData = await projectRes.json();
                const pInfo = projectData.data || projectData;
                setProjectDetails(pInfo);

                // 🚨 SECURITY CHECK: project status + join application (when API sends application_status)
                if (!canStudentAccessReportForProjectPayload(pInfo as Record<string, unknown>)) {
                    toast.error('Approval is required to start/edit a report for this project.');
                    router.push('/dashboard/student');
                    return;
                }
            }

            if (reportRes && reportRes.ok) {
                const reportData = await reportRes.json();
                const actualReportData = reportData.data || reportData; // Handle potential wrapper
                if (actualReportData && Object.keys(actualReportData).length > 0) {
                    setFullData(actualReportData);
                    const isSubmitted = ['submitted', 'approved', 'under_review'].includes(actualReportData.status) || 
                                       ['verified', 'approved'].includes(actualReportData.admin_status);
                    if (isSubmitted) {
                        // Report already submitted — skip guide, go straight to summary
                        setShowGuide(false);
                        setStep(11);
                        setReadOnly(true);
                    } else if (actualReportData.status === 'continue' || Object.keys(actualReportData).length > 2) {
                        setShowGuide(false);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load project details');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNext = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        // --- FLEXIBLE NAVIGATION (Progress Mode) ---
        // If not at the final step, allow navigation even if validation fails
        const isValid = validateCurrentSection();
        
        if (activeStep < 11) {
            setIsSaving(true);
            let updatedData = { ...data };

            // Auto-generate AI Summary for specific sections
            const sectionsToSummarize = [2, 3, 4, 5, 8, 9, 10];
            if (sectionsToSummarize.includes(activeStep) && isValid) {
                setAiStatus('Analyzing Data & Writing Summary...');
                try {
                    const { generateAISummary } = await import('./utils/aiSummarizer');
                    const sectionKey = `section${activeStep}` as Exclude<keyof typeof data, 'project_id'>;
                    const summaryRes = await generateAISummary(sectionKey, data[sectionKey]);

                    if (summaryRes.summary) {
                        updatedData = {
                            ...updatedData,
                            [sectionKey]: {
                                ...(updatedData[sectionKey] as any),
                                summary_text: summaryRes.summary
                            }
                        };
                        updateSection(sectionKey, { summary_text: summaryRes.summary });
                    }
                } catch (error) {
                    console.error('Failed to auto-generate summary', error);
                }
            }
            
            setAiStatus('Saving Progress...');
            await handleSave(true, updatedData);
            
            if (!isValid) {
                toast.info("Draft saved. Some fields need attention before submission.");
            }
            
            nextStep();
            window.scrollTo(0, 0);
        } else {
            // Final step: require verified hours and valid sections 1–10
            if (canSubmitReport && isValid) {
                handleSubmit();
            } else if (!isEligibleForSubmission) {
                toast.error("You are not yet eligible for submission. Check requirements on the summary page.");
            } else if (!areAllSectionsComplete) {
                toast.error("Complete all report sections (steps 1–10) before submitting.");
            } else {
                toast.error("Please fix all errors before final submission.");
            }
        }
    };

    const handleSave = async (silent = false, customData = data) => {
        if (isReadOnly) return;
        if (!isSaving) setIsSaving(true);
        try {
            const res = await authenticatedFetch(`/api/v1/student/reports/draft`, {
                method: 'POST',
                body: JSON.stringify({
                    ...customData,
                    status: 'continue'
                })
            });

            if (!res || !res.ok) throw new Error('Save failed');
            if (!silent) toast.success('Progress saved');
        } catch (error) {
            console.error(error);
            if (!silent) toast.error('Failed to save progress');
        } finally {
            setIsSaving(false);
            setAiStatus(null);
        }
    };

    const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);

    const handleSubmit = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (isReadOnly) return;
        if (!canSubmitReport) {
            toast.error("Complete all sections and meet hour requirements before submitting.");
            return;
        }

        setIsConfirmOpen(true);
    };

    const confirmSubmit = async () => {
        setIsConfirmOpen(false);
        setIsSaving(true);
        try {
            const res = await authenticatedFetch(`/api/v1/student/reports/${projectId}/submit`, {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (!res || !res.ok) throw new Error('Submission failed');

            toast.success('Report submitted! Redirecting to payment...');
            setTimeout(() => {
                window.location.href = `/dashboard/student/payment?projectId=${projectId}`;
            }, 2000);
        } catch (error) {
            console.error(error);
            toast.error('Failed to submit report');
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const steps = [
        "Participation", "Context", "SDG Mapping", "Activities", "Outcomes",
        "Resources", "Partnerships", "Evidence", "Reflection", "Sustainability", "Summary"
    ];

    if (showGuide) {
        return (
            <div className="max-w-none mx-auto px-6 md:px-12 py-8">
                <PreReportGuide
                    projectTitle={projectDetails?.title}
                    onStart={() => setShowGuide(false)}
                />
            </div>
        );
    }

    return (
        <div className="max-w-none mx-auto px-4 md:px-6 py-6 space-y-6">
            {/* Sticky Header Wrapper */}
            <div className="sticky top-0 z-30 -mx-4 md:-mx-6 px-4 md:px-6 py-4 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/60 transition-all">
                <div className="flex items-center justify-between max-w-[1600px] mx-auto">
                    <div className="min-w-0">
                        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-1 -ml-2 text-slate-400 hover:text-slate-600 h-7 text-[11px] font-bold">
                            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Dashboard
                        </Button>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight shrink-0">
                                Community Engagement Report
                            </h1>
                            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100 uppercase tracking-wider">
                                Step {activeStep} of 11
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 group min-w-0">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 shrink-0 hidden sm:inline">
                                Project
                            </span>
                            <p className="text-sm md:text-base font-bold text-slate-800 truncate group-hover:text-slate-950 transition-colors">
                                {projectDetails?.title || 'Loading Project...'}
                            </p>
                        </div>
                    </div>

                    {/* Eligibility Banner */}
                    {!isReadOnly && (
                        <div className={clsx(
                            "hidden md:flex items-center gap-3 px-6 py-2.5 rounded-2xl border transition-all animate-in fade-in zoom-in duration-500",
                            canSubmitReport
                                ? "bg-emerald-50 border-emerald-100 text-emerald-700 shadow-sm"
                                : "bg-amber-50 border-amber-100 text-amber-700"
                        )}>
                            <div className={clsx(
                                "w-2.5 h-2.5 rounded-full animate-pulse",
                                canSubmitReport ? "bg-emerald-500" : "bg-amber-500"
                            )} />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-0.5">
                                    {canSubmitReport
                                        ? "Submission Mode Ready"
                                        : isEligibleForSubmission
                                          ? "Almost there"
                                          : "Progress Mode"}
                                </span>
                                <span className="text-[9px] font-bold opacity-70 leading-none">
                                    {canSubmitReport
                                        ? "All sections complete. You can submit from the summary step."
                                        : isEligibleForSubmission
                                          ? "Finish steps 1–10; then you can submit on the summary."
                                          : `Verification in progress: ${data.section1.metrics?.total_verified_hours || 0}/${data.required_hours || 16} hours met.`}
                                </span>
                            </div>
                            {canSubmitReport && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-1" />}
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        {!isReadOnly && (
                            <Button
                                variant="outline"
                                onClick={() => handleSave(false)}
                                disabled={isSaving}
                                className="h-9 px-4 border-slate-200 text-slate-600 text-xs font-bold hover:bg-white hover:border-slate-300 shadow-sm transition-all"
                            >
                                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Save className="w-3.5 h-3.5 mr-2 text-blue-500" />}
                                Save Draft
                            </Button>
                        )}
                    </div>
                </div>

                {/* Stepper Inside Sticky Header */}
                <div className="max-w-[1600px] mx-auto mt-4 px-1">
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-1.5">
                        {steps.map((label, i) => {
                            const stepNum = i + 1;
                            const isActive = activeStep === stepNum;
                            const isCompleted = activeStep > stepNum;

                            return (
                                <React.Fragment key={label}>
                                    <div
                                        onClick={() => {
                                            if (isCompleted || isReadOnly || activeStep < 11) {
                                                setStep(stepNum);
                                            } else if (!isActive && validateCurrentSection()) {
                                                setStep(stepNum);
                                            } else if (!isActive) {
                                                toast.info("Navigating to step. Please complete mandatory fields later.");
                                                setStep(stepNum);
                                            }
                                        }}
                                        className={clsx(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-[11px] font-bold uppercase tracking-tight cursor-pointer",
                                            isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-200/50 scale-105"
                                                : isCompleted || isReadOnly ? "bg-white text-blue-600 border border-blue-100 hover:bg-blue-50"
                                                    : "text-slate-400 bg-transparent border border-transparent hover:border-slate-200"
                                        )}
                                    >
                                        <div className={clsx(
                                            "w-4 h-4 rounded-full flex items-center justify-center text-[9px] border transition-colors",
                                            isActive ? "border-white bg-white/20" : isCompleted ? "border-blue-200 bg-blue-50" : "border-slate-300"
                                        )}>
                                            {stepNum}
                                        </div>
                                        <span className={clsx(isActive ? "block" : "hidden sm:block")}>{label}</span>
                                    </div>
                                    {i < steps.length - 1 && (
                                        <div className="w-2 h-px bg-slate-200 hidden sm:block opacity-40" />
                                    )}
                                </React.Fragment>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-[1600px] mx-auto pt-2 flex flex-col lg:flex-row gap-8 items-start">
                <div className="flex-1 w-full min-h-[400px]">
                    {activeStep === 1 && <Section1Participation projectData={projectDetails} />}
                    {activeStep === 2 && <Section2ProjectContext projectData={projectDetails} />}
                    {activeStep === 3 && <Section3SDGMapping projectData={projectDetails} />}
                    {activeStep === 4 && <Section4Activities />}
                    {activeStep === 5 && <Section5Outcomes />}
                    {activeStep === 6 && <Section6Resources />}
                    {activeStep === 7 && <Section7Partnerships />}
                    {activeStep === 8 && <Section8Evidence />}
                    {activeStep === 9 && <Section9Reflection />}
                    {activeStep === 10 && <Section10Sustainability />}
                    {activeStep === 11 && <Section11Summary />}
                </div>

                {/* PDF Checklist Preview - Visible on large screens only on Step 1 */}

            </div>


            {/* Footer Navigation */}
            <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm shadow-slate-200/50 backdrop-blur-sm px-4 py-4 md:px-6 md:py-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between max-w-[1600px] mx-auto">
                    <div className="flex justify-start sm:flex-1">
                        {!isReadOnly && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={prevStep}
                                disabled={activeStep === 1}
                                className="h-11 rounded-xl border-slate-200 text-slate-700 font-semibold px-5 hover:bg-slate-50 disabled:opacity-40"
                            >
                                Previous Step
                            </Button>
                        )}
                    </div>

                    {!isReadOnly && activeStep < 11 && (
                        <div className="flex justify-center sm:flex-1 sm:order-none order-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleSave(false)}
                                disabled={isSaving}
                                className="bg-slate-50 hover:bg-slate-100 text-slate-800 h-11 px-5 rounded-xl border border-slate-200 font-semibold text-xs uppercase tracking-wide transition-all flex items-center gap-2 w-full sm:w-auto justify-center"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-slate-500" />}
                                <span>Save Section {activeStep} Progress</span>
                            </Button>
                        </div>
                    )}

                    <div className="flex justify-end sm:flex-1 order-3">
                        {!(activeStep === 11 && (data?.status === 'submitted' || data?.status === 'approved')) && (
                            <Button
                                type="button"
                                onClick={handleNext}
                                disabled={isSaving || (activeStep === 11 && !canSubmitReport)}
                                className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 md:px-8 font-semibold shadow-md shadow-blue-600/20 transition-all w-full sm:w-auto disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                {activeStep === 11
                                    ? isSaving
                                        ? 'Submitting...'
                                        : canSubmitReport
                                          ? 'Submit Report'
                                          : 'Complete all sections'
                                    : (aiStatus || 'Next Step')}
                                {activeStep !== 11 && !isSaving && <ChevronRight className="w-4 h-4 ml-2" />}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Submit Confirmation Dialog */}
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Submit Report?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to submit this report? You will not be able to edit it after submission.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
                            Cancel
                        </Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={confirmSubmit} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Yes, Submit Report
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function ReportPage() {
    return (
        <ReportProvider>
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
                <ReportFormContent />
            </Suspense>
        </ReportProvider>
    );
}
