"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
    describeRemindNowResult,
    fetchProjectTracking,
    postRemindNow,
    type ProjectTrackingRole,
} from "@/utils/projectTracking";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import type { FacultyCsReportRow } from "@/app/dashboard/faculty/community-service/useFacultyCommunityServiceData";

/**
 * Live project tracking rows for a dashboard (partner / NGO / university / admin): loads once,
 * refreshes every minute while visible, and offers the server-side "Remind now".
 */
export function useProjectTracking(role: ProjectTrackingRole, { enabled = true, intervalMs = 60_000 } = {}) {
    const [rows, setRows] = useState<FacultyCsReportRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [remindingId, setRemindingId] = useState<string | null>(null);
    const alive = useRef(true);

    const reload = useCallback(async () => {
        if (!enabled) return;
        try {
            const next = await fetchProjectTracking(role);
            if (alive.current) setRows(next);
        } finally {
            if (alive.current) setLoading(false);
        }
    }, [role, enabled]);

    useEffect(() => {
        alive.current = true;
        void reload();
        return () => {
            alive.current = false;
        };
    }, [reload]);

    useLiveRefresh(reload, { intervalMs, enabled });

    const remindNow = useCallback(
        async (row: FacultyCsReportRow) => {
            const opportunityId = row.project_id;
            if (!opportunityId || remindingId) return;
            setRemindingId(row.id);
            try {
                const result = await postRemindNow(role, opportunityId, row.team_members?.length ? null : row.student_email);
                const { ok, message } = describeRemindNowResult(result);
                if (ok) toast.success(message);
                else toast.error(message);
                await reload();
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Reminder could not be sent.");
            } finally {
                if (alive.current) setRemindingId(null);
            }
        },
        [role, reload, remindingId],
    );

    return { rows, loading, reload, remindNow, remindingId };
}
