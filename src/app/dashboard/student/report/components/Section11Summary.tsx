import { BarChart3, PieChart, ShieldAlert, Sparkles, Loader2, Quote, Award, Clock, Users, Target, ShieldCheck, Download, TrendingUp, X, Printer, CheckCircle, Eye, AlertTriangle, Lock } from "lucide-react";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import React, { useState, useMemo, useEffect } from "react";
import ReportPrintView from "./ReportPrintView";
import CertificateView from "./CertificateView";
import CIIDashboardMeter from "./CIIDashboardMeter";
import { generateAISummary } from "../utils/aiSummarizer";
import { toast } from "sonner";
import clsx from "clsx";

export default function Section11Summary() {
    const { data, updateSection, isEligibleForSubmission, areAllSectionsComplete } = useReportForm();
    const { section1, section2, section3, section4, section5, section8, section9, section10 } = data;

    const [showPreview, setShowPreview] = useState(false);
    const [showCertificate, setShowCertificate] = useState(false);

    const beneficiaries = section4.project_summary?.distinct_total_beneficiaries || 0;
    const engagementScore = section1.metrics?.eis_score || 72;
    const verifiedHours = section1.metrics?.total_verified_hours || 0;

    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateAISummary = async () => {
        setIsGenerating(true);
        try {
            const result = await generateAISummary("section11", data);
            
            if (result.error) {
                updateSection('section11', { 
                    summary_text: executiveSummary,
                    is_ai_generated: false 
                });
                toast.info("Generated report summary.");
            } else if (result.summary) {
                updateSection('section11', { 
                    summary_text: result.summary,
                    is_ai_generated: true 
                });
                toast.success("AI Executive Summary generated!");
            }
        } catch (err) {
            updateSection('section11', { summary_text: executiveSummary });
            toast.info("Generated report summary.");
        } finally {
            setIsGenerating(false);
        }
    };

    const executiveSummary = useMemo(() => {
        if (data.section11?.summary_text && !data.section11.summary_text.includes("Project successfully synthesized")) {
            return data.section11.summary_text;
        }

        const primaryGoalTitle = section3.primary_sdg?.goal_title || "Sustainable Development";
        return `Project synthesized academic theory with community impact, primarily addressing ${primaryGoalTitle}. Through ${verifiedHours} verified hours, the initiative delivered measurable change for ${beneficiaries} beneficiaries. Collaborative efforts ensured structured delivery, while impact is secured via ${section10.mechanisms?.length || 0} sustainability mechanisms.`;
    }, [section1, section2, section3, section4, section5, section10, verifiedHours, beneficiaries, data.section11?.summary_text]);

    useEffect(() => {
        const hasEnoughData = (section2.problem_statement?.length > 100) && (section4.activity_blocks.length > 0) && (section5.measurable_outcomes?.length > 0);
        const isEmpty = !data.section11?.summary_text || data.section11.summary_text.includes("Project successfully synthesized");

        if (hasEnoughData && isEmpty && !isGenerating) {
            handleGenerateAISummary();
        }
    }, [section2.problem_statement, section4.activity_blocks, section5.measurable_outcomes]);

    const handlePrint = () => {
        window.print();
    };

    const stats = [
        { label: "CII Index Score", val: engagementScore, suffix: "/100", icon: Award },
        { label: "Verified Hours", val: verifiedHours, suffix: "hrs", icon: Clock },
        { label: "Beneficiaries", val: beneficiaries, suffix: "pax", icon: Users },
        { label: "SDG Priority", val: `Goal ${section3.primary_sdg?.goal_number || "—"}`, suffix: "", icon: Target },
    ];

    const complianceItems = [
        {
            label: "Partner Validation",
            status: section8.partner_verification ? "PASS" : "PENDING",
            desc: "Formal recognition from external entities.",
            icon: ShieldCheck,
            check: section8.partner_verification,
        },
        {
            label: "Ethical Safeguards",
            status: Object.values(section8.ethical_compliance || {}).every(Boolean) ? "CERTIFIED" : "PENDING",
            desc: "Adherence to CIEL ethical declaration protocol.",
            icon: ShieldAlert,
            check: Object.values(section8.ethical_compliance || {}).every(Boolean),
        },
        {
            label: "Sustainability Proof",
            status: section10.mechanisms?.length > 0 ? "SECURED" : "VOLUNTARY",
            desc: "Documented project legacy and roadmap.",
            icon: TrendingUp,
            check: section10.mechanisms?.length > 0,
        },
    ];

    return (
        <div className="space-y-14 pb-20">
            {/* ── Section Header ── */}
            <div className="space-y-8">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-report-primary text-white flex items-center justify-center shadow-xl shadow-report-primary-shadow ring-4 ring-report-primary-soft">
                        <BarChart3 className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="report-h2">Section 11 — Intelligence</h2>
                        <p className="report-label">Institutional Impact Dashboard &amp; Final Preview</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.map((stat, i) => (
                        <div key={i} className="group bg-white border-2 border-slate-100 rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300 hover:border-report-primary-border hover:shadow-xl hover:shadow-report-primary-shadow">
                            <div className="w-10 h-10 rounded-xl bg-report-primary-soft text-report-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                                <stat.icon className="w-4.5 h-4.5" />
                            </div>
                            <div>
                                <p className="report-h3 !text-2xl font-black">
                                    {stat.val}
                                    {stat.suffix && <span className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider">{stat.suffix}</span>}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {(data?.status === 'submitted' || data?.status === 'under_review' || data?.status === 'approved' || data?.status === 'verified' || data?.admin_status === 'verified' || data?.admin_status === 'approved') && (
                <div className="w-full flex justify-center">
                    <CIIDashboardMeter />
                </div>
            )}

            <div className="bg-white border-2 border-slate-200 rounded-[3rem] overflow-hidden shadow-xl relative group">
                <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity duration-1000 rotate-12">
                    <BarChart3 className="w-80 h-80 text-slate-900" />
                </div>
                <div className="flex items-center justify-between px-10 py-6 border-b border-slate-100 bg-slate-50/60">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-report-primary text-white flex items-center justify-center">
                            <Quote className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {data.section11?.is_ai_generated ? "AI-Generated" : "System-Generated"}
                            </p>
                            <h3 className="text-sm font-black text-slate-900">Comprehensive Impact Profile</h3>
                        </div>
                    </div>
                    <button type="button" onClick={handleGenerateAISummary} disabled={isGenerating} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-report-primary text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-40 transition-all shadow-md shadow-report-primary-shadow">
                        {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        {isGenerating ? "Generating…" : "Improve with AI"}
                    </button>
                </div>
                <div className="px-12 py-12 space-y-8 relative z-10">
                    <span className="absolute -top-8 -left-4 text-7xl font-serif text-slate-100 select-none">“</span>
                    <div className="space-y-5">
                        {executiveSummary.split('\n\n').map((paragraph: string, idx: number) => (
                            <p key={idx} className="report-ai-text">{paragraph.trim()}</p>
                        ))}
                    </div>
                    <span className="absolute -bottom-12 -right-6 text-7xl font-serif text-slate-100 select-none rotate-180">“</span>
                    <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-slate-100">
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-report-primary bg-report-primary-soft px-3 py-1.5 rounded-lg border border-report-primary-border uppercase tracking-widest">
                            <Sparkles className="w-3 h-3" /> Integrity Verified
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-report-primary bg-report-primary-soft px-3 py-1.5 rounded-lg border border-report-primary-border uppercase tracking-widest">
                            <TrendingUp className="w-3 h-3" /> Growth Documented
                        </span>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-center gap-3 px-1">
                    <div className="w-1 h-6 rounded-full bg-report-primary" />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Institutional Compliance Matrix</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {complianceItems.map((item, idx) => (
                        <div key={idx} className={clsx("group bg-white border-2 rounded-[2.5rem] p-8 flex flex-col gap-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5", item.check ? "border-report-primary-border shadow-sm shadow-report-primary-shadow" : "border-slate-100")}>
                            <div className={clsx("w-11 h-11 rounded-xl flex items-center justify-center transition-all", item.check ? "bg-report-primary-soft text-report-primary" : "bg-slate-50 text-slate-300 group-hover:bg-slate-100")}>
                                <item.icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 space-y-2">
                                <p className="text-sm font-black text-slate-900 leading-tight">{item.label}</p>
                                <p className="text-[11px] font-medium text-slate-400 leading-relaxed">{item.desc}</p>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <span className={clsx("text-[9px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-widest", item.check ? "bg-report-primary-soft text-report-primary border-report-primary-border" : "bg-slate-50 text-slate-400 border-slate-100")}>
                                    {item.status}
                                </span>
                                {item.check && <CheckCircle className="w-4 h-4 text-report-primary" />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Final Action Hub ── */}
            <div className="border-2 border-slate-200 rounded-[3rem] p-12 flex flex-col items-center gap-6 text-center bg-white shadow-xl relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-40 h-40 bg-report-primary/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                
                {(data?.admin_status === 'verified' || data?.admin_status === 'approved' || data?.status === 'approved' || data?.status === 'verified') ? (
                    <>
                        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center shadow-sm">
                            <CheckCircle className="w-7 h-7 text-green-600" />
                        </div>
                        <div className="max-w-md space-y-4">
                            <h3 className="text-lg font-black text-slate-900">Report Approved & Impact Verified</h3>
                            <p className="text-sm font-medium text-slate-400 leading-relaxed">Congratulations! Your social impact has been verified. You can now download your official CII.</p>
                            <div className="flex flex-col sm:flex-row gap-3 w-full">
                                <Button onClick={() => setShowPreview(true)} className="bg-report-primary hover:opacity-90 text-white px-8 h-12 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-report-primary-shadow flex-1">
                                    <Eye className="w-4 h-4 mr-2" /> Preview Dossier
                                </Button>
                                <Button variant="outline" onClick={() => setShowCertificate(true)} className="border-2 border-slate-200 text-slate-900 px-8 h-12 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-slate-50 flex-1">
                                    <Download className="w-4 h-4 mr-2" /> Download CII
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (data?.status === 'submitted' || data?.status === 'under_review') ? (
                    <>
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                            <ShieldAlert className="w-7 h-7 text-slate-400" />
                        </div>
                        <div className="max-w-md space-y-3">
                            <h3 className="text-lg font-black text-slate-900">Report Locked Pending Approval</h3>
                            <p className="text-sm font-medium text-slate-400 leading-relaxed">
                                {data.status === 'under_review' 
                                    ? "Your report is currently being reviewed by the administration."
                                    : "Your report has been submitted and is currently being reviewed."
                                }
                            </p>
                        </div>
                    </>
                ) : !isEligibleForSubmission ? (
                    <>
                        <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center shadow-inner">
                            <Clock className="w-8 h-8 text-amber-500 animate-pulse" />
                        </div>
                        <div className="flex-1 space-y-6">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Report In Progress</h3>
                                <p className="text-sm font-bold text-slate-400">
                                    You are currently in <span className="text-amber-600">Progress Mode</span>. Complete the following criteria:
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className={clsx("p-5 rounded-2xl border-2 flex items-center gap-4 transition-all", verifiedHours >= (data.required_hours || 16) ? "bg-slate-50 border-slate-100 text-slate-700" : "bg-slate-50 border-slate-100 text-slate-400")}>
                                    <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center shrink-0", verifiedHours >= (data.required_hours || 16) ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400")}>
                                        {verifiedHours >= (data.required_hours || 16) ? <CheckCircle className="w-5 h-5" /> : "1"}
                                    </div>
                                    <div className="space-y-0.5 text-left">
                                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">Min. Hours Met</p>
                                        <p className="text-xs font-bold">{verifiedHours} / {data.required_hours || 16} Hours</p>
                                    </div>
                                </div>
                                <div className={clsx("p-5 rounded-2xl border-2 flex items-center gap-4 transition-all", areAllSectionsComplete ? "bg-slate-50 border-slate-100 text-slate-700" : "bg-slate-50 border-slate-100 text-slate-400")}>
                                    <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center shrink-0", areAllSectionsComplete ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400")}>
                                        {areAllSectionsComplete ? <CheckCircle className="w-5 h-5" /> : "2"}
                                    </div>
                                    <div className="space-y-0.5 text-left">
                                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">Mandatory Sections</p>
                                        <p className="text-xs font-bold">{areAllSectionsComplete ? "Complete" : "In Progress"}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 bg-amber-50/50 border border-amber-100 rounded-2xl flex items-start gap-4">
                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-xs font-bold text-amber-700 leading-relaxed text-left">
                                    Final submission and **Section 10 (Sustainability)** will remain locked until all 16 hours are verified.
                                </p>
                            </div>
                        </div>
                    </>
                ) : isEligibleForSubmission && !areAllSectionsComplete ? (
                    <>
                        <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center shadow-inner">
                            <AlertTriangle className="w-8 h-8 text-amber-500" />
                        </div>
                        <div className="flex-1 space-y-6 max-w-lg">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Hours met — finish all sections</h3>
                                <p className="text-sm font-bold text-slate-400">
                                    Use the steps above to complete and validate sections 1–10. Submit appears only when every section is complete.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-5 rounded-2xl border-2 flex items-center gap-4 bg-slate-50 border-slate-100 text-slate-700">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                        <CheckCircle className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-0.5 text-left">
                                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">Min. Hours Met</p>
                                        <p className="text-xs font-bold">{verifiedHours} / {data.required_hours || 16} Hours</p>
                                    </div>
                                </div>
                                <div className="p-5 rounded-2xl border-2 border-amber-100 bg-amber-50/50 flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center shrink-0 font-bold text-sm">!</div>
                                    <div className="space-y-0.5 text-left">
                                        <p className="text-[10px] font-black uppercase tracking-widest leading-none text-amber-900">Sections 1–10</p>
                                        <p className="text-xs font-bold text-amber-800">Complete required fields on each step</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center animate-bounce shadow-lg shadow-blue-100">
                            <ShieldCheck className="w-8 h-8 text-blue-600" />
                        </div>
                        <div className="max-w-md space-y-4">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Ready for Final Submission</h3>
                            <p className="text-sm font-bold text-slate-400 leading-relaxed">
                                All sections are complete and hour requirements are met. Review and submit when ready.
                            </p>
                            <Button
                                onClick={() => {
                                    const footerSubmitBtn = Array.from(document.querySelectorAll("button")).find((btn) =>
                                        btn.textContent?.includes("Submit Report"),
                                    );
                                    if (footerSubmitBtn) footerSubmitBtn.click();
                                }}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-10 h-12 rounded-xl w-full text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-report-primary-shadow flex items-center justify-center gap-3"
                            >
                                <Lock className="w-4 h-4" /> Submit Final Report
                            </Button>
                        </div>
                    </>
                )}
            </div>

            {/* ── Modals (Print Handled via Visibility/Display) ── */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    /* Step 1: COMPLETELY REMOVE the dashboard UI from the print flow */
                    #dashboard-root, nav, aside, header, .sonner, [role="status"] { 
                        display: none !important; 
                    }

                    /* Step 2: Force the body to allow multi-page flow without extra space */
                    body { 
                        visibility: visible !important; 
                        background: white !important; 
                        height: auto !important; 
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    /* Step 3: Position the modal at the absolute top (0,0) of the print document */
                    .print-active-modal { 
                        display: block !important; 
                        position: absolute !important; 
                        left: 0 !important; 
                        top: 0 !important; 
                        width: 100% !important; 
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        overflow: visible !important;
                        visibility: visible !important;
                    }

                    /* Step 4: Reset the modal wrapper (portal) to not use flex/fixed in print */
                    .fixed.inset-0 { 
                        display: block !important; 
                        position: absolute !important; 
                        inset: 0 !important;
                        overflow: visible !important; 
                    }
                    
                    .relative.w-full.max-w-5xl, .relative.w-full.max-w-4xl { 
                        display: block !important; 
                        position: relative !important; 
                        max-width: none !important; 
                        width: 100% !important; 
                        transform: none !important; 
                        margin: 0 !important;
                        top: 0 !important;
                    }

                    @page { margin: 1cm; size: auto; }

                    .print-no-ui { display: none !important; }
                    
                    .print-scroll-auto, #print-area, #print-area-certificate { 
                        overflow: visible !important; 
                        max-height: none !important; 
                        height: auto !important;
                        display: block !important;
                        padding: 0 !important;
                    }
                }
            `}} />

            {showPreview && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center overflow-y-auto p-4 md:p-8 animate-in fade-in duration-300 print:p-0 print:bg-white print:backdrop-blur-none transition-all print-active-modal">
                    <div className="relative w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-300 print:shadow-none print:rounded-none print:max-w-none print:w-full print:p-0 print:m-0 print-scroll-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-xl rounded-t-[2rem] z-[110] print-no-ui">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg"><Download className="w-5 h-5" /></div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Official Project Dossier</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Institutional Impact Verification</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"><Printer className="w-3.5 h-3.5" /> Print / Save PDF</Button>
                                <button onClick={() => setShowPreview(false)} className="w-10 h-10 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div id="print-area" className="px-6 py-10 md:px-12 md:py-16 overflow-y-auto max-h-[85vh] print:max-h-none print:px-0 print:py-0 print-scroll-auto">
                            <ReportPrintView reportData={data} projectData={null} />
                        </div>
                    </div>
                </div>
            )}

            {showCertificate && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center overflow-y-auto p-4 md:p-8 animate-in fade-in duration-300 print:p-0 print:bg-white print:backdrop-blur-none print-active-modal">
                    <div className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-300 print:shadow-none print:rounded-none print:max-w-none print:w-full print:p-0 print:m-0 print-scroll-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-xl rounded-t-[2rem] z-[110] print-no-ui">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-report-primary text-white flex items-center justify-center shadow-lg"><Award className="w-5 h-5" /></div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">CII Certificate</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Certificate of Institutional Impact</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button onClick={handlePrint} className="bg-report-primary hover:opacity-90 text-white h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-report-primary-shadow"><Printer className="w-3.5 h-3.5" /> Print / Save PDF</Button>
                                <button onClick={() => setShowCertificate(false)} className="w-10 h-10 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div id="print-area-certificate" className="p-4 md:p-10 overflow-y-auto max-h-[85vh] print:max-h-none print:p-0 print-scroll-auto">
                            <CertificateView />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
