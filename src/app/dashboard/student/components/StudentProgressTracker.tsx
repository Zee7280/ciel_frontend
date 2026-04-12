"use client";

import React, { useEffect, useState } from 'react';
import { authenticatedFetch } from '@/utils/api';
import { formatDisplayId } from '@/utils/displayIds';
import { CheckCircle2, Square, Loader2 } from 'lucide-react';
import clsx from 'clsx';

import {
    validateSection1,
    validateSection2,
    validateSection3,
    validateSection4,
    validateSection5
} from '../report/utils/validation';

interface StudentProgressTrackerProps {
    projectId: string;
}

export default function StudentProgressTracker({ projectId }: StudentProgressTrackerProps) {
    const [progressData, setProgressData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!projectId) {
            setIsLoading(false);
            return;
        }

        const fetchReport = async () => {
            try {
                const res = await authenticatedFetch(`/api/v1/student/reports/${projectId}`);
                if (res && res.ok) {
                    const result = await res.json();
                    const reportData = result.data || result;
                    setProgressData(reportData);
                }
            } catch (error) {
                console.error("Failed to fetch report progress:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReport();
    }, [projectId]);

    if (isLoading) {
        return (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center min-h-[160px]">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!projectId) {
        return null; // Don't show if no active project
    }

    const report = progressData || {};

    // Evaluate completion of first 5 sections
    const s1 = validateSection1(report.section1 || {}).isValid;
    const s2 = validateSection2(report.section2 || {}).isValid;
    const s3 = validateSection3(report.section3 || {}).isValid;
    const s4 = validateSection4(report.section4 || {}).isValid;
    const s5 = validateSection5(report.section5 || {}).isValid;

    const sections = [
        { label: 'Participation', completed: s1 },
        { label: 'Context', completed: s2 },
        { label: 'SDG Alignment', completed: s3 },
        { label: 'Activities', completed: s4 },
        { label: 'Outcomes', completed: s5 },
    ];

    const completedCount = sections.filter(s => s.completed).length;
    const totalCount = sections.length;
    const progressPercentage = Math.round((completedCount / totalCount) * 100);

    return (
        <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full blur-3xl -mr-16 -mt-16" />

            <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-50 text-xs shadow-sm">⭐</span>
                        Bonus Feature — Highly Recommended
                    </h3>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
                        Completion Boost
                    </span>
                </div>

                <div className="space-y-4">
                    <div className="flex items-end justify-between px-1">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Current Progress</span>
                        <span className="text-2xl font-black text-slate-900 leading-none">
                            {progressPercentage}<span className="text-sm ml-0.5 text-slate-400">%</span>
                        </span>
                    </div>

                    <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="absolute inset-y-0 left-0 bg-slate-900 rounded-full transition-all duration-1000 ease-out shadow-[0_2px_10px_rgba(0,0,0,0.1)]"
                            style={{ width: `${progressPercentage}%` }}
                        />
                        {/* Animated stripes on the progress bar */}
                        <div
                            className="absolute inset-0 opacity-10"
                            style={{
                                backgroundImage: `linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)`,
                                backgroundSize: '1rem 1rem'
                            }}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-2">
                    {sections.map((section, idx) => (
                        <div
                            key={idx}
                            className={clsx(
                                "flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300",
                                section.completed
                                    ? "bg-emerald-50/30 border-emerald-100"
                                    : "bg-slate-50/50 border-slate-50 grayscale opacity-60"
                            )}
                        >
                            <div className={clsx(
                                "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border-2",
                                section.completed
                                    ? "bg-emerald-500 border-emerald-500 text-white"
                                    : "bg-white border-slate-200 text-slate-300"
                            )}>
                                <CheckCircle2 className={clsx("w-3.5 h-3.5", section.completed ? "block" : "hidden")} strokeWidth={3} />
                            </div>
                            <span className={clsx(
                                "text-[10px] font-bold uppercase tracking-wide",
                                section.completed ? "text-emerald-700" : "text-slate-500"
                            )}>
                                {section.label}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-2 pt-2 text-[10px] font-bold text-slate-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    Tracking activity for Project ID: {formatDisplayId(projectId, "OPP")} — Complete all sections to generate Section 1 results.
                </div>
            </div>
        </div>

    );
}
