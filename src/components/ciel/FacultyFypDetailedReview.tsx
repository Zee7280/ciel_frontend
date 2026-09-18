"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { FypMeritEntry } from "@/components/ciel/FypMeritPanel";
import { displayFypId } from "@/components/ciel/FacultyFypFlashcard";
import { isPathEntryApproved, isPathEntryWaiting } from "@/utils/reviewQueue";
import { FYP_SECTION_KEYS, FYP_SECTION_LABELS, normalizeFypTeamMembers } from "@/utils/fypTypes";
import { editFypAiAnalysis } from "@/utils/fypAiAnalysis";

const BAND_MEANING: Record<string, string> = {
    exceptional: "Among the best work in your discipline at your level — the core of a publishable piece is already here.",
    advanced: "Clearly above what is expected at your level; a few specific gaps separate it from the best work.",
    excellent: "Clearly above what is expected at your level; a few specific gaps separate it from the best work.",
    strong: "Solid, complete work that meets expectations at your level with room to deepen rigor and evidence.",
    proficient: "The essentials are in place; strengthening method, evidence and reflection would lift it a full band.",
    competent: "The essentials are in place; strengthening method, evidence and reflection would lift it a full band.",
    developing: "The project shows promise but key components are thin — follow the actions listed to build it up.",
    foundational: "A starting point: the problem and aim are visible but most sections need substantial work.",
    early: "Most of what excellent work shows here is still missing — treat the actions below as the plan.",
    insufficient: "Most of what excellent work shows here is still missing — treat the actions below as the plan.",
};

function bandCopy(classification?: string) {
    const c = (classification || "").toLowerCase();
    const hit = Object.keys(BAND_MEANING).find((k) => c.includes(k));
    return hit ? BAND_MEANING[hit] : "Measured against excellent, complete work in the student's discipline at their level.";
}

function bullets(text?: string | null) {
    if (!text?.trim()) return [];
    return text
        .split(/(?<=[.?!])\s+|\n+|• /)
        .map((s) => s.replace(/^[-–•]\s*/, "").trim())
        .filter((s) => s.length > 8)
        .slice(0, 6);
}

export default function FacultyFypDetailedReview({
    entry,
    onClose,
    onUpdate,
    onSupervisorReview,
    reviewing,
    onOpenFlashcard,
}: {
    entry: FypMeritEntry;
    onClose: () => void;
    onUpdate: (id: string, patch: Partial<FypMeritEntry>) => void;
    onSupervisorReview?: (action: "approve" | "reject" | "revision", note?: string) => void;
    reviewing?: boolean;
    onOpenFlashcard?: () => void;
}) {
    const ai = entry.aiAnalysis;
    const canEdit = Boolean(onSupervisorReview) && isPathEntryWaiting(entry) && !entry.aiAnalysisLock?.locked;
    const released = isPathEntryApproved(entry);
    const title = entry.projectInfo?.title || entry.projectTitle || "Untitled Final Year Project";
    const student = entry.student?.name || entry.projectInfo?.studentName || "Student";
    const faculty = entry.projectInfo?.supervisorName || "supervisor";
    const uni = entry.projectInfo?.university || entry.student?.institution || "University";
    const prog = entry.projectInfo?.degree || entry.projectInfo?.officialProgram || "";
    const family = entry.projectInfo?.academicArea || entry.projectInfo?.discipline || entry.projectInfo?.school || "this discipline";
    const level = entry.projectInfo?.academicLevel || "Undergraduate";
    const team = normalizeFypTeamMembers(entry.projectInfo?.teamMembers).map((m) => m.name?.trim()).filter(Boolean);
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [scores, setScores] = useState<Record<string, string>>({});
    const [comments, setComments] = useState<Record<string, string>>({});

    useEffect(() => {
        const nextScores: Record<string, string> = {};
        const nextComments: Record<string, string> = {};
        for (const d of ai?.dimensions || []) {
            nextScores[d.key] = String(d.score);
            nextComments[d.key] = d.rationale || "";
        }
        setScores(nextScores);
        setComments(nextComments);
        setNote(entry.supervisorApprovalNote || "");
    }, [entry.id, ai?.computedAt, ai?.facultyEditedAt, entry.supervisorApprovalNote]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    const dims = ai?.dimensions || [];
    const ranked = useMemo(
        () => [...dims].sort((a, b) => b.score / Math.max(1, b.max) - a.score / Math.max(1, a.max)),
        [dims],
    );
    const good = ranked.filter((d) => d.score / Math.max(1, d.max) >= 0.7).slice(0, 4);
    const missing = [
        ...ranked.filter((d) => d.score / Math.max(1, d.max) <= 0.55).map((d, i) => {
            const idx = dims.findIndex((x) => x.key === d.key) + 1;
            return `S${idx} ${d.label}`;
        }),
        ...(ai?.redFlags || []),
        ...(ai?.gatesApplied || []),
        ...bullets(ai?.whyNotHigher),
    ].slice(0, 6);
    const better = bullets(ai?.studentFeedback).concat(bullets(ai?.whyNotHigher)).slice(0, 5);
    const sectionsByKey = new Map((ai?.sections || []).map((s) => [s.key, s.analysis]));
    const missingReturn = !note.trim();
    const generatedOn = ai?.computedAt
        ? new Date(ai.computedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : "on submission";
    const releasedOn = entry.supervisorApprovalAt
        ? new Date(entry.supervisorApprovalAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : "";

    const persistEdits = async () => {
        if (!entry.id || !canEdit || !dims.length) return;
        const dimensions = dims.map((d) => ({
            key: d.key,
            score: Number(scores[d.key] ?? d.score) || 0,
            rationale: (comments[d.key] ?? d.rationale ?? "").trim() || undefined,
        }));
        const result = await editFypAiAnalysis(entry.id, dimensions);
        onUpdate(entry.id, { aiAnalysis: result });
        return result;
    };

    const saveAmendments = async () => {
        if (!entry.id || !canEdit) return;
        setSaving(true);
        try {
            const result = await persistEdits();
            if (result) toast.success(`Saved amendment(s) — revised score ${result.final}/100. Approve to release it to the student.`);
            else toast.message("No changes to save.");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not save your edits.");
        } finally {
            setSaving(false);
        }
    };

    const downloadReview = () => {
        const lines = [
            `CIEL PK DETAILED REVIEW · ${displayFypId(entry)}`,
            title,
            `${student} · ${prog} · ${uni} · Supervisor ${faculty}`,
            `CIEL PK SCORE ${ai?.final ?? "—"} / 100 · ${ai?.classification || ""} · allotted by faculty`,
            "",
            `Overall review: ${ai?.why || ai?.studentFeedback || ""}`,
            entry.supervisorApprovalNote ? `Supervisor overall comment: ${entry.supervisorApprovalNote}` : "",
            "",
            "WHAT IS GOOD:",
            ...good.map((d) => `- ${d.label}`),
            "",
            "WHAT IS MISSING:",
            ...(missing.length ? missing.map((x) => `- ${x}`) : ["- nothing material"]),
            "",
            "HOW TO MAKE IT BETTER:",
            ...(better.length ? better.map((x) => `- ${x}`) : ["- keep doing what you did"]),
            "",
            "SECTION-BY-SECTION:",
            ...dims.map((d) => `${d.label}: ${d.score}/${d.max}${d.rationale ? ` — ${d.rationale}` : ""}`),
        ].filter((line) => line !== "");
        const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${displayFypId(entry)}-detailed-review.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const decide = async (action: "approve" | "reject" | "revision") => {
        if (!onSupervisorReview) return;
        if ((action === "revision" || action === "reject") && missingReturn) {
            toast.error("Please add a comment for the student before requesting revision or rejecting.");
            return;
        }
        if (canEdit && entry.id && dims.length) {
            setSaving(true);
            try {
                await persistEdits();
            } catch (e) {
                toast.error(e instanceof Error ? e.message : "Could not save your edits.");
                setSaving(false);
                return;
            }
            setSaving(false);
        }
        onSupervisorReview(action, note.trim() || undefined);
    };

    return (
        <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-auto bg-[rgba(7,28,35,.62)] p-[22px]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="my-auto w-full max-w-[940px] overflow-hidden rounded-[24px] bg-white font-[Inter,Segoe_UI,system-ui,sans-serif] text-[#1a1d2b] shadow-[0_30px_80px_rgba(0,0,0,.35)]">
                <div className="relative bg-[linear-gradient(120deg,#2b1d5c_0%,#4a2fa0_55%,#6d3df5_140%)] px-6 pb-4 pt-5 text-white">
                    <button type="button" onClick={onClose} className="absolute right-3.5 top-3.5 grid h-[34px] w-[34px] place-items-center rounded-full bg-white/15 text-[17px] font-black text-white" aria-label="Close">
                        ×
                    </button>
                    <span className="absolute right-[60px] top-4 rounded-full border border-white/20 bg-white/15 px-2.5 py-1.5 text-[8.5px] font-black uppercase tracking-[0.08em]">
                        {released ? "RELEASED" : canEdit ? "PRELIMINARY · AMENDABLE" : "PRELIMINARY"}
                    </span>
                    <div className="text-[8.5px] font-extrabold tracking-[0.2em] text-[#e8c76a]">CIEL PK DETAILED REVIEW · FINAL YEAR PROJECT · {displayFypId(entry)}</div>
                    <div className="mt-1.5 pr-24 text-[19px] font-extrabold leading-snug">📋 {title}</div>
                    <div className="mt-1 text-[11px] text-[#c8d5dd]">
                        {[
                            student,
                            team.length ? `+ ${team.filter((n) => n !== student).join(", ")}` : null,
                            prog,
                            uni,
                            `Supervisor ${faculty}`,
                            released ? `Released ${releasedOn}` : `Generated ${generatedOn}`,
                        ]
                            .filter(Boolean)
                            .join(" · ")}
                    </div>
                </div>

                <div className="max-h-[calc(100vh-300px)] overflow-auto">
                    {!ai ? (
                        <div className="m-[18px_22px] flex gap-3 rounded-[14px] border border-[#cbe0f5] bg-[#edf4fb] px-[15px] py-3 text-[11.5px] leading-relaxed text-[#376d9f]">
                            <span className="text-xl">⏳</span>
                            <div>
                                <b>The detailed review is generated when the record is submitted.</b>
                                <br />
                                <span className="text-[10.5px]">It is released, together with the CIEL PK score, the moment the supervisor approves the record.</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mx-[22px] mt-3.5 overflow-hidden rounded-2xl border-[1.5px] border-[#dccfff]">
                                <div className="flex flex-wrap items-center gap-3.5 bg-[#f7f3ff] px-4 py-3.5">
                                    <div>
                                        <div className="text-[34px] font-black leading-none text-[#6d3df5]">{ai.final}</div>
                                        <div className="text-[8.5px] font-black tracking-[0.1em] text-[#6d3df5]">
                                            {released ? "CIEL PK SCORE / 100 · ALLOTTED BY FACULTY" : "PRELIMINARY CIEL PK SCORE / 100"}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-[#14202b]">{ai.classification || "—"}</div>
                                        <div className="mt-0.5 max-w-[420px] text-[10.5px] leading-relaxed text-[#70808a]">
                                            {bandCopy(ai.classification)}
                                            {canEdit ? (
                                                <>
                                                    <br />
                                                    Evidence assurance <b>{ai.frameworkVersion || "EA"}</b>
                                                    {ai.facultyModified ? " · amended by supervisor" : ""}
                                                </>
                                            ) : null}
                                        </div>
                                    </div>
                                    <span className={`ml-auto rounded-full px-2.5 py-1.5 text-[9px] font-black tracking-[0.08em] ${released ? "bg-[#e5f8ef] text-[#087858]" : "bg-[#ffe8ea] text-[#b13e49]"}`}>
                                        {released
                                            ? `✅ CONFIRMED BY ${faculty.toUpperCase()}${releasedOn ? ` · ${releasedOn}` : ""} · SAME REPORT ON STUDENT, FACULTY, UNIVERSITY & CIEL PK WALLS`
                                            : canEdit
                                              ? `🧾 SYSTEM-GENERATED ${generatedOn} · AMEND ANY SCORE OR COMMENT · RELEASED TO THE STUDENT WHEN YOU APPROVE`
                                              : "🔒 WITH THE SUPERVISOR"}
                                    </span>
                                </div>
                                <div className="border-t border-[#ece4ff] px-4 py-3 text-[11.5px] leading-relaxed text-[#2a3350]">
                                    <b>Overall review:</b> {ai.why || ai.studentFeedback || "The analyser scored this record against excellent work in the student's discipline."}
                                    {released && entry.supervisorApprovalNote ? (
                                        <div className="mt-2 rounded-r-lg border-l-[3px] border-[#1d765d] bg-[#e8f5ef] px-2.5 py-2 text-[11px] font-semibold text-[#0f5f4b]">
                                            🧑‍🏫 SUPERVISOR&apos;S OVERALL COMMENT: {entry.supervisorApprovalNote}
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <div className="mx-[22px] mt-3 rounded-[14px] border-[1.5px] border-[#f1d68a] bg-[linear-gradient(120deg,#fffbef,#fff)] px-[15px] py-3">
                                <div className="text-[8.5px] font-black tracking-[0.14em] text-[#9b6700]">📚 LEVEL OF WORK · {family} · {level} expectations</div>
                                <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#5c4a12]">
                                    Measured against what excellent, complete work in {family} demonstrates — the same yardstick for every student in this discipline, with the bands set for {level.toLowerCase()} level.
                                </p>
                                <p className="mt-1.5 text-[11px] text-[#14202b]">
                                    <b>{ai.classification || "—"}</b> — {bandCopy(ai.classification)}
                                </p>
                                <div className="mt-2.5 grid grid-cols-1 gap-2 md:grid-cols-3">
                                    <div className="rounded-[10px] border border-[#bfe8cc] bg-[#e8f5ef] px-2.5 py-2 text-[10.5px] leading-relaxed text-[#0f5f4b]">
                                        <b className="mb-1 block text-[8.5px] tracking-[0.1em]">✅ WHAT IS GOOD</b>
                                        {good.length ? (
                                            <ul className="ml-4 list-disc">
                                                {good.map((d) => {
                                                    const idx = dims.findIndex((x) => x.key === d.key) + 1;
                                                    return <li key={d.key}>S{idx} {d.label}</li>;
                                                })}
                                            </ul>
                                        ) : (
                                            <i>—</i>
                                        )}
                                    </div>
                                    <div className="rounded-[10px] border border-[#f3c8c8] bg-[#fdeeee] px-2.5 py-2 text-[10.5px] leading-relaxed text-[#8f3b3b]">
                                        <b className="mb-1 block text-[8.5px] tracking-[0.1em]">❌ WHAT IS MISSING</b>
                                        {missing.length ? (
                                            <ul className="ml-4 list-disc">
                                                {missing.map((x) => (
                                                    <li key={x}>{x}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <i>nothing material</i>
                                        )}
                                    </div>
                                    <div className="rounded-[10px] border border-[#c9d6ff] bg-[#eef3ff] px-2.5 py-2 text-[10.5px] leading-relaxed text-[#2b3f8f]">
                                        <b className="mb-1 block text-[8.5px] tracking-[0.1em]">💡 HOW TO MAKE IT BETTER</b>
                                        {better.length ? (
                                            <ul className="ml-4 list-disc">
                                                {better.map((x) => (
                                                    <li key={x}>{x}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <i>keep doing what you did</i>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="px-[22px] pb-4 pt-2">
                                <div className="flex flex-wrap items-center gap-2 py-3 text-[9px] font-extrabold tracking-[0.12em] text-[#c98a04]">
                                    SECTION-BY-SECTION REVIEW — SCORE, STRENGTHS, LIMITATIONS, HOW TO IMPROVE
                                    {canEdit ? <span className="rounded-full bg-[#fff2dc] px-2 py-1 text-[9px] font-black tracking-normal text-[#9b6700]">AMENDABLE</span> : null}
                                </div>
                                {dims.map((d, i) => {
                                    const ratio = d.score / Math.max(1, d.max);
                                    const quoteKey = FYP_SECTION_KEYS[i];
                                    const quote = quoteKey ? entry.sectionSummaries?.[quoteKey] : "";
                                    const sectionNote = sectionsByKey.get(d.key) || sectionsByKey.get(quoteKey || "") || "";
                                    return (
                                        <div key={d.key} className="grid grid-cols-[36px_1fr] gap-[11px] border-b border-dashed border-[#eee3c8] py-3 last:border-b-0">
                                            <div className="flex h-9 w-9 flex-col items-center justify-center rounded-[10px] border border-[#eee3c8] bg-[#fffdf6] text-sm leading-none">
                                                {quoteKey ? FYP_SECTION_LABELS[quoteKey].emoji : "•"}
                                                <small className="mt-0.5 text-[7px] font-extrabold text-[#c98a04]">0{i + 1}</small>
                                            </div>
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2 text-[8.5px] font-extrabold uppercase tracking-[0.06em] text-[#7a8095]">
                                                    {d.label}
                                                    <span className="rounded-full bg-[#ede6ff] px-2 py-0.5 text-[9px] font-black text-[#6d3df5]">
                                                        {d.score} / {d.max}
                                                    </span>
                                                    {canEdit ? (
                                                        <label className="inline-flex items-center gap-1 rounded-full bg-[#fff2dc] px-2 py-0.5 text-[9.5px] font-black text-[#9b6700]">
                                                            ✏️ amend
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={d.max}
                                                                step={0.5}
                                                                value={scores[d.key] ?? String(d.score)}
                                                                onChange={(e) => setScores((prev) => ({ ...prev, [d.key]: e.target.value }))}
                                                                className="w-[52px] rounded border border-[#e9cf8f] px-1 py-0.5 text-[10.5px] font-black text-[#7a5a08]"
                                                            />
                                                            / {d.max}
                                                        </label>
                                                    ) : null}
                                                </div>
                                                {quote ? (
                                                    <p className="mt-1 text-[10.5px] leading-relaxed text-[#70808a]">
                                                        “{quote.length > 220 ? `${quote.slice(0, 220)}…` : quote}”
                                                    </p>
                                                ) : null}
                                                <div className="mt-2 rounded-r-[10px] border-l-[3px] border-[#c8b3ff] bg-[#faf8ff] px-2.5 py-2 text-[11px] leading-relaxed text-[#3b2f6b]">
                                                    <div className="mb-1 text-[8.5px] font-black tracking-[0.1em] text-[#6d3df5]">📝 REVIEW · {d.label.toUpperCase()}</div>
                                                    {comments[d.key] || d.rationale || sectionNote || "No comment yet."}
                                                    {ratio >= 0.7 ? <div className="mt-1.5 text-[8.5px] font-black tracking-[0.1em] text-[#087858]">✅ Strengths</div> : null}
                                                    {ratio <= 0.55 ? <div className="mt-1.5 text-[8.5px] font-black tracking-[0.1em] text-[#9b6700]">⚠️ Limitations</div> : null}
                                                    {canEdit ? (
                                                        <textarea
                                                            value={comments[d.key] ?? ""}
                                                            onChange={(e) => setComments((prev) => ({ ...prev, [d.key]: e.target.value }))}
                                                            placeholder="Your comment to the student for this section (released on approval)…"
                                                            className="mt-1.5 min-h-[38px] w-full rounded-lg border border-[#f1d68a] bg-[#fffdf6] px-2.5 py-1.5 text-[11px]"
                                                        />
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5 border-t border-[#dde5ea] bg-[#fafbfd] px-[22px] py-3 text-[10.5px] text-[#70808a]">
                                📚 Yardstick: excellent, complete work in {family} · {level} bands · 🧑‍🏫 Supervisor: <b className="text-[#14202b]">{faculty}</b>
                            </div>
                        </>
                    )}
                </div>

                {canEdit && onSupervisorReview ? (
                    <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-[#dde5ea] bg-white px-[22px] py-3">
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Overall comment to the student (required for revision / rejection; optional for approval)…"
                            className="min-h-[40px] min-w-[220px] flex-1 rounded-[10px] border border-[#dde5ea] px-3 py-2 text-[11.5px]"
                        />
                        <button type="button" onClick={() => void saveAmendments()} disabled={saving || reviewing} className="rounded-[9px] bg-[#eef2f3] px-3 py-2 text-[10px] font-black text-[#29454f] disabled:opacity-50">
                            💾 SAVE AMENDMENTS
                        </button>
                        <button type="button" onClick={() => void decide("approve")} disabled={saving || reviewing} className="rounded-[9px] bg-[#e5f8ef] px-3 py-2 text-[10px] font-black text-[#087858] disabled:opacity-50">
                            ✅ APPROVE — RELEASE SCORE & REVIEW
                        </button>
                        <button type="button" onClick={() => void decide("revision")} disabled={saving || reviewing || missingReturn} className="rounded-[9px] bg-[#fff2dc] px-3 py-2 text-[10px] font-black text-[#9b6700] disabled:opacity-50">
                            ✏️ REQUEST REVISION
                        </button>
                        <button type="button" onClick={() => void decide("reject")} disabled={saving || reviewing || missingReturn} className="rounded-[9px] bg-[#ffe8ea] px-3 py-2 text-[10px] font-black text-[#b13e49] disabled:opacity-50">
                            ⛔ REJECT
                        </button>
                    </div>
                ) : (
                    <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-[#dde5ea] bg-white px-[22px] py-3">
                        <span className="flex-1 text-[11px] text-[#70808a]">
                            {released
                                ? `Reviewed by CIEL PK · score and comments confirmed by ${faculty}${releasedOn ? ` on ${releasedOn}` : ""}. This report sits beside the flashcard on the Student, Faculty, University and CIEL PK impact walls.`
                                : "Preliminary — not yet released."}
                        </span>
                        {onOpenFlashcard ? (
                            <button type="button" onClick={onOpenFlashcard} className="rounded-[9px] bg-[#eef2f3] px-3 py-2 text-[10px] font-black text-[#29454f]">
                                🃏 OPEN FLASHCARD
                            </button>
                        ) : null}
                        {released ? (
                            <button type="button" onClick={downloadReview} className="rounded-[9px] bg-[#174b43] px-3 py-2 text-[10px] font-black text-white">
                                ⬇️ DOWNLOAD REVIEW
                            </button>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}
