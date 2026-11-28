"use client";

import { useMemo } from "react";
import { mergeLinkedProjectRows, type LinkedProjects } from "@/hooks/useLinkedProjects";
import type { FacultyCsReportRow } from "@/app/dashboard/faculty/community-service/useFacultyCommunityServiceData";
import { isCommunityReportRejected, isFacultyCommunityLiveCard } from "@/utils/reviewQueue";
import { EmptyPanel } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import ProjectMonitorCard from "@/components/ciel/community-service/ProjectMonitorCard";

export type LinkedProjectsTab = "active" | "verified" | "all";

/** URL tab → view tab. The old "Live progress" tab (`tracking`) is the Active tab now. */
export function linkedProjectsTab(raw: string | null | undefined): LinkedProjectsTab {
    return raw === "verified" || raw === "all" ? raw : "active";
}

/**
 * Partner / NGO "Community Service Projects": the same picture the faculty hub shows. Every linked
 * project with assigned students appears (not only submitted reports), one card per team, with live
 * hours, report progress, reminders and the opportunity flashcard. Tab counts come from the same rows.
 */
export default function LinkedProjectsView({
    tracking,
    reportRows,
    reportsLoading,
    tab,
    onTabChange,
    roleLabel,
    reportHrefFor,
    onViewFlashcard,
}: {
    tracking: LinkedProjects;
    /** Submitted reports the dashboard already loaded (shown too when tracking does not cover them). */
    reportRows: FacultyCsReportRow[];
    reportsLoading?: boolean;
    tab: LinkedProjectsTab;
    onTabChange: (tab: LinkedProjectsTab) => void;
    roleLabel: string;
    reportHrefFor?: (row: FacultyCsReportRow) => string | undefined;
    onViewFlashcard?: (projectId: string) => void;
}) {
    const all = useMemo(() => mergeLinkedProjectRows(tracking.grouped, reportRows), [tracking.grouped, reportRows]);
    const active = useMemo(() => all.filter((r) => !isFacultyCommunityLiveCard(r) && !isCommunityReportRejected(r)), [all]);
    const verified = useMemo(() => all.filter((r) => isFacultyCommunityLiveCard(r)), [all]);
    const list = tab === "verified" ? verified : tab === "all" ? all : active;
    const loading = (tracking.loading || reportsLoading === true) && !all.length;
    const tabs: Array<{ id: LinkedProjectsTab; label: string; count: number }> = [
        { id: "active", label: "Active", count: active.length },
        { id: "verified", label: "Verified", count: verified.length },
        { id: "all", label: "All", count: all.length },
    ];

    return (
        <div data-ciel-linked-projects>
            <div className="mb-3.5 flex flex-wrap gap-2" role="tablist" aria-label="Linked projects">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.id}
                        onClick={() => onTabChange(t.id)}
                        className={
                            "rounded-[10px] border px-3 py-2 text-[11px] font-extrabold " +
                            (tab === t.id ? "border-[#cbece4] bg-[#e8f7f3] text-[#08756b]" : "border-[#dce6ea] bg-white text-[#52636e]")
                        }
                    >
                        {t.label}
                        <span className="ml-1.5 text-[10px] opacity-70">{t.count}</span>
                    </button>
                ))}
            </div>
            {loading ? (
                <p className="text-sm text-slate-500">Loading projects…</p>
            ) : !list.length ? (
                <EmptyPanel
                    title={tab === "verified" ? "Nothing verified yet" : "No linked projects"}
                    text={
                        tab === "verified"
                            ? "Projects appear here once CIEL PK approves the student's report."
                            : "Approved opportunities linked to your organization appear here as soon as students are assigned."
                    }
                />
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {tab === "active" ? (
                        <p className="text-[11px] font-semibold text-[#7a919a]">
                            Live view · refreshes every minute · {active.length} student{active.length === 1 ? "" : "s"} / team
                            {active.length === 1 ? "" : "s"} still working
                        </p>
                    ) : null}
                    {list.map((row) => (
                        <ProjectMonitorCard
                            key={row.id}
                            row={row}
                            reportHrefFor={reportHrefFor}
                            onViewFlashcard={onViewFlashcard}
                            remind={{ roleLabel, onRemindNow: tracking.remindNow, busy: tracking.remindingId === row.id }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
