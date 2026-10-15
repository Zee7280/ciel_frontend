"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RotateCcw, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";

/** What an action will touch, normalised from the backend preview responses. */
export type ImpactPreview = {
    lines: string[];
    warnings: string[];
    blockers: string[];
};

function asStrings(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0) : [];
}

/** Turns a delete/merge preview payload into plain lines an admin can read before confirming. */
export function toImpactPreview(body: unknown): ImpactPreview {
    const root = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
    const data = (root.data && typeof root.data === "object" ? root.data : {}) as Record<string, unknown>;
    const lines: string[] = [];
    const members = Array.isArray(data.members) ? (data.members as Array<Record<string, unknown>>) : [];
    if (members.length) {
        lines.push(
            `${members.length} enrollment${members.length === 1 ? "" : "s"}: ${members
                .map((m) => `${String(m.name ?? m.email ?? "Member")}${m.role === "lead" || m.will_be_lead === true ? " (lead)" : ""}`)
                .join(", ")}`,
        );
    }
    const reports = Array.isArray(data.reports) ? (data.reports as Array<Record<string, unknown>>) : [];
    if (reports.length) {
        lines.push(`${reports.length} report${reports.length === 1 ? "" : "s"}: ${reports.map((r) => `${String(r.owner ?? "member")} — ${String(r.status ?? "draft")}`).join(", ")}`);
    }
    const opMember = data.member && typeof data.member === "object" ? (data.member as Record<string, unknown>) : null;
    if (typeof data.op === "string" && opMember) {
        const name = String(opMember.name ?? opMember.email ?? "Member");
        const from = data.from_team_id ? `team ${String(data.from_team_id)}` : "individual";
        if (data.op === "move") lines.push(`Move ${name} from ${from} to team ${String(data.to_team_id ?? "")}`);
        else if (data.op === "split") lines.push(`Make ${name} an individual enrollment (leaves ${from})`);
        else if (data.op === "set_lead") lines.push(`Make ${name} the lead of ${from}`);
    }
    if (typeof data.payments === "number" && data.payments > 0) lines.push(`${data.payments} payment record(s)`);
    if (typeof data.applications_to_withdraw === "number" && data.applications_to_withdraw > 0) {
        lines.push(`${data.applications_to_withdraw} application(s) will be withdrawn`);
    }
    if (typeof data.draft_reports_to_remove === "number" && data.draft_reports_to_remove > 0) {
        lines.push(`${data.draft_reports_to_remove} draft report(s) on non-lead members will be removed`);
    }
    return { lines, warnings: asStrings(root.warnings), blockers: asStrings(root.blockers) };
}

/** Pick the team a seat moves into. Only persisted teams are offered. */
export function TeamPickerDialog({
    title,
    options,
    onPick,
    onCancel,
}: {
    title: string;
    options: Array<{ id: string; label: string }>;
    onPick: (teamId: string) => void;
    onCancel: () => void;
}) {
    const [value, setValue] = useState("");
    return (
        <>
            <div className="fixed inset-0 z-[100] bg-slate-900/50" aria-hidden onClick={onCancel} />
            <div role="dialog" aria-modal="true" className="fixed left-1/2 top-1/2 z-[110] w-[calc(100vw-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
                {options.length ? (
                    <select
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        aria-label="Target team"
                        className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                    >
                        <option value="">Choose a team…</option>
                        {options.map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                ) : (
                    <p className="mt-3 text-sm text-slate-600">There is no other team on this project to move into.</p>
                )}
                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={!value}
                        onClick={() => onPick(value)}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Check &amp; continue
                    </button>
                </div>
            </div>
        </>
    );
}

export type ImpactDialogState = {
    title: string;
    confirmLabel: string;
    /** When set, the admin must type this word to enable the confirm button. */
    typedWord?: string;
    preview: ImpactPreview | null;
    loading: boolean;
    busy: boolean;
    onConfirm: () => void;
};

export function ImpactConfirmDialog({ state, onCancel }: { state: ImpactDialogState | null; onCancel: () => void }) {
    const [typed, setTyped] = useState("");
    useEffect(() => {
        setTyped("");
    }, [state?.title, state?.typedWord]);
    if (!state) return null;
    const blocked = (state.preview?.blockers.length ?? 0) > 0;
    const typedOk = !state.typedWord || typed.trim().toUpperCase() === state.typedWord.toUpperCase();
    return (
        <>
            <div className="fixed inset-0 z-[100] bg-slate-900/50" aria-hidden onClick={state.busy ? undefined : onCancel} />
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="impact-dialog-title"
                className="fixed left-1/2 top-1/2 z-[110] w-[calc(100vw-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            >
                <div className="flex items-start justify-between gap-3">
                    <h3 id="impact-dialog-title" className="text-base font-extrabold text-slate-900">
                        {state.title}
                    </h3>
                    <button type="button" onClick={onCancel} disabled={state.busy} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="mt-3 space-y-3 text-sm">
                    {state.loading ? (
                        <div className="flex items-center gap-2 text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" /> Checking what this will change…
                        </div>
                    ) : state.preview ? (
                        <>
                            {state.preview.lines.length ? (
                                <div>
                                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">This will affect</div>
                                    <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
                                        {state.preview.lines.map((line) => (
                                            <li key={line}>{line}</li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}
                            {state.preview.warnings.map((w) => (
                                <div key={w} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {w}
                                </div>
                            ))}
                            {state.preview.blockers.map((b) => (
                                <div key={b} className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {b}
                                </div>
                            ))}
                            {!blocked ? (
                                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
                                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> A safety copy is saved first. You can undo this from “Recent changes”.
                                </div>
                            ) : null}
                            {state.typedWord && !blocked ? (
                                <label className="block">
                                    <span className="text-xs font-semibold text-slate-600">
                                        Type <span className="font-mono font-bold">{state.typedWord}</span> to confirm
                                    </span>
                                    <input
                                        value={typed}
                                        onChange={(e) => setTyped(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-400"
                                        autoFocus
                                    />
                                </label>
                            ) : null}
                        </>
                    ) : (
                        <div className="text-red-700">Could not check the impact. Close this and try again.</div>
                    )}
                </div>

                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onCancel} disabled={state.busy} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={state.onConfirm}
                        disabled={state.loading || state.busy || !state.preview || blocked || !typedOk}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {state.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {state.confirmLabel}
                    </button>
                </div>
            </div>
        </>
    );
}

type SnapshotRow = {
    id: string;
    kind: string;
    label: string;
    actor_email: string | null;
    summary: Record<string, number>;
    restored_at: string | null;
    created_at: string;
};

const KIND_LABEL: Record<string, string> = {
    delete_team: "Team removed",
    delete_member: "Member removed",
    merge: "Teams merged",
    move_member: "Member moved",
    split_member: "Made individual",
    set_lead: "Lead changed",
};

/** Undo list: every delete / merge made from this modal, newest first. */
export function RecentChangesPanel({
    opportunityId,
    refreshKey,
    onRestored,
}: {
    opportunityId: string;
    refreshKey: number;
    onRestored: () => void;
}) {
    const [rows, setRows] = useState<SnapshotRow[]>([]);
    const [open, setOpen] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await authenticatedFetch(`/api/v1/admin/opportunities/${encodeURIComponent(opportunityId)}/team-snapshots`);
            if (!res?.ok) return;
            const body = (await res.json().catch(() => ({}))) as { data?: SnapshotRow[] };
            setRows(Array.isArray(body.data) ? body.data : []);
        } catch {
            /* the panel is optional */
        }
    }, [opportunityId]);

    useEffect(() => {
        void load();
    }, [load, refreshKey]);

    const undo = async (id: string) => {
        setBusyId(id);
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/opportunities/${encodeURIComponent(opportunityId)}/team-snapshots/${encodeURIComponent(id)}/restore`,
                { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
            );
            const body = res ? ((await res.json().catch(() => ({}))) as { message?: string }) : {};
            if (res?.ok) {
                toast.success("Change undone");
                onRestored();
                await load();
            } else {
                toast.error(typeof body.message === "string" ? body.message : "Could not undo this change");
            }
        } catch {
            toast.error("Could not undo this change");
        } finally {
            setBusyId(null);
        }
    };

    const pending = rows.filter((r) => !r.restored_at);
    if (!rows.length) return null;
    return (
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-2.5">
            <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
                <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-800">
                    <RotateCcw className="h-4 w-4" /> Recent changes
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">{pending.length} undoable</span>
                </span>
                <span className="text-xs font-semibold text-slate-500">{open ? "Hide" : "Show"}</span>
            </button>
            {open ? (
                <ul className="mt-2 max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                    {rows.map((r) => (
                        <li key={r.id} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 text-xs">
                                <div className="font-semibold text-slate-800">
                                    {KIND_LABEL[r.kind] ?? r.kind}: <span className="font-normal">{r.label}</span>
                                </div>
                                <div className="text-slate-500">
                                    {new Date(r.created_at).toLocaleString()} · {r.actor_email ?? "admin"} · {r.summary?.participations ?? 0} seat(s), {r.summary?.reports ?? 0} report(s)
                                </div>
                            </div>
                            {r.restored_at ? (
                                <span className="text-[11px] font-semibold text-slate-400">Undone</span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => void undo(r.id)}
                                    disabled={busyId === r.id}
                                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Undo
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}
