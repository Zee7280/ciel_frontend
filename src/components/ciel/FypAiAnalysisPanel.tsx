"use client";

import { useState } from "react";
import { ChevronDown, Sparkles, ShieldAlert } from "lucide-react";
import clsx from "clsx";
import type { FypEntry } from "@/utils/fypTypes";
import { FYP_SECTION_KEYS, FYP_SECTION_LABELS } from "@/utils/fypTypes";
import {
    approveFypAiAnalysis,
    editFypAiAnalysis,
    runFypAiAnalysis,
    type FypAiDimensionResult,
} from "@/utils/fypAiAnalysis";

/** Faculty-only "FYP-MM 1.0" AI pre-analysis workspace — mirrors the locked
 * CIEL_PK_FYP_Faculty_Review_Loop design mockup. Opt-in per card (a button, not an
 * auto-fire-on-render effect) since each run is a real OpenAI call. Sits alongside — not inside —
 * ThesisCard's own Approve/Request revision/Reject controls, which keep working exactly as before
 * for a supervisor who skips the AI step entirely. */
export default function FypAiAnalysisPanel({
    entry,
    onUpdate,
}: {
    entry: FypEntry;
    /** Bubbles a partial entry patch back up to the parent's list state, same shape as reviewEntry's setEntries merge. */
    onUpdate: (id: string, patch: Partial<FypEntry>) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [busy, setBusy] = useState<"analyse" | "approve" | "edit" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [editValues, setEditValues] = useState<Record<string, { score: string; rationale: string }>>({});
    const [approveNote, setApproveNote] = useState("");

    const id = entry.id;
    const ai = entry.aiAnalysis;
    const lock = entry.aiAnalysisLock;
    const locked = !!lock?.locked;

    if (!id) return null;

    const startEdit = () => {
        const seed: Record<string, { score: string; rationale: string }> = {};
        for (const d of ai?.dimensions || []) {
            seed[d.key] = { score: String(d.score), rationale: d.rationale || "" };
        }
        setEditValues(seed);
        setEditMode(true);
    };

    const handleAnalyse = async () => {
        setError(null);
        setBusy("analyse");
        try {
            const result = await runFypAiAnalysis(id);
            onUpdate(id, { aiAnalysis: result });
            setExpanded(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : "The AI analysis could not be run.");
        } finally {
            setBusy(null);
        }
    };

    const handleSaveEdits = async () => {
        setError(null);
        setBusy("edit");
        try {
            const dimensions = Object.entries(editValues).map(([key, v]) => ({
                key,
                score: Number(v.score) || 0,
                rationale: v.rationale.trim() || undefined,
            }));
            const result = await editFypAiAnalysis(id, dimensions);
            onUpdate(id, { aiAnalysis: result });
            setEditMode(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not save your edits.");
        } finally {
            setBusy(null);
        }
    };

    const handleApprove = async () => {
        setError(null);
        setBusy("approve");
        try {
            const result = await approveFypAiAnalysis(id, approveNote.trim() || undefined);
            onUpdate(id, {
                aiAnalysis: result.aiAnalysis,
                aiAnalysisLock: result.aiAnalysisLock,
                supervisorApprovalStatus: "approved",
                supervisorApprovalNote: approveNote.trim() || null,
                supervisorApprovalAt: new Date().toISOString(),
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not approve the AI assessment.");
        } finally {
            setBusy(null);
        }
    };

    const sectionsByKey = new Map((ai?.sections || []).map((s) => [s.key, s.analysis]));
    const summaries = entry.sectionSummaries || {};

    return (
        <div className="overflow-hidden rounded-ciel-lg border border-[#ded7ff] bg-gradient-to-br from-[#fbfaff] to-[#f7fbff]">
            <button
                type="button"
                onClick={() => setExpanded((o) => !o)}
                className="ciel-transition flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
            >
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#5b43c7]">
                    <Sparkles className="h-3.5 w-3.5" />
                    FYP-MM 1.0 · AI Pre-Analysis
                    {locked ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-700">
                            🔒 LOCKED · {ai?.final}/100
                        </span>
                    ) : ai ? (
                        <span className="rounded-full bg-[#efebff] px-2 py-0.5 text-[9px] font-black text-[#5b43c7]">
                            {ai.final}/100 · {ai.classification}
                        </span>
                    ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-500">
                            NOT RUN
                        </span>
                    )}
                </span>
                <ChevronDown className={clsx("h-3.5 w-3.5 text-[#5b43c7] transition-transform", expanded && "rotate-180")} />
            </button>

            {expanded && (
                <div className="space-y-3 border-t border-[#ded7ff] px-4 py-4">
                    {error ? (
                        <p className="rounded-ciel-xs border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                            {error}
                        </p>
                    ) : null}

                    {!ai ? (
                        <div className="space-y-2.5">
                            <p className="text-xs leading-relaxed text-ciel-text-mid">
                                Let CIEL AI read the full flashcard, section summaries and evidence before you decide —
                                it scores all 8 FYP-MM 1.0 dimensions and comments section-by-section. You still make
                                the final call; nothing is decided automatically.
                            </p>
                            <button
                                type="button"
                                onClick={handleAnalyse}
                                disabled={busy !== null}
                                className="ciel-transition rounded-ciel-xs border-2 border-[#6d4aff] bg-[#6d4aff] px-3 py-2 text-xs font-bold text-white hover:bg-[#5b3de0] disabled:opacity-50"
                            >
                                {busy === "analyse" ? "Reading the full submission…" : "✨ Run AI Analysis"}
                            </button>
                        </div>
                    ) : (
                        <>
                            {ai.gatesApplied && ai.gatesApplied.length > 0 && (
                                <div className="space-y-1 rounded-ciel-xs border border-amber-200 bg-amber-50 px-3 py-2">
                                    {ai.gatesApplied.map((g, i) => (
                                        <p key={i} className="text-[10.5px] font-semibold text-amber-800">
                                            ⚠ {g}
                                        </p>
                                    ))}
                                </div>
                            )}
                            {ai.redFlags && ai.redFlags.length > 0 && (
                                <div className="space-y-1 rounded-ciel-xs border border-red-200 bg-red-50 px-3 py-2">
                                    <p className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wide text-red-700">
                                        <ShieldAlert className="h-3 w-3" /> Red flags — review before approving
                                    </p>
                                    {ai.redFlags.map((f, i) => (
                                        <p key={i} className="text-[10.5px] font-semibold text-red-700">
                                            • {f}
                                        </p>
                                    ))}
                                </div>
                            )}

                            {/* Section-by-section */}
                            <div className="space-y-2">
                                {FYP_SECTION_KEYS.map((key) => {
                                    const studentText = summaries[key];
                                    const aiText = sectionsByKey.get(key);
                                    if (!studentText && !aiText) return null;
                                    return (
                                        <div key={key} className="overflow-hidden rounded-ciel-xs border border-ciel-border bg-white">
                                            <div className="flex items-center justify-between bg-ciel-page/60 px-3 py-1.5">
                                                <span className="text-[10px] font-black uppercase tracking-wide text-ciel-text-mid">
                                                    {FYP_SECTION_LABELS[key].emoji} {FYP_SECTION_LABELS[key].label}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2 p-2.5 sm:grid-cols-2">
                                                <div className="rounded-ciel-xs border border-ciel-border bg-white p-2">
                                                    <p className="text-[8px] font-black uppercase tracking-wide text-ciel-text-soft">Student</p>
                                                    <p className="mt-1 text-[11px] leading-relaxed text-ciel-text">{studentText || "—"}</p>
                                                </div>
                                                <div className="rounded-ciel-xs border border-[#ded7ff] bg-[#fbfaff] p-2">
                                                    <p className="text-[8px] font-black uppercase tracking-wide text-[#674bd0]">✨ AI analysis</p>
                                                    <p className="mt-1 text-[11px] leading-relaxed text-ciel-text">{aiText || "—"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Rubric dimensions */}
                            <div className="overflow-hidden rounded-ciel-xs border border-ciel-border">
                                <table className="w-full border-collapse text-[10.5px]">
                                    <thead>
                                        <tr className="bg-ciel-page/60 text-left text-[8px] uppercase tracking-wide text-ciel-text-soft">
                                            <th className="px-2.5 py-1.5">Dimension</th>
                                            <th className="px-2.5 py-1.5">Score</th>
                                            <th className="px-2.5 py-1.5">Rationale</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ai.dimensions.map((d: FypAiDimensionResult) => (
                                            <tr key={d.key} className="border-t border-ciel-border align-top">
                                                <td className="px-2.5 py-1.5 font-bold text-ciel-text">{d.label}</td>
                                                <td className="px-2.5 py-1.5 whitespace-nowrap font-black text-[#5b43c7]">
                                                    {editMode ? (
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={d.max}
                                                            step={0.5}
                                                            value={editValues[d.key]?.score ?? d.score}
                                                            onChange={(e) =>
                                                                setEditValues((prev) => ({
                                                                    ...prev,
                                                                    [d.key]: { ...prev[d.key], score: e.target.value },
                                                                }))
                                                            }
                                                            className="w-16 rounded border border-ciel-border px-1.5 py-0.5 text-[10.5px]"
                                                        />
                                                    ) : (
                                                        `${d.score} / ${d.max}`
                                                    )}
                                                </td>
                                                <td className="px-2.5 py-1.5 text-ciel-text-mid">
                                                    {editMode ? (
                                                        <textarea
                                                            value={editValues[d.key]?.rationale ?? d.rationale ?? ""}
                                                            onChange={(e) =>
                                                                setEditValues((prev) => ({
                                                                    ...prev,
                                                                    [d.key]: { ...prev[d.key], rationale: e.target.value },
                                                                }))
                                                            }
                                                            rows={2}
                                                            className="w-full rounded border border-ciel-border px-1.5 py-1 text-[10.5px]"
                                                        />
                                                    ) : (
                                                        d.rationale || "—"
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {ai.why ? (
                                    <div className="rounded-ciel-xs border border-[#ded7ff] bg-[#fbfaff] p-2.5">
                                        <p className="text-[8px] font-black uppercase tracking-wide text-[#674bd0]">Why this score?</p>
                                        <p className="mt-1 text-[11px] leading-relaxed text-ciel-text">{ai.why}</p>
                                    </div>
                                ) : null}
                                {ai.whyNotHigher ? (
                                    <div className="rounded-ciel-xs border border-ciel-border bg-white p-2.5">
                                        <p className="text-[8px] font-black uppercase tracking-wide text-ciel-text-soft">Why not higher?</p>
                                        <p className="mt-1 text-[11px] leading-relaxed text-ciel-text">{ai.whyNotHigher}</p>
                                    </div>
                                ) : null}
                                {ai.sustainability ? (
                                    <div className="rounded-ciel-xs border border-ciel-border bg-white p-2.5">
                                        <p className="text-[8px] font-black uppercase tracking-wide text-ciel-text-soft">Sustainability · separate</p>
                                        <p className="mt-1 text-[11px] leading-relaxed text-ciel-text">{ai.sustainability}</p>
                                    </div>
                                ) : null}
                                {ai.opportunityPotential ? (
                                    <div className="rounded-ciel-xs border border-ciel-border bg-white p-2.5">
                                        <p className="text-[8px] font-black uppercase tracking-wide text-ciel-text-soft">Opportunity potential · separate</p>
                                        <p className="mt-1 text-[11px] leading-relaxed text-ciel-text">{ai.opportunityPotential}</p>
                                    </div>
                                ) : null}
                            </div>

                            {locked ? (
                                <div className="rounded-ciel-xs border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                                    <p className="text-xs font-bold text-emerald-800">
                                        ✓ Locked & approved · {ai.final}/100 — {ai.classification}
                                    </p>
                                    {lock?.facultyNote ? (
                                        <p className="mt-1 text-[10.5px] text-emerald-700">Note: “{lock.facultyNote}”</p>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="space-y-2 border-t border-[#ded7ff] pt-3">
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={handleAnalyse}
                                            disabled={busy !== null || editMode}
                                            className="ciel-transition rounded-ciel-xs border-2 border-ciel-border bg-white px-3 py-2 text-[11px] font-bold text-ciel-text-mid hover:border-[#6d4aff]/40 disabled:opacity-50"
                                        >
                                            {busy === "analyse" ? "Re-running…" : "🔁 Re-run analysis"}
                                        </button>
                                        {!editMode ? (
                                            <button
                                                type="button"
                                                onClick={startEdit}
                                                disabled={busy !== null}
                                                className="ciel-transition rounded-ciel-xs border-2 border-[#6d4aff] bg-white px-3 py-2 text-[11px] font-bold text-[#5b43c7] hover:bg-[#f7f5ff] disabled:opacity-50"
                                            >
                                                ✎ Edit / revise AI assessment
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={handleSaveEdits}
                                                    disabled={busy !== null}
                                                    className="ciel-transition rounded-ciel-xs border-2 border-[#6d4aff] bg-[#6d4aff] px-3 py-2 text-[11px] font-bold text-white hover:bg-[#5b3de0] disabled:opacity-50"
                                                >
                                                    {busy === "edit" ? "Saving…" : "Save faculty-reviewed assessment"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditMode(false)}
                                                    disabled={busy !== null}
                                                    className="ciel-transition rounded-ciel-xs border-2 border-ciel-border bg-white px-3 py-2 text-[11px] font-bold text-ciel-text-mid disabled:opacity-50"
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {!editMode && (
                                        <div className="space-y-1.5">
                                            <textarea
                                                value={approveNote}
                                                onChange={(e) => setApproveNote(e.target.value)}
                                                placeholder="Optional note recorded alongside your approval…"
                                                rows={2}
                                                className="w-full rounded-ciel-xs border border-ciel-border px-2.5 py-1.5 text-xs text-ciel-text placeholder:text-ciel-text-soft focus:border-[#6d4aff]/50 focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleApprove}
                                                disabled={busy !== null}
                                                className="ciel-transition rounded-ciel-xs border-2 border-emerald-600 bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                            >
                                                {busy === "approve" ? "Locking…" : "✓ Approve AI Assessment — lock & approve"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
