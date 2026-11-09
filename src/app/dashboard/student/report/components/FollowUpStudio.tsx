"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import FollowUpStatusNote from "./FollowUpStatusNote";
import type { ReportData } from "../context/ReportContext";

/**
 * The "Impact Follow-up Studio" that opens under 9.5 once the student picks Yes. Mirrors the
 * designer's prototype tabs: 1 Source report (auto-filled from the report + opportunity),
 * 2 Questions (the only part the student edits), 3 Email & schedule (preview of the exact email
 * and dates), 4 Partner view (what the responsible person will see), 5 Tracking (status after
 * publication). Nothing here is sent; the question set is saved with the report.
 */

export type StudioPreview = {
    dueDate: string;
    reminder1: string;
    reminder2: string;
    linkValidDays: number;
    intervalLabel: string;
    subject: string;
    intro: string;
    questions: Array<{ order: number; activityId?: string | null; activityTitle: string; questionText: string; countLabel: string | null; reason: string }>;
};
export type StudioQuestion = NonNullable<ReportData["section10"]["followup_questions"]>[number];

type Props = {
    open: boolean;
    onClose: () => void;
    data: ReportData;
    projectData?: unknown;
    projectEndDate: string;
    preview: StudioPreview | null;
    questions: StudioQuestion[];
    customised: boolean;
    readOnly: boolean;
    onPatch: (id: string, fields: Partial<StudioQuestion>) => void;
    onRemove: (id: string) => void;
    onAddOwn: () => void;
    onStartEditing: () => void;
    onReset: () => void;
    /** Replace the whole saved set in one write (used by "Maximum questions per email"). */
    onReplace: (next: StudioQuestion[]) => void;
};

const MAX_QUESTIONS_DEFAULT = 5;
const MAX_QUESTION_OPTIONS = [2, 3, 4, 5, 6, 8, 10];

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : {});
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : "");
const first = (...vals: unknown[]): string => vals.map(str).find(Boolean) || "";

function pretty(iso: string): string {
    const clean = str(iso).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean ? clean : "Not set";
    const [y, m, d] = clean.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** The same project identity block the email and the partner page show, built from what the wizard already has. */
export function studioReference(data: ReportData, projectData: unknown) {
    const p = rec(projectData);
    const loc = rec(p.location);
    const tl = rec(p.timeline);
    const objectives = rec(p.objectives);
    const lead = rec(data.section1?.team_lead);
    const members = Array.isArray(data.section1?.team_members) ? data.section1.team_members : [];
    const summary = rec(rec(data.section4).project_summary);
    const count = first(summary.distinct_total_beneficiaries, data.section2?.affected_count);
    return {
        title: first(p.title, p.name, data.project_title, "Community engagement project"),
        projectId: first(data.publicId, data.public_id, data.project_id, p.id),
        host: first(p.organization_name, p.partner_name, p.organization, rec(p.partner_organization).organization_name, "Self-initiated"),
        university: first(lead.universityName, lead.university, p.university),
        location: [first(loc.venue, p.venue), first(p.city, p.district, loc.city, loc.district), first(p.province, loc.province)].filter(Boolean).join(", "),
        periodStart: first(p.start_date, p.startDate, tl.start_date, tl.startDate).slice(0, 10),
        periodEnd: first(p.end_date, p.endDate, tl.end_date, tl.endDate).slice(0, 10),
        objective: first(objectives.description, p.description, data.section2?.problem_statement).slice(0, 400),
        beneficiaries: [count, str(data.section2?.affected_group)].filter(Boolean).join(" "),
        team: [first(lead.fullName, lead.name), ...members.map((m) => first(rec(m).fullName, rec(m).name))].filter(Boolean).join(", "),
    };
}

const TABS = [
    ["source", "1 · Source report"],
    ["questions", "2 · Questions"],
    ["email", "3 · Email & schedule"],
    ["partner", "4 · Partner view"],
    ["tracking", "5 · Tracking"],
] as const;
type TabKey = (typeof TABS)[number][0];

const NOT_DELIVERED = /cancel|not deliver|not started|not complet|planned|proposed|pending|dropped/i;

function ReferenceBlock({ rows }: { rows: Array<[string, string]> }) {
    return (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 rounded-xl border border-[#d9e8e5] bg-[#f5fbfa] p-3 text-xs sm:grid-cols-2">
            {rows.map(([k, v]) => (
                <div key={k} className="flex gap-2">
                    <dt className="w-32 shrink-0 text-slate-500">{k}</dt>
                    <dd className="font-medium text-slate-900">{v}</dd>
                </div>
            ))}
        </dl>
    );
}

export default function FollowUpStudio({ open, onClose, data, projectData, projectEndDate, preview, questions, customised, readOnly, onPatch, onRemove, onAddOwn, onStartEditing, onReset, onReplace }: Props) {
    const [tab, setTab] = useState<TabKey>("questions");
    const [maxQuestions, setMaxQuestions] = useState(MAX_QUESTIONS_DEFAULT);
    const ref = useMemo(() => studioReference(data, projectData), [data, projectData]);
    const s10 = data.section10 || ({} as ReportData["section10"]);
    const included = questions.filter((q) => q.include);
    const blocks = Array.isArray(data.section4?.activity_blocks) ? data.section4.activity_blocks : [];
    const outcomes = Array.isArray(data.section5?.measurable_outcomes) ? data.section5.measurable_outcomes : [];
    const subject = (preview?.subject || `CIEL PK | Impact follow-up | PROJECT-ID | ${ref.title}`).replace("PROJECT-ID", ref.projectId || "Project ID");

    /** S4 / S5 / S9 facts for one activity (what the generator read), keyed by the Section 4 block id. */
    const activityFacts = (activityId: string | null | undefined) => {
        const idx = blocks.findIndex((b, i) => (str(rec(b).id) || `activity-${i + 1}`) === str(activityId));
        if (idx < 0) return null;
        const block = rec(blocks[idx]);
        const status = str(block.status);
        const outs = (Array.isArray(block.outputs) ? block.outputs : []).map((o) => `${str(rec(o).quantity)} ${first(rec(o).title, rec(o).type_other, rec(o).type)}`.trim()).filter(Boolean);
        const linked = outcomes.filter((o) => str(rec(o).activity_id) === (str(block.id) || `activity-${idx + 1}`));
        return {
            title: first(block.title, block.sub_category, `Activity ${idx + 1}`),
            status,
            delivered: !status || !NOT_DELIVERED.test(status),
            s4: `${status || "status not set"}${outs.length ? ` · outputs: ${outs.join(", ")}` : " · no outputs recorded"}`,
            s5: linked.length ? linked.map((o) => `${first(rec(o).metric_other, rec(o).metric)} ${str(rec(o).baseline) || "—"} → ${str(rec(o).endline) || "—"}`).join("; ") : "Not mapped",
        };
    };
    const s9Fact = str(s10.continuation_details) ? `${str(s10.continuation_details).slice(0, 160)}${str(s10.continuation_details).length > 160 ? "…" : ""}` : "Not mapped";
    const skipped = blocks
        .map((b, i) => ({ title: first(rec(b).title, rec(b).sub_category, `Activity ${i + 1}`), status: str(rec(b).status) }))
        .filter((a) => a.status && NOT_DELIVERED.test(a.status))
        .map((a) => a.title);
    const reasonFor = (q: StudioQuestion) => {
        if (q.source === "student") return "Added by you";
        const hit = (preview?.questions || []).find((p) => (q.activityId ? p.activityId === q.activityId : !p.activityId && p.activityTitle === q.activityTitle));
        return hit?.reason || "Verify continuing benefit";
    };
    // Every change goes through the saved set; the first edit copies the suggestions onto the report.
    const edit = (id: string, fields: Partial<StudioQuestion>) => {
        if (!customised) onStartEditing();
        onPatch(id, fields);
    };
    // "Maximum questions per email": keep the first n in the email, untick the rest (one save, not n patches).
    const applyMax = (n: number) => {
        setMaxQuestions(n);
        let kept = 0;
        onReplace(
            questions.map((q) => {
                const keep = kept < n;
                if (keep) kept += 1;
                return q.include === keep ? q : { ...q, include: keep };
            }),
        );
    };
    const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 disabled:bg-slate-50 disabled:text-slate-500";

    const refRows: Array<[string, string]> = [
        ["Project", ref.title],
        ["Project ID", ref.projectId],
        ["Host organisation", ref.host],
        ["University", ref.university],
        ["Location", ref.location],
        ["Project period", [ref.periodStart, ref.periodEnd].filter(Boolean).map(pretty).join(" – ")],
        ["Beneficiary group", ref.beneficiaries],
        ["Student team", ref.team],
        ["Follow-up due", preview?.dueDate ? pretty(preview.dueDate) : "Needs a project end date"],
    ].filter(([, v]) => v && v.trim()) as Array<[string, string]>;

    const btn = "rounded-full border border-[#0c746e] bg-white px-3 py-1 text-[11px] font-bold text-[#0c746e] disabled:opacity-50";
    const btnPrimary = "rounded-full bg-[#0c746e] px-3 py-1 text-[11px] font-bold text-white disabled:opacity-50";

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="flex max-h-[92vh] w-[min(1100px,96vw)] max-w-none flex-col overflow-hidden bg-[#f4f8f7] p-0" data-testid="followup-studio">
                <DialogHeader className="border-b border-[#d9e8e5] bg-white px-6 pb-4 pt-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0c746e]">CIEL PK · Section 9.5 → Partner verification</p>
                    <DialogTitle className="text-lg font-extrabold text-slate-900">Impact Follow-up Studio</DialogTitle>
                    <p className="text-xs text-slate-500">
                        Everything except the questions is filled from your report and the opportunity. Only the question set is yours to edit; CIEL PK may refine it after publication. Nothing is sent from here.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2" role="tablist">
                        {TABS.map(([key, label]) => (
                            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${tab === key ? "border-[#0c746e] bg-[#0c746e] text-white" : "border-slate-200 bg-white text-slate-600"}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                    {tab === "source" ? (
                        <div className="space-y-4">
                            <section className="rounded-2xl border border-slate-200 bg-white p-4">
                                <h3 className="text-sm font-bold text-slate-900">Project identity & approved-report references</h3>
                                <p className="mb-3 text-xs text-slate-500">Appears at the top of the partner email and the response page. Taken from the opportunity and Sections 1, 2 and 4; nothing to type here.</p>
                                <ReferenceBlock rows={refRows} />
                                {ref.objective ? <p className="mt-3 text-xs text-slate-700"><b>Original project goal:</b> {ref.objective}</p> : null}
                            </section>
                            <section className="rounded-2xl border border-slate-200 bg-white p-4">
                                <h3 className="text-sm font-bold text-slate-900">Partner contact & schedule</h3>
                                <p className="mb-3 text-xs text-slate-500">From the 9.5 fields above. Change them there if needed.</p>
                                <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
                                    {([
                                        ["Who will check", s10.followup_owner_role],
                                        ["Responsible person", s10.followup_owner_name],
                                        ["Email", s10.followup_owner_email],
                                        ["When", preview?.intervalLabel],
                                        ["Follow-up due", preview?.dueDate ? pretty(preview.dueDate) : ""],
                                        ["What to check", s10.followup_check],
                                        ["Specific instruction", s10.followup_check_notes],
                                    ] as Array<[string, string | undefined]>).map(([k, v]) => (
                                        <div key={k} className="flex gap-2">
                                            <dt className="w-36 shrink-0 text-slate-500">{k}</dt>
                                            <dd className={`font-medium ${v ? "text-slate-900" : "text-rose-600"}`}>{v || "not filled yet"}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </section>
                            <section className="rounded-2xl border border-slate-200 bg-white p-4">
                                <h3 className="text-sm font-bold text-slate-900">Extracted from Section 4 + Section 5 + Section 9, activity by activity</h3>
                                <p className="mb-3 text-xs text-slate-500">Each delivered activity becomes one verification question. Planned or undelivered activities are skipped; one-time relief is not forced into a sustainability check.</p>
                                {blocks.length === 0 ? <p className="text-xs text-slate-500">No activities in Section 4 yet, so only the overall question will be asked.</p> : null}
                                <ul className="space-y-2">
                                    {blocks.map((b, i) => {
                                        const block = rec(b);
                                        const id = str(block.id) || `activity-${i + 1}`;
                                        const status = str(block.status);
                                        const delivered = !status || !NOT_DELIVERED.test(status);
                                        const outs = (Array.isArray(block.outputs) ? block.outputs : []).map((o) => `${str(rec(o).quantity)} ${first(rec(o).title, rec(o).type_other, rec(o).type)}`.trim()).filter(Boolean);
                                        const linked = outcomes.filter((o) => str(rec(o).activity_id) === id);
                                        const asked = (preview?.questions || []).some((q) => q.activityId === id);
                                        return (
                                            <li key={id} className="rounded-xl border border-slate-200 p-3 text-xs">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <b className="text-slate-900">Activity {i + 1} · {first(block.title, block.sub_category, "Untitled")}</b>
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${asked ? "bg-[#e6f6f4] text-[#0c746e]" : "bg-slate-100 text-slate-500"}`}>{asked ? "Question drafted" : delivered ? "No separate question" : "Skipped · planned / undelivered"}</span>
                                                </div>
                                                <p className="mt-1 text-slate-600"><b>S4:</b> {status || "status not set"}{outs.length ? ` · outputs: ${outs.join(", ")}` : " · no outputs recorded"}</p>
                                                <p className="text-slate-600"><b>S5:</b> {linked.length ? linked.map((o) => `${first(rec(o).metric_other, rec(o).metric)} ${str(rec(o).baseline) || "—"} → ${str(rec(o).endline) || "—"}`).join("; ") : "no measured change linked to this activity"}</p>
                                                <p className="text-slate-600"><b>S9:</b> {str(s10.continuation_details) ? `${str(s10.continuation_details).slice(0, 140)}${str(s10.continuation_details).length > 140 ? "…" : ""}` : "continuation not described yet"}</p>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        </div>
                    ) : null}

                    {tab === "questions" ? (
                        <div className="space-y-4">
                            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4" data-testid="studio-questions">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">2. Question extraction & editorial approval</h3>
                                        <p className="text-xs text-slate-500">Generate one distinct, answerable sustainability question per meaningful project activity or outcome. Combine only if they measure the same thing.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button type="button" className={btn} onClick={() => setTab("source")}>Edit source</button>
                                        {!readOnly ? <button type="button" className={btnPrimary} onClick={onReset} disabled={!customised} title={customised ? "Rebuild the suggestions from Sections 4, 5 and 9 (your edits are discarded)" : "Already showing the fresh suggestions"}>↻ Regenerate</button> : null}
                                    </div>
                                </div>

                                <div className="grid gap-2 sm:grid-cols-3">
                                    {([
                                        ["Source interventions", String(blocks.length)],
                                        ["Selected questions", String(included.length)],
                                        ["Recipient effort", `${Math.max(1, included.length)}–${Math.max(1, included.length) + 1} min`],
                                    ] as Array<[string, string]>).map(([k, v]) => (
                                        <div key={k} className="rounded-xl border border-[#d9e8e5] bg-[#f5fbfa] px-3 py-2">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{k}</p>
                                            <p className="text-lg font-extrabold text-slate-900">{v}</p>
                                        </div>
                                    ))}
                                </div>

                                <label className="block max-w-[280px] text-xs">
                                    <span className="mb-1 block font-semibold text-slate-700">Maximum questions per email</span>
                                    <select value={MAX_QUESTION_OPTIONS.find((n) => n >= Math.max(maxQuestions, included.length)) ?? 10} disabled={readOnly || questions.length === 0} onChange={(e) => applyMax(Number(e.target.value))} className={inputCls} data-testid="studio-max-questions">
                                        {MAX_QUESTION_OPTIONS.map((n) => <option key={n} value={n}>{n} questions</option>)}
                                    </select>
                                </label>

                                <div className="rounded-xl bg-[#fffaf0] px-3 py-2 text-[11px] leading-relaxed text-[#775620]">
                                    <b>Extraction logic:</b> detect durable outcomes from S4/S5/S9 → match each to a precise verification question → remove duplicates → flag planned/unverified activities → allow human review. Never claim a result happened when source data only shows a plan.
                                </div>

                                {!preview && !customised ? <p className="text-xs text-slate-400">Preparing suggestions…</p> : null}
                                {preview && questions.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500">No questions yet. Use ↻ Regenerate to extract them from your activities, or add a custom question.</p> : null}

                                <ol className="space-y-3">
                                    {questions.map((q, i) => {
                                        const facts = activityFacts(q.activityId);
                                        const counted = q.countLabel !== null && q.countLabel !== undefined;
                                        const statusText = q.source === "student" ? "Your question" : facts ? (facts.delivered ? facts.status || "Delivered" : `${facts.status} · verify`) : "Overall project";
                                        const statusOk = q.source === "student" || !facts || facts.delivered;
                                        return (
                                            <li key={q.id} className={`rounded-2xl border p-3 text-xs ${q.include ? "border-[#9fd3cb] bg-[#f5fbfa]" : "border-dashed border-slate-200 bg-white"}`}>
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    {q.source === "student" ? (
                                                        <div className="flex min-w-0 flex-1 items-center gap-2">
                                                            <span className="shrink-0 text-[11px] font-extrabold text-slate-900">Question {i + 1} ·</span>
                                                            <input value={q.activityTitle} maxLength={240} disabled={readOnly} onChange={(e) => edit(q.id, { activityTitle: e.target.value })} placeholder="Which activity / result is this about?" className={`${inputCls} max-w-xs font-bold`} />
                                                        </div>
                                                    ) : (
                                                        <p className="text-[11px] font-extrabold text-slate-900">Question {i + 1} · {q.activityTitle || "Project activity"}</p>
                                                    )}
                                                    <div className="flex items-center gap-3">
                                                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                                                            <input type="checkbox" checked={q.include} disabled={readOnly} onChange={(e) => edit(q.id, { include: e.target.checked })} /> Include in email
                                                        </label>
                                                        {q.source === "student" && !readOnly ? <button type="button" className="text-[11px] font-bold text-rose-600" onClick={() => onRemove(q.id)}>Remove</button> : null}
                                                    </div>
                                                </div>

                                                <label className="mt-2 block">
                                                    <span className="mb-1 block text-[11px] font-semibold text-slate-700">Editable verification question</span>
                                                    <textarea value={q.questionText} maxLength={600} disabled={readOnly} onChange={(e) => edit(q.id, { questionText: e.target.value })} placeholder="Write a question the partner can answer with Yes / Partially / No" className={`${inputCls} min-h-[66px]`} />
                                                </label>

                                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                    <span className="rounded-full border border-[#dce9eb] bg-[#f0f6f8] px-2 py-0.5 text-[10px] font-semibold text-[#52707e]">Source: {q.source === "student" ? "Written by you" : "S4 · S5 outcome · S9 sustainability"}</span>
                                                    <span className="rounded-full border border-[#dce9eb] bg-[#f0f6f8] px-2 py-0.5 text-[10px] font-semibold text-[#52707e]">Reason: {reasonFor(q)}</span>
                                                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusOk ? "border-[#b6d8d4] bg-[#eefaf7] text-[#006d61]" : "border-[#edd6b4] bg-[#fff7e9] text-[#8a590d]"}`}>{statusText}</span>
                                                </div>

                                                <div className="mt-2 rounded-xl border border-slate-100 bg-white px-3 py-2 text-[11px] leading-relaxed text-slate-600">
                                                    <b>Source S4:</b> {q.source === "student" ? "Manual question" : facts ? facts.s4 : "Whole project (no single activity)"}<br />
                                                    <b>Source S5:</b> {q.source === "student" ? "Not mapped" : facts ? facts.s5 : "Not mapped"}<br />
                                                    <b>Source S9:</b> {q.source === "student" ? "Not mapped" : s9Fact}
                                                </div>

                                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                                                        <input type="checkbox" checked={counted} disabled={readOnly} onChange={(e) => edit(q.id, { countLabel: e.target.checked ? q.countLabel || "" : null })} /> Optional measurable count
                                                    </label>
                                                    <label className="block">
                                                        <span className="mb-1 block text-[11px] font-semibold text-slate-700">If counted, what exactly?</span>
                                                        <input value={q.countLabel || ""} maxLength={160} disabled={readOnly || !counted} onChange={(e) => edit(q.id, { countLabel: e.target.value })} placeholder="e.g. number of classrooms in use" className={inputCls} />
                                                    </label>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ol>

                                {skipped.length ? (
                                    <div className="rounded-xl border border-[#edd6b4] bg-[#fff7e9] px-3 py-2 text-[11px] leading-relaxed text-[#8a590d]">
                                        <b>Excluded:</b> {skipped.join("; ")}. Planned or not-delivered activities do not produce partner follow-ups.
                                    </div>
                                ) : null}

                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    {!readOnly ? <button type="button" className={btn} onClick={onAddOwn} disabled={questions.length >= 10}>+ Add custom question</button> : <span />}
                                    <button type="button" className={btnPrimary} onClick={() => setTab("email")}>Review partner email →</button>
                                </div>
                                {customised ? <p className="text-[11px] text-slate-500">This reviewed set is saved with your report and used when CIEL PK publishes it. Blank questions block submission; untick or remove them instead.</p> : null}
                            </section>

                            <section className="rounded-2xl border border-slate-200 bg-white p-4">
                                <h3 className="text-sm font-bold text-slate-900">Why this is better than one generic question</h3>
                                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                                    {([
                                        ["1 · Physical change", "Is the upgraded classroom still usable?"],
                                        ["2 · Asset condition", "Is the educational artwork still intact?"],
                                        ["3 · Actual adoption", "Are teachers actively using it?"],
                                    ] as Array<[string, string]>).map(([k, v]) => (
                                        <div key={k} className="rounded-xl border border-slate-100 bg-[#f8fbfb] px-3 py-2">
                                            <p className="text-xs font-bold text-slate-900">{k}</p>
                                            <p className="text-[11px] text-slate-600">{v}</p>
                                        </div>
                                    ))}
                                </div>
                                <p className="mt-2 text-[11px] text-slate-500">Three related but different outcomes may have three different answers. One blanket “Is impact sustained?” would hide that distinction.</p>
                            </section>
                        </div>
                    ) : null}

                    {tab === "email" ? (
                        <div className="space-y-4">
                            <div className="grid gap-2 sm:grid-cols-4">
                                {[
                                    ["Project end", projectEndDate || ref.periodEnd ? pretty(projectEndDate || ref.periodEnd) : "Not set"],
                                    ["Partner email", preview?.dueDate ? pretty(preview.dueDate) : "Needs end date"],
                                    ["Reminder", preview?.reminder1 ? pretty(preview.reminder1) : "+7 days"],
                                    ["Final reminder", preview?.reminder2 ? pretty(preview.reminder2) : "+14 days"],
                                ].map(([k, v]) => (
                                    <div key={k} className="rounded-xl border border-slate-200 bg-white p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">{k}</p>
                                        <p className="text-sm font-extrabold text-slate-900">{v}</p>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500">
                                Sent by CIEL PK after your report is published, on the due date. Reminders go only if there is no reply and stop on a reply, a decline or a cancellation. The link stays valid {preview?.linkValidDays ?? 60} days after the email.
                            </p>
                            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                <div className="border-b border-slate-100 px-4 py-3 text-xs text-slate-600">
                                    <p><b>From:</b> CIEL PK Impact Verification</p>
                                    <p><b>To:</b> {s10.followup_owner_name || "Partner Representative"} &lt;{s10.followup_owner_email || "recipient@partner.org"}&gt;</p>
                                    <p><b>Subject:</b> {subject}</p>
                                </div>
                                <div className="bg-[#0c746e] px-5 py-4 text-white">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#d9f2ee]">CIEL PK · Sustainability follow-up</p>
                                    <p className="text-lg font-extrabold">How is your community project doing now?</p>
                                    <p className="text-xs text-[#e4f5f0]">Project-specific follow-up · {preview?.dueDate ? pretty(preview.dueDate) : "due date"}</p>
                                </div>
                                <div className="space-y-3 px-5 py-4 text-sm text-slate-800">
                                    <p>Dear {s10.followup_owner_name || "Partner Representative"},</p>
                                    <p>{preview?.intro || "CIEL PK is conducting the scheduled follow-up for the student community engagement project listed below. Please confirm what has continued since the project ended."}</p>
                                    <p><b>Here is the exact project we are referring to:</b></p>
                                    <ReferenceBlock rows={refRows} />
                                    {ref.objective ? <p><b>Original project goal:</b> {ref.objective}</p> : null}
                                    <p><b>We are checking these distinct results:</b></p>
                                    {included.map((q, i) => (
                                        <div key={q.id} className="rounded-xl border border-[#d9e8e5] px-3 py-2">
                                            <p className="text-xs font-bold text-[#0c746e]">{i + 1}. {q.activityTitle || "Project activity"}</p>
                                            <p>{q.questionText}</p>
                                            <p className="text-[11px] text-slate-500">Choose: Yes · Partially · No · Unable to verify{q.countLabel ? ` · Optional number: ${q.countLabel}` : ""}</p>
                                        </div>
                                    ))}
                                    <p>It takes around {Math.max(1, included.length)}–{Math.max(1, included.length) + 1} minutes to respond. <b>No account or registration is required.</b></p>
                                    <div className="text-center"><span className="inline-block rounded-xl bg-[#0c746e] px-5 py-2.5 text-sm font-bold text-white opacity-80">Review and confirm {included.length} question{included.length === 1 ? "" : "s"} →</span></div>
                                    <p className="text-xs text-slate-500">The live email carries an individually signed link. The response page offers “Decline / wrong representative”.</p>
                                    <p>Warm regards,<br /><b>CIEL PK – Community Impact Education Lab</b><br /><span className="text-xs text-slate-500">www.cielpk.com</span></p>
                                </div>
                            </section>
                        </div>
                    ) : null}

                    {tab === "partner" ? (
                        <div className="space-y-3">
                            <p className="text-xs text-slate-500">This is the no-login page the partner opens from the email. Preview only: nothing can be submitted here.</p>
                            <div className="rounded-2xl bg-[#0c746e] p-5 text-white">
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#d9f2ee]">CIEL PK · Partner verification</p>
                                <p className="text-xl font-extrabold">{ref.title}</p>
                                <p className="text-xs text-[#e4f5f0]">You are being asked to confirm whether the outcomes of this specific student project have continued. No account is required.</p>
                            </div>
                            <ReferenceBlock rows={refRows} />
                            {included.map((q, i) => (
                                <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0c746e]">Question {i + 1} of {included.length} · {q.activityTitle || "Project activity"}</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900">{q.questionText}</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {["Yes", "Partially", "No", "Unable to verify"].map((c) => (
                                            <span key={c} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">{c}</span>
                                        ))}
                                    </div>
                                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                        {q.countLabel ? <div className="rounded-lg border border-dashed border-slate-200 px-2 py-1 text-[11px] text-slate-400">Optional number · {q.countLabel}</div> : null}
                                        <div className="rounded-lg border border-dashed border-slate-200 px-2 py-1 text-[11px] text-slate-400">Optional detail or issue</div>
                                    </div>
                                </div>
                            ))}
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
                                General comment · Your name · “I confirm these answers reflect what I can observe” · <b>Confirm {included.length} answers</b> · Decline / not the right representative
                            </div>
                        </div>
                    ) : null}

                    {tab === "tracking" ? (
                        <div className="space-y-3">
                            <section className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-700">
                                <h3 className="text-sm font-bold text-slate-900">Project-linked follow-up tracking</h3>
                                <p className="mt-1 text-slate-500">Answers are stored per question, not collapsed into one project label. “No response” is never treated as “no impact”.</p>
                                <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                                    {[
                                        ["Scheduled", "Report published; waiting for the due date."],
                                        ["Email sent / Reminded", "The partner has the link; no reply yet."],
                                        ["Responded", "Answers received; CIEL PK reviews them and then shares them here."],
                                        ["Declined / No response", "Wrong contact, or the link expired without a reply. CIEL PK may ask you for another contact."],
                                    ].map(([k, v]) => (
                                        <li key={k} className="rounded-xl border border-slate-100 bg-[#f5fbfa] px-3 py-2"><b>{k}</b><span className="block text-slate-600">{v}</span></li>
                                    ))}
                                </ol>
                            </section>
                            <FollowUpStatusNote reportId={data.id} />
                            {!data.id || !/verified|approved|paid/i.test(`${data.status || ""} ${data.admin_status || ""}`) ? (
                                <p className="text-xs text-slate-500">Live status appears here after CIEL PK publishes your report.</p>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-[#d9e8e5] bg-white px-6 py-3">
                    <p className="text-[11px] text-slate-500">Saved with your report when you save or submit. No email is sent from this studio.</p>
                    <button type="button" onClick={onClose} className="rounded-full bg-[#0c746e] px-4 py-1.5 text-xs font-bold text-white">Back to 9.5</button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
