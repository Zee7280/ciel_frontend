"use client";

import clsx from "clsx";

export interface CielTab {
    key: string;
    label: string;
    /** Amber dot for a tab that needs action (e.g. a draft awaiting evidence). */
    needsAction?: boolean;
}

export default function Tabs({
    tabs,
    active,
    onChange,
}: {
    tabs: CielTab[];
    active: string;
    onChange: (key: string) => void;
}) {
    return (
        <div role="tablist" aria-label="Workspace sections" className="flex gap-1 overflow-x-auto border-b border-ciel-border">
            {tabs.map((tab) => {
                const isActive = tab.key === active;
                return (
                    <button
                        key={tab.key}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(tab.key)}
                        className={clsx(
                            "ciel-transition relative flex shrink-0 items-center gap-1.5 px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green",
                            isActive ? "text-ciel-green-deep" : "text-ciel-text-mid hover:text-ciel-text",
                        )}
                    >
                        {tab.label}
                        {tab.needsAction && <span className="h-1.5 w-1.5 rounded-full bg-ciel-amber" aria-label="Needs action" />}
                        {isActive && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-ciel-green" />}
                    </button>
                );
            })}
        </div>
    );
}
