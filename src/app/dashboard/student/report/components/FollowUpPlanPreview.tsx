"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { useReportForm } from "../context/ReportContext";
import type { ReportData } from "../context/ReportContext";

/**
 * Shown under 9.5 as soon as the student picks "Yes": the email schedule and the questions the
 * partner will be asked. The suggested set is built on the server from the answers currently on
 * screen (Section 4 activities, Section 5 outcomes, the 9.5 focus); the student can keep it, edit
 * the wording, untick a question or add their own. The reviewed set is saved with the report
 * (`section10.followup_questions`) and used at publication; CIEL PK may still refine it.
 */

type SuggestedQuestion = { order: number; activityId?: string | null; activityTitle: string; questionText: string; countLabel: string | null; reason: string };
type Preview = {
    dueDate: string;
    reminder1: string;
    reminder2: string;
    linkValidDays: number;
    intervalLabel: string;
    subject: string;
    intro: string;
    questions: SuggestedQuestion[];
};
type StudentQuestion = NonNullable<ReportData["section10"]["followup_questions"]>[number];

const MAX_QUESTIONS = 10;

function pretty(iso: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return "date pending";
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function suggestedToStudent(q: SuggestedQuestion): StudentQuestion {
    return {
        id: `s-${q.order}-${q.activityTitle}`.replace(/\s+/g, "-").toLowerCase(),
        activityId: q.activityId ?? null,
        activityTitle: q.activityTitle,
        questionText: q.questionText,
        countLabel: q.countLabel,
        include: true,
        source: "suggested",
    };
}

export default function FollowUpPlanPreview({ data, projectEndDate, projectTitle }: { data: ReportData; projectEndDate: string; projectTitle?: string }) {
    const { updateSection, isReportSectionsReadOnly } = useReportForm();
    const readOnly = isReportSectionsReadOnly;
    const [preview, setPreview] = useState<Preview | null>(null);
    const [failed, setFailed] = useState(false);
    const [editing, setEditing] = useState(false);

    const saved = useMemo(
        () => (Array.isArray(data.section10?.followup_questions) ? data.section10.followup_questions : []),
        [data.section10?.followup_questions],
    );
    const customised = saved.length > 0;

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

    const suggested: StudentQuestion[] = (preview?.questions || []).map(suggestedToStudent);
    const shown: StudentQuestion[] = customised ? saved : suggested;
    const includedCount = shown.filter((q) => q.include).length;

    const save = (next: StudentQuestion[]) => updateSection("section10", { followup_questions: next });
    const startEditing = () => {
        if (!customised) save(suggested);
        setEditing(true);
    };
    const patch = (id: string, fields: Partial<StudentQuestion>) => save(shown.map((q) => (q.id === id ? { ...q, ...fields } : q)));
    const remove = (id: string) => save(shown.filter((q) => q.id !== id));
    const addOwn = () =>
        save([
            ...shown,
            { id: `own-${Date.now()}`, activityId: null, activityTitle: "", questionText: "", countLabel: null, include: true, source: "student" },
        ]);
    const resetToSuggested = () => {
        updateSection("section10", { followup_questions: [] });
        setEditing(false);
    };

    const steps: Array<[string, string]> = [
        ["Now", "You save 9.5. No email is sent."],
        ["Report published", "CIEL PK approves your report; the follow-up is scheduled and the questions below are locked in (CIEL PK may refine them)."],
        [preview ? pretty(preview.dueDate) : "Due date", "The responsible person receives one email with the questions and a secure link (no login)."],
        [preview ? `${pretty(preview.reminder1)} · ${pretty(preview.reminder2)}` : "+7 · +14 days", "Reminders only if there is no reply. They stop on a reply, a decline or a cancellation."],
    ];

    const btn = "rounded-full border border-[#0c746e] bg-white px-3 py-1 text-[11px] font-bold text-[#0c746e] disabled:opacity-50";
    const btnPrimary = "rounded-full bg-[#0c746e] px-3 py-1 text-[11px] font-bold text-white disabled:opacity-50";

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
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0c746e]">
                        Questions the partner will be asked · {includedCount}{customised ? " · reviewed by you" : " · suggested"}
                    </p>
                    {!readOnly ? (
                        <div className="flex gap-2">
                            {editing ? (
                                <>
                                    <button type="button" className={btn} onClick={addOwn} disabled={shown.length >= MAX_QUESTIONS}>+ Add my own question</button>
                                    <button type="button" className={btnPrimary} onClick={() => setEditing(false)} disabled={includedCount === 0}>Done</button>
                                </>
                            ) : (
                                <button type="button" className={btn} onClick={startEditing} disabled={!preview} data-testid="followup-edit-questions">
                                    {customised ? "Edit questions" : "Review / edit questions"}
                                </button>
                            )}
                            {customised ? (
                                <button type="button" className="text-[11px] font-bold text-slate-500 underline" onClick={resetToSuggested}>Reset to suggested</button>
                            ) : null}
                        </div>
                    ) : null}
                </div>
                <p className="text-[11px] text-slate-500">
                    Suggested from your Section 4 activities, Section 5 outcomes and the instruction above. Each is answered Yes / Partially / No / Unable to verify.
                    {customised ? " Your reviewed set is saved with the report." : ""}
                </p>
                {!preview && !customised ? <p className="mt-2 text-xs text-slate-400">Preparing suggestions…</p> : null}
                <ul className="mt-2 space-y-1.5">
                    {shown.map((q, i) => (
                        <li key={q.id} className={`rounded-lg border border-white bg-white/80 px-3 py-2 text-xs text-slate-800 ${q.include ? "" : "opacity-60"}`}>
                            {editing ? (
                                <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <input
                                            value={q.activityTitle}
                                            maxLength={240}
                                            onChange={(e) => patch(q.id, { activityTitle: e.target.value })}
                                            placeholder="Which activity / result is this about?"
                                            className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold"
                                        />
                                        <label className="flex items-center gap-1 text-[11px]">
                                            <input type="checkbox" checked={q.include} onChange={(e) => patch(q.id, { include: e.target.checked })} /> Ask this
                                        </label>
                                        {q.source === "student" ? (
                                            <button type="button" className="text-[11px] font-bold text-rose-600" onClick={() => remove(q.id)}>Remove</button>
                                        ) : null}
                                    </div>
                                    <textarea
                                        value={q.questionText}
                                        maxLength={600}
                                        onChange={(e) => patch(q.id, { questionText: e.target.value })}
                                        placeholder="Write a question the partner can answer with Yes / Partially / No"
                                        className="min-h-[52px] w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                                    />
                                    <input
                                        value={q.countLabel || ""}
                                        maxLength={160}
                                        onChange={(e) => patch(q.id, { countLabel: e.target.value || null })}
                                        placeholder="Optional number to ask for (e.g. Trees still surviving)"
                                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px]"
                                    />
                                </div>
                            ) : (
                                <>
                                    <span className="font-bold text-[#0c746e]">{i + 1}. {q.activityTitle || "Project activity"}{q.include ? "" : " · not asked"}</span>
                                    <span className="block">{q.questionText || <em className="text-slate-400">(write the question)</em>}</span>
                                    {q.countLabel ? <span className="block text-[11px] text-slate-500">Optional number: {q.countLabel}</span> : null}
                                </>
                            )}
                        </li>
                    ))}
                </ul>
                {preview ? (
                    <p className="mt-2 text-[11px] text-slate-500">
                        Email subject: “{preview.subject.replace("PROJECT-ID", "Project ID")}” · link valid {preview.linkValidDays} days after the email.
                    </p>
                ) : null}
            </div>
        </div>
    );
}
