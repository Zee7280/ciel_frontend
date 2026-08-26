"use client";

import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Loader2,
    XCircle,
} from "lucide-react";
import clsx from "clsx";
import { normalizeEngagementAttendanceLog } from "@/utils/engagementAttendanceMap";

type PendingRow = Record<string, unknown>;

function pickStr(v: unknown): string {
    if (v == null) return "";
    return String(v).trim();
}

function participantDisplay(raw: Record<string, unknown>): { name: string; detail: string } {
    const p = raw.participant;
    if (!p || typeof p !== "object") return { name: "", detail: "" };
    const o = p as Record<string, unknown>;
    const name = pickStr(o.fullName ?? o.full_name);
    const uni = pickStr(o.universityName ?? o.university_name);
    const email = pickStr(o.email);
    const detail = [uni, email].filter(Boolean).join(" · ");
    return { name, detail };
}

function formatDisplayDate(raw: string): string {
    const s = raw.trim();
    if (!s) return "—";
    const parsed = Date.parse(s);
    if (!Number.isNaN(parsed)) {
        return new Date(parsed).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    }
    return s;
}

function formatDisplayTimeSegment(raw: string): string {
    const s = raw.trim();
    if (!s) return "";
    const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return s;
    let h = parseInt(m[1], 10);
    const min = m[2];
    const ap = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${min} ${ap}`;
}

function initialFromName(name: string): string {
    const t = name.trim();
    return t ? t.charAt(0).toUpperCase() : "?";
}

function hoursFromRow(row: ReturnType<typeof normalizeEngagementAttendanceLog>): string {
    const h = Number(row.hours);
    if (Number.isFinite(h) && h > 0) return `${Math.round(h * 10) / 10}h`;
    const st = pickStr(row.start_time);
    const et = pickStr(row.end_time);
    const m1 = st.match(/^(\d{1,2}):(\d{2})/);
    const m2 = et.match(/^(\d{1,2}):(\d{2})/);
    if (!m1 || !m2) return "—";
    const mins =
        parseInt(m2[1], 10) * 60 +
        parseInt(m2[2], 10) -
        (parseInt(m1[1], 10) * 60 + parseInt(m1[2], 10));
    if (mins <= 0) return "—";
    return `${Math.round((mins / 60) * 10) / 10}h`;
}

export type AttendanceFlashCardAction = "approve" | "reject" | "flag";

/**
 * Faculty flash-card deck for pending attendance sessions.
 * Same PATCH actions as the table queue — visual presentation only.
 */
export default function AttendanceApprovalFlashCard({
    rows,
    acting,
    reasonByLogId,
    onReasonChange,
    onAct,
    projectTitle,
}: {
    rows: PendingRow[];
    acting: string | null;
    reasonByLogId: Record<string, string>;
    onReasonChange: (logId: string, reason: string) => void;
    onAct: (logId: string, action: AttendanceFlashCardAction) => void;
    projectTitle?: string;
}) {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (rows.length === 0) {
            setIndex(0);
            return;
        }
        setIndex((i) => Math.min(i, rows.length - 1));
    }, [rows.length]);

    const safeIndex = rows.length === 0 ? 0 : Math.min(index, rows.length - 1);
    const raw = rows[safeIndex] as Record<string, unknown> | undefined;

    const card = useMemo(() => {
        if (!raw) return null;
        const row = normalizeEngagementAttendanceLog(raw);
        const id = pickStr(row.id);
        const who = participantDisplay(raw);
        const rawUrl = pickStr(raw.evidenceUrl ?? raw.evidence_url ?? raw.evidenceURL);
        const fromRow =
            typeof row.evidence_file === "string" && /^https?:\/\//i.test(row.evidence_file.trim())
                ? row.evidence_file.trim()
                : "";
        const evidenceUrl = fromRow || (rawUrl.startsWith("http") ? rawUrl : "");
        const st = pickStr(row.start_time);
        const et = pickStr(row.end_time);
        const t1 = formatDisplayTimeSegment(st) || st;
        const t2 = formatDisplayTimeSegment(et) || et;
        return {
            id,
            who,
            evidenceUrl,
            workType: pickStr(row.activity_type) || "Session",
            desc: pickStr(row.description),
            dateLabel: formatDisplayDate(pickStr(row.date)),
            timeRange: [t1, t2].filter(Boolean).join(" – ") || "—",
            loc: pickStr(row.location),
            hours: hoursFromRow(row),
            name: who.name || "Participant",
        };
    }, [raw]);

    if (!card || rows.length === 0) return null;

    const busy = acting !== null;

    return (
        <div className="mx-auto w-full max-w-[640px] px-3 py-4 sm:px-5">
            <div className="mb-3 flex items-center justify-between gap-2 text-[11px] font-bold tracking-wide text-[#7a919a]">
                <span>
                    CARD {safeIndex + 1} / {rows.length}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        disabled={safeIndex <= 0}
                        onClick={() => setIndex((i) => Math.max(0, i - 1))}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#dcebee] bg-white text-[#0d2b33] disabled:opacity-40"
                        aria-label="Previous session"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        disabled={safeIndex >= rows.length - 1}
                        onClick={() => setIndex((i) => Math.min(rows.length - 1, i + 1))}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#dcebee] bg-white text-[#0d2b33] disabled:opacity-40"
                        aria-label="Next session"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="overflow-hidden rounded-[26px] border border-[#dcebee] bg-white shadow-[0_24px_60px_rgba(4,37,43,0.16)]">
                {/* Header — matches HTML .fch */}
                <div className="relative overflow-hidden bg-gradient-to-br from-[#04252b] via-[#0e5f63] to-[#12a5a0] px-6 py-6 text-white">
                    <span className="pointer-events-none absolute -bottom-6 -right-4 text-[120px] opacity-[0.08]">
                        🌍
                    </span>
                    <span className="inline-block rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[8px] font-extrabold tracking-[0.22em] text-[#99f6e4]">
                        CIEL PK · ATTENDANCE REVIEW
                    </span>
                    <h2 className="mt-2.5 text-[21px] font-extrabold leading-snug">
                        {projectTitle?.trim() || "Pending session"}
                    </h2>
                    <p className="mt-1 text-[11px] text-[#cdf5f0]">
                        📍 {card.loc || "Location not pinned"} · 📅 {card.dateLabel}
                    </p>
                    <div className="mt-3 flex items-center">
                        <div
                            className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-2 border-[#0e5f63] bg-gradient-to-br from-[#0e7d74] to-[#2dd4bf] text-[13px] font-extrabold text-white"
                            aria-hidden
                        >
                            {initialFromName(card.name)}
                        </div>
                        <div className="ml-3 min-w-0">
                            <p className="truncate text-sm font-bold">{card.name}</p>
                            {card.who.detail ? (
                                <p className="truncate text-[10px] text-[#a5e8de]">{card.who.detail}</p>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* Stats strip */}
                <div className="grid grid-cols-2 border-b border-[#dcebee] sm:grid-cols-4">
                    {[
                        { v: card.hours, k: "SESSION HOURS" },
                        { v: card.timeRange, k: "TIME WINDOW" },
                        { v: card.workType, k: "ACTIVITY" },
                        { v: card.evidenceUrl ? "Yes" : "No", k: "EVIDENCE" },
                    ].map((s, i) => (
                        <div
                            key={s.k}
                            className={clsx(
                                "px-2.5 py-3.5 text-center",
                                i < 3 && "border-r border-[#dcebee]",
                            )}
                        >
                            <div className="truncate text-sm font-extrabold text-[#0e7d74] sm:text-base">
                                {s.v}
                            </div>
                            <div className="mt-1 text-[7px] font-extrabold tracking-[0.13em] text-[#7a919a]">
                                {s.k}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-3 px-5 py-4 sm:px-6">
                    {card.desc ? (
                        <div className="rounded-[14px] border border-[#dcebee] bg-[#f6fcfb] px-4 py-3">
                            <p className="text-[8.5px] font-extrabold tracking-[0.1em] text-[#7a919a]">
                                WHAT THEY DID
                            </p>
                            <p className="mt-1 text-[11px] leading-relaxed text-[#1d3a3d]">
                                “{card.desc}”
                            </p>
                        </div>
                    ) : (
                        <p className="text-center text-[11px] text-[#7a919a]">No description provided.</p>
                    )}

                    {card.evidenceUrl ? (
                        <a
                            href={card.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 rounded-[14px] border border-[#cbe7e3] bg-[#e6f6f4] px-4 py-3 text-[12px] font-extrabold text-[#0e7d74] transition hover:bg-[#d8f0ed]"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Open evidence photo
                        </a>
                    ) : (
                        <div className="flex items-center justify-center gap-2 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-extrabold text-amber-800">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            Evidence missing — review carefully
                        </div>
                    )}
                </div>

                <div className="border-t border-dashed border-[#dcebee] bg-[#fafdfd] px-5 py-4 sm:px-6">
                    <p className="text-[11px] font-extrabold text-[#b45309]">
                        ⏳ PENDING — one tap to approve this session
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <button
                            type="button"
                            disabled={busy || !card.id}
                            onClick={() => onAct(card.id, "approve")}
                            className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-[14px] bg-[#0e7d74] px-3 text-[13px] font-extrabold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-[#c7dcd9]"
                        >
                            {acting === `${card.id}:approve` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4" />
                            )}
                            Approve
                        </button>
                        <button
                            type="button"
                            disabled={busy || !card.id}
                            onClick={() => onAct(card.id, "reject")}
                            className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-[14px] border border-[#f6cfd8] bg-[#fdf1f4] px-3 text-[13px] font-extrabold text-[#e11d48] transition hover:bg-[#fce7ec] disabled:opacity-50"
                        >
                            {acting === `${card.id}:reject` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <XCircle className="h-4 w-4" />
                            )}
                            Reject
                        </button>
                        <button
                            type="button"
                            disabled={busy || !card.id}
                            onClick={() => onAct(card.id, "flag")}
                            className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-[14px] border border-[#f3d9a0] bg-[#fbf0d7] px-3 text-[13px] font-extrabold text-[#b45309] transition hover:bg-[#f7e6c0] disabled:opacity-50"
                        >
                            {acting === `${card.id}:flag` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <AlertTriangle className="h-4 w-4" />
                            )}
                            Revision
                        </button>
                    </div>
                    <label className="mt-3 block">
                        <span className="sr-only">Reason for rejection or revision</span>
                        <textarea
                            rows={2}
                            className="w-full resize-y rounded-[12px] border border-[#dcebee] bg-white px-3 py-2 text-xs text-[#0d2b33] outline-none placeholder:text-[#7a919a] focus:border-[#0e7d74] focus:ring-2 focus:ring-[#0e7d74]/15"
                            placeholder="Reason (required for reject / revision)"
                            value={reasonByLogId[card.id] || ""}
                            onChange={(e) => onReasonChange(card.id, e.target.value)}
                        />
                    </label>
                    <p className="mt-2 text-center text-[10px] leading-relaxed text-[#7a919a]">
                        Approving locks this session as verified hours. Reject or request revision if
                        evidence or hours look wrong.
                    </p>
                </div>
            </div>
        </div>
    );
}
