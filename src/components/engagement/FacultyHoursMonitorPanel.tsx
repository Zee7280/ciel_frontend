"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { normalizeEngagementAttendanceLog } from "@/utils/engagementAttendanceMap";

type TeamMember = {
    id: string;
    name: string;
    email?: string;
    hours: number;
    sessions: number;
};

function pickStr(v: unknown): string {
    return typeof v === "string" ? v.trim() : "";
}

function memberFromTeamRow(raw: Record<string, unknown>): { id: string; name: string; email?: string } | null {
    const id = pickStr(raw.id ?? raw._id ?? raw.participantId);
    const name =
        pickStr(raw.fullName ?? raw.full_name ?? raw.name ?? raw.student_name) ||
        "Student";
    const email = pickStr(raw.email ?? raw.student_email);
    if (!id && !name) return null;
    return { id: id || `nm:${name}`, name, email: email.includes("@") ? email : undefined };
}

export default function FacultyHoursMonitorPanel({
    projectId,
}: {
    projectId: string;
}) {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        const id = projectId.trim();
        if (!id) {
            setLogs([]);
            setTeam([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const [logsRes, teamRes] = await Promise.all([
                authenticatedFetch(`/api/v1/engagement/project/${encodeURIComponent(id)}/attendance-logs`, {}, { redirectToLogin: false }),
                authenticatedFetch(`/api/v1/engagement/project/${encodeURIComponent(id)}/team`, {}, { redirectToLogin: false }),
            ]);
            const logsJson = logsRes?.ok ? await logsRes.json() : null;
            const teamJson = teamRes?.ok ? await teamRes.json() : null;
            const rawLogs: unknown[] = Array.isArray(logsJson?.data)
                ? logsJson.data
                : Array.isArray(logsJson)
                  ? logsJson
                  : [];
            const mappedLogs = rawLogs
                .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"))
                .map((row) => normalizeEngagementAttendanceLog(row));
            setLogs(mappedLogs);

            const hoursByParticipant = new Map<string, { hours: number; sessions: number }>();
            for (const log of mappedLogs) {
                const status = String(log.approval_status ?? "").toLowerCase();
                if (status === "rejected") continue;
                const pid = pickStr(log.participantId) || pickStr((log.participant as Record<string, unknown> | undefined)?.id);
                if (!pid) continue;
                const prev = hoursByParticipant.get(pid) ?? { hours: 0, sessions: 0 };
                prev.hours += Number(log.hours || 0) || 0;
                prev.sessions += 1;
                hoursByParticipant.set(pid, prev);
            }

            const rawTeam: unknown[] = Array.isArray(teamJson?.data)
                ? teamJson.data
                : Array.isArray(teamJson)
                  ? teamJson
                  : [];
            const members: TeamMember[] = [];
            const seen = new Set<string>();
            for (const row of rawTeam) {
                if (!row || typeof row !== "object") continue;
                const m = memberFromTeamRow(row as Record<string, unknown>);
                if (!m || seen.has(m.id)) continue;
                seen.add(m.id);
                const tally = hoursByParticipant.get(m.id) ?? { hours: 0, sessions: 0 };
                members.push({ ...m, hours: Math.round(tally.hours * 10) / 10, sessions: tally.sessions });
            }
            for (const log of mappedLogs) {
                const p = log.participant;
                const po = p && typeof p === "object" ? (p as Record<string, unknown>) : null;
                const pid = pickStr(log.participantId) || pickStr(po?.id);
                if (!pid || seen.has(pid)) continue;
                seen.add(pid);
                const tally = hoursByParticipant.get(pid) ?? { hours: 0, sessions: 0 };
                members.push({
                    id: pid,
                    name: pickStr(po?.fullName ?? po?.full_name ?? po?.name) || "Student",
                    hours: Math.round(tally.hours * 10) / 10,
                    sessions: tally.sessions,
                });
            }
            members.sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name));
            setTeam(members);
        } catch {
            setError("Could not load live hours.");
            setLogs([]);
            setTeam([]);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        void load();
        const timer = window.setInterval(() => void load(), 20000);
        return () => window.clearInterval(timer);
    }, [load]);

    const totalHours = useMemo(
        () => Math.round(team.reduce((sum, m) => sum + m.hours, 0) * 10) / 10,
        [team],
    );

    if (loading && logs.length === 0 && team.length === 0) {
        return (
            <div className="flex min-h-[16rem] items-center justify-center rounded-2xl border border-slate-200 bg-white">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-hidden />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Live member hours</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">
                        {totalHours} hrs logged · {team.length} student{team.length === 1 ? "" : "s"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Updates as students log sessions. Hours are confirmed on the flash card.</p>
                </div>
                <button
                    type="button"
                    onClick={() => void load()}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-[#0e7d74]/40 hover:text-[#0e7d74] disabled:opacity-50"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Refresh
                </button>
            </div>

            {error ? <p className="text-sm text-rose-700">{error}</p> : null}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <p className="border-b border-slate-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Assigned students
                </p>
                {team.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-slate-500">No assigned students on this opportunity yet.</p>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {team.map((m) => (
                            <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-900">{m.name}</p>
                                    {m.email ? <p className="truncate text-[11px] text-slate-500">{m.email}</p> : null}
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-sm font-extrabold tabular-nums text-[#0e7d74]">{m.hours}h</p>
                                    <p className="text-[11px] text-slate-400">{m.sessions} session{m.sessions === 1 ? "" : "s"}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <p className="border-b border-slate-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Session log
                </p>
                {logs.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-slate-500">No hours logged yet. Sessions appear here in real time as students submit them.</p>
                ) : (
                    <div className="max-h-[min(28rem,calc(100dvh-22rem))] overflow-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="sticky top-0 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-2">Date</th>
                                    <th className="px-4 py-2">Student</th>
                                    <th className="px-4 py-2">Hours</th>
                                    <th className="px-4 py-2">Activity</th>
                                    <th className="px-4 py-2">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {logs.map((log, i) => {
                                    const p = log.participant;
                                    const po = p && typeof p === "object" ? (p as Record<string, unknown>) : null;
                                    const name = pickStr(po?.fullName ?? po?.full_name ?? po?.name) || "Student";
                                    const status = pickStr(log.approval_status) || "logged";
                                    return (
                                        <tr key={pickStr(log.id) || `log-${i}`} className="text-slate-700">
                                            <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{pickStr(log.date) || "—"}</td>
                                            <td className="px-4 py-2.5">{name}</td>
                                            <td className="px-4 py-2.5 font-semibold tabular-nums">{Number(log.hours || 0) || 0}</td>
                                            <td className="max-w-[16rem] truncate px-4 py-2.5 text-slate-500">
                                                {pickStr(log.activity_type) || pickStr(log.description) || "—"}
                                            </td>
                                            <td className="px-4 py-2.5 capitalize text-slate-500">{status}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
