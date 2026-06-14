"use client";

import React from "react";
import clsx from "clsx";
import { summarizeEngagementRedFlags } from "@/lib/summarizeRedFlagDetails";

type Props = {
    flags: unknown;
    className?: string;
    itemClassName?: string;
    emptyLabel?: string;
};

export default function RedFlagsSummaryList({
    flags,
    className,
    itemClassName,
    emptyLabel = "None recorded",
}: Props) {
    const items = summarizeEngagementRedFlags(flags);

    if (items.length === 0) {
        return (
            <span className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-500">
                {emptyLabel}
            </span>
        );
    }

    return (
        <ul className={clsx("list-disc space-y-1.5 pl-5 text-sm font-medium leading-relaxed text-slate-800", className)}>
            {items.map((item, index) => (
                <li key={`${index}-${item}`} className={itemClassName}>
                    {item}
                </li>
            ))}
        </ul>
    );
}
