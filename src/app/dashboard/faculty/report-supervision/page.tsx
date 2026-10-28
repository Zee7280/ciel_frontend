"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
    confirmReportSupervision,
    fetchFacultySupervisionRequests,
    type FacultySupervisionRow,
} from "@/utils/reportSupervisionApi";

function fmt(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Students who named this faculty member as primary supervisor and wait for confirmation before starting their impact report. */
export default function FacultyReportSupervisionPage() {
    const [data, setData] = useState<{ pending: FacultySupervisionRow[]; confirmed: FacultySupervisionRow[] } | null>(null);
    const [failed, setFailed] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async () => {
        const next = await fetchFacultySupervisionRequests();
        setFailed(next === null);
        setData(next ?? { pending: [], confirmed: [] });
    }, []);
    useEffect(() => {
        let cancelled = false;
        void fetchFacultySupervisionRequests().then((next) => {
            if (cancelled) return;
            setFailed(next === null);
            setData(next ?? { pending: [], confirmed: [] });
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const confirm = async (row: FacultySupervisionRow) => {
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
                <h1 className="text-[21px] font-semibold leading-tight">Confirm the students you supervise</h1>
                <p className="mt-3 max-w-[680px] text-[13px] text-[#6b7c86] sm:text-sm">
                    These students named you as their primary faculty supervisor. A student can start the impact report only after you confirm.
                    Confirming a team lead confirms the whole team. If a student is not yours, do not confirm; contact CIEL PK.
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

            {!data ? (
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
                <>
                    <h2 className="mb-2 text-sm font-bold">Waiting for you ({data.pending.length})</h2>
                    {data.pending.length === 0 ? (
                        <p className="mb-6 rounded-xl border border-[#e2eaed] bg-white px-4 py-5 text-sm text-[#6b7c86]">No student is waiting for your confirmation.</p>
                    ) : (
                        <ul className="mb-6 grid gap-3">
                            {data.pending.map((row) => (
                                <li key={row.participation_id} className="rounded-xl border border-[#e2eaed] bg-white p-4 shadow-sm">
                                    <SupervisionRowBody row={row} />
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void confirm(row)}
                                            disabled={busyId !== null}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0e7d74] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b6760] disabled:opacity-60"
                                        >
                                            {busyId === row.participation_id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                            {row.participation_type === "team" ? `Confirm team (${row.team_members.length})` : "Confirm student"}
                                        </button>
                                        {row.requested_at ? <span className="text-xs text-[#6b7c86]">Requested {fmt(row.requested_at)}</span> : null}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    {data.confirmed.length ? (
                        <>
                            <h2 className="mb-2 text-sm font-bold">Recently confirmed</h2>
                            <ul className="grid gap-2">
                                {data.confirmed.map((row) => (
                                    <li key={row.participation_id} className="rounded-xl border border-[#e2eaed] bg-[#fbfcfd] p-3">
                                        <SupervisionRowBody row={row} />
                                        <p className="mt-1 text-xs font-semibold text-[#0e7d74]">Confirmed {fmt(row.confirmed_at)}</p>
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : null}
                </>
            )}
        </div>
    );
}

function SupervisionRowBody({ row }: { row: FacultySupervisionRow }) {
    return (
        <div className="min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <b className="text-[15px]">{row.student_name}</b>
                <span className="text-xs text-[#6b7c86]">{row.participation_type === "team" ? `Team · ${row.team_members.length} members` : "Individual"}</span>
            </div>
            <p className="mt-0.5 break-words text-[13px] text-slate-700">{row.opportunity_title}</p>
            <p className="mt-0.5 break-words text-xs text-[#6b7c86]">
                {[row.student_email, row.university, row.department].filter(Boolean).join(" · ")}
            </p>
            {row.participation_type === "team" ? (
                <p className="mt-1 break-words text-xs text-[#6b7c86]">
                    Team: {row.team_members.map((m) => `${m.name}${m.lead ? " (lead)" : ""}`).join(", ")}
                </p>
            ) : null}
        </div>
    );
}
