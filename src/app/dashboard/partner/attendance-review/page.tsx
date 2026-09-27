"use client";

import { useEffect, useRef, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import AttendanceReviewDashboard from "@/components/engagement/AttendanceReviewDashboard";

/**
 * Normalize list shapes from Nest + older BFF (some clients sent nested `data`).
 * `partner_id=me` list is always server-scoped — do not re-filter client-side.
 */
function extractPartnerOpportunityRows(payload: unknown): Record<string, unknown>[] {
    if (!payload || typeof payload !== "object") return [];
    const root = payload as Record<string, unknown>;
    if (root.success === false && (typeof root.message === "string" || typeof root.error === "string")) {
        return [];
    }

    const d = root.data;
    if (Array.isArray(d)) return d.filter((x) => x && typeof x === "object") as Record<string, unknown>[];
    if (d && typeof d === "object" && !Array.isArray(d)) {
        const inner = d as Record<string, unknown>;
        for (const k of ["items", "opportunities", "rows", "data"]) {
            const v = inner[k];
            if (Array.isArray(v)) return v.filter((x) => x && typeof x === "object") as Record<string, unknown>[];
        }
    }
    for (const top of ["opportunities", "items", "rows"] as const) {
        const v = root[top];
        if (Array.isArray(v)) return v.filter((x) => x && typeof x === "object") as Record<string, unknown>[];
    }
    return [];
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
    const [pendingById] = useState<Record<string, number>>({});
    const didInitProjectChoice = useRef(false);

    useEffect(() => {
        if (didInitProjectChoice.current) return;
        if (loading) return;
        if (projects.length === 0) return;
        if (projectId) return;
        didInitProjectChoice.current = true;
        setProjectId(projects[0].id);
    }, [loading, projects, projectId]);

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
                if (typeof (data as { success?: unknown }).success !== "undefined" && (data as { success?: boolean }).success === false) {
                    const msg =
                        typeof (data as { message?: unknown }).message === "string"
                            ? (data as { message: string }).message
                            : "Could not load your opportunities.";
                    if (!cancelled) toast.error(msg);
                    return;
                }
                const mine = extractPartnerOpportunityRows(data).filter((o) => String(o.id ?? "").trim());
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
            variant="partner"
            backHref="/dashboard/partner/requests"
            backLabel="Back to opportunities"
            wideQueueLayout
            eyebrow=""
            title="Attendance Verification"
            description=""
            projects={projects}
            projectId={projectId}
            setProjectId={setProjectId}
            didInitProjectChoiceRef={didInitProjectChoice}
            pendingById={pendingById}
            loading={loading}
            countsLoading={false}
            queueTitle="Logged hours"
            queueDescription=""
        />
    );
}
