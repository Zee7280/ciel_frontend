"use client";

import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

export default function StatTile({
    label,
    value,
    icon: Icon,
    hint,
    className,
}: {
    label: string;
    value: string;
    icon?: LucideIcon;
    /** e.g. "contributes to sections 4, 7 of your impact score" — pass on the last tile in a strip. */
    hint?: string;
    className?: string;
}) {
    return (
        <div
            className={clsx(
                "flex min-w-[10rem] flex-1 flex-col gap-1 rounded-ciel-md border border-ciel-border bg-white px-4 py-3.5",
                className,
            )}
        >
            <div className="flex items-center gap-2 text-ciel-text-soft">
                {Icon && <Icon className="h-4 w-4" aria-hidden />}
                <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
            </div>
            <span className="text-2xl font-black leading-tight text-ciel-text">{value}</span>
            {hint && <span className="text-xs text-ciel-text-soft">{hint}</span>}
        </div>
    );
}
