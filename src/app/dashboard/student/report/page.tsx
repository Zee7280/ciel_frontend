"use client";

import { ArrowLeft, Loader2, Save, Printer, ShieldCheck, AlertCircle, Clock, Lock, FileText } from "lucide-react";
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
import ReportPrintView from "./components/ReportPrintView";

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'verified':
            return (
                <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold border border-green-200">
                    <ShieldCheck className="w-4 h-4" />
                    Verified Report
                </div>
            );
        case 'submitted':
            return (
                <div className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full text-xs font-bold border border-yellow-200">
                    <Clock className="w-4 h-4" />
                    Under Review
                </div>
            );
        case 'rejected':
            return (
                <div className="flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-xs font-bold border border-red-200">
                    <AlertCircle className="w-4 h-4" />
                    Needs Revision
                </div>
            );
        default:
            return (
                <div className="flex items-center gap-2 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full text-xs font-bold border border-slate-200">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    Draft
                </div>
            );
    }
};

function ReportContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const projectId = searchParams.get("projectId");

    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [projectData, setProjectData] = useState<any>(null);
    const [reportStatus, setReportStatus] = useState<string>('draft');
    const [viewMode, setViewMode] = useState<'step' | 'full'>('step');

    const { data: formData, setProjectId, activeStep, setStep, nextStep, prevStep, validateCurrentSection, updateSection, setFullData, setReadOnly, isReadOnly } = useReportForm();

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
            checkAndLoadExistingReport();
        }
    }, [projectId]);

    const checkAndLoadExistingReport = async () => {
        try {
            const storedUser = localStorage.getItem("ciel_user");
            if (!storedUser) return;
            const userObj = JSON.parse(storedUser);
            const studentId = userObj.id || userObj.studentId || userObj.userId;

            // Check if report exists
            const checkRes = await authenticatedFetch(
                `${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/students/reports/check?studentId=${studentId}&opportunityId=${projectId}`
            );

            if (checkRes && checkRes.ok) {
                const checkData = await checkRes.json();
                console.log("Check API response:", checkData);

                let reportInfo = null;

                // Handle different response structures
                if (checkData.success && Array.isArray(checkData.data)) {
                    // Check API returns an array of reports
                    // Find the one matching this project ID
                    reportInfo = checkData.data.find((r: any) =>
                        r.opportunity_id === projectId ||
                        r.projectId === projectId ||
                        r.project_id === projectId ||
                        true
                    );
                } else if (checkData.report_id) {
                    reportInfo = checkData;
                } else if (checkData.data && checkData.data.report_id) {
                    reportInfo = checkData.data;
                }

                if (reportInfo && reportInfo.report_id && reportInfo.status !== 'none') {
                    console.log("Found existing report:", reportInfo);
                    setReportStatus(reportInfo.status);

                    // Set View-Only mode for submitted/verified reports
                    if (reportInfo.status === 'submitted' || reportInfo.status === 'verified') {
                        setReadOnly(true);
                    }

                    // Fetch full report data
                    const reportRes = await authenticatedFetch(
                        `${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/students/reports/${reportInfo.report_id}`
                    );

                    if (reportRes && reportRes.ok) {
                        const reportDataWrapper = await reportRes.json();
                        // Backend might wrap it in { success: true, report: ... } or just return the object
                        const reportData = reportDataWrapper.data || reportDataWrapper.report || reportDataWrapper;

                        if (reportData) {
                            console.log("Hydrating form with report data:", reportData);

                            // Check if it's our structured data or flat DB data
                            if (reportData.section1 || reportData.section_1) {
                                // It seems to be structured
                                setFullData({
                                    project_id: projectId || '',
                                    section1: reportData.section1 || reportData.section_1 || {},
                                    section2: reportData.section2 || reportData.section_2 || {},
                                    section3: reportData.section3 || reportData.section_3 || {},
                                    section4: reportData.section4 || reportData.section_4 || {},
                                    section5: reportData.section5 || reportData.section_5 || {},
                                    section6: reportData.section6 || reportData.section_6 || {},
                                    section7: reportData.section7 || reportData.section_7 || {},
                                    section8: reportData.section8 || reportData.section_8 || {},
                                    section10: reportData.section10 || reportData.section_10 || {},
                                    section12: reportData.section12 || reportData.section_12 || {}
                                } as any);

                                // Set active step if saved
                                if (reportData.current_step) {
                                    setStep(reportData.current_step);
                                }
                            } else {
                                // Attempt to load from local storage as fallback
                                const localDraft = localStorage.getItem(`report_draft_${projectId}`);
                                if (localDraft) {
                                    setFullData(JSON.parse(localDraft));
                                }
                            }
                        }
                    }
                } else {
                    // Try loading local draft if no submitted report found
                    const localDraft = localStorage.getItem(`report_draft_${projectId}`);
                    if (localDraft) {
                        console.log("Loading form from local draft");
                        setFullData(JSON.parse(localDraft));
                    }
                }
            }
        } catch (error) {
            console.error("Failed to load existing report:", error);
        }
    };

    const fetchProjectDetails = async () => {
        setIsLoading(true);
        try {
            // Fetch from opportunities endpoint since that's what exists
            const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/students/opportunities`);
            if (res && res.ok) {
                const data = await res.json();

                if (data.success && data.data) {
                    // Find the specific opportunity/project by ID
                    const project = Array.isArray(data.data)
                        ? data.data.find((opp: any) => opp.id === projectId)
                        : data.data;

                    if (project) {
                        setProjectData(project);
                    } else {
                        console.warn("Project not found in opportunities list");
                        // Set minimal data so the form can still work
                        setProjectData({ id: projectId, title: "Project Report" });
                    }
                } else if (data.data) {
                    setProjectData(data.data);
                } else {
                    setProjectData(data);
                }
            } else {
                console.error("Failed to fetch project details - HTTP error");
                // Set minimal data so the form can still work
                setProjectData({ id: projectId, title: "Project Report" });
            }
        } catch (error) {
            console.error("Failed to fetch project details", error);
            // Set minimal data so the form can still work
            setProjectData({ id: projectId, title: "Project Report" });
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-populate logic - ONLY if form is empty (to avoid overwriting fetched report)
    useEffect(() => {
        // Only populate if we have project data AND the form is essentially empty
        // We check section2.participation_type as a proxy for "is untouched" or check if team_members is empty
        const isFormEmpty = formData.section2.team_members.length === 0 && !formData.section2.team_lead.name;

        if (projectData && projectData.teamMembers && isFormEmpty) {
            const { teamMembers } = projectData;

            // If there are team members, set participation type to 'team'
            if (Array.isArray(teamMembers) && teamMembers.length > 0) {
                // Get current logged-in user data for team lead
                const storedUser = localStorage.getItem("ciel_user");
                let userData = null;
                if (storedUser) {
                    try {
                        userData = JSON.parse(storedUser);
                    } catch (e) {
                        console.error("Failed to parse user data");
                    }
                }

                // Populate team lead with current user info
                updateSection('section2', {
                    participation_type: 'team',
                    team_lead: {
                        name: userData?.name || '',
                        cnic: userData?.cnic || '',
                        mobile: userData?.phone || userData?.mobile || '',
                        email: userData?.email || '',
                        university: userData?.university || '',
                        degree: userData?.degree || '',
                        year: userData?.year || userData?.academic_year || '',
                        consent: false
                    },
                    // Map team members from project data - filter out invalid data
                    team_members: teamMembers
                        .filter((member: any) => {
                            // Only include members with valid name and mobile
                            const mobileValid = member.mobile && /^03\d{9}$/.test(member.mobile.replace(/-/g, ''));
                            return member.name && mobileValid;
                        })
                        .map((member: any) => ({
                            name: member.name || '',
                            cnic: member.cnic || '',
                            mobile: member.mobile || member.phone || '',
                            university: member.university || '',
                            program: member.degree || member.program || '',
                            role: member.role || '',
                            hours: ''
                        }))
                });
            } else {
                // No team members, set to individual
                updateSection('section2', { participation_type: 'individual' });
            }
        }
    }, [projectData]);

    // Auto-save when step changes
    useEffect(() => {
        if (activeStep > 1 && projectId && !isReadOnly) {
            handleAutoSave();
        }
    }, [activeStep, isReadOnly]);

    const handleAutoSave = async () => {
        try {
            if (isReadOnly) return;

            // Save current progress to localStorage (instant)
            localStorage.setItem(`report_draft_${projectId}`, JSON.stringify(formData));

            // Also save to backend using draft endpoint
            const draftPayload = {
                studentId: JSON.parse(localStorage.getItem('ciel_user') || '{}')?.id,
                opportunityId: projectId,
                current_step: activeStep,
                status: 'draft',
                ...formData
            };

            await authenticatedFetch(
                `${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/students/reports/draft`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(draftPayload)
                }
            );

            // Subtle success notification
            console.log('Auto-saved at step', activeStep);
        } catch (error) {
            console.error("Auto-save failed:", error);
            // Don't show error to user, it's background save
        }
    };

    const handleSaveDraft = async () => {
        if (isReadOnly) return;
        try {
            // Save to localStorage
            localStorage.setItem(`report_draft_${projectId}`, JSON.stringify(formData));

            // Save to backend using draft endpoint
            const draftPayload = {
                studentId: JSON.parse(localStorage.getItem('ciel_user') || '{}')?.id,
                opportunityId: projectId,
                current_step: activeStep,
                status: 'draft',
                ...formData
            };

            await authenticatedFetch(
                `${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/students/reports/draft`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(draftPayload)
                }
            );

            toast.success("Draft saved successfully!");
        } catch (error) {
            console.error("Draft save error:", error);
            toast.error("Failed to save draft. Please try again.");
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

        if (isReadOnly) {
            // Just move to next if viewing or wrap up
            if (activeStep < 12) nextStep();
            return;
        }

        // If not on the last step, validate current section first
        if (activeStep < 12) {
            const isValid = validateCurrentSection();

            if (!isValid) {
                toast.error("Please fix the validation errors before continuing");
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            // Proceed to next step
            nextStep();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // Final submission - validate all critical sections
        const isValid = validateCurrentSection();
        if (!isValid) {
            toast.error("Please complete all required fields in the declaration section");
            return;
        }

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

            const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/students/reports`, {
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
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.push("/dashboard/student/projects")}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-xl font-black text-slate-900 tracking-tight">
                                Impact Report
                            </h1>
                            <StatusBadge status={reportStatus} />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                            <p className="truncate max-w-[300px]" title={projectData?.title}>
                                Project: <span className="text-slate-900">{projectData?.title}</span>
                            </p>
                            <span className="text-slate-300">•</span>
                            <p>Step {activeStep} of 12</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 print:hidden">
                    {viewMode === 'step' ? (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setViewMode('full')}
                                className="hidden sm:flex border-slate-200 text-slate-600 hover:bg-slate-50"
                            >
                                <FileText className="w-4 h-4 mr-2" /> View Full Report
                            </Button>

                            {isReadOnly && (
                                <div className="flex items-center bg-slate-100 text-slate-500 px-4 py-2 rounded-lg text-sm font-medium">
                                    <Lock className="w-4 h-4 mr-2" />
                                    View Only Mode
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <Button
                                variant="ghost"
                                onClick={() => setViewMode('step')}
                                className="text-slate-500 hover:text-slate-900"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Steps
                            </Button>
                            <Button
                                onClick={() => window.print()}
                                className="bg-slate-900 text-white hover:bg-slate-800 shadow-md shadow-slate-200"
                            >
                                <Printer className="w-4 h-4 mr-2" /> Print PDF
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {viewMode === 'step' ? (
                <div className="flex flex-col lg:flex-row gap-8 p-8 max-w-7xl mx-auto print:p-0 print:max-w-none">
                    {/* Sidebar Navigation */}
                    <aside className="w-full lg:w-72 shrink-0 print:hidden">
                        <div className="sticky top-32 space-y-1 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-4 flex justify-between items-center">
                                Report Sections
                                {isReadOnly && <Lock className="w-3 h-3 text-slate-300" />}
                            </p>
                            {steps.map((step, idx) => (
                                <button
                                    key={step.id}
                                    onClick={() => setStep(step.id)}
                                    className={clsx(
                                        "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all group text-left",
                                        activeStep === step.id
                                            ? "bg-slate-900 text-white shadow-xl shadow-slate-200"
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
                    <main className="flex-1 min-w-0 print:w-full print:max-w-none">
                        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-100 animate-fade-in-up print:shadow-none print:border-none print:p-0">
                            <ActiveSection projectData={projectData} />

                            {/* Navigation Footer */}
                            <div className="mt-16 pt-8 border-t border-slate-100 flex items-center justify-between print:hidden">
                                <Button
                                    variant="ghost"
                                    onClick={prevStep}
                                    disabled={activeStep === 1}
                                    className="text-slate-500 font-bold hover:bg-slate-50 hover:text-slate-900"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Previous Step
                                </Button>

                                <div className="flex gap-4">
                                    {isReadOnly && activeStep < 12 && (
                                        <Button
                                            onClick={nextStep}
                                            className="px-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
                                        >
                                            Next Section
                                        </Button>
                                    )}
                                    {!isReadOnly && (
                                        <Button
                                            onClick={handleSubmit}
                                            className="bg-slate-900 hover:bg-slate-800 text-white px-10 rounded-full shadow-xl shadow-slate-200"
                                        >
                                            {activeStep === 12 ? "Submit Final Report" : "Next"}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            ) : (
                <div className="max-w-[210mm] mx-auto bg-white min-h-screen my-8 p-[20mm] shadow-2xl print:shadow-none print:m-0 print:p-0 print:w-full print:max-w-none">
                    <div className="mb-8 flex flex-col md:flex-row items-center md:items-start justify-between border-b-2 border-slate-900 pb-6 gap-6">
                        <div className="flex items-center gap-6">
                            {/* Assuming logo is in public folder */}
                            <img src="/ciel-logo.png" alt="CIEL Logo" className="h-20 w-auto object-contain" />
                            <div className="text-left">
                                <h1 className="text-3xl font-serif font-bold text-slate-900 leading-tight">{projectData?.title || "Impact Report"}</h1>
                                <p className="text-slate-500 uppercase tracking-widest text-sm font-bold mt-2">Official Impact Documentation</p>
                            </div>
                        </div>
                        <div className="text-right hidden md:block">
                            <div className="text-xs font-mono text-slate-400 space-y-1">
                                <p>Generated: {new Date().toLocaleDateString()}</p>
                                <p>Ref: {projectData?.id?.slice(0, 8).toUpperCase() || "N/A"}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8">
                        <ReportPrintView projectData={projectData} />
                    </div>

                    <div className="mt-16 pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
                        Generated by CIEL Impact Platform • {new Date().toLocaleDateString()}
                    </div>
                </div>
            )}

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
