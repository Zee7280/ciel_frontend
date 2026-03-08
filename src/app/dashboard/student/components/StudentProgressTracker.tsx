"use client";

import React, { useEffect, useState } from 'react';
import { authenticatedFetch } from '@/utils/api';
import { CheckCircle2, Square, Loader2 } from 'lucide-react';
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
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                <span className="text-amber-500 text-lg">⭐</span> BONUS FEATURE (Highly Recommended)
            </h3>

            <p className="text-slate-700 text-sm mb-4">
                Add a student progress tracker at the top of the dashboard:
            </p>

            <div className="flex items-center gap-4 mb-6">
                <span className="text-slate-600 font-medium">Progress:</span>
                <div className="flex-1 max-w-[200px] h-4 bg-slate-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-slate-700 rounded-full transition-all duration-1000"
                        style={{ width: `${progressPercentage}%`, backgroundImage: 'radial-gradient(circle, #ffffff33 1px, transparent 1px)', backgroundSize: '4px 4px' }}
                    />
                </div>
                <span className="text-slate-600 font-medium">{progressPercentage}%</span>
            </div>

            <div className="space-y-2 mb-6">
                {sections.map((section, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                        {section.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-indigo-500 fill-indigo-100" strokeWidth={2.5} />
                        ) : (
                            <Square className="w-5 h-5 text-indigo-200 fill-indigo-50/50 rounded drop-shadow-sm" strokeWidth={2.5} />
                        )}
                        <span className={`text-sm ${section.completed ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                            {section.label} {section.completed ? 'Completed' : 'Pending'}
                        </span>
                    </div>
                ))}
            </div>

            <p className="text-slate-400 text-xs mt-2">
                This dramatically improves student completion rates.
            </p>
        </div>
    );
}
