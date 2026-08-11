"use client";

import clsx from "clsx";

export default function ProgressBar({
    value,
    className,
    trackClassName,
    barClassName,
}: {
    /** 0–100 */
    value: number;
    className?: string;
    trackClassName?: string;
    barClassName?: string;
}) {
    const pct = Math.max(0, Math.min(100, value));
    return (
        <div
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            className={clsx("h-1.5 w-full overflow-hidden rounded-full bg-ciel-border", trackClassName, className)}
        >
            <div
                className={clsx("ciel-transition h-full rounded-full bg-ciel-green", barClassName)}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}
