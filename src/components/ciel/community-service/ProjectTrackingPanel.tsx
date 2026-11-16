"use client";

import { useProjectTracking } from "@/hooks/useProjectTracking";
import type { ProjectTrackingRole } from "@/utils/projectTracking";
import type { FacultyCsReportRow } from "@/app/dashboard/faculty/community-service/useFacultyCommunityServiceData";
import { isFacultyCommunityLiveCard } from "@/utils/reviewQueue";
import { EmptyPanel } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import ProjectMonitorCard from "@/components/ciel/community-service/ProjectMonitorCard";

/**
 * "Live progress" tab of a Community Service Projects view: every assigned student / team on the
 * projects this dashboard may see, with live hours, report progress, deadline and reminder state.
 * Refreshes itself every minute while open. Verified projects are left to the Verified tab.
 */
export default function ProjectTrackingPanel({
    role,
    roleLabel,
    reportHrefFor,
    hoursHrefFor,
    emptyText,
}: {
    role: ProjectTrackingRole;
    roleLabel: string;
    reportHrefFor?: (row: FacultyCsReportRow) => string | undefined;
    hoursHrefFor?: (projectId: string) => string;
    emptyText: string;
}) {
    const { rows, loading, remindNow, remindingId } = useProjectTracking(role);
    const active = rows.filter((row) => !isFacultyCommunityLiveCard(row));
    if (loading) return <p className="text-sm text-slate-500">Loading live progress…</p>;
    if (!active.length) return <EmptyPanel title="No project in progress" text={emptyText} />;
    return (
        <div className="grid grid-cols-1 gap-4">
            <p className="text-[11px] font-semibold text-[#7a919a]">
                Live view · refreshes every minute · {active.length} student{active.length === 1 ? "" : "s"} / team{active.length === 1 ? "" : "s"} still working
            </p>
            {active.map((row) => (
                <ProjectMonitorCard
                    key={row.id}
                    row={row}
                    reportHrefFor={reportHrefFor}
                    hoursHrefFor={hoursHrefFor}
                    remind={{ roleLabel, onRemindNow: remindNow, busy: remindingId === row.id }}
                />
            ))}
        </div>
    );
}
