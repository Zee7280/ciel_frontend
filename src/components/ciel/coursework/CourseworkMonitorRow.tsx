"use client";

import { Mail, MessageCircle } from "lucide-react";
import { courseworkStatusLabel, type CourseworkStatusTone } from "@/utils/courseworkSectionReview";
import { mailtoHref, whatsappShareHref } from "@/utils/reminderLinks";

/** The minimal shape a "Live Monitor" / "Command Monitor" row needs — deliberately loose so any
 * coursework list row (MeritEntry, AdminCourseProjectRow, …) can be passed straight through. */
export interface CourseworkMonitorEntry {
    id?: string;
    projectTitle?: string | null;
    course?: string | null;
    status?: string;
    facultyApprovalStatus?: string | null;
    updatedAt?: string;
    student?: { name?: string; email?: string } | null;
    studentInfo?: {
        studentName?: string;
        studentEmail?: string;
        teacherName?: string;
        teacherEmail?: string;
        universityName?: string;
    } | null;
}

const TONE_PILL: Record<CourseworkStatusTone, string> = {
    draft: "bg-[#eef1f2] text-[#596971]",
    under_review: "bg-[#fff3dc] text-[#a66d11]",
    revision_requested: "bg-[#fdeeee] text-[#b34c4c]",
    rejected: "bg-[#fdeeee] text-[#b34c4c]",
    approved: "bg-[#e8f5ef] text-[#1d765d]",
};

/** Days since this record's last update — the closest proxy we have to "days waiting" without a
 * dedicated submittedAt/reviewedAt timestamp: while a record is genuinely waiting on someone,
 * nothing else touches updatedAt in the meantime. */
export function courseworkMonitorDaysWaiting(entry: { updatedAt?: string }): number {
    if (!entry.updatedAt) return 0;
    const ms = Date.now() - new Date(entry.updatedAt).getTime();
    return Math.max(0, Math.floor(ms / 86_400_000));
}

/** Client-side "stalled" rule for the Super Admin Command Monitor, mirroring the mockup's rule
 * (drafts/revisions idle ≥3 days, submissions waiting on faculty ≥5 days) — computed only from
 * fields every coursework list endpoint already returns, no new backend field or endpoint. */
export function isCourseworkMonitorStalled(entry: {
    status?: string;
    facultyApprovalStatus?: string | null;
    updatedAt?: string;
}): boolean {
    const days = courseworkMonitorDaysWaiting(entry);
    const { tone } = courseworkStatusLabel(entry, "other");
    if (tone === "under_review") return days >= 5;
    if (tone === "draft" || tone === "revision_requested") return days >= 3;
    return false;
}

/**
 * One read-only monitor row: title, owner, university/faculty, stage pill and waiting-time — no
 * academic text, no review actions. Used by the University "Live Monitor" (no `contact`, no
 * `showStalled`) and the Super Admin "Command Monitor" (`showStalled` + an optional one-tap
 * `contact` reminder), so both dashboards read from a single row shape.
 */
export function CourseworkMonitorRow({
    entry,
    contact,
    showStalled = false,
}: {
    entry: CourseworkMonitorEntry;
    /** Presence alone renders the Email/WhatsApp "reach in one tap" pair — omit for a strictly
     * read-only row (the University's Live Monitor must show no action buttons at all). */
    contact?: { name: string; to: string; subject: string; body: string } | null;
    showStalled?: boolean;
}) {
    const si = entry.studentInfo || {};
    const studentName = entry.student?.name || si.studentName || "Student";
    const { tone, label } = courseworkStatusLabel(entry, "other");
    const days = courseworkMonitorDaysWaiting(entry);
    const stalled = showStalled && isCourseworkMonitorStalled(entry);
    const showDays = tone === "under_review" || tone === "draft" || tone === "revision_requested";

    return (
        <div
            className={`flex flex-wrap items-center justify-between gap-3 rounded-[14px] border px-4 py-3 ${
                stalled ? "border-[#f0c4c4] bg-[#fff7f7]" : "border-[#e7edf0] bg-white"
            }`}
        >
            <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-[#183140]">{entry.projectTitle || "Untitled coursework"}</p>
                <p className="mt-0.5 truncate text-[11px] text-[#70808a]">
                    {studentName}
                    {entry.course ? ` · ${entry.course}` : ""}
                    {si.universityName ? ` · ${si.universityName}` : ""}
                    {si.teacherName ? ` · ${si.teacherName}` : ""}
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                {stalled ? (
                    <span className="rounded-full bg-[#b34c4c] px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wide text-white">
                        Stalled
                    </span>
                ) : null}
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${TONE_PILL[tone]}`}>{label}</span>
                {showDays ? <span className="text-[10px] font-bold text-[#70808a]">{days}d</span> : null}
                {contact ? (
                    <>
                        <a
                            href={mailtoHref(contact.to, contact.subject, contact.body)}
                            title={`Email ${contact.name}`}
                            className="rounded-full border border-[#dde5ea] bg-white p-1.5 text-[#376d9f] hover:border-[#376d9f]"
                        >
                            <Mail className="h-3.5 w-3.5" />
                        </a>
                        <a
                            href={whatsappShareHref(`${contact.subject}\n\n${contact.body}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`WhatsApp ${contact.name}`}
                            className="rounded-full border border-[#dde5ea] bg-white p-1.5 text-[#1d765d] hover:border-[#1d765d]"
                        >
                            <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                    </>
                ) : null}
            </div>
        </div>
    );
}
