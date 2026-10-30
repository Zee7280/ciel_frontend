"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
    confirmReportSupervision,
    fetchAdminSupervisionRequests,
    type FacultySupervisionRow,
} from "@/utils/reportSupervisionApi";

function fmt(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Days since the faculty was first asked; null when never asked. */
function waitingDays(iso: string | null): number | null {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    return Number.isNaN(t) ? null : Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

/**
 * CIEL PK oversight of the report-supervision gate: students whose named faculty has not yet
 * confirmed them. An admin confirms on the faculty's behalf only after checking with them.
 */
export default function AdminReportSupervisionPage() {
    const [rows, setRows] = useState<FacultySupervisionRow[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    const load = useCallback(async () => {
        const next = await fetchAdminSupervisionRequests();
        setFailed(next === null);
        setRows(next ?? []);
    }, []);
    useEffect(() => {
        let cancelled = false;
        void fetchAdminSupervisionRequests().then((next) => {
            if (cancelled) return;
            setFailed(next === null);
            setRows(next ?? []);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q || !rows) return rows ?? [];
        return rows.filter((r) =>
            [r.student_name, r.student_email, r.opportunity_title, r.faculty_email, r.university].some((v) => (v ?? "").toLowerCase().includes(q)),
        );
    }, [rows, search]);

    const confirm = async (row: FacultySupervisionRow) => {
        const who = row.participation_type === "team" ? `the team led by ${row.student_name}` : row.student_name;
        if (!window.confirm(`Confirm supervision for ${who} on behalf of ${row.faculty_email || "the named faculty"}? The student can then start the report.`)) return;
        setBusyId(row.participation_id);
        const r = await confirmReportSupervision(row.participation_id);
        setBusyId(null);
        if (r.ok) {
            toast.success(r.message);
            await load();
        } else toast.error(r.message);
    };

    return (
        <div className="mx-auto min-w-0 max-w-[1100px] pb-16 text-[#16313d]">
            <section className="pb-6 pt-2">
                <div className="mb-3 text-xs font-bold uppercase tracking-[1.6px] text-[#0e7d74]">Community Service / Report supervision</div>
                <h1 className="text-[21px] font-semibold leading-tight">Students waiting for a faculty confirmation</h1>
                <p className="mt-3 max-w-[720px] text-[13px] text-[#6b7c86] sm:text-sm">
                    A student whose seat names a faculty supervisor can start the impact report only after that faculty member confirms them (the
                    student can re-send the request from the report page). When a faculty member does not respond, check with them, then confirm
                    here on their behalf. Confirming a team lead confirms the whole team.
                </p>
            </section>

            {failed ? (
                <div role="alert" className="mb-4 rounded-[9px] border border-[#edccc5] bg-[#fff0ed] px-4 py-3 text-xs text-[#9b3832]">
                    Could not load supervision requests.{" "}
                    <button type="button" onClick={() => void load()} className="font-semibold underline">
                        Try again
                    </button>
                </div>
            ) : null}

            {!rows ? (
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
                <>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-sm font-bold">Waiting ({visible.length})</h2>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search student, faculty email, opportunity…"
                            aria-label="Search"
                            className="w-full max-w-xs rounded-lg border border-[#d3e3e6] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#0e7d74]"
                        />
                    </div>
                    {visible.length === 0 ? (
                        <p className="rounded-xl border border-[#e2eaed] bg-white px-4 py-5 text-sm text-[#6b7c86]">
                            {rows.length ? "No match." : "No student is waiting for a faculty confirmation."}
                        </p>
                    ) : (
                        <ul className="grid gap-3">
                            {visible.map((row) => {
                                const days = waitingDays(row.requested_at);
                                return (
                                    <li key={row.participation_id} className="rounded-xl border border-[#e2eaed] bg-white p-4 shadow-sm">
                                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                            <b className="text-[15px]">{row.student_name}</b>
                                            <span className="text-xs text-[#6b7c86]">
                                                {row.participation_type === "team" ? `Team · ${row.team_members.length} members` : "Individual"}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 break-words text-[13px] text-slate-700">{row.opportunity_title}</p>
                                        <p className="mt-0.5 break-words text-xs text-[#6b7c86]">
                                            {[row.student_email, row.university, row.department].filter(Boolean).join(" · ")}
                                        </p>
                                        <p className="mt-1 break-words text-xs">
                                            <span className="font-semibold text-[#79571c]">Waiting on faculty:</span> {row.faculty_email || "—"}
                                            {row.requested_at ? (
                                                <span className="text-[#6b7c86]">
                                                    {" "}
                                                    · asked {fmt(row.requested_at)}
                                                    {days !== null && days >= 1 ? ` (${days} day${days === 1 ? "" : "s"} ago)` : ""}
                                                </span>
                                            ) : (
                                                <span className="text-[#6b7c86]"> · not asked yet (the student has not opened the report)</span>
                                            )}
                                        </p>
                                        {row.participation_type === "team" ? (
                                            <p className="mt-1 break-words text-xs text-[#6b7c86]">
                                                Team: {row.team_members.map((m) => `${m.name}${m.lead ? " (lead)" : ""}`).join(", ")}
                                            </p>
                                        ) : null}
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => void confirm(row)}
                                                disabled={busyId !== null}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0e7d74] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b6760] disabled:opacity-60"
                                            >
                                                {busyId === row.participation_id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                                Confirm on faculty’s behalf
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}
