"use client"

import React, { useMemo } from 'react';
import { useReportForm } from '../context/ReportContext';
import { calculateCII } from '../utils/calculateCII';
import { readPersistedCiiSnapshot } from '@/utils/reportCiiSnapshot';
import {
    CII_APPROVED_LABELS,
    CII_BREAKDOWN_ORDER,
    CII_SECTION_MAX,
    ciiContributorBand,
} from '../utils/ciiSectionWeights';
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
                  breakdown: persisted.breakdown
                      ? { ...calculated.breakdown, ...persisted.breakdown }
                      : calculated.breakdown,
                  suggestions: persisted.suggestions ?? calculated.suggestions,
              }
            : calculated;
    }, [data]);

    const { totalScore, breakdown } = ciiResult;
    const band = ciiContributorBand(totalScore);
    const dash = 251.2;
    const filled = dash * Math.min(1, Math.max(0, totalScore / 100));

    const scoreItems = CII_BREAKDOWN_ORDER.map((key) => ({
        label: CII_APPROVED_LABELS[key],
        score: breakdown[key],
        max: CII_SECTION_MAX[key],
    }));

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
            <div className="cer-cii-bars">
                {scoreItems.map((item) => {
                    const pct = item.max > 0 ? Math.min(100, (Number(item.score) / item.max) * 100) : 0;
                    const weak = pct < 99;
                    const display =
                        typeof item.score === "number" && !Number.isInteger(item.score)
                            ? item.score.toFixed(1)
                            : item.score;
                    return (
                        <div key={item.label} className={clsx("cer-cii-row", weak && "weak")}>
                            <span className="cer-cii-lab">{item.label}</span>
                            <div className="cer-cii-track">
                                <i style={{ width: `${pct}%` }} />
                            </div>
                            <span className="cer-cii-n">
                                {display} / {item.max}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
