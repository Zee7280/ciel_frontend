"use client";

import clsx from "clsx";

export default function RoleTile({
    label,
    emoji,
    selected,
    onSelect,
}: {
    label: string;
    emoji: string;
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
                "ciel-transition flex flex-col items-center gap-2 rounded-ciel-md border-2 px-3 py-4 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green focus-visible:ring-offset-2",
                selected
                    ? "border-ciel-green bg-ciel-green-soft"
                    : "border-ciel-border bg-white hover:border-ciel-green/40",
            )}
        >
            <span
                className={clsx(
                    "ciel-transition flex h-10 w-10 items-center justify-center rounded-ciel-sm text-xl",
                    selected ? "bg-ciel-green text-white" : "bg-ciel-page",
                )}
                aria-hidden
            >
                {emoji}
            </span>
            <span className={clsx("text-xs font-bold leading-tight", selected ? "text-ciel-green-deep" : "text-ciel-text")}>
                {label}
            </span>
        </button>
    );
}
