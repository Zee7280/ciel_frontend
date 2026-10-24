"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { apiMessages, quickWorkApi, type FacultyQuickWorkQueue } from "@/utils/quickWorkApi";
import { formatHours, shortDate, type QuickWorkLog } from "@/utils/quickWorkRules";
import {
    EvidenceGallery,
    QuickWorkRecordDetails,
    QuickWorkStatusPill,
} from "@/components/ciel/community-service/quick-work/QuickWorkShared";

type Action = "approve" | "changes" | "reject";

/** Faculty review of Quick Community Work logs that name this faculty member. */
export default function FacultyQuickWorkPage() {
    const [queue, setQueue] = useState<FacultyQuickWorkQueue | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setQueue(await quickWorkApi.facultyQueue());
            setLoadError(null);
        } catch (e) {
            setLoadError(apiMessages(e).join(" "));
        }
    }, []);
    useEffect(() => {
        let cancelled = false;
        quickWorkApi
            .facultyQueue()
            .then((q) => {
                if (!cancelled) setQueue(q);
            })
            .catch((e: unknown) => {
                if (!cancelled) setLoadError(apiMessages(e).join(" "));
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const pending = queue?.pending ?? [];

    return (
        <div className="mx-auto min-w-0 max-w-[1100px] pb-16 text-[#16313d]">
            <section className="pb-6 pt-2">
                <div className="mb-3 text-xs font-bold uppercase tracking-[1.6px] text-[#0e7d74]">Quick Community Work / Faculty review</div>
                <h1 className="text-[21px] font-semibold leading-tight">A quick check. A trusted record.</h1>
                <p className="mt-3 max-w-[680px] text-[13px] text-[#6b7c86] sm:text-sm">
                    Students submit short university activities after they finish, naming you as the coordinating faculty member. Review the activity,
                    each person’s attendance and the evidence together in one decision. Only approved hours count, and they stay separate from the
                    structured 16-hour requirement.
                </p>
            </section>

            {loadError ? (
                <div role="alert" className="mb-4 rounded-[9px] border border-[#edccc5] bg-[#fff0ed] px-4 py-3 text-xs text-[#9b3832]">
                    {loadError}{" "}
                    <button type="button" onClick={() => void load()} className="font-semibold underline">
                        Try again
                    </button>
                </div>
            ) : null}

            <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-[15px] font-semibold">
                    {pending.length} item{pending.length === 1 ? "" : "s"} awaiting review
                </h2>
            </div>

            {!queue && !loadError ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-[#6b7c86]" />
                </div>
            ) : pending.length ? (
                pending.map((log) => <ReviewCard key={log.id} log={log} onDone={load} />)
            ) : queue ? (
                <div className="rounded-2xl border border-[#dcebee] bg-white px-6 py-11 text-center text-[#6b7c86]">
                    <h3 className="mb-2 text-[15px] font-semibold text-[#16313d]">You’re all caught up.</h3>
                    <p className="mx-auto max-w-[440px] text-[13px]">
                        Requests appear here only after a student submits a completed quick-work log that names your email as coordinating faculty.
                    </p>
                </div>
            ) : null}

            {queue?.reviewed.length ? (
                <section className="mt-8">
                    <h2 className="mb-3 text-[15px] font-semibold">Recently reviewed</h2>
                    <div className="overflow-x-auto rounded-2xl border border-[#dcebee] bg-white">
                        <table className="w-full min-w-[600px] border-collapse text-[13px]">
                            <thead>
                                <tr className="bg-[#f4f8f9] text-left text-xs text-[#6b7c86]">
                                    <th className="px-5 py-3.5 font-semibold">Activity</th>
                                    <th className="px-5 py-3.5 font-semibold">Lead</th>
                                    <th className="px-5 py-3.5 font-semibold">Team hours</th>
                                    <th className="px-5 py-3.5 font-semibold">Decision</th>
                                </tr>
                            </thead>
                            <tbody>
                                {queue.reviewed.map((r) => (
                                    <tr key={r.id} className="border-b border-[#dcebee] align-top">
                                        <td className="px-5 py-3.5">
                                            <span className="font-semibold">{r.title}</span>
                                            <small className="block text-xs text-[#6b7c86]">
                                                {shortDate(r.activityDate)} · {r.activityType}
                                            </small>
                                        </td>
                                        <td className="px-5 py-3.5">{r.participants.find((p) => p.isLead)?.name ?? "—"}</td>
                                        <td className="px-5 py-3.5">{formatHours(r.participants.reduce((a, p) => a + p.minutes, 0))} h</td>
                                        <td className="px-5 py-3.5">
                                            <QuickWorkStatusPill status={r.status} />
                                            {r.reviewNote ? <small className="mt-1 block max-w-[260px] break-words text-xs text-[#6b7c86]">{r.reviewNote}</small> : null}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : null}
        </div>
    );
}

function ReviewCard({ log, onDone }: { log: QuickWorkLog; onDone: () => Promise<void> }) {
    const [verified, setVerified] = useState(false);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState<Action | null>(null);
    const [error, setError] = useState<string[]>([]);

    const act = async (action: Action) => {
        if (action !== "approve" && !note.trim()) return setError(["Add a brief reason or correction first."]);
        if (action === "approve" && !verified) return setError(["Confirm you reviewed the attendance and evidence."]);
        setBusy(action);
        setError([]);
        try {
            await quickWorkApi.review(log.id, { action, note: note.trim() || undefined, verified });
            toast.success(
                action === "approve"
                    ? "Confirmed. Each participant’s own hours now appear on their dashboard."
                    : action === "changes"
                      ? "Returned for correction. No hours have been credited."
                      : "Record declined. No hours have been credited.",
            );
            await onDone();
        } catch (e) {
            setError(apiMessages(e));
        } finally {
            setBusy(null);
        }
    };

    return (
        <article className="mb-4 rounded-[13px] border border-[#dcebee] bg-white p-4 sm:p-6">
            <header className="mb-3 flex flex-col items-start justify-between gap-3 sm:flex-row">
                <div className="min-w-0">
                    <span className="text-xs font-bold uppercase tracking-[1.6px] text-[#0e7d74]">Final · completed activity review</span>
                    <h2 className="mt-1 break-words text-lg font-bold">{log.title}</h2>
                </div>
                <QuickWorkStatusPill status={log.status} />
            </header>
            <QuickWorkRecordDetails log={log} />
            <details open className="my-3.5">
                <summary className="cursor-pointer text-xs font-semibold text-[#0e7d74]">
                    Review evidence ({log.evidence.length}) · {log.visibility}
                </summary>
                <EvidenceGallery evidence={log.evidence} />
            </details>
            {error.length ? (
                <div role="alert" className="mb-3 rounded-[9px] border border-[#edccc5] bg-[#fff0ed] px-4 py-3 text-xs text-[#9b3832]">
                    <ul className="list-disc pl-4">
                        {error.map((x) => (
                            <li key={x}>{x}</li>
                        ))}
                    </ul>
                </div>
            ) : null}
            <label className="my-3 flex items-start gap-2.5 text-xs">
                <input type="checkbox" className="mt-0.5 h-[17px] w-[17px] flex-none accent-[#0e7d74]" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
                <span>I have reviewed the evidence and confirm the individual participation times shown above.</span>
            </label>
            <label htmlFor={`note-${log.id}`} className="mb-1.5 block text-xs font-semibold">
                Review note <span className="font-normal text-[#6b7c86]">(required when returning or declining)</span>
            </label>
            <input
                id={`note-${log.id}`}
                maxLength={300}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Feedback for the activity lead"
                className="w-full rounded-lg border border-[#d3e3e6] px-3 py-2.5 text-[13px] outline-none focus:border-[#0e7d74] focus:ring-2 focus:ring-[#0e7d74]/30"
            />
            <div className="mt-3.5 flex flex-wrap gap-2.5">
                <button
                    type="button"
                    disabled={busy != null}
                    onClick={() => void act("approve")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0e7d74] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0b6760] disabled:opacity-50"
                >
                    {busy === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Approve work & hours
                </button>
                <button
                    type="button"
                    disabled={busy != null}
                    onClick={() => void act("changes")}
                    className="rounded-lg border border-[#cbe3e0] bg-white px-4 py-2.5 text-xs font-semibold text-[#0e7d74] disabled:opacity-50"
                >
                    Request changes
                </button>
                <button
                    type="button"
                    disabled={busy != null}
                    onClick={() => void act("reject")}
                    className="rounded-lg border border-[#e6c7c5] bg-white px-4 py-2.5 text-xs font-semibold text-[#ac3c3c] disabled:opacity-50"
                >
                    Decline
                </button>
            </div>
        </article>
    );
}
