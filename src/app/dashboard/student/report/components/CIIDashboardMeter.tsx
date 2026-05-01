"use client"

import React, { useMemo } from 'react';
import { useReportForm } from '../context/ReportContext';
import { calculateCII } from '../utils/calculateCII';
import { readPersistedCiiSnapshot } from '@/utils/reportCiiSnapshot';
import { CheckCircle2, ChevronRight, TrendingUp, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

export default function CIIDashboardMeter() {
    const { data } = useReportForm();

    const ciiResult = useMemo(() => {
        const calculated = calculateCII(data);
        const persisted = readPersistedCiiSnapshot(data);
        return persisted
            ? {
                  ...calculated,
                  ...persisted,
                  totalScore: Math.round(persisted.totalScore),
                  breakdown: calculated.breakdown,
                  suggestions: persisted.suggestions ?? calculated.suggestions,
              }
            : calculated;
    }, [data]);

    const { totalScore, level, breakdown, suggestions } = ciiResult;

    // Determine colors based on score
    let meterColor = 'from-purple-500 to-indigo-600'; // Default purple (Transformational)
    let textColor = 'text-purple-700';
    let bgColor = 'bg-purple-50';
    let borderColor = 'border-purple-200';

    if (totalScore <= 20) {
        meterColor = 'from-red-500 to-rose-600';
        textColor = 'text-red-700';
        bgColor = 'bg-red-50';
        borderColor = 'border-red-200';
    } else if (totalScore <= 40) {
        meterColor = 'from-orange-500 to-amber-500';
        textColor = 'text-orange-700';
        bgColor = 'bg-orange-50';
        borderColor = 'border-orange-200';
    } else if (totalScore <= 60) {
        meterColor = 'from-yellow-400 to-amber-400';
        textColor = 'text-yellow-700';
        bgColor = 'bg-yellow-50';
        borderColor = 'border-yellow-200';
    } else if (totalScore <= 75) {
        meterColor = 'from-green-500 to-emerald-500';
        textColor = 'text-green-700';
        bgColor = 'bg-green-50';
        borderColor = 'border-green-200';
    } else if (totalScore <= 90) {
        meterColor = 'from-blue-500 to-cyan-500';
        textColor = 'text-blue-700';
        bgColor = 'bg-blue-50';
        borderColor = 'border-blue-200';
    }

    // Calculate rotation for speedometer (SVG arc)
    // Map 0-100 to 0-180 degrees (half circle)
    const arcDegree = (totalScore / 100) * 180;

    // Per-category maxima — must match `calculateCII.ts` / `CIIResult["breakdown"]` comments
    const scoreItems = [
        { label: 'Participation', score: breakdown.participation, max: 10 },
        { label: 'Context', score: breakdown.context, max: 10 },
        { label: 'SDG Alignment', score: breakdown.sdg, max: 10 },
        { label: 'Activities', score: breakdown.outputs, max: 15 },
        { label: 'Outcomes', score: breakdown.outcomes, max: 20 },
        { label: 'Resources', score: breakdown.resources, max: 7 },
        { label: 'Partnerships', score: breakdown.partnerships, max: 7 },
        { label: 'Evidence', score: breakdown.evidence, max: 12 },
        { label: 'Reflection', score: breakdown.learning, max: 4 },
        { label: 'Sustainability', score: breakdown.sustainability, max: 5 },
    ];

    return (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* ── Top Row: Speedometer + Score Breakdown ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                {/* Speedometer Card */}
                <div className={`bg-white rounded-2xl border ${borderColor} shadow-sm overflow-hidden`}>
                    <div className={`px-5 py-3 ${bgColor} border-b ${borderColor} flex items-center gap-2`}>
                        <TrendingUp className={`w-4 h-4 ${textColor}`} />
                        <h3 className={`text-xs font-black uppercase tracking-widest ${textColor}`}>Impact Score</h3>
                    </div>
                    <div className="py-6 flex flex-col items-center justify-center gap-2">
                        <div className="relative w-40 h-20 overflow-hidden">
                            <svg className="w-full h-full" viewBox="0 0 200 100">
                                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#f1f5f9" strokeWidth="24" strokeLinecap="round" />
                                <path
                                    d="M 20 100 A 80 80 0 0 1 180 100"
                                    fill="none"
                                    stroke="url(#cii-gradient)"
                                    strokeWidth="24"
                                    strokeLinecap="round"
                                    strokeDasharray="251.2"
                                    strokeDashoffset={251.2 - (251.2 * (totalScore / 100))}
                                    className="transition-all duration-1000 ease-out"
                                />
                                <defs>
                                    <linearGradient id="cii-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        {totalScore <= 40 ? (
                                            <>
                                                <stop offset="0%" stopColor="#f43f5e" />
                                                <stop offset="100%" stopColor="#f59e0b" />
                                            </>
                                        ) : totalScore <= 75 ? (
                                            <>
                                                <stop offset="0%" stopColor="#eab308" />
                                                <stop offset="100%" stopColor="#10b981" />
                                            </>
                                        ) : (
                                            <>
                                                <stop offset="0%" stopColor="#3b82f6" />
                                                <stop offset="100%" stopColor="#8b5cf6" />
                                            </>
                                        )}
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div
                                className="absolute bottom-0 left-1/2 w-1.5 h-14 bg-slate-800 rounded-full origin-bottom -translate-x-1/2 transition-transform duration-1000 z-10 ease-out"
                                style={{ transform: `translateX(-50%) rotate(${-90 + arcDegree}deg)` }}
                            >
                                <div className="absolute -top-1 -left-1 w-3 h-3 bg-slate-800 rounded-full" />
                            </div>
                            <div className="absolute bottom-[-6px] left-1/2 w-3.5 h-3.5 rounded-full bg-slate-900 -translate-x-1/2 z-20" />
                        </div>
                        <div className="text-center mt-2">
                            <p className="report-h3 !text-3xl font-black">
                                {totalScore}
                                <span className="text-sm font-semibold text-slate-400 ml-1">/ 100</span>
                            </p>
                            <p className={clsx("text-[10px] font-black uppercase tracking-widest mt-2", textColor)}>{level}</p>
                        </div>
                    </div>
                </div>

                {/* Score Breakdown Card */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-slate-100">Score Breakdown</p>
                    <div className="space-y-2.5 flex-1">
                        {scoreItems.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-xs">
                                <span className="text-slate-500 w-24 shrink-0">{item.label}</span>
                                <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-report-primary rounded-full transition-all duration-700"
                                        style={{
                                            width: `${item.max > 0 ? Math.min(100, (item.score / item.max) * 100) : 0}%`,
                                        }}
                                    />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 w-8 text-right shrink-0">
                                    {typeof item.score === 'number' && !Number.isInteger(item.score)
                                        ? item.score.toFixed(1)
                                        : item.score}
                                    /{item.max}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Bottom Row: Suggestions + Impact Profile ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Smart Suggestions */}
                {suggestions.length > 0 && totalScore < 100 ? (
                    <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
                        <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-3 pb-2 border-b border-amber-200 flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5" /> Next Time…
                        </p>
                        <ul className="space-y-2">
                            {suggestions.map((s, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-amber-700">
                                    <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                                    {s}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : <div />}

                {/* Impact Profile */}
                {totalScore >= 50 ? (
                    <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5">
                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-3 pb-2 border-b border-emerald-200 flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Impact Profile
                        </p>
                        <ul className="space-y-2">
                            {breakdown.participation >= 8 && (
                                <li className="flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> High Verified Participation</li>
                            )}
                            {breakdown.outcomes >= 18 && (
                                <li className="flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Strong Measurable Outcomes</li>
                            )}
                            {breakdown.partnerships >= 5 && (
                                <li className="flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Multi-Partner Collaboration</li>
                            )}
                            {breakdown.evidence >= 7 && (
                                <li className="flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Solid Verification</li>
                            )}
                        </ul>
                    </div>
                ) : <div />}
            </div>
        </div>
    );
}
