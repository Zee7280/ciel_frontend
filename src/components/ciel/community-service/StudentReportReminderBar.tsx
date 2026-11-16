"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/utils/api";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";

export type StudentReportReminder = {
    opportunity_id: string;
    public_code: string;
    project_title: string;
    report_id: string | null;
    report_started: boolean;
    progress_pct: number;
    sections_complete: number;
    sections_total: number;
    phase: "no_dates" | "before_start" | "in_progress" | "reporting_window" | "closed";
    end_date: string | null;
    reporting_close_date: string | null;
    days_left_to_report: number | null;
    last_reminder_at: string | null;
    reminders_sent: number;
    urgent: boolean;
};

export const STUDENT_REPORT_REMINDERS_API = "/api/v1/student/report-reminders";

function shortDate(iso: string | null): string | null {
    if (!iso) return null;
    const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** The line under each project: deadline first, then where the report stands. */
export function reminderLine(item: StudentReportReminder): string {
    const left = item.days_left_to_report;
    const close = shortDate(item.reporting_close_date);
    const deadline =
        item.phase === "reporting_window"
            ? left != null
                ? `Project ended · ${left} day${left === 1 ? "" : "s"} left to submit${close ? ` (closes ${close})` : ""}`
                : "Project ended · submit your report now"
            : `Project running${item.end_date ? ` · ends ${shortDate(item.end_date)}` : ""}${close ? ` · report closes ${close}` : ""}`;
    const state = item.report_started
        ? `${Math.round(item.progress_pct)}% filled · ${item.sections_complete} of ${item.sections_total} sections`
        : "Report not started";
    return `${deadline} · ${state}`;
}

/**
 * Student "communication bar": every open Community Service report with its deadline, most urgent
 * first, with the automatic "Complete your report ASAP" status. Renders nothing when all is done.
 */
export default function StudentReportReminderBar({ className = "" }: { className?: string }) {
    const [items, setItems] = useState<StudentReportReminder[] | null>(null);
    const load = async () => {
        try {
            const res = await authenticatedFetch(STUDENT_REPORT_REMINDERS_API, {}, { redirectToLogin: false });
            if (!res?.ok) return;
            const json = await res.json().catch(() => null);
            setItems(Array.isArray(json?.data) ? (json.data as StudentReportReminder[]) : []);
        } catch {
            /* keep whatever is shown */
        }
    };
    useEffect(() => {
        // First load after mount (the live refresh below handles every later one).
        let cancelled = false;
        void Promise.resolve().then(() => (cancelled ? undefined : load()));
        return () => {
            cancelled = true;
        };
    }, []);
    useLiveRefresh(load, { intervalMs: 120_000 });

    if (!items || !items.length) return null;
    const urgent = items.filter((i) => i.urgent);
    const tone = urgent.length ? "border-[#f3c9a6] bg-[#fff6ee]" : "border-[#dce6ea] bg-white";
    return (
        <section data-testid="student-report-reminder-bar" className={`rounded-[18px] border p-4 ${tone} ${className}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                    <p className={`text-[9.5px] font-black uppercase tracking-[0.08em] ${urgent.length ? "text-[#b4530a]" : "text-[#7a919a]"}`}>
                        {urgent.length ? "Complete your report ASAP" : "Reports in progress"}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#5d727a]">
                        {urgent.length
                            ? `${urgent.length} project${urgent.length === 1 ? " has" : "s have"} ended. Submit before the reporting window closes — your faculty, partner and CIEL PK see this progress live.`
                            : "Keep logging hours and evidence as you go. CIEL PK reminds you automatically once a project ends."}
                    </p>
                </div>
            </div>
            <ul className="mt-3 grid gap-2">
                {items.map((item) => (
                    <li
                        key={item.opportunity_id}
                        className="flex flex-col gap-2 rounded-xl border border-[#e2eaed] bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div className="min-w-0">
                            <b className="block truncate text-[13px] text-[#16313d]">
                                {item.project_title} <span className="font-mono text-[10.5px] font-bold text-[#7a919a]">{item.public_code}</span>
                            </b>
                            <small className={`block text-[11.5px] ${item.urgent ? "text-[#b4530a]" : "text-[#5d727a]"}`}>{reminderLine(item)}</small>
                            {item.last_reminder_at ? (
                                <small className="block text-[10.5px] text-[#8aa0a6]">
                                    Last reminder {shortDate(item.last_reminder_at)}
                                    {item.reminders_sent > 1 ? ` · ${item.reminders_sent} so far` : ""}
                                </small>
                            ) : null}
                        </div>
                        <Link
                            href={`/dashboard/student/report?projectId=${encodeURIComponent(item.opportunity_id)}`}
                            className={`shrink-0 rounded-[10px] px-3 py-2 text-center text-[12px] font-black text-white ${item.urgent ? "bg-[#c76000] hover:bg-[#a85000]" : "bg-[#0e7d74] hover:bg-[#0b665e]"}`}
                        >
                            {item.report_started ? "Continue report" : "Start report"}
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
