"use client";

import { useMemo, useState } from "react";
import CourseworkFacultyAiAnalyser from "@/components/ciel/coursework/CourseworkFacultyAiAnalyser";
import { type MeritEntry } from "@/components/ciel/MeritModelPanel";
import { courseworkStatusLabel, pendingFacultyReview, reviewCourseProjectSections } from "@/utils/courseworkSectionReview";
import { normalizeUrlList } from "@/utils/courseProjectTypes";

const INBOX_CHIP: Record<ReturnType<typeof courseworkStatusLabel>["tone"], string> = {
    draft: "DRAFT",
    under_review: "REVIEW",
    revision_requested: "REVISION",
    rejected: "REJECTED",
    approved: "APPROVED",
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
    const current = queue[Math.min(sel, Math.max(queue.length - 1, 0))];

    if (queue.length === 0) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
                <p className="text-base font-bold text-slate-800">Inbox is clear</p>
                <p className="mt-1.5 text-sm text-slate-500">No submitted cards waiting for your approval.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="rounded-[18px] border border-[#dcebee] bg-white p-4">
                <p className="text-[8.5px] font-extrabold tracking-[0.14em] text-[#7a919a]">REVIEW INBOX</p>
                <div className="mt-2 space-y-2">
                    {queue.map((q, i) => {
                        const qIssues = reviewCourseProjectSections(q).filter((c) => !c.ok).length;
                        const st = courseworkStatusLabel(q);
                        const fileCount = (q.assignmentFileUrl ? 1 : 0) + normalizeUrlList(q.evidenceUrls).length;
                        return (
                            <button
                                key={q.id}
                                type="button"
                                onClick={() => setSel(i)}
                                className={`w-full rounded-[13px] border px-3 py-2.5 text-left transition ${
                                    i === sel ? "border-[#0e7d74] bg-[#e6f6f4]" : "border-[#dcebee] bg-white hover:border-[#0e7d74]"
                                }`}
                            >
                                <span className="flex items-start justify-between gap-2">
                                    <b className="min-w-0 truncate text-[11px] text-[#0d2b33]">{q.projectTitle || "Untitled"}</b>
                                    <span
                                        className={`shrink-0 rounded-full px-2 py-0.5 text-[7px] font-extrabold ${
                                            st.tone === "rejected"
                                                ? "bg-[#fdf1f4] text-[#e11d48]"
                                                : st.tone === "revision_requested"
                                                  ? "bg-[#fef3e2] text-[#b45309]"
                                                  : st.tone === "approved"
                                                    ? "bg-[#e6f6f4] text-[#0e7d74]"
                                                    : "bg-[#e3f4fa] text-[#0891b2]"
                                        }`}
                                    >
                                        {INBOX_CHIP[st.tone]}
                                    </span>
                                </span>
                                <span className="mt-0.5 block text-[8.5px] text-[#7a919a]">
                                    {q.student?.name || q.studentInfo?.studentName || "Student"} · {fileCount} file{fileCount === 1 ? "" : "s"}
                                    {qIssues ? ` · ${qIssues} AI flag${qIssues === 1 ? "" : "s"}` : ""}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {current ? <CourseworkFacultyAiAnalyser entry={current} reviewingId={reviewingId} onReview={onReview} /> : null}
        </div>
    );
}
