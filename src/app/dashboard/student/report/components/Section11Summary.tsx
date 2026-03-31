import { BarChart3, PieChart, ShieldAlert, Sparkles, Loader2, Quote, Award, Clock, Users, Target, ShieldCheck, Download, TrendingUp, X, Printer, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import React, { useState, useMemo, useEffect } from "react";
import ReportPrintView from "./ReportPrintView";
import CIIDashboardMeter from "./CIIDashboardMeter";
import { generateAISummary } from "../utils/aiSummarizer";
import { toast } from "sonner";
import clsx from "clsx";

export default function Section11Summary() {
    const { data, updateSection, saveReport } = useReportForm();
    const { section1, section2, section3, section4, section5, section8, section9, section10 } = data;

    const [showPreview, setShowPreview] = useState(false);

    const beneficiaries = section4.total_beneficiaries || 0;
    const engagementScore = section1.metrics?.eis_score || 72; // Default for demo if not calc
    const verifiedHours = section1.metrics?.total_verified_hours || 0;

    // ─── AI Summarization Logic ─────────────────────────────────────────────
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateAISummary = async () => {
        setIsGenerating(true);
        const result = await generateAISummary("section11", data); // Pass all data for executive summary
        setIsGenerating(false);

        if (result.error) {
            toast.error(result.error);
        } else if (result.summary) {
            updateSection('section11', { summary_text: result.summary });
            toast.success("AI Executive Summary generated!");
        }
    };

    const executiveSummary = useMemo(() => {
        if (data.section11?.summary_text) return data.section11.summary_text;

        const primaryGoal = section3.primary_sdg?.goal_number || "X";
        const firstOutcome = section5.measurable_outcomes?.[0];
        const improvement = Math.abs((parseFloat(firstOutcome?.endline || '0') || 0) - (parseFloat(firstOutcome?.baseline || '0') || 0));
        return `Project successfully synthesized academic theory with community impact, primarily addressing SDG ${primaryGoal}. Through ${verifiedHours} verified hours of engagement, the project delivered measurable change for ${beneficiaries} beneficiaries. Competency growth was demonstrated across multiple domains, while sustainability is secured via ${section10.mechanisms?.length || 0} local mechanisms.`;
    }, [section1, section3, section4, section5, section10, verifiedHours, beneficiaries, data.section11?.summary_text]);

    // ─── Automated AI Summarization (On First View) ─────────────────────────
    useEffect(() => {
        const hasEnoughData =
            (section2.problem_statement?.length > 100) &&
            (section4.activities?.length > 0) &&
            (section5.measurable_outcomes?.length > 0);

        const isEmpty = !data.section11?.summary_text ||
            data.section11.summary_text.includes("Project successfully synthesized") ||
            data.section11.summary_text.length < 50;

        if (hasEnoughData && isEmpty && !isGenerating) {
            handleGenerateAISummary();
        }
    }, []); // Only on mount

    const handlePrint = () => {
        window.print();
    };

    const stats = [
        { label: "Impact Score", val: engagementScore, suffix: "/100", icon: Award },
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
                        <h2 className="report-h2">
                            Section 11 — Intelligence
                        </h2>

                        <p className="report-label">
                            Institutional Impact Dashboard &amp; Final Preview
                        </p>
                    </div>

                </div>

                {/* ── Stats Row ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                    {stats.map((stat, i) => (

                        <div
                            key={i}
                            className="group bg-white border-2 border-slate-100 rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300 hover:border-report-primary-border hover:shadow-xl hover:shadow-report-primary-shadow"
                        >

                            {/* icon */}
                            <div className="w-10 h-10 rounded-xl bg-report-primary-soft text-report-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                                <stat.icon className="w-4.5 h-4.5" />
                            </div>


                            {/* value */}
                            <div>

                                <p className="text-2xl font-black text-slate-900 leading-none">

                                    {stat.val}

                                    {stat.suffix && (
                                        <span className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider">
                                            {stat.suffix}
                                        </span>
                                    )}

                                </p>


                                {/* label */}
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                                    {stat.label}
                                </p>

                            </div>

                        </div>

                    ))}

                </div>
            </div>

            {/* ── CII Dashboard (post-submission) ── */}
            {(data?.status === 'submitted' || data?.status === 'approved') && (
                <div className="w-full flex justify-center">
                    <CIIDashboardMeter />
                </div>
            )}


            {/* ── Executive Impact Summary ── */}
            <div className="bg-white border-2 border-slate-200 rounded-[3rem] overflow-hidden shadow-xl relative group">

                {/* watermark */}
                <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity duration-1000 rotate-12">
                    <BarChart3 className="w-80 h-80 text-slate-900" />
                </div>


                {/* Card Header */}
                <div className="flex items-center justify-between px-10 py-6 border-b border-slate-100 bg-slate-50/60">

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-report-primary text-white flex items-center justify-center">
                            <Quote className="w-4 h-4" />
                        </div>

                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                AI-Generated
                            </p>

                            <h3 className="text-sm font-black text-slate-900">
                                Comprehensive Impact Profile
                            </h3>
                        </div>
                    </div>


                    <button
                        type="button"
                        onClick={handleGenerateAISummary}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-report-primary text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-40 transition-all shadow-md shadow-report-primary-shadow"
                    >
                        {isGenerating
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Sparkles className="w-3.5 h-3.5" />
                        }

                        {isGenerating ? "Generating…" : "Improve with AI"}
                    </button>

                </div>


                {/* Card Body */}
                <div className="px-12 py-12 space-y-8 relative z-10">

                    {/* opening quote */}
                    <span className="absolute -top-8 -left-4 text-7xl font-serif text-slate-100 select-none">
                        “
                    </span>


                    <div className="space-y-5">

                        {executiveSummary.split('\n\n').map((paragraph: string, idx: number) => (
                            <p
                                key={idx}
                                className="report-ai-text"
                            >
                                {paragraph
                                    .trim()
                                    .replace(/^Paragraph \d: /, '')
                                    .replace(/^Paragraph \d - /, '')
                                }
                            </p>
                        ))}

                    </div>


                    {/* closing quote */}
                    <span className="absolute -bottom-12 -right-6 text-7xl font-serif text-slate-100 select-none rotate-180">
                        “
                    </span>


                    {/* Footer badges */}
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

            {/* ── Institutional Compliance Matrix ── */}
            <div className="space-y-6">

                <div className="flex items-center gap-3 px-1">
                    <div className="w-1 h-6 rounded-full bg-report-primary" />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                        Institutional Compliance Matrix
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {complianceItems.map((item, idx) => (

                        <div
                            key={idx}
                            className={clsx(
                                "group bg-white border-2 rounded-[2.5rem] p-8 flex flex-col gap-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
                                item.check
                                    ? "border-report-primary-border shadow-sm shadow-report-primary-shadow"
                                    : "border-slate-100"
                            )}
                        >

                            {/* Icon */}
                            <div
                                className={clsx(
                                    "w-11 h-11 rounded-xl flex items-center justify-center transition-all",
                                    item.check
                                        ? "bg-report-primary-soft text-report-primary"
                                        : "bg-slate-50 text-slate-300 group-hover:bg-slate-100"
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                            </div>


                            {/* Content */}
                            <div className="flex-1 space-y-2">

                                <p className="text-sm font-black text-slate-900 leading-tight">
                                    {item.label}
                                </p>

                                <p className="text-[11px] font-medium text-slate-400 leading-relaxed">
                                    {item.desc}
                                </p>

                            </div>


                            {/* Status Row */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">

                                <span
                                    className={clsx(
                                        "text-[9px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-widest",
                                        item.check
                                            ? "bg-report-primary-soft text-report-primary border-report-primary-border"
                                            : "bg-slate-50 text-slate-400 border-slate-100"
                                    )}
                                >
                                    {item.status}
                                </span>

                                {item.check && (
                                    <CheckCircle className="w-4 h-4 text-report-primary" />
                                )}

                            </div>

                        </div>

                    ))}

                </div>

            </div>

            {/* ── Final Action Hub ── */}
            <div className="border-2 border-slate-200 rounded-[3rem] p-12 flex flex-col items-center gap-6 text-center bg-white shadow-xl relative overflow-hidden group">

                {/* subtle background accent */}
                <div className="absolute right-0 top-0 w-40 h-40 bg-report-primary/5 rounded-full -mr-20 -mt-20 blur-3xl" />

                {data?.status === 'submitted' || data?.status === 'approved' ? (
                    <>
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                            <ShieldAlert className="w-7 h-7 text-slate-400" />
                        </div>

                        <div className="max-w-md space-y-3">
                            <h3 className="text-lg font-black text-slate-900">
                                Report Locked Pending Approval
                            </h3>

                            <p className="text-sm font-medium text-slate-400 leading-relaxed">
                                The final impact dossier and certificate will be available for preview and download once the report has been reviewed and approved by the NGO and university administration.
                            </p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 bg-report-primary-soft rounded-2xl flex items-center justify-center shadow-sm">
                            <CheckCircle className="w-7 h-7 text-report-primary" />
                        </div>

                        <div className="max-w-md space-y-4">

                            <h3 className="text-lg font-black text-slate-900">
                                Ready for Final Submission
                            </h3>

                            <p className="text-sm font-medium text-slate-400 leading-relaxed">
                                Please review your institutional impact dashboard above. Once submitted, you will not be able to edit this report.
                            </p>

                            <Button
                                onClick={() => {
                                    const footerSubmitBtn = Array.from(document.querySelectorAll('button'))
                                        .find(btn => btn.textContent?.includes('Submit Report'));
                                    if (footerSubmitBtn) footerSubmitBtn.click();
                                }}
                                className="bg-report-primary hover:opacity-90 text-white px-10 h-12 rounded-xl w-full text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-report-primary-shadow"
                            >
                                Submit Final Report
                            </Button>

                        </div>
                    </>
                )}
            </div>
            {/* ── Print Preview Modal ── */}
            {showPreview && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center overflow-y-auto p-6 animate-in fade-in duration-300 print:p-0 print:bg-white print:backdrop-blur-none">

                    <div className="relative w-full max-w-6xl bg-white rounded-[3rem] shadow-2xl animate-in slide-in-from-bottom-10 duration-500 print:shadow-none print:rounded-none print:max-w-none print:w-full">

                        {/* subtle background accent */}
                        <div className="absolute right-0 top-0 w-56 h-56 bg-report-primary/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-10 py-7 border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur-md rounded-t-[3rem] z-[110] print:hidden">

                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-report-primary text-white flex items-center justify-center shadow-sm">
                                    <Download className="w-5 h-5" />
                                </div>

                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-black text-slate-900">
                                        Official Project Dossier
                                    </h3>
                                    <p className="text-[11px] font-medium text-slate-400">
                                        Review your final submission layout
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">

                                <Button
                                    onClick={handlePrint}
                                    className="bg-report-primary hover:opacity-90 text-white h-11 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-md shadow-report-primary-shadow"
                                >
                                    <Printer className="w-4 h-4" />
                                    Print / Save PDF
                                </Button>

                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="w-11 h-11 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                            </div>

                        </div>


                        {/* Report Content */}
                        <div
                            id="print-area"
                            className="px-14 py-12 overflow-y-auto max-h-[80vh] print:max-h-none print:px-0 print:py-0"
                        >
                            <ReportPrintView projectData={null} />
                        </div>

                    </div>

                </div>
            )}
        </div>
    );
}
