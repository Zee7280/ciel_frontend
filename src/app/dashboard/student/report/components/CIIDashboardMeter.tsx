"use client"

import React, { useMemo } from 'react';
import { useReportForm } from '../context/ReportContext';
import { resolveReportCii } from '../utils/resolveReportCii';
import { ciiContributorBand } from '../utils/ciiSectionWeights';

export default function CIIDashboardMeter() {
    const { data } = useReportForm();

    const ciiResult = useMemo(() => resolveReportCii(data), [data]);

    const { totalScore } = ciiResult;
    const band = ciiContributorBand(totalScore);
    const dash = 251.2;
    const filled = dash * Math.min(1, Math.max(0, totalScore / 100));

    return (
        <div className="cer-cii">
            <div className="cer-cii-gauge">
                <div className="cer-cii-arc">
                    <svg viewBox="0 0 200 110" className="cer-cii-svg" aria-hidden>
                        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e8eeed" strokeWidth="16" strokeLinecap="round" />
                        <path
                            d="M 20 100 A 80 80 0 0 1 180 100"
                            fill="none"
                            stroke="#0e7d74"
                            strokeWidth="16"
                            strokeLinecap="round"
                            strokeDasharray={`${filled} ${dash}`}
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <p className="cer-cii-score">
                        {totalScore} <span>/ 100</span>
                    </p>
                </div>
                <p className="cer-cii-band">{band.title}</p>
                <p className="cer-cii-band-sub">{band.detail}</p>
            </div>
        </div>
    );
}
