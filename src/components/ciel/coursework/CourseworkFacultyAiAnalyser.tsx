"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import CourseworkCard from "@/components/ciel/CourseworkCard";
import type { MeritEntry } from "@/components/ciel/MeritModelPanel";
import {
    PERFORMANCE_ANCHORS,
    bandForScore,
    buildAnalyserModel,
    criterionExplain,
    scoreFromLevels,
    weightedPoints,
} from "@/utils/courseworkFacultyAnalyser";

async function sha256Hex(payload: unknown): Promise<string> {
    const data = new TextEncoder().encode(JSON.stringify(payload));
    const hash = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Compact inline review workspace — mirrors the mockup's `aiBlock` + decision box: AI proposal up
 * top, one editable 0–5 level per criterion with a bar, a single note field, then Approve / Request
 * revision / Reject. The heavier QAA/AAC&U/UNESCO citation panels and the fake "run analysis"
 * scan (the AI score is already computed the moment the record is submitted) were trimmed — the
 * scoring math (`computeMeritScorecard`) and the network calls are untouched.
 */
export default function CourseworkFacultyAiAnalyser({
    entry,
    reviewingId,
    onReview,
}: {
    entry: MeritEntry;
    reviewingId: string | null;
    onReview: (
        id: string,
        action: "approve" | "reject" | "revision",
        note?: string,
        moderation?: { levels: Record<string, number>; notes?: Record<string, string>; facultyScore: number; band?: string; lockHash?: string },
    ) => void;
}) {
    const model = useMemo(() => buildAnalyserModel(entry), [entry]);
    const alreadyApproved = entry.facultyApprovalStatus === "approved";
    const savedModeration = entry.facultyModeration;
    const locked = alreadyApproved;
    const lockHash = savedModeration?.lockHash || "";
    const lockedAt = entry.facultyApprovalAt || "";

    const [facultyLevels, setFacultyLevels] = useState<Record<string, number>>(savedModeration?.levels || model.aiLevels);
    const [note, setNote] = useState(entry.facultyApprovalNote || "");
    const [openCriterion, setOpenCriterion] = useState<string | null>(null);
    const [showSubmission, setShowSubmission] = useState(false);

    useEffect(() => {
        setFacultyLevels(entry.facultyModeration?.levels || model.aiLevels);
        setNote(entry.facultyApprovalNote || "");
        setOpenCriterion(null);
        setShowSubmission(false);
    }, [entry.id, entry.facultyApprovalAt, entry.facultyApprovalNote, entry.facultyModeration, model.aiLevels]);

    const facultyScore = scoreFromLevels(model.scorecard, facultyLevels);
    const facultyBand = bandForScore(facultyScore);
    const delta = facultyScore - model.aiScore;
    const changedCount = model.scorecard.criteria.filter((c) => (facultyLevels[c.key] ?? 0) !== model.aiLevels[c.key]).length;
    const missingNote = !note.trim();
    const busy = reviewingId === entry.id;
    const fileCount = (model.primaryFile ? 1 : 0) + model.evidenceCount;

    const approve = async () => {
        if (!entry.id || locked || busy) return;
        const record = {
            id: entry.id,
            title: model.title,
            aiScore: model.aiScore,
            facultyScore,
            band: facultyBand.name,
            evidenceAverage: model.evidenceAvg,
            levels: facultyLevels,
            overallNote: note,
            at: new Date().toISOString(),
        };
        const hash = await sha256Hex(record);
        onReview(entry.id, "approve", note.trim() || undefined, {
            levels: facultyLevels,
            facultyScore,
            band: facultyBand.name,
            lockHash: hash,
        });
    };
    const requestRevision = () => {
        if (!entry.id || locked || busy || missingNote) return;
        onReview(entry.id, "revision", note.trim());
    };
    const reject = () => {
        if (!entry.id || locked || busy || missingNote) return;
        onReview(entry.id, "reject", note.trim());
    };
    const resetToAi = () => {
        if (locked) return;
        setFacultyLevels(model.aiLevels);
    };

    return (
        <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[#e4e9ef] bg-white px-4 py-3">
                <div className="min-w-0">
                    <p className="truncate text-[13px] font-black text-[#10212c]">{model.title}</p>
                    <p className="mt-0.5 truncate text-[10.5px] text-[#6d7987]">
                        {model.name} · {model.course} · {model.programme} · {model.stage.label}
                    </p>
                </div>
                <span
                    className={clsx(
                        "shrink-0 rounded-full px-2.5 py-1.5 text-[8.5px] font-black",
                        locked ? "bg-[#eeeafd] text-[#5943b2]" : "bg-[#e9f8f0] text-[#16865a]",
                    )}
                >
                    {locked ? "🔒 COURSEWORK SCORE LOCKED" : "🔓 FACULTY REVIEW OPEN"}
                </span>
            </div>

            <article className="rounded-[18px] border border-[#e4e9ef] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <b className="text-[13px] text-[#10212c]">🧪 AI Analyzer · proposed score</b>
                        <p className="mt-0.5 text-[10.5px] text-[#6d7987]">
                            7-criterion universal rubric · evidence-checked · calibrated to {model.stage.label}
                        </p>
                    </div>
                    <div className="text-right">
                        <b className="text-[24px] leading-none text-[#10212c]">{model.aiScore}</b>
                        <span className="ml-1 text-[10px] font-black text-[#768390]">/100 · {model.band.short}</span>
                    </div>
                </div>

                <div className="mt-3 space-y-1.5">
                    {model.scorecard.criteria.map((c) => {
                        const ai = model.aiLevels[c.key];
                        const fl = facultyLevels[c.key] ?? ai;
                        const changed = fl !== ai;
                        const open = openCriterion === c.key;
                        const explain = criterionExplain(c);
                        return (
                            <div key={c.key} className={clsx("rounded-[12px] border px-2.5 py-2", changed ? "border-[#f0d9a8] bg-[#fffaf0]" : "border-[#e0e6ec] bg-white")}>
                                <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_130px_150px]">
                                    <button type="button" onClick={() => setOpenCriterion(open ? null : c.key)} className="min-w-0 text-left">
                                        <span className="block truncate text-[11.5px] font-bold text-[#10212c]">{c.label}</span>
                                        <span className="text-[9.5px] text-[#8a95a0]">{c.max} pts max{changed ? ` · was ${ai}/5` : ""}</span>
                                    </button>
                                    <span className="h-[7px] overflow-hidden rounded-full bg-[#e7ebf0]">
                                        <i className="block h-full bg-[linear-gradient(90deg,#2866d5,#6c4ce3)]" style={{ width: `${(fl / 5) * 100}%` }} />
                                    </span>
                                    <div className="flex items-center justify-end gap-1.5">
                                        <select
                                            value={fl}
                                            disabled={locked}
                                            onChange={(e) => setFacultyLevels((prev) => ({ ...prev, [c.key]: Number(e.target.value) }))}
                                            className="rounded-lg border border-[#dce3ea] bg-white px-1.5 py-1 text-[10.5px] font-bold disabled:opacity-60"
                                        >
                                            {[0, 1, 2, 3, 4, 5].map((n) => (
                                                <option key={n} value={n}>
                                                    {n}/5
                                                </option>
                                            ))}
                                        </select>
                                        <b className="w-14 shrink-0 text-right text-[11px] text-[#10212c]">
                                            {weightedPoints(c, fl).toFixed(1)}/{c.max}
                                        </b>
                                    </div>
                                </div>
                                {open ? (
                                    <div className="mt-2 grid gap-1.5 border-t border-dashed border-[#e6ebee] pt-2 text-[10.5px] leading-relaxed sm:grid-cols-2">
                                        <p className="rounded-[9px] bg-[#e9f8f0] px-2 py-1.5 text-[#2d6654]">
                                            <b>Why:</b> {explain.good}
                                        </p>
                                        <p className="rounded-[9px] bg-[#fff7e9] px-2 py-1.5 text-[#765e32]">
                                            <b>Anchor:</b> {PERFORMANCE_ANCHORS[fl]?.title} — {PERFORMANCE_ANCHORS[fl]?.text}
                                        </p>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-[#f6fafb] px-3 py-2.5">
                    <p className="text-[11px] text-[#5d6d79]">
                        Faculty-moderated score <b className="text-[#10212c]">{facultyScore.toFixed(1)}/100 · {facultyBand.name}</b>
                        {changedCount ? (
                            <>
                                {" · "}
                                {changedCount} criteri{changedCount === 1 ? "on" : "a"} changed ·{" "}
                                <span className={delta > 0 ? "text-[#16865a]" : delta < 0 ? "text-[#c33e51]" : ""}>
                                    {delta > 0 ? "+" : ""}
                                    {delta.toFixed(1)} vs AI
                                </span>
                            </>
                        ) : (
                            " · unchanged from the AI proposal"
                        )}
                    </p>
                    {!locked && changedCount > 0 ? (
                        <button type="button" onClick={resetToAi} className="rounded-[9px] border border-[#e4e9ef] bg-white px-2.5 py-1.5 text-[10px] font-black text-[#405461]">
                            ↺ Reset to AI proposal
                        </button>
                    ) : null}
                </div>
            </article>

            <article className="rounded-[18px] border border-[#e4e9ef] bg-white p-4">
                <button type="button" onClick={() => setShowSubmission((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
                    <span className="text-[11.5px] font-black text-[#10212c]">
                        📎 Submission package & evidence · {fileCount} file{fileCount === 1 ? "" : "s"}
                    </span>
                    <span className="text-[10px] font-black text-[#6c4ce3]">{showSubmission ? "Hide ▲" : "Read submission ▼"}</span>
                </button>
                {showSubmission ? (
                    <div className="mt-3">
                        <CourseworkCard entry={entry} studentName={model.name} defaultOpen={false} hideScore={false} />
                    </div>
                ) : null}
            </article>

            <article className="rounded-[18px] border border-[#e4e9ef] bg-white p-4">
                <b className="text-[13px] text-[#10212c]">Your decision</b>
                <p className="mt-1 text-[11px] leading-relaxed text-[#6d7987]">
                    Edit any criterion above if you disagree with the AI — the change and reason are recorded. Approving seals the score shown above. Revision and reject need a note the student will see.
                </p>
                <textarea
                    disabled={locked}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Note to the student (required for revision / reject, optional for approval)…"
                    className="mt-2 min-h-[76px] w-full rounded-[10px] border border-[#dce3ea] p-2 text-[12px] disabled:opacity-60"
                />
                {missingNote ? (
                    <p className="mt-1 text-[10px] font-extrabold text-[#c33e51]">A note is required before returning or rejecting a submission.</p>
                ) : null}
                <div className="mt-2.5 flex flex-wrap gap-2">
                    <button
                        type="button"
                        disabled={locked || busy}
                        onClick={approve}
                        className="rounded-[11px] bg-[linear-gradient(90deg,#173b54,#6b4cd7)] px-3.5 py-2.5 text-[11px] font-black text-white disabled:opacity-45"
                    >
                        ✓ Approve & seal score
                    </button>
                    <button
                        type="button"
                        disabled={locked || busy || missingNote}
                        onClick={requestRevision}
                        className="rounded-[11px] border border-[#eedcae] bg-[#fff8ec] px-3 py-2.5 text-[11px] font-black text-[#8b600a] disabled:opacity-45"
                    >
                        ↩ Request revision
                    </button>
                    <button
                        type="button"
                        disabled={locked || busy || missingNote}
                        onClick={reject}
                        className="rounded-[11px] border border-[#efcbd1] bg-[#fff7f8] px-3 py-2.5 text-[11px] font-black text-[#a34254] disabled:opacity-45"
                    >
                        ✕ Reject
                    </button>
                </div>
                {locked ? (
                    <div className="mt-3 rounded-[12px] border border-[#ddd7f0] bg-[linear-gradient(135deg,#faf9ff,#fff)] p-3 text-[11px] leading-relaxed text-[#605975]">
                        🔒 <b>Moderated coursework record locked</b>
                        {lockedAt ? ` · ${lockedAt}` : ""}. AI proposal, faculty overrides and the final score are frozen — published to the student, this faculty wall, the university and CIEL PK.
                        {lockHash ? <span className="mt-1.5 block break-all font-mono text-[9.5px] text-[#605975]/80">{lockHash}</span> : null}
                    </div>
                ) : null}
            </article>
        </div>
    );
}
