"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import type { ReportData } from "../context/ReportContext";

/**
 * Shown under 9.5 as soon as the student picks "Yes": the email schedule and the draft questions
 * the partner will be asked, built on the server from the answers currently on screen (Section 4
 * activities, Section 5 outcomes, the 9.5 focus). Read-only; nothing is stored or sent from here.
 */

type Preview = {
    dueDate: string;
    reminder1: string;
    reminder2: string;
    linkValidDays: number;
    intervalLabel: string;
    subject: string;
    intro: string;
    questions: Array<{ order: number; activityTitle: string; questionText: string; countLabel: string | null; reason: string }>;
};

function pretty(iso: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return "date pending";
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function FollowUpPlanPreview({ data, projectEndDate, projectTitle }: { data: ReportData; projectEndDate: string; projectTitle?: string }) {
    const [preview, setPreview] = useState<Preview | null>(null);
    const [failed, setFailed] = useState(false);

    // Only the fields the generator reads; re-fetch when they change (debounced).
    const payload = useMemo(
        () =>
            JSON.stringify({
                section4: { activity_blocks: data.section4?.activity_blocks || [] },
                section5: { measurable_outcomes: data.section5?.measurable_outcomes || [] },
                section10: {
                    followup_interval: data.section10?.followup_interval,
                    followup_custom_date: data.section10?.followup_custom_date,
                    followup_due_date: data.section10?.followup_due_date,
                    followup_check: data.section10?.followup_check,
                    followup_check_notes: data.section10?.followup_check_notes,
                },
                projectTitle: projectTitle || data.project_title || "",
                projectEndDate,
            }),
        [data.section4?.activity_blocks, data.section5?.measurable_outcomes, data.section10?.followup_interval, data.section10?.followup_custom_date, data.section10?.followup_due_date, data.section10?.followup_check, data.section10?.followup_check_notes, data.project_title, projectTitle, projectEndDate],
    );

    useEffect(() => {
        let cancelled = false;
        const timer = window.setTimeout(async () => {
            try {
                const res = await authenticatedFetch(
                    "/api/v1/students/followups/preview",
                    { method: "POST", headers: { "Content-Type": "application/json" }, body: payload },
                    { redirectToLogin: false },
                );
                if (cancelled) return;
                if (!res || !res.ok) {
                    setFailed(true);
                    return;
                }
                setPreview((await res.json()) as Preview);
                setFailed(false);
            } catch {
                if (!cancelled) setFailed(true);
            }
        }, 500);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [payload]);

    if (failed && !preview) return null;

    const steps: Array<[string, string]> = [
        ["Now", "You save 9.5. No email is sent."],
        ["Report published", "CIEL PK approves your report; the follow-up is scheduled and the questions below are locked in (CIEL PK may refine them)."],
        [preview ? pretty(preview.dueDate) : "Due date", "The responsible person receives one email with the questions and a secure link (no login)."],
        [preview ? `${pretty(preview.reminder1)} · ${pretty(preview.reminder2)}` : "+7 · +14 days", "Reminders only if there is no reply. They stop on a reply, a decline or a cancellation."],
    ];

    return (
        <div className="space-y-3 rounded-xl border border-[#cbe7e3] bg-[#f5fbfa] px-4 py-3" data-testid="followup-plan-preview">
            <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0c746e]">What happens after you choose Yes</p>
                <ol className="mt-2 grid gap-2 sm:grid-cols-4">
                    {steps.map(([when, what], i) => (
                        <li key={when} className="rounded-lg border border-white bg-white/80 px-3 py-2">
                            <p className="text-[11px] font-bold text-slate-900">{i + 1} · {when}</p>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{what}</p>
                        </li>
                    ))}
                </ol>
            </div>

            <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0c746e]">
                    Draft questions the partner will be asked{preview ? ` · ${preview.questions.length}` : ""}
                </p>
                <p className="text-[11px] text-slate-500">
                    Built from your Section 4 activities, Section 5 outcomes and the instruction above. Each is answered Yes / Partially / No / Unable to verify.
                </p>
                {preview ? (
                    <ul className="mt-2 space-y-1.5">
                        {preview.questions.map((q) => (
                            <li key={`${q.order}-${q.activityTitle}`} className="rounded-lg border border-white bg-white/80 px-3 py-2 text-xs text-slate-800">
                                <span className="font-bold text-[#0c746e]">{q.order}. {q.activityTitle}</span>
                                <span className="block">{q.questionText}</span>
                                {q.countLabel ? <span className="block text-[11px] text-slate-500">Optional number: {q.countLabel}</span> : null}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-2 text-xs text-slate-400">Preparing preview…</p>
                )}
                {preview ? (
                    <p className="mt-2 text-[11px] text-slate-500">
                        Email subject: “{preview.subject.replace("PROJECT-ID", "Project ID")}” · link valid {preview.linkValidDays} days after the email.
                    </p>
                ) : null}
            </div>
        </div>
    );
}
