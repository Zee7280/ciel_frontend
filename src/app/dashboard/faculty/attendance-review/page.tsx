"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { getStoredCurrentUserEmail } from "@/utils/currentUser";
import { toast } from "sonner";
import AttendanceReviewDashboard from "@/components/engagement/AttendanceReviewDashboard";
import { fetchPendingAttendanceCountForProject } from "@/utils/engagementPendingAttendanceResponse";

/** Normalize faculty /mine list payloads (flat `data[]`, nested wrappers, Mongo-style `_id`). */
function extractFacultyMineOpportunityRows(payload: unknown): Record<string, unknown>[] {
    if (Array.isArray(payload)) {
        return payload.filter((x): x is Record<string, unknown> => x != null && typeof x === "object");
    }
    if (payload == null || typeof payload !== "object") return [];
    const root = payload as Record<string, unknown>;
    if (root.success === false) return [];

    const asObjectRows = (v: unknown): Record<string, unknown>[] | null => {
        if (!Array.isArray(v)) return null;
        return v.filter((x): x is Record<string, unknown> => x != null && typeof x === "object");
    };

    const top = asObjectRows(root.data);
    if (top) return top;

    if (root.data != null && typeof root.data === "object" && !Array.isArray(root.data)) {
        const inner = root.data as Record<string, unknown>;
        for (const key of ["opportunities", "items", "rows", "records", "list"] as const) {
            const nested = asObjectRows(inner[key]);
            if (nested) return nested;
        }
    }

    for (const key of ["opportunities", "items"] as const) {
        const direct = asObjectRows(root[key]);
        if (direct) return direct;
    }

    return [];
}

function pickOpportunityListId(o: Record<string, unknown>): string {
    const nested =
        o.opportunity && typeof o.opportunity === "object"
            ? (o.opportunity as Record<string, unknown>)
            : null;
    for (const v of [
        o.id,
        o._id,
        o.opportunity_id,
        o.opportunityId,
        nested?.id,
        nested?._id,
    ]) {
        if (v == null) continue;
        const s = String(v).trim();
        if (s) return s;
    }
    return "";
}

function pickOpportunityListTitle(o: Record<string, unknown>): string {
    const nested =
        o.opportunity && typeof o.opportunity === "object"
            ? (o.opportunity as Record<string, unknown>)
            : null;
    const t = o.title ?? o.name ?? o.opportunity_title ?? nested?.title ?? nested?.name;
    const s = String(t ?? "").trim();
    return s || "Untitled";
}

function pickOpportunitySubtitle(o: Record<string, unknown>): string | undefined {
    const nested =
        o.opportunity && typeof o.opportunity === "object"
            ? (o.opportunity as Record<string, unknown>)
            : null;
    for (const raw of [
        o.university_name,
        o.universityName,
        o.university,
        o.organization_name,
        nested?.university_name,
        nested?.universityName,
    ]) {
        if (typeof raw === "string" && raw.trim()) return raw.trim();
    }
    return undefined;
}

export default function FacultyAttendanceReviewPage() {
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<{ id: string; title: string; subtitle?: string }[]>([]);
    const [projectId, setProjectId] = useState("");
    const [pendingById, setPendingById] = useState<Record<string, number>>({});
    const [countsLoading, setCountsLoading] = useState(false);
    const didInitProjectChoice = useRef(false);

    const refreshAllPendingCounts = useCallback(async () => {
        if (projects.length === 0) {
            setPendingById({});
            return;
        }
        setCountsLoading(true);
        try {
            const entries = await Promise.all(
                projects.map(async (p) => {
                    const n = await fetchPendingAttendanceCountForProject(p.id);
                    return [p.id, n] as const;
                }),
            );
            setPendingById(Object.fromEntries(entries));
        } finally {
            setCountsLoading(false);
        }
    }, [projects]);

    useEffect(() => {
        if (loading || projects.length === 0) return;
        void refreshAllPendingCounts();
    }, [loading, projects, refreshAllPendingCounts]);

    useEffect(() => {
        if (didInitProjectChoice.current) return;
        if (projectId) return;
        if (countsLoading) return;
        if (Object.keys(pendingById).length === 0) return;
        didInitProjectChoice.current = true;
        const first = projects.find((p) => (pendingById[p.id] ?? 0) > 0);
        if (first) setProjectId(first.id);
    }, [countsLoading, projects, pendingById, projectId]);

    const handlePanelPendingCount = useCallback((n: number) => {
        if (!projectId) return;
        setPendingById((prev) => ({ ...prev, [projectId]: n }));
    }, [projectId]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const params = new URLSearchParams();
                const facultyEmail = getStoredCurrentUserEmail();
                if (facultyEmail) params.set("faculty_email", facultyEmail);
                const res = await authenticatedFetch(`/api/v1/opportunities/faculty/mine?${params.toString()}`);
                if (!res?.ok) {
                    if (!cancelled) toast.error("Could not load your faculty opportunities.");
                    return;
                }
                const data = await res.json();
                const rows = extractFacultyMineOpportunityRows(data);
                const mapped = rows
                    .map((o) => ({
                        id: pickOpportunityListId(o),
                        title: pickOpportunityListTitle(o),
                        subtitle: pickOpportunitySubtitle(o),
                    }))
                    .filter((p: { id: string }) => p.id);
                if (!cancelled) setProjects(mapped);
            } catch {
                if (!cancelled) toast.error("Could not load your faculty opportunities.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <AttendanceReviewDashboard
            backHref="/dashboard/faculty/approvals"
            backLabel="Back to approvals"
            eyebrow="Faculty approvals"
            title="Attendance review"
            description="Review attendance sessions students log for your opportunities. Pending counts are fetched per project—the list below shows where work is waiting. Approve, reject, or flag each session in the queue; routing matches the existing CIEL reviewer rules."
            reviewerBadge="Faculty queue"
            projects={projects}
            projectId={projectId}
            setProjectId={setProjectId}
            didInitProjectChoiceRef={didInitProjectChoice}
            pendingById={pendingById}
            loading={loading}
            countsLoading={countsLoading}
            onRefreshCounts={refreshAllPendingCounts}
            onQueuePendingCountChanged={handlePanelPendingCount}
            queueTitle="Pending attendance"
            queueDescription="Sessions awaiting your decision for the selected opportunity. Use Refresh after actions or if another reviewer changes the queue."
        />
    );
}
