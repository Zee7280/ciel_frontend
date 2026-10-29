"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { apiMessages, QUICK_WORK_HREF, quickWorkApi, type QuickWorkMine } from "@/utils/quickWorkApi";
import { activityLabel, formatHours, shortDate, viewerRow, type QuickWorkLog } from "@/utils/quickWorkRules";
import {
    EvidenceGallery,
    ModalClose,
    QuickWorkModal,
    QuickWorkRecordDetails,
    QuickWorkReminder,
    QuickWorkStatusPill,
} from "@/components/ciel/community-service/quick-work/QuickWorkShared";
import { facultyReminder } from "@/utils/quickWorkReminders";
import { useQuickWorkRoutes } from "@/components/ciel/community-service/quick-work/QuickWorkRoutes";

const HUB = "/dashboard/student/paths/community-service";

type Stage = "draft" | "progress" | "submitted" | "approved";
const STAGES: { key: Stage; label: string; empty: string }[] = [
    { key: "draft", label: "Draft", empty: "No drafts. A log you start appears here until you add teammates." },
    { key: "progress", label: "In progress", empty: "Nothing waiting. Logs appear here while your teammates confirm, or when faculty asks for changes." },
    { key: "submitted", label: "Submitted", empty: "Nothing under review right now." },
    { key: "approved", label: "Approved", empty: "No approved activities yet." },
];

/** Draft: nothing sent yet. In progress: teammates asked, or changes requested. Submitted: with faculty (or not approved). */
function stageOf(r: QuickWorkLog): Stage {
    if (r.status === "approved") return "approved";
    if (r.status === "submitted" || r.status === "admin_review" || r.status === "rejected") return "submitted";
    if (r.status === "changes" || !r.isLead) return "progress";
    return r.participants.length > 1 ? "progress" : "draft";
}

/** One line on where a log being prepared stands: how many teammates confirmed. */
function progressNote(r: QuickWorkLog): string {
    if (r.status !== "draft" && r.status !== "changes") return "";
    const parts: string[] = [];
    const mates = r.participants.filter((p) => !p.isLead);
    if (mates.length) parts.push(`${mates.filter((p) => p.joinStatus === "joined").length} of ${mates.length} teammates confirmed`);
    return parts.join(" · ");
}

function downloadJson(data: unknown, name: string) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function QuickWorkDashboard() {
    const router = useRouter();
    const routes = useQuickWorkRoutes(() => router.push(`${HUB}#structured-tools`));
    const [data, setData] = useState<QuickWorkMine | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [viewing, setViewing] = useState<QuickWorkLog | null>(null);
    const [deleting, setDeleting] = useState<QuickWorkLog | null>(null);
    const [stage, setStage] = useState<Stage | null>(null);

    const load = useCallback(async () => {
        try {
            setData(await quickWorkApi.mine());
            setLoadError(null);
        } catch (e) {
            setLoadError(apiMessages(e).join(" "));
        }
    }, []);
    useEffect(() => {
        void load();
    }, [load]);

    const mine = viewerRow;

    const invitations = (data?.logs ?? []).filter(
        (l) => !l.isLead && (l.status === "draft" || l.status === "changes") && mine(l)?.joinStatus === "invited",
    );
    const records = (data?.logs ?? []).filter((l) => !invitations.includes(l));
    const byStage = (key: Stage) => records.filter((r) => stageOf(r) === key);
    // Until the student picks a tab, open the first one that has something in it.
    const activeStage: Stage = stage ?? STAGES.find((st) => byStage(st.key).length)?.key ?? "draft";
    const shown = byStage(activeStage);

    const respond = async (log: QuickWorkLog, accept: boolean) => {
        setBusyId(log.id);
        try {
            await quickWorkApi.join(log.id, accept);
            toast.success(accept ? "Confirmed. Your time will count once faculty and then CIEL PK approve the log." : "Declined. The activity lead has been told.");
            await load();
        } catch (e) {
            toast.error(apiMessages(e).join(" "));
        } finally {
            setBusyId(null);
        }
    };

    const removeDraft = async (log: QuickWorkLog) => {
        setBusyId(log.id);
        try {
            await quickWorkApi.remove(log.id);
            toast.success("Draft deleted.");
            setDeleting(null);
            await load();
        } catch (e) {
            toast.error(apiMessages(e).join(" "));
        } finally {
            setBusyId(null);
        }
    };

    const exportHistory = () => {
        const entries = records.map((r) => {
            const m = mine(r);
            return {
                activity_id: r.id,
                title: r.title,
                date: r.activityDate,
                type: activityLabel(r),
                location: r.location,
                status: r.status,
                participant: m
                    ? { name: m.name, student_id: m.studentId, email: m.email, start: m.startTime, end: m.endTime, break_minutes: m.breakMinutes, present: m.present }
                    : null,
                recorded_minutes: m?.minutes ?? 0,
                credited_minutes: r.status === "approved" ? (m?.minutes ?? 0) : 0,
                faculty: r.facultyName,
                review_note: r.reviewNote,
            };
        });
        downloadJson(
            {
                format: "CIEL_PK_PERSONAL_QUICK_SERVICE_V1",
                exported_at: new Date().toISOString(),
                entries,
                approved_minutes: entries.reduce((a, e) => a + e.credited_minutes, 0),
            },
            "CIEL_PK_My_Quick_Service_History.json",
        );
    };

    return (
        <div className="mx-auto min-w-0 max-w-[1280px] pb-16 text-[#16313d]">
            <Link href={HUB} className="text-xs font-semibold text-[#0e7d74] underline underline-offset-[3px]">
                ← All Community Service
            </Link>
            <section className="flex items-end justify-between gap-6 pb-6 pt-5">
                <div>
                    <div className="mb-3 text-xs font-bold uppercase tracking-[1.6px] text-[#0e7d74]">Quick Community Impact / Quick Impact Log</div>
                    <h1 className="text-[21px] font-semibold leading-tight">Quick Impact Log</h1>
                    <p className="mt-3 max-w-[650px] text-[13px] text-[#6b7c86] sm:text-sm">
                        Your short university activities, from draft to final approval. Drafts save on CIEL PK as you go, so you can continue
                        from any device. These totals do not show completion of your structured 16-hour requirement.
                    </p>
                </div>
                <div className="hidden min-w-[155px] border-l-2 border-[#cbe3e0] pl-4 lg:block">
                    <b className="block text-lg">Every hour counts.</b>
                    <small className="text-xs text-[#6b7c86]">One activity. One simple record.</small>
                </div>
            </section>

            <div className="mb-5 flex flex-wrap justify-end gap-2.5">
                <button
                    type="button"
                    onClick={exportHistory}
                    disabled={!records.length}
                    className="rounded-lg border border-[#cbe3e0] bg-white px-4 py-2.5 text-xs font-semibold text-[#0e7d74] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Export service record
                </button>
                <button type="button" onClick={routes.openIntro} className="rounded-lg bg-[#0e7d74] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0b6760]">
                    + Log another activity
                </button>
            </div>

            {loadError ? (
                <div role="alert" className="mb-4 rounded-[9px] border border-[#edccc5] bg-[#fff0ed] px-4 py-3 text-xs text-[#9b3832]">
                    {loadError}{" "}
                    <button type="button" onClick={() => void load()} className="font-semibold underline">
                        Try again
                    </button>
                </div>
            ) : null}

            {invitations.length ? (
                <section className="mb-5 rounded-[13px] border border-[#e8d9b7] bg-[#fffdf7] p-4 sm:p-5">
                    <h2 className="text-[15px] font-semibold">Confirm you took part</h2>
                    <p className="mt-1 text-xs text-[#6b7c86]">
                        An activity lead added you to their log. Confirm only if you actually attended; the lead cannot submit until everyone responds.
                    </p>
                    <div className="mt-3 space-y-2.5">
                        {invitations.map((log) => {
                            const lead = log.participants.find((p) => p.isLead);
                            return (
                                <div key={log.id} className="flex flex-col gap-3 rounded-[10px] border border-[#dcebee] bg-white p-3.5 sm:flex-row sm:items-center">
                                    <div className="min-w-0 flex-1">
                                        <b className="block break-words text-[13px]">{log.title || "Untitled activity"}</b>
                                        <small className="text-xs text-[#6b7c86]">
                                            {lead?.name || "Activity lead"} · {shortDate(log.activityDate)} · {log.location || "Venue to be added"}
                                        </small>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            disabled={busyId === log.id}
                                            onClick={() => void respond(log, true)}
                                            className="rounded-lg bg-[#0e7d74] px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                        >
                                            Confirm I took part
                                        </button>
                                        <button
                                            type="button"
                                            disabled={busyId === log.id}
                                            onClick={() => void respond(log, false)}
                                            className="rounded-lg border border-[#e6c7c5] bg-white px-3.5 py-2 text-xs font-semibold text-[#ac3c3c] disabled:opacity-50"
                                        >
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            ) : null}

            <div className="my-5 grid grid-cols-3 gap-2 sm:gap-4">
                <Metric hero value={`${formatHours(data?.totals.approvedMinutes ?? 0)}`} unit="h" label="Approved Quick Community Impact hours" />
                <Metric value={String(data?.totals.approvedActivities ?? 0)} label="Activities participated in" />
                <Metric value={`${formatHours(data?.totals.pendingMinutes ?? 0)}`} unit="h" label="Pending approval" />
            </div>

            <div role="tablist" aria-label="Log status" className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
                {STAGES.map((st) => {
                    const active = st.key === activeStage;
                    return (
                        <button
                            key={st.key}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setStage(st.key)}
                            className={`flex-none rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                                active ? "border-[#0e7d74] bg-[#0e7d74] text-white" : "border-[#dcebee] bg-white text-[#6b7c86] hover:border-[#0e7d74]"
                            }`}
                        >
                            {st.label} <span className={active ? "text-[#cfeee9]" : "text-[#9aa8b0]"}>{byStage(st.key).length}</span>
                        </button>
                    );
                })}
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#dcebee] bg-white shadow-[0_3px_12px_#16313d12]">
                {!data && !loadError ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-5 w-5 animate-spin text-[#6b7c86]" />
                    </div>
                ) : records.length && !shown.length ? (
                    <p className="px-6 py-10 text-center text-[13px] text-[#6b7c86]">{STAGES.find((st) => st.key === activeStage)?.empty}</p>
                ) : records.length ? (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] border-collapse text-[13px]">
                            <thead>
                                <tr className="bg-[#f4f8f9] text-left text-xs text-[#6b7c86]">
                                    <th className="px-5 py-4 font-semibold">Activity</th>
                                    <th className="px-5 py-4 font-semibold">Your hours</th>
                                    <th className="px-5 py-4 font-semibold">Status</th>
                                    <th className="px-5 py-4 font-semibold">Record</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shown.map((r) => {
                                    const m = mine(r);
                                    const note = r.isLead ? progressNote(r) : "";
                                    const editable = r.isLead && (r.status === "draft" || r.status === "changes");
                                    return (
                                        <tr key={r.id} className="border-b border-[#dcebee] align-top">
                                            <td className="px-5 py-4">
                                                <span className="font-semibold">{r.title || "Untitled activity"}</span>
                                                <small className="block text-xs text-[#6b7c86]">
                                                    {shortDate(r.activityDate)} · {activityLabel(r) || "Type not set"}
                                                    {!r.isLead ? " · Teammate" : ""}
                                                </small>
                                            </td>
                                            <td className="px-5 py-4">
                                                {formatHours(m?.minutes ?? 0)} h
                                                {r.status !== "approved" ? <small className="block text-xs text-[#6b7c86]">Not credited</small> : null}
                                            </td>
                                            <td className="px-5 py-4">
                                                <QuickWorkStatusPill status={r.status} inProgress={stageOf(r) === "progress"} />
                                                {note ? <small className="mt-1 block max-w-[260px] break-words text-xs text-[#79571c]">{note}</small> : null}
                                                {r.reviewNote ? <small className="mt-1 block max-w-[260px] break-words text-xs text-[#6b7c86]">{r.reviewNote}</small> : null}
                                                {!r.isLead && m?.joinStatus === "declined" ? (
                                                    <small className="mt-1 block text-xs text-[#ac3c3c]">You declined</small>
                                                ) : null}
                                                {r.isLead && r.status === "submitted" && r.facultyEmail ? (
                                                    <QuickWorkReminder
                                                        label="Remind faculty:"
                                                        email={r.facultyEmail}
                                                        message={facultyReminder({ facultyName: r.facultyName, title: r.title, leadName: m?.name, from: "student" })}
                                                    />
                                                ) : null}
                                            </td>
                                            <td className="space-y-1 px-5 py-4">
                                                <button type="button" onClick={() => setViewing(r)} className="block text-xs font-semibold text-[#0e7d74] underline underline-offset-[3px]">
                                                    View
                                                </button>
                                                {editable ? (
                                                    <Link
                                                        href={`${QUICK_WORK_HREF}?log=${encodeURIComponent(r.id)}`}
                                                        className="block text-xs font-semibold text-[#0e7d74] underline underline-offset-[3px]"
                                                    >
                                                        {r.status === "changes" ? "Revise log" : "Continue draft"}
                                                    </Link>
                                                ) : null}
                                                {r.isLead && r.status === "draft" ? (
                                                    <button type="button" onClick={() => setDeleting(r)} className="block text-xs font-semibold text-[#ac3c3c] underline underline-offset-[3px]">
                                                        Delete draft
                                                    </button>
                                                ) : null}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="px-6 py-11 text-center text-[#6b7c86]">
                        <h3 className="mb-2 text-[15px] font-semibold text-[#16313d]">Start with one small action.</h3>
                        <p className="mx-auto max-w-[440px] text-[13px]">
                            A tree drive, an awareness session or a community clean-up—your first activity will appear here after you start a log.
                        </p>
                        <button
                            type="button"
                            onClick={routes.openIntro}
                            className="mt-4 rounded-lg border border-[#cbe3e0] bg-white px-4 py-2.5 text-xs font-semibold text-[#0e7d74]"
                        >
                            Create your first log →
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-4 rounded-lg bg-[#e6f6f4] px-3.5 py-3 text-xs leading-relaxed text-[#0b6760]">
                <b>Separate pathways. One community-engagement journey.</b>
                <br />
                Quick Community Impact tracks approved participation and hours. Structured Community Service uses the full report and CII rubric for the
                16-hour requirement. Do not count the same activity twice. Quick Community Impact hours do not automatically fulfil the 16-hour requirement. Any
                course-credit recognition must be confirmed by your university.
            </div>

            {viewing ? (
                <QuickWorkModal labelledBy="quickRecordTitle" onClose={() => setViewing(null)} wide>
                    <header className="mb-3 flex items-start justify-between gap-5">
                        <div className="min-w-0">
                            <div className="text-xs font-bold uppercase tracking-[1.6px] text-[#0e7d74]">Complete Quick Community Impact Log record</div>
                            <h2 id="quickRecordTitle" className="mt-1 break-words text-lg font-bold">
                                Quick Community Impact Log
                            </h2>
                        </div>
                        <ModalClose onClose={() => setViewing(null)} />
                    </header>
                    {viewing.reviewNote ? <p className="mt-2 text-xs text-[#6b7c86]">Review note: {viewing.reviewNote}</p> : null}
                    <QuickWorkRecordDetails log={viewing} evidence={<EvidenceGallery evidence={viewing.evidence} />} />
                    {viewing.reviewedAt ? (
                        <p className="text-xs text-[#6b7c86]">
                            Reviewed by {viewing.facultyName} ·{" "}
                            {new Date(viewing.reviewedAt).toLocaleString("en-GB", { timeZone: "Asia/Karachi" })} (PKT)
                        </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2.5 border-t border-[#dcebee] pt-4">
                        <button
                            type="button"
                            onClick={() =>
                                downloadJson({ format: "CIEL_PK_QUICK_SERVICE_V1", record: viewing }, "CIEL_PK_Quick_Service_Record.json")
                            }
                            className="rounded-lg border border-[#cbe3e0] bg-white px-4 py-2.5 text-xs font-semibold text-[#0e7d74]"
                        >
                            Export full record
                        </button>
                        <button type="button" onClick={() => setViewing(null)} className="rounded-lg bg-[#0e7d74] px-4 py-2.5 text-xs font-semibold text-white">
                            Done
                        </button>
                    </div>
                </QuickWorkModal>
            ) : null}

            {deleting ? (
                <QuickWorkModal labelledBy="deleteDraftTitle" onClose={() => setDeleting(null)}>
                    <header className="mb-3 flex items-start justify-between gap-5">
                        <h2 id="deleteDraftTitle" className="text-lg font-bold">
                            Delete this draft?
                        </h2>
                        <ModalClose onClose={() => setDeleting(null)} />
                    </header>
                    <p className="text-[13px] text-[#6b7c86]">
                        “{deleting.title || "Untitled activity"}” has not been submitted. Deleting it removes the draft for you and any invited teammates.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2.5 border-t border-[#dcebee] pt-4">
                        <button type="button" onClick={() => setDeleting(null)} className="rounded-lg border border-[#cbe3e0] bg-white px-4 py-2.5 text-xs font-semibold text-[#0e7d74]">
                            Keep draft
                        </button>
                        <button
                            type="button"
                            disabled={busyId === deleting.id}
                            onClick={() => void removeDraft(deleting)}
                            className="rounded-lg bg-[#ac3c3c] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                        >
                            Delete draft
                        </button>
                    </div>
                </QuickWorkModal>
            ) : null}

            {routes.dialogs}
        </div>
    );
}

function Metric({ value, unit, label, hero = false }: { value: string; unit?: string; label: string; hero?: boolean }) {
    return (
        <div className={`rounded-xl border p-3 sm:p-6 ${hero ? "border-[#0b6760] bg-[#0b6760]" : "border-[#dcebee] bg-white"}`}>
            <b className={`block text-[21px] font-semibold leading-tight sm:text-[35px] ${hero ? "text-[#ddebab]" : "text-[#0e7d74]"}`}>
                {value}
                {unit ? <span className="text-base"> {unit}</span> : null}
            </b>
            <span className={`text-[11px] sm:text-xs ${hero ? "text-[#d5e5dc]" : "text-[#6b7c86]"}`}>{label}</span>
        </div>
    );
}
