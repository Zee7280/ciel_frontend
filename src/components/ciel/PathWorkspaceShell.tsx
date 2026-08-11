"use client";

import type { LucideIcon } from "lucide-react";
import StatTile from "./StatTile";
import Tabs, { type CielTab } from "./Tabs";

export interface WorkspaceStat {
    label: string;
    value: string;
    icon?: LucideIcon;
    /** Only set this on the last stat tile: "Contributes to sections X, Y of your impact score". */
    hint?: string;
}

export default function PathWorkspaceShell({
    title,
    primaryActionLabel,
    onPrimaryAction,
    stats,
    tabs,
    activeTab,
    onTabChange,
    contextRail,
    children,
}: {
    title: string;
    primaryActionLabel?: string;
    onPrimaryAction?: () => void;
    stats: WorkspaceStat[];
    tabs: CielTab[];
    activeTab: string;
    onTabChange: (key: string) => void;
    contextRail?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="mx-auto max-w-[1440px]">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-black text-ciel-text">{title}</h1>
                {primaryActionLabel && (
                    <button
                        type="button"
                        onClick={onPrimaryAction}
                        className="ciel-transition rounded-ciel-sm bg-ciel-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-ciel-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green focus-visible:ring-offset-2"
                    >
                        {primaryActionLabel}
                    </button>
                )}
            </div>

            {stats.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-3">
                    {stats.map((stat) => (
                        <StatTile key={stat.label} {...stat} />
                    ))}
                </div>
            )}

            <div className="mt-6">
                <Tabs tabs={tabs} active={activeTab} onChange={onTabChange} />
            </div>

            <div className="mt-6 flex gap-6">
                <div className="min-w-0 flex-1">{children}</div>
                {contextRail}
            </div>
        </div>
    );
}
