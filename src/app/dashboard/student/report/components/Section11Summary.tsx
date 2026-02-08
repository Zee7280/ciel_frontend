import { LayoutGrid, CheckCircle2, FileText, ArrowRight, BarChart3, Fingerprint } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { useReportForm } from "../context/ReportContext";
import clsx from "clsx";

export default function Section11Summary() {
    const { data } = useReportForm();
    const { secondary_sdgs } = data.section3;
    const { metrics } = data.section5;
    const { evidence_types } = data.section8;

    return (
        <div className="space-y-12">
            {/* Section Header */}
            <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500">
                    <LayoutGrid className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Executive Summary</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Cross SDG Overview</h2>
                <p className="text-slate-500 max-w-2xl font-medium">An automatically generated summary linking your primary and secondary SDG objectives with outcomes.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stats Grid */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    {["SDG Category", "Metric Status", "Evidence Integrity"].map((h, i) => (
                                        <th key={i} className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {/* Primary SDG Row */}
                                <tr className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                                                <Target className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-slate-900">Primary SDG</div>
                                                <div className="text-[10px] font-medium text-slate-400 italic">Core Mission</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className="text-lg font-black text-slate-900">{metrics.filter((m: any) => m.metric).length}</div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Indicators</div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        {evidence_types.length > 0 ? (
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full border border-green-100">
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span className="text-[10px] font-black tracking-widest uppercase">Verified ({evidence_types.length})</span>
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                                                <AlertCircle className="w-3 h-3" />
                                                <span className="text-[10px] font-black tracking-widest uppercase">Missing</span>
                                            </div>
                                        )}
                                    </td>
                                </tr>

                                {/* Secondary SDGs */}
                                {secondary_sdgs.map((sdg, idx) => (
                                    <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-blue-400 shadow-lg">
                                                    <LayoutGrid className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-slate-900">Secondary SDG {sdg.sdg_id}</div>
                                                    <div className="text-[10px] font-medium text-slate-400 italic">Impact Multiplier</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                                                {sdg.justification ? 'Rationale Documented' : 'Rationale Pending'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest border-none">Cross-cutting</Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Validated Aggregation System • v1.0</p>
                        </div>
                    </div>
                </div>

                {/* Summary Card */}
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl space-y-8 relative overflow-hidden">
                        <div className="absolute -bottom-10 -right-10 opacity-10">
                            <BarChart3 className="w-48 h-48" />
                        </div>

                        <div className="space-y-2 relative z-10">
                            <h4 className="text-2xl font-black tracking-tight leading-tight">Insight Summary</h4>
                            <p className="text-slate-400 text-sm font-medium">Your project has effectively targeted multimodal developmental goals.</p>
                        </div>

                        <div className="space-y-4 relative z-10">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Impacts</span>
                                <span className="text-xl font-black text-blue-400">{1 + secondary_sdgs.length} Goals</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Evidence Score</span>
                                <span className="text-xl font-black text-green-400">{evidence_types.length > 0 ? 'High' : 'None'}</span>
                            </div>
                        </div>

                        <div className="pt-6 relative z-10">
                            <div className="p-4 bg-blue-600/20 rounded-2xl border border-blue-500/30 flex items-start gap-3">
                                <Fingerprint className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-blue-100/70 font-medium leading-relaxed italic">The cross-cutting nature of your work suggests strong system-level change.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function Target(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
        </svg>
    )
}

function AlertCircle(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
    )
}
