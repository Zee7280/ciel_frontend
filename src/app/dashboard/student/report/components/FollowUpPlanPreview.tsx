"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { useReportForm } from "../context/ReportContext";
import type { ReportData } from "../context/ReportContext";
import FollowUpStudio, { type StudioPreview, type StudioQuestion } from "./FollowUpStudio";

/**
 * Shown under 9.5 as soon as the student picks "Yes": a compact summary (timeline, questions) and
 * the button that opens the Impact Follow-up Studio. The suggested questions are built on the
 * server from the answers currently on screen; the student's reviewed set is saved with the report
 * (`section10.followup_questions`) and used at publication. Nothing is stored or sent from here.
 */

const MAX_QUESTIONS = 10;

function pretty(iso: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return "date pending";
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function suggestedToStudent(q: StudioPreview["questions"][number]): StudioQuestion {
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

export default function FollowUpPlanPreview({ data, projectData, projectEndDate, projectTitle }: { data: ReportData; projectData?: unknown; projectEndDate: string; projectTitle?: string }) {
    const { updateSection, isReportSectionsReadOnly } = useReportForm();
    const readOnly = isReportSectionsReadOnly;
    const [preview, setPreview] = useState<StudioPreview | null>(null);
    const [failed, setFailed] = useState(false);
    const [studioOpen, setStudioOpen] = useState(false);

    const saved: StudioQuestion[] = Array.isArray(data.section10?.followup_questions) ? data.section10.followup_questions : [];
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
                setPreview((await res.json()) as StudioPreview);
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

    if (failed && !preview && !customised) return null;

    const suggested: StudioQuestion[] = (preview?.questions || []).map(suggestedToStudent);
    const shown: StudioQuestion[] = customised ? saved : suggested;
    const includedCount = shown.filter((q) => q.include).length;

    const save = (next: StudioQuestion[]) => updateSection("section10", { followup_questions: next });
    const startEditing = () => {
        if (!customised) save(suggested);
    };
    const patch = (id: string, fields: Partial<StudioQuestion>) => save(shown.map((q) => (q.id === id ? { ...q, ...fields } : q)));
    const remove = (id: string) => save(shown.filter((q) => q.id !== id));
    const addOwn = () => {
        if (shown.length >= MAX_QUESTIONS) return;
        // Deterministic id: one past the highest "own-N" already in the list (stable across re-renders).
        const nextOwn = shown.reduce((max, q) => {
            const m = /^own-(\d+)$/.exec(q.id);
            return m ? Math.max(max, Number(m[1])) : max;
        }, 0) + 1;
        save([...shown, { id: `own-${nextOwn}`, activityId: null, activityTitle: "", questionText: "", countLabel: null, include: true, source: "student" }]);
    };
    const resetToSuggested = () => updateSection("section10", { followup_questions: [] });

    const steps: Array<[string, string]> = [
        ["Now", "You save 9.5. No email is sent."],
        ["Report published", "CIEL PK approves your report; the follow-up is scheduled and the questions are locked in (CIEL PK may refine them)."],
        [preview ? pretty(preview.dueDate) : "Due date", "The responsible person receives one email with the questions and a secure link (no login)."],
        [preview ? `${pretty(preview.reminder1)} · ${pretty(preview.reminder2)}` : "+7 · +14 days", "Reminders only if there is no reply. They stop on a reply, a decline or a cancellation."],
    ];

    const facts: Array<[string, string]> = [
        ["Partner email", preview ? pretty(preview.dueDate) : "Needs end date"],
        ["Interval", preview?.intervalLabel || "After project end"],
        ["Questions", `${includedCount} ${customised ? "reviewed by you" : "suggested"}`],
        ["Link valid", preview ? `${preview.linkValidDays} days` : "—"],
    ];

    return (
        <div className="overflow-hidden rounded-2xl border border-[#cbe7e3] bg-white shadow-[0_10px_30px_rgba(12,116,110,0.08)]" data-testid="followup-plan-preview">
            {/* header band */}
            <div className="relative overflow-hidden bg-[linear-gradient(118deg,#083b4a_0%,#0c746e_62%,#159d89_100%)] px-5 py-5 text-white">
                <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/15" aria-hidden />
                <div className="pointer-events-none absolute -right-6 -top-14 h-40 w-40 rounded-full border border-white/10" aria-hidden />
                <div className="relative flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 max-w-2xl">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#abf8e7]">Impact Follow-up Studio</p>
                        <h4 className="mt-1 text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">Partner verification, planned from your report</h4>
                        <p className="mt-1.5 text-xs leading-relaxed text-[#dcf2ef] sm:text-sm">
                            Source report, questions, the exact email and schedule, the partner&apos;s page and tracking, all filled from your report. Only the questions are yours to edit.
                        </p>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                        <button
                            type="button"
                            onClick={() => setStudioOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-extrabold text-[#0c746e] shadow-md transition hover:bg-[#eefaf7] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                            data-testid="open-followup-studio"
                        >
                            Open Follow-up Studio →
                        </button>
                        <span className="rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#dcf2ef]">Preview · nothing is sent</span>
                    </div>
                </div>
                <dl className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {facts.map(([k, v]) => (
                        <div key={k} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-[2px]">
                            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#abf8e7]">{k}</dt>
                            <dd className="truncate text-sm font-extrabold text-white">{v}</dd>
                        </div>
                    ))}
                </dl>
            </div>

            <div className="space-y-5 px-5 py-5">
                {/* timeline */}
                <section>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0c746e]">How it unfolds</p>
                    <ol className="relative mt-3 grid gap-3 sm:grid-cols-4">
                        <span className="pointer-events-none absolute left-[12%] right-[12%] top-[18px] hidden h-px bg-[#cbe7e3] sm:block" aria-hidden />
                        {steps.map(([when, what], i) => (
                            <li key={when} className="relative rounded-xl border border-[#e3efed] bg-[#f8fcfb] px-3 pb-3 pt-2.5">
                                <div className="flex items-center gap-2">
                                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0c746e] text-[11px] font-extrabold text-white shadow-sm ring-4 ring-white">{i + 1}</span>
                                    <p className="truncate text-xs font-extrabold text-slate-900">{when}</p>
                                </div>
                                <p className="mt-2 text-[11px] leading-relaxed text-slate-600">{what}</p>
                            </li>
                        ))}
                    </ol>
                </section>

                {/* questions */}
                <section>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0c746e]">Questions the partner will be asked</p>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${customised ? "bg-[#fff1d6] text-[#84611c]" : "bg-[#e6f6f4] text-[#0c746e]"}`}>
                            {includedCount} · {customised ? "reviewed by you" : "suggested"}
                        </span>
                    </div>
                    {!preview && !customised ? <p className="mt-2 text-xs text-slate-400">Preparing suggestions…</p> : null}
                    <ol className="mt-2.5 space-y-2">
                        {shown.filter((q) => q.include).map((q, i) => (
                            <li key={q.id} className="flex gap-3 rounded-xl border border-[#e3efed] bg-white px-3.5 py-3 shadow-[0_1px_0_rgba(12,116,110,0.06)]">
                                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#e6f6f4] text-[11px] font-extrabold text-[#0c746e]">{i + 1}</span>
                                <div className="min-w-0 flex-1">
                                    <span className="inline-block rounded-md bg-[#f0f6f8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#52707e]">{q.activityTitle || "Project activity"}</span>
                                    <p className="mt-1 text-sm font-semibold leading-snug text-slate-900">
                                        {q.questionText || <em className="font-normal text-slate-400">(write the question in the studio)</em>}
                                    </p>
                                    {q.countLabel ? <p className="mt-1 text-[11px] text-slate-500">Optional number · {q.countLabel}</p> : null}
                                </div>
                            </li>
                        ))}
                    </ol>
                    <p className="mt-2.5 text-[11px] text-slate-500">
                        Edit, untick or add questions in the studio{customised ? "" : " (suggested from your Section 4 activities, Section 5 outcomes and the instruction above)"}.
                        {preview ? ` Link valid ${preview.linkValidDays} days after the email.` : ""}
                    </p>
                </section>
            </div>

            <FollowUpStudio
                open={studioOpen}
                onClose={() => setStudioOpen(false)}
                data={data}
                projectData={projectData}
                projectEndDate={projectEndDate}
                preview={preview}
                questions={shown}
                customised={customised}
                readOnly={readOnly}
                onPatch={patch}
                onRemove={remove}
                onAddOwn={addOwn}
                onStartEditing={startEditing}
                onReset={resetToSuggested}
                onReplace={save}
            />
        </div>
    );
}
