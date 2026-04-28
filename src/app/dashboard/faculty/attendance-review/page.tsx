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
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
                <Link
                    href="/dashboard/faculty/approvals"
                    className="group inline-flex items-center gap-1.5 rounded-full px-1 text-sm font-semibold text-slate-500 transition-colors hover:text-blue-600"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                    Back to approvals
                </Link>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Faculty approvals</p>
                        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                            Attendance review
                        </h1>
                    </div>
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                        Review queue
                    </div>
                </div>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                    Review attendance logs that students send to you as the faculty approver. Pick an opportunity below; each
                    line shows <span className="font-semibold text-slate-800">how many are still waiting</span> in that
                    project so you can quickly see where action is needed.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center gap-2 rounded-3xl border border-slate-200 bg-white py-16 text-slate-500 shadow-sm">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : (
                <div className="space-y-4">
                    <div
                        className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-slate-50 p-4 shadow-sm"
                        role="status"
                    >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-100">
                            <Inbox className="h-5 w-5" aria-hidden />
                        </div>
                        <div className="min-w-0 pt-0.5 text-sm leading-6 text-slate-700">
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
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                            Project
                        </label>
                        <select
                            value={projectId}
                            onChange={(e) => {
                                didInitProjectChoice.current = true;
                                setProjectId(e.target.value);
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
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
