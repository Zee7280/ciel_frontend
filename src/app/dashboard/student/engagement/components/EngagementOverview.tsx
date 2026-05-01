"use client";

import { Shield, Clock, TrendingUp, CheckCircle2, Calendar, Activity, Database, Zap } from "lucide-react";
import clsx from "clsx";

interface EngagementMetrics {
    totalHours: number;
    /** Roster-scoped attendance row count (teams); falls back in UI if omitted. */
    sessionCount?: number;
    activeDays: number;
    spanWeeks: number;
    frequency: number;
    weeklyContinuity: number;
    eis: number;
    category: string;
    hecStatus: string;
    evidenceCount: number;
    evidenceRatio: number;
    requiredHours?: number;
    /** Per-student requirement × team size (Section 1); used for team institutional cards. */
    projectGoal?: number;
    individual_metrics?: any[];
    intensity?: {
        volume: number;
        continuity: number;
        span: number;
        frequency: number;
    };
    redFlags?: string[];
    isNonCompliant?: boolean;
}

export default function EngagementOverview({ metrics, isTeam = false, participantNames = {}, hideIntensityHero = false }: { 
    metrics: EngagementMetrics, 
    isTeam?: boolean,
    participantNames?: Record<string, string>,
    /** When true, hides the dark intensity / HEC compliance hero (used in report Section 1 only). */
    hideIntensityHero?: boolean,
}) {
    const requiredHours = metrics.requiredHours || 16;
    const projectCapacityHours =
        isTeam && typeof metrics.projectGoal === "number" && metrics.projectGoal > 0
            ? metrics.projectGoal
            : requiredHours;
    const totalSessionsDisplay =
        typeof metrics.sessionCount === "number"
            ? metrics.sessionCount
            : Math.round(metrics.frequency * metrics.spanWeeks) || 0;

    // Fallback intensity if not provided by backend logic
    const intensity = metrics.intensity || {
        volume: Math.min(100, (metrics.totalHours / projectCapacityHours) * 100),
        continuity: metrics.weeklyContinuity || 0,
        span: Math.min(100, (metrics.spanWeeks / 12) * 100),
        frequency: Math.min(100, (metrics.frequency / 3) * 100)
    };

    return (
        <div className="space-y-8">
            {/* ── Engagement Intensity Hero (Image-Fidelity Version) ── */}
            {!hideIntensityHero && (
            <div className="bg-gradient-to-br from-[#0c143d] via-[#101962] to-[#070b24] rounded-[2.5rem] p-12 text-white shadow-2xl relative overflow-hidden border border-white/5 group">
                {/* Neon Glow Accents */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] -mr-40 -mt-40 group-hover:bg-blue-400/20 transition-colors duration-1000" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -ml-20 -mb-20" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-12">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 backdrop-blur-3xl flex items-center justify-center border border-white/10 shadow-inner">
                                <Shield className="w-5 h-5 text-blue-400" />
                            </div>
                            <span className="text-[11px] font-black tracking-[0.3em] uppercase text-blue-300 opacity-80">
                                {isTeam ? 'Team Engagement Intensity' : 'Student Engagement Intensity'}
                            </span>
                        </div>
                        
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-[140px] font-black tracking-tighter leading-none text-white drop-shadow-2xl">
                                {metrics.eis}
                            </h2>
                            <span className="text-4xl font-bold opacity-20 tracking-tighter">/100</span>
                        </div>

                        <div className="inline-flex items-center px-6 py-2 bg-white/5 backdrop-blur-2xl rounded-full text-xs font-black uppercase tracking-[0.15em] border border-white/10 text-blue-100 shadow-xl">
                            {metrics.category}
                        </div>
                    </div>

                    {/* Breakdown Column (Right Side of Image) */}
                    <div className="w-full md:w-[320px] space-y-8 self-center">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-400/60">Intensity Breakdown</p>
                        </div>
                        <div className="space-y-6">
                            {[
                                { label: 'Volume (50%)', value: intensity.volume, color: 'bg-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.4)]' },
                                { label: 'Continuity (25%)', value: intensity.continuity, color: 'bg-[#3b82f6] shadow-[0_0_15px_rgba(59,130,246,0.4)]' },
                                { label: 'Span (15%)', value: intensity.span, color: 'bg-[#ec4899] shadow-[0_0_15px_rgba(236,72,153,0.4)]' },
                                { label: 'Freq (10%)', value: intensity.frequency, color: 'bg-[#f43f5e] shadow-[0_0_15px_rgba(244,63,94,0.4)]' },
                            ].map((d, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-[11px] font-black tracking-wider uppercase opacity-70">
                                        <span>{d.label}</span>
                                        <span className="text-white">{Math.round(d.value)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${d.color} transition-all duration-1000 ease-out rounded-full`} 
                                            style={{ width: `${d.value}%` }} 
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* HEC Status Footer Bar */}
                <div className="mt-16 pt-10 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className={clsx(
                            "w-16 h-16 rounded-[1.5rem] backdrop-blur-2xl flex items-center justify-center border shadow-xl group/icon transition-all",
                            metrics.isNonCompliant ? "bg-rose-500/10 border-rose-500/30" : "bg-white/5 border-white/10"
                        )}>
                            <TrendingUp className={clsx(
                                "w-8 h-8 group-hover:scale-110 transition-transform",
                                metrics.isNonCompliant ? "text-rose-400" : "text-emerald-400"
                            )} />
                        </div>
                        <div>
                            <p className="text-[10px] opacity-40 font-black uppercase tracking-[0.3em] mb-1">HEC Compliance Status</p>
                            <p className={clsx(
                                "text-2xl font-black uppercase tracking-tight",
                                metrics.isNonCompliant ? "text-rose-400" : "text-white"
                            )}>
                                {metrics.isNonCompliant ? "Non-Compliant" : metrics.hecStatus}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-2">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="w-9 h-9 rounded-full border-[3px] border-[#070b24] bg-[#101962] flex items-center justify-center shadow-lg">
                                    <CheckCircle2 className={clsx(
                                        "w-4 h-4",
                                        metrics.isNonCompliant ? "text-rose-400" : "text-blue-300"
                                    )} />
                                </div>
                            ))}
                        </div>
                        <span className="text-[11px] font-black text-blue-400/60 uppercase tracking-[0.25em]">Verified by CIEL Panel</span>
                    </div>
                </div>

                {/* 🚨 Red Flags Alert Section 🚨 */}
                {metrics.redFlags && metrics.redFlags.length > 0 && (
                    <div className="mt-8 p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl animate-in slide-in-from-top-2 duration-500">
                        <div className="flex items-center gap-3 mb-4">
                            <Zap className="w-5 h-5 text-rose-400 animate-pulse" />
                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-300">Audit & Integrity Alerts</h4>
                        </div>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                            {metrics.redFlags.map((flag, idx) => (
                                <li key={idx} className="flex items-center gap-3 text-[10px] font-bold text-rose-200/70">
                                    <div className="w-1 h-1 rounded-full bg-rose-500" />
                                    {flag}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            )}

            {/* ── Analytics Highlighters (Institutional Summary) ── */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Database className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Institutional Analytics Highlights</h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Highlighter 1: Total Engagement Capacity */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                            <Clock className="w-12 h-12" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 italic">Engagement Capacity</p>
                        <div className="space-y-4">
                            <div className="flex justify-between items-baseline">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Required (RHS)</span>
                                <span className="text-sm font-black text-slate-900">{projectCapacityHours} <span className="text-[8px] opacity-40">HRS</span></span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Verified (Hs)</span>
                                <span className="text-sm font-black text-indigo-600">{metrics.totalHours} <span className="text-[8px] opacity-40">HRS</span></span>
                            </div>
                        </div>
                    </div>

                    {/* Highlighter 2: Completion Efficiency */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group border-l-4 border-l-emerald-500">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 italic">Completion Efficiency</p>
                        <div className="space-y-4">
                            <div className="flex justify-between items-baseline">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Ratio (%)</span>
                                <span className="text-sm font-black text-slate-900">{Math.round((metrics.totalHours / projectCapacityHours) * 100)}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Eligibility</span>
                                <span className={clsx(
                                    "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                    metrics.totalHours >= projectCapacityHours ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                )}>
                                    {metrics.totalHours >= projectCapacityHours ? "ELIGIBLE" : "INCOMPLETE"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Highlighter 3: Integrity & Structure */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 italic">Integrity & Structure</p>
                        <div className="space-y-4">
                            <div className="flex justify-between items-baseline">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Struct. Type</span>
                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{isTeam ? 'Team Base' : 'Individual'}</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Integrity Sc.</span>
                                <span className="text-sm font-black text-indigo-600">{Math.round(metrics.weeklyContinuity || 0)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Highlighter 4: Performance Bonus */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group border-l-4 border-l-indigo-500">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 italic">Performance Bonus</p>
                        <div className="space-y-4">
                            <div className="flex justify-between items-baseline">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Bonus Status</span>
                                <span className={clsx(
                                    "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                    metrics.totalHours >= projectCapacityHours * 2 ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-slate-50 text-slate-400 border-slate-100"
                                )}>
                                    {metrics.totalHours >= projectCapacityHours * 2 ? "GOLD BONUS" : "NOT APPLICABLE"}
                                </span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Total Sessions</span>
                                <span className="text-sm font-black text-slate-900">{totalSessionsDisplay} <span className="text-[8px] opacity-40">SESS.</span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Individual Completion Table - ONLY FOR TEAMS */}
            {isTeam && metrics.individual_metrics && metrics.individual_metrics.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-100 p-8 space-y-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-report-primary" />
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Individual Completion Status</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {metrics.individual_metrics.map((m, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        {participantNames[m.student_id] ?? "Participant"}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-black text-slate-900">{m.individual_hours}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">/ {requiredHours} hrs</span>
                                    </div>
                                </div>
                                <div className="text-right space-y-2">
                                    <div className="h-2 w-24 bg-slate-200 rounded-full overflow-hidden">
                                        <div 
                                            className={clsx(
                                                "h-full transition-all duration-1000",
                                                m.completion_percentage >= 100 ? "bg-emerald-500" : "bg-report-primary"
                                            )} 
                                            style={{ width: `${m.completion_percentage}%` }}
                                        />
                                    </div>
                                    <p className={clsx(
                                        "text-[9px] font-black uppercase tracking-widest",
                                        m.gateway_status === 'ELIGIBLE' ? "text-emerald-500" : "text-amber-500"
                                    )}>
                                        {m.gateway_status === 'ELIGIBLE' ? 'Target Met' : 'In Progress'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: 'Total Hours', value: metrics.totalHours, unit: 'hrs', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Active Days', value: metrics.activeDays, unit: 'days', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Span', value: metrics.spanWeeks, unit: 'wks', icon: Calendar, color: 'text-violet-600', bg: 'bg-violet-50' },
                    { label: 'Frequency', value: metrics.frequency, unit: 'v/wk', icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50' },
                    { label: 'Evidence', value: Math.round(metrics.evidenceRatio), unit: '%', icon: Database, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((m, i) => (
                    <div
                        key={i}
                        title={
                            m.label === "Frequency"
                                ? "Average verified attendance entries per week that had at least one log (sessions ÷ active weeks with logs)."
                                : undefined
                        }
                        className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group/card"
                    >
                        <div className={`w-10 h-10 rounded-xl ${m.bg} ${m.color} flex items-center justify-center mb-4 group-hover/card:scale-110 transition-transform`}>
                            <m.icon className="w-5 h-5" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">{m.label}</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-800">{m.value}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{m.unit}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
