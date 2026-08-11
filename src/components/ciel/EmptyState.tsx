"use client";

import clsx from "clsx";

export default function EmptyState({
    emoji,
    heading,
    line,
    actionLabel,
    onAction,
    href,
    className,
}: {
    emoji: string;
    heading: string;
    line: string;
    actionLabel?: string;
    onAction?: () => void;
    href?: string;
    className?: string;
}) {
    return (
        <div
            className={clsx(
                "flex flex-col items-center justify-center rounded-ciel-lg border border-ciel-border bg-white px-6 py-14 text-center",
                className,
            )}
        >
            <span className="text-4xl" aria-hidden>
                {emoji}
            </span>
            <h3 className="mt-4 text-base font-bold text-ciel-text">{heading}</h3>
            <p className="mt-1.5 max-w-sm text-sm text-ciel-text-mid">{line}</p>
            {actionLabel && (href || onAction) && (
                href ? (
                    <a
                        href={href}
                        className="ciel-transition mt-6 inline-flex items-center justify-center rounded-ciel-sm bg-ciel-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-ciel-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green focus-visible:ring-offset-2"
                    >
                        {actionLabel}
                    </a>
                ) : (
                    <button
                        type="button"
                        onClick={onAction}
                        className="ciel-transition mt-6 inline-flex items-center justify-center rounded-ciel-sm bg-ciel-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-ciel-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green focus-visible:ring-offset-2"
                    >
                        {actionLabel}
                    </button>
                )
            )}
        </div>
    );
}
