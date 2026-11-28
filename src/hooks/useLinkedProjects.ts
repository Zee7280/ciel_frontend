"use client";

import { useMemo } from "react";
import { useProjectTracking } from "@/hooks/useProjectTracking";
import type { ProjectTrackingRole } from "@/utils/projectTracking";
import { groupTeamTrackingRows } from "@/utils/facultyTeamTracking";
import { isCommunityReportRejected, isFacultyCommunityLiveCard } from "@/utils/reviewQueue";
import type { FacultyCsReportRow } from "@/app/dashboard/faculty/community-service/useFacultyCommunityServiceData";

/**
 * Linked Community Service projects for a dashboard, shaped like the faculty hub: live tracking rows
 * (one card per team, refreshed every minute) split into still-working ("active") and verified.
 */
export function useLinkedProjects(role: ProjectTrackingRole, options?: { enabled?: boolean; intervalMs?: number }) {
    const tracking = useProjectTracking(role, options);
    const grouped = useMemo(() => groupTeamTrackingRows(tracking.rows), [tracking.rows]);
    const active = useMemo(
        () => grouped.filter((row) => !isFacultyCommunityLiveCard(row) && !isCommunityReportRejected(row)),
        [grouped],
    );
    const verified = useMemo(() => grouped.filter((row) => isFacultyCommunityLiveCard(row)), [grouped]);
    return { ...tracking, grouped, active, verified };
}

export type LinkedProjects = ReturnType<typeof useLinkedProjects>;

/**
 * Tracking rows plus any report the tracking feed does not already show (e.g. a report that names the
 * organization in its Partnerships section without a seat on a linked opportunity).
 */
export function mergeLinkedProjectRows(grouped: FacultyCsReportRow[], reportRows: FacultyCsReportRow[]): FacultyCsReportRow[] {
    if (!grouped.length) return reportRows;
    const shown = new Set<string>();
    for (const row of grouped) {
        const reportId = String(row.report_id || "").trim();
        if (reportId) shown.add(reportId);
        shown.add(String(row.id));
    }
    return [...grouped, ...reportRows.filter((row) => !shown.has(String(row.id)))];
}
