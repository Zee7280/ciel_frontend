"use client";

import clsx from "clsx";
import { CII_BREAKDOWN_ORDER, CII_SECTION_MAX, CII_SECTION_SHORT_LABELS, type CIIBreakdownKey } from "@/app/dashboard/student/report/utils/ciiSectionWeights";

/** 10-cell rubric micro-strip: one cell per CII section, filled proportionally to score/max. */
export default function RubricMicroStrip({ scores }: { scores: Partial<Record<CIIBreakdownKey, number>> }) {
    return (
        <div className="flex items-end gap-1" role="img" aria-label="Impact score rubric breakdown across 10 sections">
            {CII_BREAKDOWN_ORDER.map((key) => {
                const max = CII_SECTION_MAX[key];
                const raw = scores[key] ?? 0;
                const pct = max > 0 ? Math.max(0, Math.min(1, raw / max)) : 0;
                return (
                    <div key={key} className="group relative flex w-6 flex-col items-center gap-1" title={`${CII_SECTION_SHORT_LABELS[key]}: ${raw}/${max}`}>
                        <div className="flex h-10 w-full items-end overflow-hidden rounded-ciel-xs bg-ciel-border">
                            <div
                                className={clsx("ciel-transition w-full", pct > 0 ? "bg-ciel-green" : "bg-transparent")}
                                style={{ height: `${Math.max(pct * 100, pct > 0 ? 12 : 0)}%` }}
                            />
                        </div>
                        <span className="text-[9px] font-semibold uppercase tracking-tight text-ciel-text-soft">{key.slice(0, 3)}</span>
                    </div>
                );
            })}
        </div>
    );
}
