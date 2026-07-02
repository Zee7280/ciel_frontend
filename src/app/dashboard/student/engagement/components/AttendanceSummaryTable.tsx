"use client";

import React from "react";
import {
    Clock,
    Calendar,
    Tag,
    CheckCircle2,
    Trash2,
    MessageSquareText,
    MapPin,
    User,
    ExternalLink,
} from "lucide-react";
import clsx from "clsx";

interface AttendanceEntry {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    hours: number;
    activity_type: string;
    description?: string | null;
    session_description?: string | null;
    entryStatus?: "pending" | "verified" | "flagged";
    approval_status?: string | null;
    approval_remark?: string | null;
    approvalActionReason?: string | null;
    approval_action_reason?: string | null;
    evidence_file?: unknown;
    participantId?: string;
    location?: string | null;
    organizationName?: string | null;
    locationPin?: string | null;
    location_pin?: string | null;
}

function displayApprovalLabel(entry: AttendanceEntry): string {
    const raw = entry.approval_status ?? entry.entryStatus;
    if (raw == null || String(raw).trim() === "") return "Verified";
    const s = String(raw).trim().toLowerCase();
    if (s === "pending") return "Pending review";
    if (s === "approved") return "Approved";
    if (s === "rejected") return "Rejected";
    if (s === "flagged") return "Flagged";
    return s.replace(/_/g, " ");
}

function approvalPillClass(entry: AttendanceEntry): string {
    const raw = (entry.approval_status ?? entry.entryStatus ?? "").toString().toLowerCase();
    if (!raw || raw === "verified") return "bg-slate-100 text-slate-600";
    if (raw === "approved") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
    if (raw === "rejected") return "bg-rose-50 text-rose-700 ring-1 ring-rose-100";
    if (raw === "flagged") return "bg-amber-50 text-amber-800 ring-1 ring-amber-100";
    if (raw === "pending") return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
    return "bg-slate-100 text-slate-600";
}

function isRejectedEntry(entry: AttendanceEntry): boolean {
    const raw = (entry.approval_status ?? entry.entryStatus ?? "").toString().toLowerCase();
    return raw === "rejected";
}

function pickEntryLocation(entry: AttendanceEntry): string {
    const e = entry as AttendanceEntry & {
        organizationName?: string | null;
        locationPin?: string | null;
        location_pin?: string | null;
    };
    const loc =
        [e.location, e.organizationName].find((x) => typeof x === "string" && x.trim())?.trim() ??
        "";
    return loc || "";
}

function pickDescription(entry: AttendanceEntry): string {
    const e = entry as AttendanceEntry & { sessionDescription?: string | null };
    for (const v of [entry.description, entry.session_description, e.sessionDescription]) {
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
}

function resolvedRejectRemark(entry: AttendanceEntry): string {
    const candidates = [entry.approval_remark, entry.approvalActionReason, entry.approval_action_reason];
    for (const c of candidates) {
        if (typeof c === "string" && c.trim()) return c.trim();
    }
    return "";
}

function engagementParticipantBareId(id: string | undefined | null): string {
    if (!id) return "";
    if (id.startsWith("lead:")) return id.slice("lead:".length);
    const m = /^member:\d+:(.+)$/.exec(id);
    if (m?.[1]) return m[1];
    return id;
}

function resolveParticipantDisplayName(
    participantId: string | undefined,
    participantNames: Record<string, string>,
): string {
    if (!participantId) return "—";
    const trimmedMap = (k: string) => (participantNames[k] || "").trim();
    const direct = trimmedMap(participantId);
    if (direct) return direct;
    const bare = engagementParticipantBareId(participantId);
    if (bare && trimmedMap(bare)) return trimmedMap(bare);
    for (const [key, name] of Object.entries(participantNames)) {
        const n = (name || "").trim();
        if (!n) continue;
        if (engagementParticipantBareId(key) === bare) return n;
    }
    return "Team member";
}

function isNativeFile(value: unknown): value is File {
    return typeof File !== "undefined" && value instanceof File;
}

function resolveAttendanceEvidenceHref(evidence: unknown, entry: AttendanceEntry): string | null {
    const ext = entry as AttendanceEntry & { evidenceUrl?: string; evidence_url?: string };
    for (const v of [ext.evidenceUrl, ext.evidence_url]) {
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    if (typeof evidence === "string" && evidence.trim()) return evidence.trim();
    if (evidence && typeof evidence === "object" && !Array.isArray(evidence) && !isNativeFile(evidence)) {
        const o = evidence as Record<string, unknown>;
        for (const k of ["url", "href", "path", "fileUrl", "file_url", "publicUrl", "public_url"]) {
            const v = o[k];
            if (typeof v === "string" && v.trim()) return v.trim();
        }
    }
    return null;
}

function evidenceLinkLabel(href: string): string {
    try {
        if (href.startsWith("http")) {
            const u = new URL(href);
            const last = u.pathname.split("/").filter(Boolean).pop();
            if (last) return decodeURIComponent(last);
        }
        const last = href.split(/[/?#]/).filter(Boolean).pop();
        return last ? decodeURIComponent(last) : "Evidence";
    } catch {
        return "Evidence";
    }
}

function formatSessionDate(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    } catch {
        return dateStr;
    }
}

function SessionCard({
    entry,
    participantNames,
    onDelete,
    canDelete,
    isLocked,
}: {
    entry: AttendanceEntry;
    participantNames: Record<string, string>;
    onDelete?: (id: string) => void;
    canDelete: boolean;
    isLocked: boolean;
}) {
    const [remarkOpen, setRemarkOpen] = React.useState(false);
    const descText = pickDescription(entry);
    const locationText = pickEntryLocation(entry);
    const participantLabel = resolveParticipantDisplayName(entry.participantId, participantNames);
    const evidenceHref = resolveAttendanceEvidenceHref(entry.evidence_file, entry);
    const localFile = isNativeFile(entry.evidence_file);
    const rejected = isRejectedEntry(entry);
    const showDelete = !isLocked && canDelete && !!onDelete;

    return (
        <article className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                        <span className="text-lg font-bold leading-none">
                            {new Date(entry.date).getDate()}
                        </span>
                        <span className="text-[9px] font-medium uppercase" suppressHydrationWarning>
                            {new Date(entry.date).toLocaleDateString(undefined, { month: "short" })}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900" suppressHydrationWarning>
                            {formatSessionDate(entry.date)}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="h-3 w-3" />
                            {entry.start_time} – {entry.end_time}
                            <span className="mx-1 text-slate-300">·</span>
                            <span className="font-semibold text-slate-700">{entry.hours} hrs</span>
                        </p>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {rejected ? (
                        <button
                            type="button"
                            onClick={() => setRemarkOpen((v) => !v)}
                            className={clsx(
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
                                approvalPillClass(entry),
                            )}
                        >
                            {displayApprovalLabel(entry)}
                            <MessageSquareText className="h-3 w-3" />
                        </button>
                    ) : (
                        <span
                            className={clsx(
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
                                approvalPillClass(entry),
                            )}
                        >
                            {(entry.approval_status ?? entry.entryStatus ?? "")
                                .toString()
                                .toLowerCase() === "approved" ||
                            (entry.approval_status ?? entry.entryStatus ?? "")
                                .toString()
                                .toLowerCase() === "verified" ? (
                                <CheckCircle2 className="h-3 w-3" />
                            ) : null}
                            {displayApprovalLabel(entry)}
                        </span>
                    )}
                    {showDelete ? (
                        <button
                            type="button"
                            onClick={() => onDelete!(entry.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                            aria-label="Delete attendance entry"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    ) : null}
                </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-100">
                    <Tag className="h-3 w-3 text-slate-400" />
                    {entry.activity_type}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-100">
                    <User className="h-3 w-3 text-slate-400" />
                    {participantLabel}
                </span>
                {locationText ? (
                    <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-100">
                        <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                        <span className="truncate">{locationText}</span>
                    </span>
                ) : null}
            </div>

            {descText ? (
                <p className="mt-3 text-sm leading-relaxed text-slate-600 line-clamp-3">{descText}</p>
            ) : null}

            {evidenceHref ? (
                <a
                    href={evidenceHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                    <ExternalLink className="h-3 w-3" />
                    {evidenceLinkLabel(evidenceHref)}
                </a>
            ) : localFile ? (
                <p className="mt-3 text-xs text-slate-500">
                    {(entry.evidence_file as File).name || "File attached"}
                </p>
            ) : null}

            {remarkOpen && rejected ? (
                <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50/50 px-3 py-2.5 text-sm text-slate-700">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                        Rejection remarks
                    </p>
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {resolvedRejectRemark(entry) ||
                            "No written remarks were provided for this rejection."}
                    </p>
                </div>
            ) : null}
        </article>
    );
}

export default function AttendanceSummaryTable({
    entries,
    onDelete,
    canDeleteEntry,
    isLocked = false,
    participantNames = {},
    embedded = false,
}: {
    entries: AttendanceEntry[];
    onDelete?: (id: string) => void;
    canDeleteEntry?: (entry: AttendanceEntry) => boolean;
    isLocked?: boolean;
    participantNames?: Record<string, string>;
    embedded?: boolean;
}) {
    const rowCanDelete = (entry: AttendanceEntry) =>
        !isLocked && !!onDelete && (canDeleteEntry ? canDeleteEntry(entry) : true);

    if (entries.length === 0) {
        return (
            <div
                className={clsx(
                    "px-6 py-12 text-center",
                    embedded ? "" : "rounded-xl border border-slate-200 bg-white",
                )}
            >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <Calendar className="h-6 w-6 text-slate-300" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">No sessions logged yet</h3>
                <p className="mt-1 text-xs text-slate-500">
                    Your attendance entries will appear here after you save them.
                </p>
            </div>
        );
    }

    return (
        <div
            className={clsx(
                "min-w-0",
                embedded ? "p-4" : "rounded-xl border border-slate-200 bg-slate-50/30 p-4",
            )}
        >
            <div className="space-y-3">
                {entries.map((entry) => (
                    <SessionCard
                        key={entry.id}
                        entry={entry}
                        participantNames={participantNames}
                        onDelete={onDelete}
                        canDelete={rowCanDelete(entry)}
                        isLocked={isLocked}
                    />
                ))}
            </div>
        </div>
    );
}
