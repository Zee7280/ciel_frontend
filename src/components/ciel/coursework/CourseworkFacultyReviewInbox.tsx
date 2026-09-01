"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import CourseworkCard from "@/components/ciel/CourseworkCard";
import { type MeritEntry } from "@/components/ciel/MeritModelPanel";
import { pendingFacultyReview, reviewCourseProjectSections } from "@/utils/courseworkSectionReview";
import { isReviewApprovedStatus } from "@/utils/reviewQueue";
import { computeMeritScorecard, rubricBand, RUBRIC_SCALE, type RubricBand } from "@/utils/courseworkMeritModel";

const BAND_FILL: Record<RubricBand, string> = { EXEMPLARY: "#0e7d74", SOLID: "#d97706", DEVELOPING: "#e11d48" };
const BAND_CHIP: Record<RubricBand, string> = {
    EXEMPLARY: "bg-[#e6f6f4] text-[#0e7d74]",
    SOLID: "bg-[#fbf0d7] text-[#b45309]",
    DEVELOPING: "bg-[#fdf1f4] text-[#e11d48]",
};

export default function CourseworkFacultyReviewInbox({
    entries,
    reviewingId,
    onReview,
}: {
    entries: MeritEntry[];
    reviewingId: string | null;
    onReview: (id: string, action: "approve" | "reject" | "revision", note?: string) => void;
}) {
    const queue = useMemo(() => entries.filter(pendingFacultyReview), [entries]);
    const [sel, setSel] = useState(0);
    const [note, setNote] = useState("");
    const current = queue[Math.min(sel, Math.max(queue.length - 1, 0))];

    if (queue.length === 0) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
                <p className="text-base font-bold text-slate-800">Inbox is clear</p>
                <p className="mt-1.5 text-sm text-slate-500">No submitted cards waiting for your approval.</p>
            </div>
        );
    }

    const checks = current ? reviewCourseProjectSections(current) : [];
    const issues = checks.filter((c) => !c.ok).length;
    const approval = current?.facultyApprovalStatus;
    const scorecard = current ? computeMeritScorecard(current) : null;

    return (
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[240px_1fr]">
            <div className="rounded-[18px] border border-[#dcebee] bg-white p-4">
                <p className="text-[8.5px] font-extrabold tracking-[0.14em] text-[#7a919a]">REVIEW INBOX</p>
                <div className="mt-2 space-y-2">
                    {queue.map((q, i) => {
                        const qIssues = reviewCourseProjectSections(q).filter((c) => !c.ok).length;
                        const rejected = q.facultyApprovalStatus === "rejected";
                        const revision = q.facultyApprovalStatus === "revision_requested";
                        return (
                            <button
                                key={q.id}
                                type="button"
                                onClick={() => {
                                    setSel(i);
                                    setNote("");
                                }}
                                className={`relative w-full rounded-[13px] border px-3 py-2.5 text-left transition ${
                                    i === sel ? "border-[#0e7d74] bg-[#e6f6f4]" : "border-[#dcebee] bg-white hover:border-[#0e7d74]"
                                }`}
                            >
                                <span
                                    className={`absolute right-2.5 top-2 rounded-full px-2 py-0.5 text-[7px] font-extrabold ${
                                        rejected
                                            ? "bg-[#fdf1f4] text-[#e11d48]"
                                            : revision
                                              ? "bg-[#fef3e2] text-[#b45309]"
                                              : qIssues
                                                ? "bg-[#fdf1f4] text-[#e11d48]"
                                                : "bg-[#e3f4fa] text-[#0891b2]"
                                    }`}
                                >
                                    {rejected ? "REJECTED" : revision ? "REVISION" : qIssues ? `⚠️ ${qIssues} ISSUES` : "ALL CLEAR"}
                                </span>
                                <b className="block pr-20 text-[11px] text-[#0d2b33]">{q.projectTitle || "Untitled"}</b>
                                <span className="mt-0.5 block text-[8.5px] text-[#7a919a]">
                                    {q.student?.name || q.studentInfo?.studentName || "Student"} · {q.evidenceUrls?.length || 0} files
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {current && (
                <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
                    <div className="rounded-[18px] border border-[#dcebee] bg-white p-4">
                        <p className="text-[8.5px] font-extrabold tracking-[0.14em] text-[#7a919a]">
                            FLASH CARD · {(current.projectTitle || "UNTITLED").toUpperCase()}
                        </p>

                        {scorecard && (
                            <div className="mt-2.5 rounded-[14px] border-2 border-[#e2d9f7] bg-[#faf8ff] px-3.5 py-3">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <div>
                                        <div className="text-[26px] font-extrabold leading-none text-[#6d28d9]">{scorecard.total}</div>
                                        <div className="text-[7.5px] font-extrabold tracking-[0.1em] text-[#6d28d9]">AI QUALITY SCORE / 100</div>
                                    </div>
                                    <span className="rounded-full px-2.5 py-1 text-[9px] font-extrabold" style={{ background: `${scorecard.gradeColor}1a`, color: scorecard.gradeColor }}>
                                        {scorecard.grade}
                                    </span>
                                    <span className="ml-auto rounded-full bg-[#ffe8ea] px-2.5 py-1 text-[8px] font-extrabold text-[#b13e49]">
                                        🔒 FACULTY-ONLY · NEVER SHOWN TO STUDENT
                                    </span>
                                </div>
                                <p className="mt-1.5 text-[9.5px] leading-relaxed text-[#4c3a78]">
                                    Assists your decision — the same standard rubric used by the AI Ranking studio, computed instantly
                                    from what the student declared. It never overrides your judgment.
                                </p>
                                <div className="mt-2.5 space-y-1">
                                    {scorecard.criteria.map((c) => {
                                        const band = rubricBand(c.points, c.max);
                                        return (
                                            <div key={c.key} className="flex items-center gap-2 border-b border-dashed border-[#e2d9f7] py-1 text-[9px] last:border-0">
                                                <span className="w-24 shrink-0 truncate font-extrabold text-[#4c3a78]">{RUBRIC_SCALE[c.key].title.split(" — ")[0].split(" &")[0]}</span>
                                                <span className="h-[6px] w-[70px] shrink-0 overflow-hidden rounded-full bg-[#eef4f6]">
                                                    <span className="block h-full rounded-full" style={{ width: `${Math.round((c.points / c.max) * 100)}%`, background: BAND_FILL[band] }} />
                                                </span>
                                                <span className="w-9 shrink-0 font-extrabold text-[#6d28d9]">{Math.round(c.points * 10) / 10}/{c.max}</span>
                                                <span className={clsx("shrink-0 rounded-full px-1.5 py-0.5 text-[6.5px] font-extrabold", BAND_CHIP[band])}>{band}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                {!scorecard.consistency.ok && (
                                    <p className="mt-2 rounded-[10px] bg-[#fdf1f4] px-2.5 py-1.5 text-[9px] font-bold text-[#9c1f3f]">⚠️ {scorecard.consistency.message}</p>
                                )}
                            </div>
                        )}

                        <div className="mt-2.5 flex gap-2 rounded-[11px] border border-[#e2d9f7] bg-[#f1ebfd] px-3 py-2.5 text-[10px] leading-relaxed text-[#4c3a78]">
                            <span>🧠</span>
                            <span>
                                <b>Section analysis — beside the score, never a replacement for it.</b> Checks come from the submitted
                                fields (same rule engine as the merit model). Judgment stays yours.
                            </span>
                        </div>
                        <div className="mt-2">
                            {checks.map((x) => (
                                <div
                                    key={x.label}
                                    className={`flex gap-2 border-b border-dashed border-[#dcebee] py-1.5 text-[10px] leading-relaxed last:border-0 ${
                                        x.ok ? "text-[#0f5e57]" : "text-[#9c1f3f]"
                                    }`}
                                >
                                    <span>{x.ok ? "✅" : "⚠️"}</span>
                                    <span>
                                        <b>{x.label}</b> — {x.note}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div
                            className={`mt-2 rounded-[10px] px-3 py-2 text-[10px] font-extrabold ${
                                issues ? "bg-[#fbf0d7] text-[#b45309]" : "bg-[#e6f6f4] text-[#0e7d74]"
                            }`}
                        >
                            {issues
                                ? `🧠 ${issues} issue${issues === 1 ? "" : "s"} to consider — approve anyway, or return with notes.`
                                : "🧠 All 8 sections check out. Ready for your approval."}
                        </div>
                        {isReviewApprovedStatus(approval) ? null : (
                            <>
                                <label className="mt-3 block text-[8px] font-extrabold tracking-[0.12em] text-[#7a919a]">
                                    NOTES FOR THE STUDENT (OPTIONAL)
                                </label>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    rows={2}
                                    placeholder="Returned with these notes — fix & resubmit, nothing penalised."
                                    className="mt-1 w-full rounded-[10px] border border-[#dcebee] px-3 py-2 text-[11px] outline-none focus:border-[#0e7d74]"
                                />
                                <div className="mt-2.5 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        disabled={reviewingId === current.id}
                                        onClick={() => current.id && onReview(current.id, "approve")}
                                        className="min-w-[140px] flex-1 rounded-[10px] border border-[#bfe6e2] bg-white px-3 py-2.5 text-[10px] font-extrabold text-[#0e7d74] disabled:opacity-50"
                                    >
                                        ✅ Approve
                                    </button>
                                    <button
                                        type="button"
                                        disabled={reviewingId === current.id}
                                        onClick={() => current.id && onReview(current.id, "revision", note.trim() || undefined)}
                                        className="min-w-[140px] flex-1 rounded-[10px] border border-[#f3d9a0] bg-white px-3 py-2.5 text-[10px] font-extrabold text-[#b45309] disabled:opacity-50"
                                    >
                                        🔁 Request revision
                                    </button>
                                    <button
                                        type="button"
                                        disabled={reviewingId === current.id}
                                        onClick={() => current.id && onReview(current.id, "reject", note.trim() || undefined)}
                                        className="min-w-[140px] flex-1 rounded-[10px] border border-[#f3c6d1] bg-white px-3 py-2.5 text-[10px] font-extrabold text-[#e11d48] disabled:opacity-50"
                                    >
                                        ❌ Reject
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                    <CourseworkCard entry={current} studentName={current.student?.name} defaultOpen />
                </div>
            )}
        </div>
    );
}
