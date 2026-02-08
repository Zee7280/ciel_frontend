"use client";

import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import { useEffect, useState, Suspense } from "react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { useReportForm } from "./context/ReportContext";
import clsx from "clsx";

// Placeholder imports for sections - will implement one by one
import ReportHeader from "./components/ReportHeader";
import Section1ProjectContext from "./components/Section1ProjectContext";
import Section2StudentTeam from "./components/Section2StudentTeam";
import Section3SDGMapping from "./components/Section3SDGMapping";
import Section4Activities from "./components/Section4Activities";
import Section5Outcomes from "./components/Section5Outcomes";
import Section6Resources from "./components/Section6Resources";
import Section7Partnerships from "./components/Section7Partnerships";
import Section8Evidence from "./components/Section8Evidence";
import Section10Reflection from "./components/Section10Reflection";
import Section11Summary from "./components/Section11Summary";
import Section12Declaration from "./components/Section12Declaration";

function ReportContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const projectId = searchParams.get("projectId");

    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [projectData, setProjectData] = useState<any>(null);

    const { data: formData, setProjectId, activeStep, setStep, nextStep, prevStep } = useReportForm();

    const steps = [
        { id: 1, title: "Context", component: Section1ProjectContext },
        { id: 2, title: "Team", component: Section2StudentTeam },
        { id: 3, title: "SDG Mapping", component: Section3SDGMapping },
        { id: 4, title: "Activities", component: Section4Activities },
        { id: 5, title: "Outcomes", component: Section5Outcomes },
        { id: 6, title: "Resources", component: Section6Resources },
        { id: 7, title: "Partnerships", component: Section7Partnerships },
        { id: 8, title: "Evidence", component: Section8Evidence },
        { id: 10, title: "Reflection", component: Section10Reflection },
        { id: 11, title: "Summary", component: Section11Summary },
        { id: 12, title: "Declaration", component: Section12Declaration },
    ];

    const ActiveSection = steps.find(s => s.id === activeStep)?.component || Section1ProjectContext;

    useEffect(() => {
        if (projectId) {
            setProjectId(projectId);
            fetchProjectDetails();
        }
    }, [projectId]);

    const fetchProjectDetails = async () => {
        setIsLoading(true);
        try {
            const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/students/projects/${projectId}`);
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    setProjectData(data.data);
                }
            }
        } catch (error) {
            console.error("Failed to fetch project details", error);
        } finally {
            setIsLoading(false);
        }
    };

    const appendToFormData = (formData: FormData, data: any, prefix = '') => {
        if (data instanceof File) {
            formData.append(prefix, data);
        } else if (Array.isArray(data)) {
            data.forEach((item, index) => {
                appendToFormData(formData, item, `${prefix}[${index}]`);
            });
        } else if (typeof data === 'object' && data !== null) {
            Object.keys(data).forEach(key => {
                appendToFormData(formData, data[key], prefix ? `${prefix}.${key}` : key);
            });
        } else {
            formData.append(prefix, data);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // If not on the last step, just go to next
        if (activeStep < 12) {
            nextStep();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // Final submission
        setIsSubmitting(true);
        try {
            const formDataToSubmit = new FormData();

            // Build FormData from our nested context state
            // formData.project_id is separate in the context, rest are sections
            formDataToSubmit.append('project_id', formData.project_id);
            formDataToSubmit.append('submission_date', new Date().toISOString());

            // Append all sections recursively
            Object.keys(formData).forEach(key => {
                if (key !== 'project_id') {
                    appendToFormData(formDataToSubmit, (formData as any)[key], key);
                }
            });

            const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/student/reports`, {
                method: 'POST',
                body: formDataToSubmit
            });

            if (res && res.ok) {
                const result = await res.json();
                if (result.success) {
                    toast.success("Report submitted successfully!");
                    router.push("/dashboard/student/projects");
                } else {
                    toast.error(result.message || "Failed to submit report");
                }
            } else {
                const errorData = await res?.json().catch(() => ({}));
                toast.error(errorData?.message || "Failed to connect to server");
            }
        } catch (error) {
            console.error("Submission error", error);
            toast.error("An error occurred during submission. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            <p className="text-slate-500 font-medium animate-pulse">Loading project details...</p>
        </div>;
    }

    return (
        <div className="max-w-[1400px] mx-auto min-h-screen bg-slate-50/50">
            {/* Header Area */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/dashboard/student/projects")}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            Impact Report
                            <span className="text-blue-600 px-2 py-0.5 bg-blue-50 rounded text-sm font-bold border border-blue-100">
                                Project: {projectData?.title?.split(' ')[0]}...
                            </span>
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">Step {activeStep} of 12 • {steps.find(s => s.id === activeStep)?.title}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" className="hidden sm:flex" disabled={isSubmitting}>
                        <Save className="w-4 h-4 mr-2" /> Save Draft
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : activeStep === 12 ? "Submit Report" : "Save & Next"}
                    </Button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 p-8 max-w-7xl mx-auto">
                {/* Sidebar Navigation */}
                <aside className="w-full lg:w-72 shrink-0">
                    <div className="sticky top-32 space-y-1 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-4">Report Sections</p>
                        {steps.map((step, idx) => (
                            <button
                                key={step.id}
                                onClick={() => setStep(step.id)}
                                className={clsx(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all group text-left",
                                    activeStep === step.id
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <span className={clsx(
                                    "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] shrink-0 border transition-colors",
                                    activeStep === step.id ? "bg-white/20 border-white/30 text-white" : "bg-slate-50 border-slate-200 text-slate-400"
                                )}>
                                    {idx + 1}
                                </span>
                                {step.title}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Main Form Area */}
                <main className="flex-1 min-w-0">
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-100 animate-fade-in-up">
                        <ActiveSection projectData={projectData} />

                        {/* Navigation Footer */}
                        <div className="mt-16 pt-8 border-t border-slate-100 flex items-center justify-between">
                            <Button
                                variant="ghost"
                                onClick={prevStep}
                                disabled={activeStep === 1}
                                className="text-slate-500 font-bold"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" /> Previous Step
                            </Button>

                            <div className="flex gap-4">
                                {activeStep < 12 && (
                                    <Button
                                        onClick={nextStep}
                                        className="bg-slate-900 hover:bg-slate-800 text-white px-8 rounded-full"
                                    >
                                        Skip to Next
                                    </Button>
                                )}
                                <Button
                                    onClick={handleSubmit}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-10 rounded-full shadow-xl shadow-blue-100"
                                >
                                    {activeStep === 12 ? "Submit Final Report" : "Save & Continue"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            <div className="h-12"></div>
        </div>
    );
}

import { ReportProvider } from "@/app/dashboard/student/report/context/ReportContext";

export default function StudentReportPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>}>
            <ReportProvider>
                <ReportContent />
            </ReportProvider>
        </Suspense>
    );
}
