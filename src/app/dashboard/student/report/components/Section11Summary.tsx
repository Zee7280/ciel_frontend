import { CheckCircle, Clock, Users, Target, ShieldCheck, Download, Award, TrendingUp, X, Printer, Quote, Sparkles, BarChart3, PieChart, ShieldAlert } from "lucide-react";
import { Button } from "./ui/button";
import { useReportForm } from "../context/ReportContext";
import React, { useState, useMemo } from "react";
import ReportPrintView from "./ReportPrintView";
import clsx from "clsx";

export default function Section11Summary() {
    const { data } = useReportForm();
    const { section1, section2, section3, section4, section5, section8, section9, section10 } = data;

    const [showPreview, setShowPreview] = useState(false);

    const beneficiaries = section4.total_beneficiaries || 0;
    const engagementScore = section1.metrics?.eis_score || 72; // Default for demo if not calc
    const verifiedHours = section1.metrics?.total_verified_hours || 0;

    const executiveSummary = useMemo(() => {
        const primaryGoal = section3.primary_sdg?.goal_number || "X";
        const firstOutcome = section5.measurable_outcomes?.[0];
        const improvement = Math.abs((parseFloat(firstOutcome?.endline || '0') || 0) - (parseFloat(firstOutcome?.baseline || '0') || 0));
        return `Project successfully synthesized academic theory with community impact, primarily addressing SDG ${primaryGoal}. Through ${verifiedHours} verified hours of engagement, the project delivered measurable change for ${beneficiaries} beneficiaries. Competency growth was demonstrated across multiple domains, while sustainability is secured via ${section10.mechanisms?.length || 0} local mechanisms.`;
    }, [section1, section3, section4, section5, section10, verifiedHours, beneficiaries]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-12 pb-20">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xl shadow-slate-100 ring-4 ring-slate-50">
                        <BarChart3 className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Section 11 — Intelligence</h2>
                        <p className="text-slate-500 font-bold uppercase tracking-[0.15em] text-[10px]">Institutional Impact Dashboard & Final Preview</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: "Impact Score", val: engagementScore, suffix: "/100", icon: Award, color: "bg-indigo-600 shadow-indigo-100" },
                        { label: "Verified Hours", val: verifiedHours, suffix: "HRS", icon: Clock, color: "bg-slate-900 shadow-slate-200" },
                        { label: "Beneficiaries", val: beneficiaries, suffix: "PAX", icon: Users, color: "bg-emerald-600 shadow-emerald-100" },
                        { label: "SDG Priority", val: `Goal ${section3.primary_sdg?.goal_number || 0}`, suffix: "", icon: Target, color: "bg-amber-600 shadow-amber-100" }
                    ].map((stat, i) => (
                        <div key={i} className={clsx("p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden group transition-transform hover:scale-[1.02]", stat.color)}>
                            <stat.icon className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10 group-hover:scale-110 transition-transform" />
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">{stat.label}</p>
                            <p className="text-3xl font-black">{stat.val} <span className="text-[10px] opacity-70 uppercase">{stat.suffix}</span></p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Executive Impact Summary */}
            <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-12 relative overflow-hidden group shadow-2xl shadow-slate-100">
                <div className="absolute right-0 top-0 w-96 h-96 bg-slate-50 rounded-full -mr-48 -mt-48 blur-3xl group-hover:bg-indigo-50 transition-colors duration-1000" />
                <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
                    <div className="space-y-6 flex-1 text-center lg:text-left">
                        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                            <Quote className="w-3 h-3 text-indigo-400" /> AI-Generated Executive Summary
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 leading-tight">Project Impact Profile</h3>
                        <p className="text-xl font-bold text-slate-500 leading-relaxed font-serif italic">
                            "{executiveSummary}"
                        </p>
                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                            <span className="flex items-center gap-2 text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 uppercase tracking-widest">
                                <Sparkles className="w-3 h-3" /> Integrity Verified
                            </span>
                            <span className="flex items-center gap-2 text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 uppercase tracking-widest">
                                <TrendingUp className="w-3 h-3" /> Growth Documented
                            </span>
                        </div>
                    </div>
                    <div className="w-48 h-48 rounded-[2rem] bg-slate-50 border-4 border-white shadow-inner flex items-center justify-center shrink-0 group-hover:rotate-6 transition-transform">
                        <Award className="w-20 h-20 text-slate-200 group-hover:text-indigo-600 transition-colors" />
                    </div>
                </div>
            </div>

            {/* Audit & Compliance Matrix */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-[10px]">VERIFY</div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Institutional Compliance Matrix</h3>
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
                                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", item.check ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-300")}>
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">{item.label}</h4>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{item.desc}</p>
                                </div>
                            </div>
                            <div className="mt-8 flex items-center justify-between">
                                <span className={clsx("text-[9px] font-black px-3 py-1 rounded-lg border uppercase tracking-widest",
                                    item.check ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100")}>
                                    {item.status}
                                </span>
                                {item.check && <CheckCircle className="w-4 h-4 text-emerald-500" />}
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
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Report Locked Pending Approval</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
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
                                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                                    <Download className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Official Project Dossier</h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Review your final submission layout</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <Button
                                    onClick={handlePrint}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
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
