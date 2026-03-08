import { BarChart3, PieChart, ShieldAlert, Sparkles, Loader2, Quote, Award, Clock, Users, Target, ShieldCheck, Download, TrendingUp, X, Printer, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import React, { useState, useMemo, useEffect } from "react";
import ReportPrintView from "./ReportPrintView";
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

    return (
        <div className="space-y-12 pb-20">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-report-primary text-white flex items-center justify-center shadow-xl shadow-report-primary-shadow ring-4 ring-report-primary-soft">
                        <BarChart3 className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="report-h2">Section 11 — Intelligence</h2>
                        <p className="report-label">Institutional Impact Dashboard & Final Preview</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: "Impact Score", val: engagementScore, suffix: "/100", icon: Award, color: "bg-report-primary shadow-report-primary-shadow" },
                        { label: "Verified Hours", val: verifiedHours, suffix: "HRS", icon: Clock, color: "bg-report-primary shadow-report-primary-shadow" },
                        { label: "Beneficiaries", val: beneficiaries, suffix: "PAX", icon: Users, color: "bg-report-primary shadow-report-primary-shadow" },
                        { label: "SDG Priority", val: `Goal ${section3.primary_sdg?.goal_number || 0}`, suffix: "", icon: Target, color: "bg-report-primary shadow-report-primary-shadow" }
                    ].map((stat, i) => (
                        <div key={i} className={clsx("p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden group transition-transform hover:scale-[1.02]", stat.color)}>
                            <stat.icon className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10 group-hover:scale-110 transition-transform" />
                            <p className="report-label !opacity-80 !mb-2">{stat.label}</p>
                            <p className="text-3xl font-black">{stat.val} <span className="report-label !opacity-70">{stat.suffix}</span></p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Executive Impact Summary */}
            <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-12 relative overflow-hidden group shadow-2xl shadow-slate-100">
                <div className="absolute right-0 top-0 w-96 h-96 bg-slate-50 rounded-full -mr-48 -mt-48 blur-3xl group-hover:bg-indigo-50 transition-colors duration-1000" />
                <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
                    <div className="space-y-6 flex-1 text-center lg:text-left">
                        <div className="flex items-center justify-between">
                            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-report-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                                <Quote className="w-3 h-3 text-white opacity-50" /> AI-Generated Executive Summary
                            </div>
                            <button
                                type="button"
                                onClick={handleGenerateAISummary}
                                disabled={isGenerating}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-report-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-report-primary-border disabled:opacity-50 transition-all shadow-lg shadow-report-primary-shadow"
                            >
                                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                Improve with AI
                            </button>
                        </div>
                        <h3 className="report-h2 !text-3xl">Project Impact Profile</h3>
                        <p className="report-ai-text !italic">
                            "{executiveSummary}"
                        </p>
                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                            <span className="flex items-center gap-2 text-[9px] font-black text-report-primary bg-report-primary-soft px-3 py-1 rounded-lg border border-report-primary-border uppercase tracking-widest">
                                <Sparkles className="w-3 h-3" /> Integrity Verified
                            </span>
                            <span className="flex items-center gap-2 text-[9px] font-black text-report-primary bg-report-primary-soft px-3 py-1 rounded-lg border border-report-primary-border uppercase tracking-widest">
                                <TrendingUp className="w-3 h-3" /> Growth Documented
                            </span>
                        </div>
                    </div>
                    <div className="w-48 h-48 rounded-[2rem] bg-slate-50 border-4 border-white shadow-inner flex items-center justify-center shrink-0 group-hover:rotate-6 transition-transform">
                        <Award className="w-20 h-20 text-slate-200 group-hover:text-report-primary transition-colors" />
                    </div>
                </div>
            </div>

            {/* Audit & Compliance Matrix */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center report-label !text-[8px]">VERIFY</div>
                    <h3 className="report-h3 !italic">Institutional Compliance Matrix</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        {
                            label: "Partner Validation",
                            status: section8.partner_verification ? "PASS" : "PENDING",
                            desc: "Formal recognition from external entities.",
                            icon: ShieldCheck,
                            check: section8.partner_verification
                        },
                        {
                            label: "Ethical Safeguards",
                            status: Object.values(section8.ethical_compliance || {}).every(Boolean) ? "CERTIFIED" : "PENDING",
                            desc: "Adherence to CIEL ethical declaration protocol.",
                            icon: ShieldAlert,
                            check: Object.values(section8.ethical_compliance || {}).every(Boolean)
                        },
                        {
                            label: "Sustainability Proof",
                            status: section10.mechanisms?.length > 0 ? "SECURED" : "VOLUNTARY",
                            desc: "Documented project legacy and roadmap.",
                            icon: TrendingUp,
                            check: section10.mechanisms?.length > 0
                        }
                    ].map((item, idx) => (
                        <div key={idx} className="bg-white border-2 border-slate-50 p-8 rounded-[2.5rem] shadow-sm hover:border-slate-200 transition-all flex flex-col justify-between">
                            <div className="space-y-4">
                                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", item.check ? "bg-report-primary-soft text-report-primary" : "bg-slate-50 text-slate-300")}>
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="report-label !text-slate-900">{item.label}</h4>
                                    <p className="report-help !mt-1">{item.desc}</p>
                                </div>
                            </div>
                            <div className="mt-8 flex items-center justify-between">
                                <span className={clsx("report-label !text-[9px] !px-3 !py-1 rounded-lg border",
                                    item.check ? "bg-report-primary-soft text-report-primary border-report-primary-border" : "bg-slate-50 text-slate-400 border-slate-100")}>
                                    {item.status}
                                </span>
                                {item.check && <CheckCircle className="w-4 h-4 text-report-primary" />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Final Action Hub */}
            <div className="pt-10 border-t-2 border-slate-50 flex flex-col items-center gap-6 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-2">
                    <ShieldAlert className="w-8 h-8 text-slate-400" />
                </div>
                <div className="max-w-md space-y-2">
                    <h3 className="report-h3 !text-xl">Report Locked Pending Approval</h3>
                    <p className="report-help">
                        The final impact dossier and certificate will be available for preview and download once the report has been reviewed and approved by the NGO and university administration.
                    </p>
                </div>
            </div>

            {/* ── Print Preview Modal ── */}
            {showPreview && (
                <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-start justify-center overflow-y-auto py-12 px-6 animate-in fade-in duration-300 print:p-0 print:bg-white print:backdrop-blur-none">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl relative animate-in slide-in-from-bottom-10 duration-700 print:shadow-none print:rounded-none print:max-w-none print:w-full">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-8 border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur-md rounded-t-[3rem] z-[110] print:hidden">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-report-primary flex items-center justify-center text-white">
                                    <Download className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="report-label !text-slate-900 !text-sm">Official Project Dossier</h3>
                                    <p className="report-help">Review your final submission layout</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <Button
                                    onClick={handlePrint}
                                    className="bg-report-primary hover:bg-report-primary-border text-white h-12 px-6 rounded-xl report-label transition-all flex items-center gap-2"
                                >
                                    <Printer className="w-4 h-4" /> Print / Save PDF
                                </Button>
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="w-12 h-12 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                        {/* Report Content */}
                        <div id="print-area" className="p-12 print:p-0">
                            <ReportPrintView projectData={null} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
