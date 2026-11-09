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

    return (
        <div className="space-y-3 rounded-xl border border-[#cbe7e3] bg-[#f5fbfa] px-4 py-3" data-testid="followup-plan-preview">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0c746e]">Impact Follow-up Studio</p>
                    <p className="text-xs text-slate-600">
                        Source report, questions, the exact email and schedule, the partner&apos;s page and tracking, all filled from your report. Only the questions are yours to edit.
                    </p>
                </div>
                <button type="button" onClick={() => setStudioOpen(true)} className="rounded-full bg-[#0c746e] px-4 py-2 text-xs font-bold text-white shadow-sm" data-testid="open-followup-studio">
                    Open Follow-up Studio →
                </button>
            </div>

            <ol className="grid gap-2 sm:grid-cols-4">
                {steps.map(([when, what], i) => (
                    <li key={when} className="rounded-lg border border-white bg-white/80 px-3 py-2">
                        <p className="text-[11px] font-bold text-slate-900">{i + 1} · {when}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{what}</p>
                    </li>
                ))}
            </ol>

            <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0c746e]">
                    Questions the partner will be asked · {includedCount}{customised ? " · reviewed by you" : " · suggested"}
                </p>
                {!preview && !customised ? <p className="mt-1 text-xs text-slate-400">Preparing suggestions…</p> : null}
                <ul className="mt-1.5 space-y-1.5">
                    {shown.filter((q) => q.include).map((q, i) => (
                        <li key={q.id} className="rounded-lg border border-white bg-white/80 px-3 py-2 text-xs text-slate-800">
                            <span className="font-bold text-[#0c746e]">{i + 1}. {q.activityTitle || "Project activity"}</span>
                            <span className="block">{q.questionText || <em className="text-slate-400">(write the question in the studio)</em>}</span>
                            {q.countLabel ? <span className="block text-[11px] text-slate-500">Optional number: {q.countLabel}</span> : null}
                        </li>
                    ))}
                </ul>
                <p className="mt-2 text-[11px] text-slate-500">
                    Edit, untick or add questions in the studio{customised ? "" : " (suggested from your Section 4 activities, Section 5 outcomes and the instruction above)"}.
                    {preview ? ` Link valid ${preview.linkValidDays} days after the email.` : ""}
                </p>
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
