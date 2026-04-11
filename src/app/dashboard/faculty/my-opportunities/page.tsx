"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/utils/api";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import { Badge } from "@/app/dashboard/student/report/components/ui/badge";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

type Row = {
    id: string;
    title: string;
    status: string;
    workflow_stage?: string | null;
    created_at?: string;
    mode?: string;
    sdg?: string;
    applicants_count?: number;
    remaining_seats?: number;
    organization_name?: string | null;
};

function statusBadgeClass(status: string) {
    const s = status?.toLowerCase() || "";
    if (s === "active" || s === "live") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (s === "rejected") return "bg-red-100 text-red-800 border-red-200";
    if (s.includes("pending") || s === "draft") return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
}

export default function FacultyMyOpportunitiesPage() {
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await authenticatedFetch("/api/v1/opportunities/faculty/mine");
                if (res?.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.data)) {
                        setRows(data.data);
                    } else {
                        setRows([]);
                    }
                } else {
                    toast.error("Could not load your opportunities");
                    setRows([]);
                }
            } catch {
                toast.error("Could not load your opportunities");
                setRows([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-4 pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Opportunities</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Opportunities you created. Approval order: optional partner (if you added one) → CIEL Admin → LIVE.
                        After approval, monitor applicants and use Student Grading for academic oversight.
                    </p>
                </div>
                <Link href="/dashboard/faculty/create-opportunity">
                    <Button className="gap-2">
                        <Plus className="w-4 h-4" />
                        Create opportunity
                    </Button>
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center py-24">
                    <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
                </div>
            ) : rows.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
                    <p className="text-slate-600 mb-4">You have not created any opportunities yet.</p>
                    <Link href="/dashboard/faculty/create-opportunity">
                        <Button>Create your first opportunity</Button>
                    </Link>
                </div>
            ) : (
                <ul className="space-y-3">
                    {rows.map((r) => (
                        <li
                            key={r.id}
                            className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                        >
                            <div className="space-y-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="font-semibold text-slate-900 truncate">{r.title}</h2>
                                    <Badge variant="outline" className={statusBadgeClass(r.status)}>
                                        {r.status?.replace(/_/g, " ") || "—"}
                                    </Badge>
                                    {r.workflow_stage ? (
                                        <Badge variant="outline" className="text-xs font-normal text-slate-600">
                                            {String(r.workflow_stage).replace(/_/g, " ")}
                                        </Badge>
                                    ) : null}
                                </div>
                                <p className="text-xs text-slate-500">
                                    {r.created_at
                                        ? new Date(r.created_at).toLocaleDateString(undefined, {
                                              year: "numeric",
                                              month: "short",
                                              day: "numeric",
                                          })
                                        : "—"}
                                    {r.sdg ? ` · ${r.sdg}` : ""}
                                    {r.mode ? ` · ${r.mode}` : ""}
                                    {r.organization_name ? ` · ${r.organization_name}` : ""}
                                </p>
                                <p className="text-xs text-slate-400">
                                    Applicants: {r.applicants_count ?? 0}
                                    {typeof r.remaining_seats === "number"
                                        ? ` · Seats left: ${r.remaining_seats}`
                                        : ""}
                                </p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                                <Link href={`/dashboard/faculty/create-opportunity?edit=${encodeURIComponent(r.id)}`}>
                                    <Button variant="outline" size="sm" className="gap-1.5">
                                        <Pencil className="w-3.5 h-3.5" />
                                        Edit
                                    </Button>
                                </Link>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
