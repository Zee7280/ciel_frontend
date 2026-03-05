"use client"
import React from 'react';
import { useReportForm, ReportProvider } from './context/ReportContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { authenticatedFetch } from '@/utils/api';
import { toast } from 'sonner';
import { ChevronRight, Save, Loader2, ArrowLeft, Lock } from 'lucide-react';
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
        setReadOnly,
        isReadOnly
    } = useReportForm();

    const [isSaving, setIsSaving] = React.useState(false);
    const [projectDetails, setProjectDetails] = React.useState<any>(null);
    const [isLoading, setIsLoading] = React.useState(true);

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
                setProjectDetails(projectData.data || projectData);
            }

            if (reportRes && reportRes.ok) {
                const reportData = await reportRes.json();
                const actualReportData = reportData.data || reportData; // Handle potential wrapper
                if (actualReportData && Object.keys(actualReportData).length > 0) {
                    setFullData(actualReportData);
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

        if (validateCurrentSection()) {
            if (activeStep < 11) {
                // Auto-save on next
                await handleSave(true);
                nextStep();
                window.scrollTo(0, 0);
            } else {
                // Final Submit
                handleSubmit();
            }
        } else {
            const firstError = Object.values(validationErrors)[0]?.[0]?.message;
            toast.error(firstError || 'Please fix the errors before proceeding');
        }
    };

    const handleSave = async (silent = false) => {
        if (isReadOnly) return;
        setIsSaving(true);
        try {
            const res = await authenticatedFetch(`/api/v1/student/reports`, {
                method: 'POST',
                body: JSON.stringify({
                    ...data,
                    status: 'draft'
                })
            });

            if (!res || !res.ok) throw new Error('Save failed');
            if (!silent) toast.success('Progress saved');
        } catch (error) {
            console.error(error);
            if (!silent) toast.error('Failed to save progress');
        } finally {
            setIsSaving(false);
        }
    };

    const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);

    const handleSubmit = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (isReadOnly) return;

        // Final validation check for all sections could go here

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

            toast.success('Report submitted successfully!');
            setTimeout(() => {
                window.location.href = '/dashboard/student';
            }, 3500);
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

    return (
        <div className="max-w-none mx-auto px-6 md:px-12 py-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2 -ml-2 text-slate-500 hover:text-slate-900">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                    </Button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-900">Community Engagement Report</h1>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200">
                            Step {activeStep} of 11
                        </span>
                    </div>
                    <p className="text-slate-600 mt-1">{projectDetails?.title || 'Loading Project...'}</p>
                </div>
                <div className="flex items-center gap-2">
                    {!isReadOnly && (
                        <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Draft
                        </Button>
                    )}
                </div>
            </div>

            {/* Stepper */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex flex-wrap gap-2">
                    {steps.map((label, i) => {
                        const stepNum = i + 1;
                        const isActive = activeStep === stepNum;
                        const isCompleted = activeStep > stepNum;

                        return (
                            <div key={label} className="flex items-center mb-2">
                                <div
                                    onClick={() => {
                                        // Allow jumping to any completed step, or any step if read-only
                                        if (isCompleted || isReadOnly) {
                                            setStep(stepNum);
                                        } else if (isActive) {
                                            // Do nothing if clicking current step
                                        } else {
                                            // Validate current before jumping forward
                                            if (validateCurrentSection()) {
                                                setStep(stepNum);
                                            } else {
                                                const firstError = Object.values(validationErrors)[0]?.[0]?.message;
                                                toast.error(firstError || 'Please fix errors before skipping ahead');
                                            }
                                        }
                                    }}
                                    className={clsx(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium",
                                        isActive ? "bg-blue-600 text-white shadow-md shadow-blue-200 cursor-default"
                                            : isCompleted || isReadOnly ? "bg-blue-50 text-blue-700 cursor-pointer hover:bg-blue-100"
                                                : "text-slate-400 bg-slate-50 cursor-pointer hover:bg-slate-100"
                                    )}
                                >
                                    <div className={clsx(
                                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] border transition-colors",
                                        isActive ? "border-white bg-white/20" : isCompleted ? "border-blue-200 bg-blue-100" : "border-slate-300"
                                    )}>
                                        {stepNum}
                                    </div>
                                    {label}
                                </div>
                                {i < steps.length - 1 && (
                                    <div className="w-4 h-0.5 bg-slate-200 mx-1 hidden sm:block" />
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {activeStep === 1 && <Section1Participation />}
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

            {/* Footer Navigation */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                <Button type="button" variant="outline" onClick={prevStep} disabled={activeStep === 1}>
                    Previous Step
                </Button>

                <Button
                    type="button"
                    onClick={handleNext}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                >
                    {isSaving && activeStep === 11 ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {activeStep === 11 ? (isSaving ? 'Submitting...' : 'Submit Report') : 'Next Step'}
                    {activeStep !== 11 && <ChevronRight className="w-4 h-4 ml-2" />}
                </Button>
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

import { Suspense } from 'react';

// ... (existing imports)

export default function ReportPage() {
    return (
        <ReportProvider>
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
                <ReportFormContent />
            </Suspense>
        </ReportProvider>
    );
}
