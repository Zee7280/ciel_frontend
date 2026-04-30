"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { getStoredCurrentUserId } from "@/utils/currentUser";
import { toast } from "sonner";
import AttendanceReviewDashboard from "@/components/engagement/AttendanceReviewDashboard";
import { fetchPendingAttendanceCountForProject } from "@/utils/engagementPendingAttendanceResponse";

function isOwnedByCurrentPartner(opportunity: Record<string, unknown>, currentUserId: string) {
    const createdByRole = String(opportunity.created_by_role ?? opportunity.creator_role ?? "").toLowerCase();
    const source = String(opportunity.source ?? "").toLowerCase();

    if (opportunity.is_student_created === true || createdByRole === "student" || source === "student_created") {
        return false;
    }

    const creatorId = opportunity.creatorId ?? opportunity.creator_id ?? opportunity.created_by ?? opportunity.owner_id;
    if (!currentUserId || creatorId == null) {
        return true;
    }

    return String(creatorId).trim() === currentUserId;
}

function opportunitySubtitle(o: Record<string, unknown>): string | undefined {
    const raw = o.category ?? o.opportunity_category ?? o.opportunityCategory;
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    return undefined;
}

export default function PartnerAttendanceReviewPage() {
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
                params.set("partner_id", "me");
                const res = await authenticatedFetch(`/api/v1/opportunities?${params.toString()}`);
                if (!res?.ok) {
                    if (!cancelled) toast.error("Could not load your opportunities.");
                    return;
                }
                const data = await res.json();
                const rows = Array.isArray(data.data) ? data.data : [];
                const currentUserId = getStoredCurrentUserId();
                const mine = rows.filter((item: unknown) =>
                    item && typeof item === "object" ? isOwnedByCurrentPartner(item as Record<string, unknown>, currentUserId) : false,
                );
                const mapped = mine
                    .map((o: Record<string, unknown>) => ({
                        id: String(o.id ?? ""),
                        title: String(o.title ?? o.name ?? o.opportunity_title ?? "Untitled").trim() || "Untitled",
                        subtitle: opportunitySubtitle(o),
                    }))
                    .filter((p: { id: string }) => p.id);
                if (!cancelled) setProjects(mapped);
            } catch {
                if (!cancelled) toast.error("Could not load your opportunities.");
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
            backHref="/dashboard/partner/requests"
            backLabel="Back to opportunities"
            eyebrow="Partner workspace"
            title="Attendance review"
            description="Open pending engagement sessions for opportunities you own. Counts show how many sessions are still waiting per project. Only items routed to your account appear in the queue."
            reviewerBadge="Partner queue"
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
            queueDescription="Sessions awaiting your approval for the selected project. Use Refresh after actions or to pick up changes from students."
        />
    );
}
