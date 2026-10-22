"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, Filter, Clock, Loader2, Users } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";

type Participant = {
    id: string;
    name?: string;
    opportunity?: string;
    joinedDate?: string;
    hours?: number;
    status?: string;
    participation_type?: string;
    is_leader?: boolean;
    leader_name?: string;
};

function statusLabel(status?: string): string {
    const s = String(status || "").trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "Unknown";
}

function statusClass(status?: string): string {
    const s = String(status || "").toLowerCase();
    if (s === "approved" || s === "active") return "bg-[#e8f7f3] text-[#08756b]";
    if (s === "completed" || s === "verified") return "bg-green-50 text-green-700";
    if (s === "pending") return "bg-amber-50 text-amber-700";
    return "bg-red-50 text-red-600";
}

export default function PartnerParticipantsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        let cancelled = false;
        authenticatedFetch(`/api/v1/participants`, { method: "POST", body: JSON.stringify({}) })
            .then(async (res) => {
                const data = res ? await res.json().catch(() => null) : null;
                if (cancelled) return;
                if (res?.ok && data?.success) {
                    setParticipants(Array.isArray(data.data) ? data.data : []);
                } else {
                    toast.error(data?.message || "Could not load participants");
                }
            })
            .catch(() => {
                if (!cancelled) toast.error("Could not load participants");
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const statuses = useMemo(
        () => Array.from(new Set(participants.map((p) => String(p.status || "").toLowerCase()).filter(Boolean))),
        [participants],
    );

    const filteredParticipants = participants.filter((p) => {
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch =
            !q || String(p.name || "").toLowerCase().includes(q) || String(p.opportunity || "").toLowerCase().includes(q);
        const matchesStatus = statusFilter === "all" || String(p.status || "").toLowerCase() === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-col items-stretch justify-between gap-4 lg:flex-row lg:items-center">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-slate-900">Student Participants</h1>
                    <p className="text-slate-500">Students who joined your opportunities.</p>
                </div>
                <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search students or opportunities..."
                            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-[#0e7d74] lg:w-64"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <select
                            className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-[#0e7d74]"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All statuses</option>
                            {statuses.map((s) => (
                                <option key={s} value={s}>
                                    {statusLabel(s)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left">
                        <thead className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4">Opportunity</th>
                                <th className="px-6 py-4">Joined</th>
                                <th className="px-6 py-4">Logged hours</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center">
                                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                                    </td>
                                </tr>
                            ) : filteredParticipants.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center">
                                        <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                                        <p className="font-bold text-slate-800">
                                            {participants.length ? "No participants match your filters" : "No participants yet"}
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            {participants.length
                                                ? "Try a different search or status."
                                                : "Students appear here once they join one of your opportunities."}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredParticipants.map((p) => (
                                    <tr key={`${p.id}-${p.opportunity}`} className="transition-colors hover:bg-slate-50/50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8f7f3] font-bold text-[#08756b]">
                                                    {(p.name || "?").charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="block font-bold text-slate-900">{p.name || "Student"}</span>
                                                    {p.is_leader || p.participation_type === "team" ? (
                                                        <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                                                            Team leader
                                                        </span>
                                                    ) : p.participation_type === "team_member" ? (
                                                        <span className="text-[11px] text-slate-400">
                                                            Team member{p.leader_name ? ` · Lead: ${p.leader_name}` : ""}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="max-w-[360px] px-6 py-4 text-sm text-slate-600">
                                            <span className="line-clamp-2">{p.opportunity || "—"}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">{p.joinedDate || "—"}</td>
                                        <td className="px-6 py-4">
                                            <span className="flex items-center gap-2 font-bold text-slate-900">
                                                <Clock className="h-4 w-4 text-slate-400" /> {Number(p.hours) || 0} hrs
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(p.status)}`}>
                                                {statusLabel(p.status)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <p className="text-sm text-slate-500">
                Need to review logged hours?{" "}
                <Link href="/dashboard/partner/attendance-review" className="font-bold text-[#0e7d74] hover:underline">
                    Open attendance review
                </Link>
            </p>
        </div>
    );
}
