"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export function CollapsibleDetailText({
    fullText,
    previewText,
    isLong,
    emptyLabel = "No details provided.",
    className = "",
}: {
    fullText: string;
    previewText?: string;
    isLong?: boolean;
    emptyLabel?: string;
    className?: string;
}) {
    const [expanded, setExpanded] = useState(false);
    const full = (fullText || "").trim();
    if (!full) {
        return <p className={`text-sm text-slate-500 italic ${className}`}>{emptyLabel}</p>;
    }

    const long = isLong ?? full.length > 1_500;
    const preview = (previewText || full).trim();
    const shown = !long || expanded ? full : preview;

    return (
        <div className={className}>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap border-l-2 border-indigo-200 pl-4 max-h-[min(70vh,42rem)] overflow-y-auto">
                {shown}
            </p>
            {long ? (
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900"
                >
                    {expanded ? (
                        <>
                            <ChevronUp className="h-3.5 w-3.5" /> Show less
                        </>
                    ) : (
                        <>
                            <ChevronDown className="h-3.5 w-3.5" /> Show full execution plan
                        </>
                    )}
                </button>
            ) : null}
        </div>
    );
}
