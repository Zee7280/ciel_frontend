"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { getStoredCurrentUserId } from "@/utils/currentUser";
import { toast } from "sonner";
import AttendancePendingQueuePanel from "@/components/engagement/AttendancePendingQueuePanel";

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

export default function PartnerAttendanceReviewPage() {
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
    const [projectId, setProjectId] = useState("");

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
                    }))
                    .filter((p: { id: string; title: string }) => p.id);
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
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div>
                <Link
                    href="/dashboard/partner/requests"
                    className="group inline-flex items-center gap-1.5 text-slate-500 hover:text-blue-600 text-sm font-bold mb-4"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                    Back to opportunities
                </Link>
                <h1 className="text-3xl font-bold text-slate-900">Attendance review</h1>
                <p className="text-slate-500 mt-2 text-sm">
                    Load pending engagement sessions for a project you created (NGO / corporate / org). Only entries
                    routed to your account appear in the queue.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center py-16 text-slate-500 gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            Project
                        </label>
                        <select
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value="">Select an opportunity…</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.title} ({p.id.slice(0, 8)}…)
                                </option>
                            ))}
                        </select>
                    </div>

                    <AttendancePendingQueuePanel
                        projectId={projectId}
                        title="Pending attendance"
                        description="Sessions awaiting your approval for the selected project."
                    />
                </div>
            )}
        </div>
    );
}
