"use client";

import clsx from "clsx";

export default function RoleTile({
    label,
    emoji,
    desc,
    selected,
    onSelect,
}: {
    label: string;
    emoji: string;
    desc?: string;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={onSelect}
            className={clsx(
                "ciel-transition flex min-h-[7.25rem] min-w-0 flex-col items-start rounded-ciel-md border-2 px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green focus-visible:ring-offset-2",
                selected
                    ? "border-ciel-green bg-ciel-green-soft"
                    : "border-ciel-border bg-white hover:border-ciel-green/40",
            )}
        >
            <span
                className={clsx(
                    "ciel-transition mb-2 flex h-9 w-9 items-center justify-center rounded-ciel-sm text-lg",
                    selected ? "bg-ciel-green text-white" : "bg-ciel-page",
                )}
                aria-hidden
            >
                {emoji}
            </span>
            <span className={clsx("text-xs font-bold leading-tight", selected ? "text-ciel-green-deep" : "text-ciel-text")}>
                {label}
            </span>
            {desc ? (
                <span className="mt-1 text-[10px] leading-snug text-ciel-text-soft">{desc}</span>
            ) : null}
        </button>
    );
}
