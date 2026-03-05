"use client";

import { Shield, Clock, TrendingUp, CheckCircle2, Calendar, Activity, Database } from "lucide-react";

interface EngagementMetrics {
    totalHours: number;
    activeDays: number;
    spanWeeks: number;
    frequency: number;
    weeklyContinuity: number;
    eis: number;
    category: string;
    hecStatus: string;
    evidenceCount: number;
    evidenceRatio: number;
}

export default function EngagementOverview({ metrics, isTeam = false }: { metrics: EngagementMetrics, isTeam?: boolean }) {
    return (
        <div className="space-y-8">
            {/* EIS Hero Card */}
            <div className="bg-gradient-to-br from-slate-800 via-blue-800 to-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-slate-500/5 rounded-full blur-3xl -ml-10 -mb-10"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                <Shield className="w-4 h-4 text-blue-300" />
                            </div>
                            <span className="text-xs font-black tracking-[0.2em] uppercase text-blue-200">{isTeam ? 'Team Engagement Intensity' : 'Engagement Intensity'}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-8xl font-black tracking-tighter">{metrics.eis}</h2>
                            <span className="text-2xl font-bold opacity-30">/100</span>
                        </div>
                        <div className="inline-flex items-center px-4 py-1.5 bg-blue-500/20 backdrop-blur-xl rounded-full text-xs font-black uppercase tracking-wider border border-blue-400/30 text-blue-200">
                            {metrics.category}
                        </div>
                    </div>

                    <div className="w-full md:w-64 space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Intensity Breakdown</p>
                        <div className="space-y-2.5">
                            {[
                                { label: 'Hours (40%)', value: Math.min(100, (metrics.totalHours / 48) * 100), color: 'bg-blue-400' },
                                { label: 'Continuity (20%)', value: metrics.weeklyContinuity, color: 'bg-indigo-400' },
                                { label: 'Span (15%)', value: Math.min(100, (metrics.spanWeeks / 16) * 100), color: 'bg-violet-400' },
                            ].map((d, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-bold">
                                        <span className="opacity-70">{d.label}</span>
                                        <span>{Math.round(d.value)}%</span>
                                    </div>
                                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                        <div className={`h-full ${d.color} transition-all duration-1000`} style={{ width: `${d.value}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Status Bar */}
                <div className="mt-12 pt-8 border-t border-white/10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                                <TrendingUp className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-[10px] opacity-50 font-black uppercase tracking-widest">HEC Compliance Status</p>
                                <p className="text-lg font-bold text-slate-100">{metrics.hecStatus}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-1.5 overflow-hidden">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="w-7 h-7 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                                    </div>
                                ))}
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verified by CIEL Panel</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: 'Total Hours', value: metrics.totalHours, unit: 'hrs', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Active Days', value: metrics.activeDays, unit: 'days', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Span', value: metrics.spanWeeks, unit: 'wks', icon: Calendar, color: 'text-violet-600', bg: 'bg-violet-50' },
                    { label: 'Frequency', value: metrics.frequency, unit: 'v/wk', icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50' },
                    { label: 'Evidence', value: metrics.evidenceRatio, unit: '%', icon: Database, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((m, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className={`w-10 h-10 rounded-xl ${m.bg} ${m.color} flex items-center justify-center mb-4`}>
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
