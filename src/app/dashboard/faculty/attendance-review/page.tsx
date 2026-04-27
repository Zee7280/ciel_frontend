"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Inbox, Loader2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { getStoredCurrentUserEmail } from "@/utils/currentUser";
import { toast } from "sonner";
import AttendancePendingQueuePanel from "@/components/engagement/AttendancePendingQueuePanel";
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

function formatOpportunityLabel(title: string, n: number | undefined): string {
    if (n === undefined) return title;
    if (n > 0) return `${title} — ${n} to review`;
    return `${title} — no pending`;
}

export default function FacultyAttendanceReviewPage() {
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
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
                    }))
                    .filter((p: { id: string; title: string }) => p.id);
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
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div>
                <Link
                    href="/dashboard/faculty/approvals"
                    className="group inline-flex items-center gap-1.5 text-slate-500 hover:text-blue-600 text-sm font-bold mb-4"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                    Back to approvals
                </Link>
                <h1 className="text-3xl font-bold text-slate-900">Attendance review</h1>
                <p className="text-slate-500 mt-2 text-sm max-w-2xl">
                    Review attendance logs that students send to you as the faculty approver. Pick an opportunity below: each
                    line shows <span className="text-slate-700 font-medium">how many are still waiting</span> in that
                    project so you can see where action is needed without trying every one.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center py-16 text-slate-500 gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : (
                <div className="space-y-4">
                    <div
                        className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-slate-50/80 p-4 flex gap-3 items-start"
                        role="status"
                    >
                        <Inbox className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" aria-hidden />
                        <div className="min-w-0 text-sm text-slate-700">
                            {countsLoading || loading ? (
                                <p>Checking which opportunities have work waiting for you…</p>
                            ) : (() => {
                                const total = Object.values(pendingById).reduce((a, b) => a + b, 0);
                                const withWork = Object.values(pendingById).filter((n) => n > 0).length;
                                if (total === 0) {
                                    return (
                                        <p>
                                            <span className="font-semibold text-slate-900">No open queue right now.</span> You
                                            have nothing pending in any of your listed opportunities, or the list is up to
                                            date. You can still pick a project to confirm.
                                        </p>
                                    );
                                }
                                return (
                                    <p>
                                        <span className="font-semibold text-slate-900">
                                            {total} {total === 1 ? "entry" : "entries"} to review
                                        </span>{" "}
                                        across {withWork} {withWork === 1 ? "opportunity" : "opportunities"}. The dropdown
                                        below shows a count for each; the first with work was selected when possible.
                                    </p>
                                );
                            })()}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            Project
                        </label>
                        <select
                            value={projectId}
                            onChange={(e) => {
                                didInitProjectChoice.current = true;
                                setProjectId(e.target.value);
                            }}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value="">Select an opportunity…</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {formatOpportunityLabel(p.title, pendingById[p.id])}
                                </option>
                            ))}
                        </select>
                    </div>

                    <AttendancePendingQueuePanel
                        projectId={projectId}
                        title="Pending attendance (faculty)"
                        description="Approve, reject, or flag attendance for the project above. The queue updates when you change the opportunity or when you use Refresh."
                        autoLoadOnProjectIdChange
                        onPendingCountChanged={handlePanelPendingCount}
                    />
                </div>
            )}
        </div>
    );
}
