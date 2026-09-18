"use client";

import { useEffect, useMemo, useState } from "react";
import ThesisCard from "@/components/ciel/ThesisCard";
import FypAiAnalysisPanel from "@/components/ciel/FypAiAnalysisPanel";
import type { FypMeritEntry } from "@/components/ciel/FypMeritPanel";
import { isPathEntryApproved, isPathEntryWaiting, normalizeReviewStatus } from "@/utils/reviewQueue";
import { sdgData } from "@/utils/sdgData";
import { SDG_COLORS } from "@/utils/ventureStudioV11";
import { fypStatusLabel, reviewStatusLabel } from "@/utils/pathReviewStatus";
import { mailtoHref, whatsappShareHref } from "@/utils/reminderLinks";
import { fypRankRibbons, normalizeFypTeamMembers } from "@/utils/fypTypes";
import { computeFypMeritScorecard } from "@/utils/fypMeritModel";
import { FYP_V9_STEP_NAMES } from "@/utils/fypV9Catalog";
import { toast } from "sonner";

export function displayFypId(entry: FypMeritEntry) {
    const year = entry.createdAt ? new Date(entry.createdAt).getFullYear() : new Date().getFullYear();
    const tail = (entry.id || "").replace(/-/g, "").slice(-5).toUpperCase() || "00000";
    return `FYP-${year}-${tail}`;
}

export function fypHeadline(entry: FypMeritEntry) {
    return (
        entry.sectionSummaries?.project?.trim() ||
        entry.sectionSummaries?.findings?.trim() ||
        entry.findings?.findings?.filter(Boolean)[0] ||
        entry.background?.problem?.trim() ||
        "Submitted FYP flashcard."
    );
}

export function fypAiFlagCount(entry: FypMeritEntry) {
    const ai = entry.aiAnalysis;
    if (!ai) return 0;
    return (ai.redFlags?.length ?? 0) + (ai.gatesApplied?.length ?? 0) + (ai.needsAdminReview ? 1 : 0);
}

function sdgNums(entry: FypMeritEntry) {
    return (entry.sdgMapping?.entries || []).map((e) => e.goalNumber).filter((n) => n >= 1 && n <= 17);
}

function formatDay(value?: string | null) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function SdgTiles({ entry, compact }: { entry: FypMeritEntry; compact?: boolean }) {
    const nums = sdgNums(entry);
    if (!nums.length) return null;
    return (
        <span className={compact ? "ml-1.5 inline-flex align-middle gap-1" : "inline-flex flex-wrap items-center gap-1.5"}>
            {nums.map((n, i) => {
                const title = sdgData.find((s) => s.number === n)?.title || `SDG ${n}`;
                if (compact) {
                    return (
                        <span
                            key={n}
                            title={`SDG ${n} ${title}`}
                            className="inline-grid h-[22px] w-[22px] place-items-center rounded-[6px] text-[9px] font-black text-white"
                            style={{ background: SDG_COLORS[n] || "#70808a" }}
                        >
                            {n}
                        </span>
                    );
                }
                return (
                    <span
                        key={n}
                        title={`SDG ${n} ${title}`}
                        className={`relative flex h-10 w-10 flex-col items-center justify-center rounded-[10px] text-white shadow-[0_4px_10px_rgba(0,0,0,.28)] ${i === 0 ? "after:absolute after:-right-1.5 after:-top-1.5 after:grid after:h-4 after:w-4 after:place-items-center after:rounded-full after:bg-[#14202b] after:text-[9px] after:content-['★'] after:text-[#ffd76a]" : ""}`}
                        style={{ background: SDG_COLORS[n] || "#70808a" }}
                    >
                        <span className="text-[13px] font-extrabold leading-none">{n}</span>
                        <span className="mt-0.5 px-0.5 text-center text-[5.5px] font-extrabold uppercase leading-tight">{title}</span>
                    </span>
                );
            })}
        </span>
    );
}

export function FacultyFypReviewCard({
    entry,
    onOpenFlashcard,
    onOpenReview,
}: {
    entry: FypMeritEntry;
    onOpenFlashcard: () => void;
    onOpenReview: () => void;
}) {
    const ai = entry.aiAnalysis;
    const flags = fypAiFlagCount(entry);
    const st = fypStatusLabel(entry);
    const waiting = isPathEntryWaiting(entry);
    const title = entry.projectInfo?.title || entry.projectTitle || "Untitled Final Year Project";
    const student = entry.student?.name || entry.projectInfo?.studentName || "Student";
    const team = normalizeFypTeamMembers(entry.projectInfo?.teamMembers).map((m) => m.name?.trim()).filter(Boolean);
    const files = entry.deliverables?.length ?? 0;
    const submittedOn = formatDay(entry.updatedAt);
    const pill =
        st.tone === "approved"
            ? "bg-[#e8f5ef] text-[#1d765d]"
            : st.tone === "rejected" || st.tone === "revision_requested"
              ? "bg-[#fdeeee] text-[#b34c4c]"
              : st.tone === "under_review"
                ? "bg-[#fff3dc] text-[#a66d11]"
                : "bg-[#edf4fb] text-[#376d9f]";
    const studentEmail = entry.student?.email || entry.projectInfo?.studentEmail;
    const remindSubject = `CIEL PK reminder — revision needed on ${title}`;
    const remindBody = `Hi ${student.split(" ")[0]},\n\nPlease revise your Final Year Project "${title}" (${displayFypId(entry)}) on CIEL PK and resubmit.\n\nThank you.`;

    return (
        <div className="grid grid-cols-1 items-start gap-4 rounded-2xl border border-[#dde5ea] bg-white p-[15px] md:grid-cols-[minmax(0,1fr)_290px]">
            <div>
                <h4 className="m-0 mb-1 text-[15px] font-semibold text-[#14202b]">
                    {title} <SdgTiles entry={entry} compact />
                </h4>
                <p className="text-[10.5px] text-[#70808a]">
                    {displayFypId(entry)}
                    {entry.projectInfo?.academicLevel ? ` · ${entry.projectInfo.academicLevel}` : ""}
                    {entry.projectInfo?.degree || entry.projectInfo?.officialProgram ? ` · ${entry.projectInfo.degree || entry.projectInfo.officialProgram}` : ""}
                    {entry.projectInfo?.span ? ` · ${entry.projectInfo.span}` : ""}
                    {` · ${team.length ? `Group — ${team.join(", ")}` : `${student} · Individual`}`}
                    {submittedOn ? ` · Submitted ${submittedOn}` : ""}
                    {files ? ` · 📎 ${files} file${files === 1 ? "" : "s"}` : ""}
                </p>
                <div className="mt-[11px] rounded-xl border border-[#e8edef] bg-[#fafbfb] px-3 py-[11px]">
                    <span className={`inline-block whitespace-nowrap rounded-[18px] px-2 py-[5px] text-[9.5px] font-black uppercase ${pill}`}>{st.label}</span>
                    {ai && typeof ai.final === "number" ? (
                        <>
                            <span className="ml-1.5 inline-block whitespace-nowrap rounded-[18px] bg-[#ede6ff] px-2 py-[5px] text-[9.5px] font-black text-[#6d3df5]">
                                AI {ai.final} · {ai.classification}
                            </span>
                            {ai.frameworkVersion ? (
                                <span className="ml-1.5 inline-block whitespace-nowrap rounded-[18px] bg-[#edf4fb] px-2 py-[5px] text-[9.5px] font-black text-[#376d9f]">
                                    Evidence {ai.frameworkVersion}
                                </span>
                            ) : null}
                            {flags ? (
                                <span className="ml-1.5 inline-block whitespace-nowrap rounded-[18px] bg-[#fff2dc] px-2 py-[5px] text-[9.5px] font-black text-[#9b6700]">
                                    🚩 {flags} flag{flags === 1 ? "" : "s"} to check
                                </span>
                            ) : null}
                        </>
                    ) : null}
                    <p className="mt-2 text-[11px] leading-relaxed text-[#31405a]">
                        <b>AI headline:</b> {fypHeadline(entry)}
                    </p>
                    {ai?.why ? (
                        <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#5f707b]">
                            <b>AI rationale:</b> {ai.why}
                        </p>
                    ) : null}
                    {entry.supervisorApprovalNote ? (
                        <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#5f707b]">
                            <b>Your decision{entry.supervisorApprovalAt ? ` (${formatDay(entry.supervisorApprovalAt)})` : ""}:</b> “{entry.supervisorApprovalNote}”
                        </p>
                    ) : null}
                </div>
                {normalizeReviewStatus(entry.supervisorApprovalStatus) === "revision_requested" && studentEmail ? (
                    <div className="mt-[11px] rounded-xl border border-[#e8edef] bg-[#fafbfb] px-3 py-[11px]">
                        <b className="mb-1 block text-[10px] font-black uppercase tracking-[0.05em] text-[#71828e]">Reminder to student (revision pending)</b>
                        <div className="flex flex-wrap gap-1.5">
                            <a href={mailtoHref(studentEmail, remindSubject, remindBody)} className="inline-flex items-center rounded-[9px] bg-[#edf4fb] px-2.5 py-1.5 text-[10px] font-black text-[#376d9f]">
                                ✉️ Email {student.split(" ")[0]}
                            </a>
                            <a href={whatsappShareHref(`${remindSubject}\n\n${remindBody}`)} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-[9px] bg-[#e6f7ee] px-2.5 py-1.5 text-[10px] font-black text-[#137a4b]">
                                💬 WhatsApp {student.split(" ")[0]}
                            </a>
                        </div>
                    </div>
                ) : null}
            </div>
            <div className="border-[#dde5ea] max-md:border-t max-md:pt-3 md:border-l md:pl-3.5">
                <div className="rounded-[14px] border border-[#dccfff] bg-[#f3edff] px-3 py-2.5 text-center">
                    <span className="block text-[8.5px] font-black uppercase tracking-[0.05em] text-[#6d3df5]">
                        {ai?.facultyModified ? "YOUR AMENDED SCORE" : "PRELIMINARY CIEL PK SCORE"}
                    </span>
                    <strong className="block text-[22px] font-black text-[#6d3df5]">{ai && typeof ai.final === "number" ? ai.final : "—"}</strong>
                    <small className="mt-0.5 block text-[9px] text-[#70808a]">
                        {ai
                            ? `system-generated · amend in the Detailed Review · released on approval`
                            : "generated on submission"}
                    </small>
                </div>
                <button type="button" onClick={onOpenReview} className="mt-2.5 inline-flex w-full items-center justify-center gap-1 rounded-[9px] bg-[#6d3df5] px-3.5 py-[11px] text-[11px] font-black text-white">
                    📋 DETAILED REVIEW · AMEND & DECIDE
                </button>
                <button type="button" onClick={onOpenFlashcard} className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded-[9px] bg-[#eef2f3] px-3.5 py-2 text-[10px] font-black text-[#29454f]">
                    🃏 FLASHCARD
                </button>
                {waiting ? (
                    <>
                        <div className="mt-1 flex flex-wrap gap-1">
                            <button type="button" onClick={onOpenReview} className="rounded-[9px] bg-[#e5f8ef] px-2.5 py-1.5 text-[10px] font-black text-[#087858]">
                                APPROVE
                            </button>
                            <button type="button" onClick={onOpenReview} className="rounded-[9px] bg-[#fff2dc] px-2.5 py-1.5 text-[10px] font-black text-[#9b6700]">
                                REVISE
                            </button>
                            <button type="button" onClick={onOpenReview} className="rounded-[9px] bg-[#ffe8ea] px-2.5 py-1.5 text-[10px] font-black text-[#b13e49]">
                                REJECT
                            </button>
                        </div>
                        <p className="mt-1 text-[9.5px] text-[#70808a]">Decisions are made inside the Detailed Review so the comment travels with it.</p>
                    </>
                ) : null}
            </div>
        </div>
    );
}

export default function FacultyFypFlashcardModal({
    entry,
    onClose,
    onUpdate,
    onSupervisorReview,
    reviewing,
    onOpenReview,
}: {
    entry: FypMeritEntry;
    onClose: () => void;
    onUpdate: (id: string, patch: Partial<FypMeritEntry>) => void;
    onSupervisorReview?: (action: "approve" | "reject" | "revision", note?: string) => void;
    reviewing?: boolean;
    onOpenReview?: () => void;
}) {
    const [note, setNote] = useState("");
    const canDecide = Boolean(onSupervisorReview) && isPathEntryWaiting(entry);
    const title = entry.projectInfo?.title || entry.projectTitle || "Untitled Final Year Project";
    const student = entry.student?.name || entry.projectInfo?.studentName || "Student";
    const faculty = entry.projectInfo?.supervisorName || "supervisor";
    const uni = entry.projectInfo?.university || entry.student?.institution || "University";
    const team = normalizeFypTeamMembers(entry.projectInfo?.teamMembers).filter((m) => m.name?.trim());
    const names = team.length ? team.map((m) => m.name) : [student];
    const ai = entry.aiAnalysis;
    const st = fypStatusLabel(entry);
    const isDraft = entry.status === "draft";
    const submittedOn = formatDay(entry.updatedAt);
    const missingReturn = !note.trim();
    const latestFile = entry.deliverables?.[entry.deliverables.length - 1];

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

    const trackers: { label: string; state: "done" | "act" | "next" | "bad" }[] = isDraft
        ? [
            { label: "📝 Record created", state: "done" },
            { label: "🔧 In progress", state: "act" },
            { label: "📤 Submitted", state: "next" },
            { label: "🔍 Under review", state: "next" },
            { label: "🏅 Approved & published", state: "next" },
        ]
        : [
            { label: "📝 Record created", state: "done" },
            { label: "🔧 In progress", state: "done" },
            { label: "📤 Submitted", state: "done" },
            { label: "🔍 Under review", state: canDecide || st.tone === "under_review" ? "act" : st.tone === "revision_requested" || st.tone === "rejected" || st.tone === "approved" ? "done" : "act" },
            st.tone === "rejected"
                ? { label: "⛔ Rejected", state: "bad" as const }
                : st.tone === "revision_requested"
                  ? { label: "✏️ Revision loop", state: "act" as const }
                  : { label: "🏅 Approved & published", state: st.tone === "approved" ? ("done" as const) : ("next" as const) },
        ];

    return (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-auto bg-[rgba(7,28,35,.62)] p-[22px]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="my-auto w-full max-w-[940px] overflow-hidden rounded-[24px] bg-white font-[Inter,Segoe_UI,system-ui,sans-serif] text-[#1a1d2b] shadow-[0_30px_80px_rgba(0,0,0,.35)]">
                <div className="relative bg-[linear-gradient(120deg,#14202b_0%,#243b4d_55%,#6b4a0a_140%)] px-6 pb-4 pt-5 text-white after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-[linear-gradient(90deg,#e8b64a,#c98a04,#3F7E44,#26BDE2)]">
                    <button type="button" onClick={onClose} className="absolute right-3.5 top-3.5 grid h-[34px] w-[34px] place-items-center rounded-full bg-white/15 text-[17px] font-black text-white" aria-label="Close">
                        ×
                    </button>
                    <span className="absolute right-[60px] top-4 rounded-full border border-white/20 bg-white/15 px-2.5 py-1.5 text-[8.5px] font-black uppercase tracking-[0.08em]">
                        {st.label}
                    </span>
                    <div className="text-[8.5px] font-extrabold tracking-[0.2em] text-[#e8c76a]">CIEL PK FLASH CARD · FINAL YEAR PROJECT RECORD · {displayFypId(entry)}</div>
                    <div className="mt-1.5 pr-24 text-[19px] font-extrabold leading-snug">🃏 {title}</div>
                    <div className="mt-1 text-[11px] text-[#c8d5dd]">
                        {[
                            entry.projectInfo?.academicArea || entry.projectInfo?.discipline,
                            entry.projectInfo?.degree || entry.projectInfo?.officialProgram,
                            entry.projectInfo?.span,
                            team.length ? `Group — ${names.join(", ")}` : `${student} · Individual`,
                            uni,
                            entry.projectInfo?.graduationYear ? `Batch ${entry.projectInfo.graduationYear}` : null,
                        ]
                            .filter(Boolean)
                            .join(" · ")}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-[8px] font-extrabold uppercase tracking-[0.1em] text-[#c8bfa2]">
                            SDGs
                            <br />
                            LINKED
                        </span>
                        <SdgTiles entry={entry} />
                    </div>
                </div>

                <div className="max-h-[calc(100vh-300px)] overflow-auto pb-2">
                    {canDecide ? (
                        <div className="mx-[22px] mt-3.5 flex items-start gap-3 rounded-[14px] border border-[#cbe0f5] bg-[#edf4fb] px-[15px] py-3 text-[11.5px] leading-relaxed text-[#376d9f]">
                            <span className="text-xl">⏳</span>
                            <div>
                                <b>Submitted{submittedOn ? ` ${submittedOn}` : ""} — awaiting supervisor review by {faculty}.</b>
                                <br />
                                <span className="text-[10.5px]">The record is locked and the FYP AI Analyser ran automatically on submission, measured against excellent work in the student&apos;s discipline at their level. Edit any section score or comment below if you disagree, then Approve, Request Revision or Reject — on approval the final score and comments are released to the student, the university and CIEL PK.</span>
                            </div>
                        </div>
                    ) : st.tone === "revision_requested" ? (
                        <div className="mx-[22px] mt-3.5 flex items-start gap-3 rounded-[14px] border border-[#f3d8a0] bg-[#fff2dc] px-[15px] py-3 text-[11.5px] leading-relaxed text-[#9b6700]">
                            <span className="text-xl">✏️</span>
                            <div>
                                <b>Revision requested{entry.supervisorApprovalAt ? ` on ${formatDay(entry.supervisorApprovalAt)}` : ""}.</b>
                                {entry.supervisorApprovalNote ? <><br />“{entry.supervisorApprovalNote}”</> : null}
                            </div>
                        </div>
                    ) : st.tone === "rejected" ? (
                        <div className="mx-[22px] mt-3.5 flex items-start gap-3 rounded-[14px] border border-[#f3c8c8] bg-[#ffe8ea] px-[15px] py-3 text-[11.5px] leading-relaxed text-[#b13e49]">
                            <span className="text-xl">⛔</span>
                            <div>
                                <b>Not accepted.</b>
                                {entry.supervisorApprovalNote ? <><br />“{entry.supervisorApprovalNote}”</> : null}
                            </div>
                        </div>
                    ) : st.tone === "approved" ? (
                        <div className="mx-[22px] mt-3.5 flex items-start gap-3 rounded-[14px] border border-[#bfe8cc] bg-[#e5f8ef] px-[15px] py-3 text-[11.5px] leading-relaxed text-[#087858]">
                            <span className="text-xl">✅</span>
                            <div>
                                <b>Approved{entry.supervisorApprovalAt ? ` on ${formatDay(entry.supervisorApprovalAt)}` : ""}.</b>
                                <br />
                                <span className="text-[10.5px]">Published to: 🧑‍🎓 Student · 🧑‍🏫 Faculty / Supervisor · 🏫 University · 🌐 CIEL PK</span>
                            </div>
                        </div>
                    ) : null}

                    <div className="mx-[22px] mt-3.5 flex flex-wrap gap-1.5">
                        {trackers.map((t) => (
                            <div
                                key={t.label}
                                className={`min-w-[96px] flex-1 rounded-[11px] border px-2.5 py-2 text-center text-[9.5px] font-black ${
                                    t.state === "done"
                                        ? "border-[#bfe8cc] bg-[#e8f5ef] text-[#1d765d]"
                                        : t.state === "act"
                                          ? "border-[#14202b] bg-[#14202b] text-[#ffd76a] shadow-[0_6px_14px_rgba(20,32,43,.25)]"
                                          : t.state === "bad"
                                            ? "border-[#f3c8c8] bg-[#fdeeee] text-[#b34c4c]"
                                            : "border-[#e3e8ec] bg-[#f7f8fa] text-[#8b98a1]"
                                }`}
                            >
                                {t.label}
                                <small className="mt-0.5 block text-[8px] font-bold opacity-75">
                                    {t.state === "done" ? "DONE" : t.state === "act" ? "CURRENT STAGE" : t.state === "bad" ? "FINAL" : "NEXT"}
                                </small>
                            </div>
                        ))}
                    </div>
                    <div className="mx-[22px] mt-2 flex flex-wrap items-center gap-2 text-[10.5px] text-[#70808a]">
                        <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-black tracking-[0.05em] ${isDraft || canDecide || st.tone === "revision_requested" ? "bg-[#14202b] text-[#ffd76a]" : "bg-[#e8f5ef] text-[#1d765d]"}`}>
                            ⚡ ACTION WITH: {isDraft || st.tone === "revision_requested" ? "STUDENT" : canDecide || st.tone === "under_review" ? "SUPERVISOR" : "NONE"}
                        </span>
                        <span>
                            {isDraft
                                ? "Next: the student is completing the form — remind if inactive."
                                : canDecide || st.tone === "under_review"
                                  ? "Next: the supervisor reviews the flashcard. CIEL PK cannot skip that step — remind them if they are holding the workflow."
                                  : st.tone === "revision_requested"
                                    ? "Student must revise and resubmit."
                                    : "Decision recorded."}
                        </span>
                    </div>

                    <div className="mx-[22px] mt-3.5 rounded-[14px] border border-[#d5eee8] bg-[#f4faf8] px-3.5 py-3">
                        <span className="text-[8.5px] font-extrabold tracking-[0.14em] text-[#0f766e]">🔗 AUTOMATIC PROJECT CONNECTIONS — ONE MASTER RECORD · {displayFypId(entry)}</span>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {names.map((n) => (
                                <span key={n} className="rounded-full border border-[#d7e5e0] bg-white px-2.5 py-1 text-[9.5px] font-extrabold text-[#2d5a50]">
                                    {n === student ? "🧑‍🎓" : "👥"} {n}
                                    {n === student ? " · Student lead" : " · Team member"}
                                </span>
                            ))}
                            <span className="rounded-full border border-[#d7e5e0] bg-white px-2.5 py-1 text-[9.5px] font-extrabold text-[#2d5a50]">🧑‍🏫 {faculty} · Supervisor</span>
                            <span className="rounded-full border border-[#d7e5e0] bg-white px-2.5 py-1 text-[9.5px] font-extrabold text-[#2d5a50]">🏫 {uni} · University</span>
                            <span className="rounded-full border border-[#d7e5e0] bg-white px-2.5 py-1 text-[9.5px] font-extrabold text-[#2d5a50]">🌐 CIEL PK</span>
                        </div>
                        <p className="mt-1.5 text-[9.5px] text-[#5f7a72]">Created automatically when Section 1 was first saved. Every stakeholder opens this same live record — the system never creates duplicates, and all team members share one FYP ID.</p>
                    </div>

                    {ai && typeof ai.final === "number" ? (
                        <div className="mx-[22px] mt-3.5 overflow-hidden rounded-2xl border-[1.5px] border-[#dccfff]">
                            <div className="flex flex-wrap items-center gap-3.5 bg-[#f7f3ff] px-4 py-3">
                                <div>
                                    <div className="text-[34px] font-black leading-none text-[#6d3df5]">{ai.final}</div>
                                    <div className="text-[8.5px] font-black uppercase tracking-[0.1em] text-[#6d3df5]">
                                        {entry.aiAnalysisLock?.locked ? "SCORE ALLOTTED BY FACULTY / 100" : "AUTO AI SCORE / 100 · PRELIMINARY"}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-black text-[#14202b]">{ai.classification}</div>
                                    <div className="text-[10.5px] leading-relaxed text-[#70808a]">
                                        Raw {ai.rawTotal} of applicable maximum · Confidence {ai.frameworkVersion || "MEDIUM"}
                                    </div>
                                </div>
                                <span className={`ml-auto rounded-full px-2.5 py-1.5 text-[9px] font-black tracking-[0.08em] ${entry.aiAnalysisLock?.locked ? "bg-[#e5f8ef] text-[#087858]" : "bg-[#ffe8ea] text-[#b13e49]"}`}>
                                    {entry.aiAnalysisLock?.locked
                                        ? "✅ RELEASED ON APPROVAL"
                                        : "🤖 RAN AUTOMATICALLY ON SUBMISSION · EDIT ANY SCORE / COMMENT · RELEASED TO STUDENT ON APPROVAL"}
                                </span>
                            </div>
                            <div className="border-t border-[#ece4ff] px-4 py-3 text-[11.5px] leading-relaxed text-[#2a3350]">
                                <b>Overall AI rationale:</b> {ai.why || "The analyser scored this record against excellent work in the student's discipline."}
                                <div className="mt-1.5">
                                    {(() => {
                                        const ranked = [...(ai.dimensions || [])].sort((a, b) => b.score / Math.max(1, b.max) - a.score / Math.max(1, a.max));
                                        const strongest = ranked[0]?.label;
                                        const weaker = ranked[ranked.length - 1]?.label;
                                        return (
                                            <>
                                                {strongest ? <span className="mr-1 inline-block rounded-full bg-[#e5f8ef] px-2 py-1 text-[9px] font-black text-[#087858]">Strongest: {strongest}</span> : null}
                                                {weaker && weaker !== strongest ? <span className="inline-block rounded-full bg-[#fff2dc] px-2 py-1 text-[9px] font-black text-[#9b6700]">Weaker: {weaker}</span> : null}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {entry.id ? (
                        <div className="mx-[22px] mt-3.5">
                            <FypAiAnalysisPanel entry={entry} onUpdate={onUpdate} defaultExpanded />
                        </div>
                    ) : null}

                    <div className="mx-[22px] mt-3.5 mb-4">
                        <ThesisCard
                            entry={entry}
                            defaultOpen
                            studentName={student}
                            remindDraftOwner={normalizeReviewStatus(entry.supervisorApprovalStatus) === "revision_requested"}
                            studentEmail={entry.student?.email || entry.projectInfo?.studentEmail}
                        />
                    </div>
                </div>

                {canDecide && onSupervisorReview ? (
                    <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-[#dde5ea] bg-white px-[22px] py-3">
                        <span className="flex-1 text-[11px] text-[#70808a]">The score and section comments are in the Detailed Review — amend them there if you wish, then approve, request revision or reject.</span>
                        {onOpenReview ? (
                            <button type="button" onClick={onOpenReview} className="rounded-[9px] bg-[#6d3df5] px-3 py-2 text-[10px] font-black text-white">
                                📋 OPEN DETAILED REVIEW · AMEND & DECIDE
                            </button>
                        ) : (
                            <>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Comment to the student (required for revision / rejection; optional for approval)…"
                                    className="min-h-[40px] min-w-[220px] flex-1 rounded-[10px] border border-[#dde5ea] px-3 py-2 text-[11.5px]"
                                />
                                <button type="button" onClick={() => onSupervisorReview("approve", note.trim() || undefined)} disabled={reviewing} className="rounded-[9px] bg-[#e5f8ef] px-3 py-2 text-[10px] font-black text-[#087858] disabled:opacity-50">
                                    ✅ APPROVE — RELEASE SCORE
                                </button>
                                <button type="button" onClick={() => onSupervisorReview("revision", note.trim())} disabled={reviewing || missingReturn} className="rounded-[9px] bg-[#fff2dc] px-3 py-2 text-[10px] font-black text-[#9b6700] disabled:opacity-50">
                                    ✏️ REQUEST REVISION
                                </button>
                                <button type="button" onClick={() => onSupervisorReview("reject", note.trim())} disabled={reviewing || missingReturn} className="rounded-[9px] bg-[#ffe8ea] px-3 py-2 text-[10px] font-black text-[#b13e49] disabled:opacity-50">
                                    ⛔ REJECT
                                </button>
                            </>
                        )}
                    </div>
                ) : st.tone === "approved" && (onOpenReview || latestFile?.fileUrl) ? (
                    <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-[#dde5ea] bg-white px-[22px] py-3">
                        <span className="flex-1 text-[11px] text-[#70808a]">Approved record — flashcard, Detailed Review and badges synchronised across all dashboards.</span>
                        {onOpenReview ? (
                            <button type="button" onClick={onOpenReview} className="rounded-[9px] bg-[#6d3df5] px-3 py-2 text-[10px] font-black text-white">
                                📋 DETAILED REVIEW
                            </button>
                        ) : null}
                        {latestFile?.fileUrl ? (
                            <a href={latestFile.fileUrl} target="_blank" rel="noreferrer" className="rounded-[9px] bg-[#eef2f3] px-3 py-2 text-[10px] font-black text-[#29454f]">
                                ⬇️ DOWNLOAD APPROVED FILE
                            </a>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

const SECTION_TOTAL = FYP_V9_STEP_NAMES.length;

function sectionsDone(entry: FypMeritEntry) {
    return Math.max(0, Math.min(SECTION_TOTAL, entry.stepCompleted ?? 0));
}
function completionPct(entry: FypMeritEntry) {
    return Math.round((sectionsDone(entry) / SECTION_TOTAL) * 100);
}
function progCat(pct: number): [string, string] {
    if (pct >= 100) return ["💯", "Ready to Submit"];
    if (pct > 75) return ["🏁", "Near Completion"];
    if (pct > 50) return ["📈", "Advanced Progress"];
    if (pct > 25) return ["🔨", "Mid Development"];
    return ["🌱", "Early Stage"];
}
function sectionsChecklist(entry: FypMeritEntry) {
    const done = sectionsDone(entry);
    return FYP_V9_STEP_NAMES.map((name, i) => `${name} ${i < done ? "✓" : i === done ? "⏳" : "✗"}`).join(" · ");
}
function relativeUpdated(value?: string | null) {
    if (!value) return "just now";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return formatDay(value);
    const start = (x: Date) => Date.UTC(x.getFullYear(), x.getMonth(), x.getDate());
    const diff = Math.round((start(new Date()) - start(d)) / 86400000);
    if (diff <= 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return `${diff} days ago`;
    return formatDay(value);
}

export function FacultyFypProgressCard({
    entry,
    onOpenDraft,
}: {
    entry: FypMeritEntry;
    onOpenDraft: () => void;
}) {
    const pct = completionPct(entry);
    const done = sectionsDone(entry);
    const remaining = SECTION_TOTAL - done;
    const cat = progCat(pct);
    const wait = pct < 100;
    const title = entry.projectInfo?.title || entry.projectTitle || "Untitled Final Year Project";
    const student = entry.student?.name || entry.projectInfo?.studentName || "Student";
    const faculty = entry.projectInfo?.supervisorName || "supervisor";
    const uni = entry.projectInfo?.university || entry.student?.institution || "University";
    const teamMembers = normalizeFypTeamMembers(entry.projectInfo?.teamMembers);
    const team = teamMembers.map((m) => m.name?.trim()).filter(Boolean);
    const studentEmail = entry.student?.email || entry.projectInfo?.studentEmail;
    const remindSubject = `CIEL PK reminder — continue your Final Year Project`;
    const remindBody = `Dear ${student}, a gentle reminder from CIEL PK: your Final Year Project record "${title}" (${displayFypId(entry)}) is ${pct}% complete. Please continue in your Student Dashboard → Final Year Project → FYP in Progress.`;

    return (
        <div className="grid grid-cols-1 items-start gap-4 rounded-2xl border border-[#dde5ea] bg-white p-[15px] md:grid-cols-[minmax(0,1fr)_290px]">
            <div>
                <h4 className="m-0 text-[15px] font-semibold text-[#14202b]">{title}</h4>
                <p className="mt-1 text-[10.5px] text-[#70808a]">
                    <b className="font-semibold text-[#14202b]">{displayFypId(entry)}</b>
                    {` · ${entry.projectInfo?.degree || entry.projectInfo?.officialProgram || "Programme"}`}
                    {entry.projectInfo?.span ? ` · ${entry.projectInfo.span}` : ""}
                    {` · ${team.length ? `Team: ${team.join(", ")}` : "Individual"}`}
                    {` · Student: `}<b className="text-[#14202b]">{student}</b>
                    {` · Supervisor: ${faculty}`}
                    {` · ${uni}`}
                </p>
                <div className="mt-[11px] rounded-xl border border-[#e8edef] bg-[#fafbfb] px-3 py-2.5 text-[11px] leading-relaxed">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] font-black">
                        <span>
                            <span className={`inline-block whitespace-nowrap rounded-[18px] px-2 py-[5px] text-[9.5px] font-black ${wait ? "bg-[#fff3dc] text-[#a66d11]" : "bg-[#edf4fb] text-[#376d9f]"}`}>
                                {wait ? "In progress" : "Ready to submit"}
                            </span>
                            <span className="ml-1 inline-block whitespace-nowrap rounded-[18px] bg-[#edf4fb] px-2 py-[5px] text-[9.5px] font-black text-[#376d9f]">
                                {cat[0]} {cat[1]}
                            </span>
                        </span>
                        <span>{pct}% complete</span>
                    </div>
                    <div className="mt-1.5 h-2 min-w-[120px] overflow-hidden rounded-lg bg-[#e6ecee]">
                        <span className="block h-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#15a08e,#e4a73e)" }} />
                    </div>
                    <p className="mt-1.5 text-[10.5px] text-[#70808a]">
                        <b className="text-[10px] font-black uppercase tracking-[0.05em] text-[#14202b]">{done} of {SECTION_TOTAL} Sections Completed</b>
                        {` · ${remaining} remaining · ${sectionsChecklist(entry)}`}
                    </p>
                    <p className="mt-[3px] text-[10.5px] text-[#70808a]">💾 Auto-saved continuously · last updated {relativeUpdated(entry.updatedAt)}</p>
                    <div className="mt-[7px] rounded-[10px] border border-[#dbe7f2] bg-[#f2f7fb] px-2.5 py-[7px] text-[10.5px] leading-relaxed text-[#31405a]">
                        ⚡ <b className="font-black uppercase tracking-[0.04em]">Action with: Student</b> · {pct >= 100 ? "Next: the record is 100% ready — nudge the student to submit." : "Next: the student is completing the form — remind if inactive."}
                    </div>
                </div>
                <div className="mt-[11px] rounded-xl border border-[#d5eee8] bg-[#f4faf8] px-3 py-2.5 text-[11px] leading-relaxed">
                    <b className="mb-1 block text-[10px] font-black uppercase tracking-[0.05em] text-[#71828e]">One master record — auto-connected</b>
                    <div className="mt-1 flex flex-wrap gap-[5px]">
                        {(team.length ? team : [student]).map((n) => (
                            <span key={n} className="rounded-full border border-[#d7e5e0] bg-white px-[9px] py-1 text-[9.5px] font-extrabold text-[#2d5a50]">
                                {n === student ? "🧑‍🎓" : "👥"} {n}
                            </span>
                        ))}
                        <span className="rounded-full border border-[#d7e5e0] bg-white px-[9px] py-1 text-[9.5px] font-extrabold text-[#2d5a50]">🧑‍🏫 {faculty}</span>
                        <span className="rounded-full border border-[#d7e5e0] bg-white px-[9px] py-1 text-[9.5px] font-extrabold text-[#2d5a50]">🏫 {uni}</span>
                        <span className="rounded-full border border-[#d7e5e0] bg-white px-[9px] py-1 text-[9.5px] font-extrabold text-[#2d5a50]">🌐 CIEL PK</span>
                    </div>
                    <p className="mt-1.5 text-[9.5px] text-[#5f7a72]">All stakeholders see this same live record ({displayFypId(entry)}) — no duplicates; team members share one FYP ID.</p>
                </div>
                {studentEmail || teamMembers.some((m) => m.email) ? (
                    <div className="mt-[11px] rounded-xl border border-[#e8edef] bg-[#fafbfb] px-3 py-[11px]">
                        <b className="mb-1 block text-[10px] font-black uppercase tracking-[0.05em] text-[#71828e]">Remind {student}{team.length ? " & team" : ""} (workflow owner)</b>
                        <div className="flex flex-wrap gap-1.5">
                            {studentEmail ? (
                                <>
                                    <a href={mailtoHref(studentEmail, remindSubject, remindBody)} className="inline-flex items-center rounded-[9px] bg-[#edf4fb] px-2.5 py-1.5 text-[10px] font-black text-[#376d9f]">
                                        ✉️ Email {student.split(" ")[0]}
                                    </a>
                                    <a href={whatsappShareHref(`${remindSubject}\n\n${remindBody}`)} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-[9px] bg-[#e6f7ee] px-2.5 py-1.5 text-[10px] font-black text-[#137a4b]">
                                        💬 WhatsApp {student.split(" ")[0]}
                                    </a>
                                </>
                            ) : null}
                            {teamMembers.filter((m) => m.email && m.name && m.name !== student).map((m) => {
                                const body = `Dear ${m.name}, a gentle reminder from CIEL PK: the Final Year Project "${title}" (${displayFypId(entry)}) is ${pct}% complete. Please continue your part in Student Dashboard → Final Year Project → FYP in Progress.`;
                                return (
                                    <span key={`${m.email}-${m.name}`} className="inline-flex flex-wrap gap-1.5">
                                        <a href={mailtoHref(m.email as string, remindSubject, body)} className="inline-flex items-center rounded-[9px] bg-[#edf4fb] px-2.5 py-1.5 text-[10px] font-black text-[#376d9f]">
                                            ✉️ Email {m.name.split(" ")[0]}
                                        </a>
                                        <a href={whatsappShareHref(`${remindSubject}\n\n${body}`)} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-[9px] bg-[#e6f7ee] px-2.5 py-1.5 text-[10px] font-black text-[#137a4b]">
                                            💬 WhatsApp {m.name.split(" ")[0]}
                                        </a>
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                ) : null}
            </div>
            <div className="border-[#dde5ea] max-md:border-t max-md:pt-3 md:border-l md:pl-3.5">
                <div className="mb-2.5 rounded-[11px] border border-[#dde5ea] bg-[#f8fafb] px-2.5 py-2.5">
                    <b className="block text-[11px] text-[#16313d]">Current workflow owner</b>
                    <small className="mt-[3px] block text-[10px] leading-relaxed text-[#70808a]">
                        Student{team.length ? " team" : ""} — {pct >= 100 ? "ready to submit" : "record in progress"}
                    </small>
                </div>
                <button type="button" onClick={onOpenDraft} className="inline-flex w-full items-center justify-center gap-1 rounded-[9px] bg-[#eef2f3] px-2.5 py-[11px] text-[11px] font-black text-[#29454f]">
                    👁 VIEW DRAFT (READ-ONLY)
                </button>
            </div>
        </div>
    );
}

export function FacultyFypApprovedCard({
    entry,
    onOpenFlashcard,
    onOpenReview,
    audience = "faculty",
}: {
    entry: FypMeritEntry;
    onOpenFlashcard: () => void;
    onOpenReview?: () => void;
    audience?: "faculty" | "admin";
}) {
    const title = entry.projectInfo?.title || entry.projectTitle || "Untitled Final Year Project";
    const student = entry.student?.name || entry.projectInfo?.studentName || "Student";
    const faculty = entry.projectInfo?.supervisorName || "supervisor";
    const uni = entry.projectInfo?.university || entry.student?.institution || "University";
    const team = normalizeFypTeamMembers(entry.projectInfo?.teamMembers).map((m) => m.name?.trim()).filter(Boolean);
    const files = entry.deliverables || [];
    const latestFile = files[files.length - 1];
    const ribbons = fypRankRibbons(entry);
    const std = audience === "admin" ? computeFypMeritScorecard(entry) : null;
    const approvedOn = formatDay(entry.supervisorApprovalAt);
    const meta = [
        displayFypId(entry),
        entry.projectInfo?.academicLevel,
        entry.projectInfo?.degree || entry.projectInfo?.officialProgram,
        team.length ? `Group — ${team.join(", ")}` : student,
        entry.projectInfo?.school,
        uni,
        entry.projectInfo?.graduationYear ? `Batch ${entry.projectInfo.graduationYear}` : null,
        `Approved by ${faculty}${approvedOn ? ` ${approvedOn}` : ""}`,
    ]
        .filter(Boolean)
        .join(" · ");

    return (
        <div className="grid grid-cols-1 items-start gap-4 rounded-2xl border border-[#dde5ea] bg-white p-[15px] md:grid-cols-[minmax(0,1fr)_290px]">
            <div>
                <h4 className="m-0 mb-[3px] text-[15px] font-semibold text-[#14202b]">
                    {title} <SdgTiles entry={entry} compact />
                </h4>
                <p className="text-[10.5px] text-[#70808a]">{meta}</p>
                <div className="mt-[11px] rounded-xl border border-[#e8edef] bg-[#fafbfb] px-3 py-[11px]">
                    <span className="inline-block whitespace-nowrap rounded-[18px] bg-[#e8f5ef] px-2 py-[5px] text-[9.5px] font-black text-[#1d765d]">✓ FACULTY APPROVED</span>
                    {entry.aiAnalysis && typeof entry.aiAnalysis.final === "number" ? (
                        <span className="ml-1.5 inline-block whitespace-nowrap rounded-[18px] bg-[#ede6ff] px-2 py-[5px] text-[9.5px] font-black text-[#6d3df5]">
                            🎓 {audience === "admin" ? "CIEL PK SCORE" : "FACULTY SCORE"} {entry.aiAnalysis.final} · {entry.aiAnalysis.classification}
                        </span>
                    ) : null}
                    {std ? (
                        <span className="ml-1.5 inline-block whitespace-nowrap rounded-[18px] bg-[#edf4fb] px-2 py-[5px] text-[9.5px] font-black text-[#376d9f]" title="Discipline-weighted standard score vs the discipline benchmark — the number every ranking uses">
                            📚 STD {std.total} · {std.grade}
                        </span>
                    ) : null}
                    <p className="mt-2 text-[11px] leading-relaxed text-[#31405a]">{fypHeadline(entry)}</p>
                </div>
                {ribbons.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {ribbons.map(({ kind, ribbon }) => (
                            <span
                                key={kind}
                                className="rounded-full border border-[#dde5ea] bg-[#f8fafb] px-2.5 py-1 text-[9.5px] font-black text-[#31405a]"
                            >
                                {kind === "faculty" ? "🏅 Faculty AI Analyser" : kind === "university" ? "🏛️ University AI Analyser" : "🌐 CIEL PK Live"} · #{ribbon.rank} of {ribbon.of}
                            </span>
                        ))}
                    </div>
                ) : null}
            </div>
            <div className="border-[#dde5ea] max-md:border-t max-md:pt-3 md:border-l md:pl-3.5">
                <div className="mb-2.5 rounded-[11px] border border-[#dde5ea] bg-[#f8fafb] px-2.5 py-2.5">
                    <b className="block text-[11px] text-[#16313d]">Published to</b>
                    <small className="mt-[3px] block text-[10px] leading-relaxed text-[#70808a]">🧑‍🎓 Student · 🧑‍🏫 Supervisor · 🏫 University · 🌐 CIEL PK</small>
                </div>
                <button type="button" onClick={onOpenFlashcard} className="inline-flex w-full items-center justify-center gap-1 rounded-[9px] bg-[#174b43] px-3.5 py-[11px] text-[11px] font-black text-white">
                    🃏 {audience === "admin" ? "FLASHCARD" : "OPEN FLASHCARD"}
                </button>
                {onOpenReview && entry.aiAnalysis ? (
                    <button type="button" onClick={onOpenReview} className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded-[9px] bg-[#6d3df5] px-3.5 py-2 text-[10px] font-black text-white">
                        📋 DETAILED REVIEW
                    </button>
                ) : null}
                {latestFile?.fileUrl ? (
                    <a href={latestFile.fileUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded-[9px] bg-[#eef2f3] px-2.5 py-2 text-[10px] font-black text-[#29454f]">
                        ⬇️ FILE
                    </a>
                ) : (
                    <button
                        type="button"
                        onClick={() => toast.message("Approved Final Year Project file will appear here when it is attached to this record.")}
                        className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded-[9px] bg-[#eef2f3] px-2.5 py-2 text-[10px] font-black text-[#29454f]"
                    >
                        ⬇️ FILE
                    </button>
                )}
            </div>
        </div>
    );
}

/** University FYP Under Review — reminders only. University cannot skip the supervisor. */
export function UniversityFypReviewCard({
    entry,
    onOpenFlashcard,
    audience = "university",
}: {
    entry: FypMeritEntry;
    onOpenFlashcard: () => void;
    audience?: "university" | "admin";
}) {
    const st = reviewStatusLabel(entry.status, entry.supervisorApprovalStatus, "revision_requested", "other");
    const waiting = isPathEntryWaiting(entry);
    const revision = st.tone === "revision_requested";
    const rejected = st.tone === "rejected";
    const title = entry.projectInfo?.title || entry.projectTitle || "Untitled Final Year Project";
    const student = entry.student?.name || entry.projectInfo?.studentName || "Student";
    const faculty = entry.projectInfo?.supervisorName || "supervisor";
    const uni = entry.projectInfo?.university || entry.student?.institution || "University";
    const team = normalizeFypTeamMembers(entry.projectInfo?.teamMembers).map((m) => m.name?.trim()).filter(Boolean);
    const files = entry.deliverables?.length ?? 0;
    const submittedOn = formatDay(entry.updatedAt);
    const studentEmail = entry.student?.email || entry.projectInfo?.studentEmail;
    const supervisorEmail = entry.projectInfo?.supervisorEmail;
    const pill =
        st.tone === "rejected" || st.tone === "revision_requested"
            ? "bg-[#fdeeee] text-[#b34c4c]"
            : st.tone === "under_review"
              ? "bg-[#fff3dc] text-[#a66d11]"
              : "bg-[#edf4fb] text-[#376d9f]";
    const facultyLast = faculty.split(" ").slice(-2).join(" ") || faculty;
    const studentFirst = student.split(" ")[0];
    const remindFacultySubject = `CIEL PK reminder — review ${title}`;
    const remindFacultyBody = `Dear ${faculty}, a gentle reminder: the Final Year Project record "${title}" (${displayFypId(entry)}) by ${student} has been awaiting your review${submittedOn ? ` since ${submittedOn}` : ""}. Please open Final Year Project (FYP) → FYP Review in your CIEL PK Faculty / Supervisor Dashboard to approve, request revision or reject. Thank you.`;
    const remindStudentSubject = `CIEL PK reminder — revision in progress on ${title}`;
    const remindStudentBody = `Dear ${student}, a gentle reminder from CIEL PK: your Final Year Project record "${title}" (${displayFypId(entry)}) has faculty revision comments waiting. Please continue in your Student Dashboard → Final Year Project → FYP Under Review.`;

    return (
        <div className="grid grid-cols-1 items-start gap-4 rounded-2xl border border-[#dde5ea] bg-white p-[15px] md:grid-cols-[minmax(0,1fr)_290px]">
            <div>
                <h4 className="m-0 mb-1 text-[15px] font-semibold text-[#14202b]">
                    {title} <SdgTiles entry={entry} compact />
                </h4>
                <p className="text-[10.5px] text-[#70808a]">
                    <b className="font-semibold text-[#14202b]">{displayFypId(entry)}</b>
                    {entry.projectInfo?.degree || entry.projectInfo?.officialProgram ? ` · ${entry.projectInfo.degree || entry.projectInfo.officialProgram}` : ""}
                    {` · ${team.length ? `Team — ${team.join(", ")}` : student}`}
                    {submittedOn ? ` · Submitted ${submittedOn}` : ""}
                    {` · Supervisor ${faculty}`}
                    {` · ${uni}`}
                </p>
                <div className="mt-[11px] rounded-xl border border-[#e8edef] bg-[#fafbfb] px-3 py-[11px]">
                    <span className={`inline-block whitespace-nowrap rounded-[18px] px-2 py-[5px] text-[9.5px] font-black uppercase ${pill}`}>{st.label}</span>
                    <span className="ml-1.5 text-[10.5px] text-[#70808a]">
                        {waiting
                            ? `Supervisor owns the next action${submittedOn ? ` · waiting since ${submittedOn}` : ""}`
                            : revision
                              ? "Student owns the next action"
                              : "Decision recorded"}
                    </span>
                    <p className="mt-2 text-[11px] leading-relaxed text-[#31405a]">{fypHeadline(entry)}</p>
                    <div className="mt-[7px] rounded-[10px] border border-[#dbe7f2] bg-[#f2f7fb] px-2.5 py-[7px] text-[10.5px] leading-relaxed text-[#31405a]">
                        ⚡ <b className="font-black uppercase tracking-[0.04em]">Action with: {waiting ? faculty : revision ? student : "Closed"}</b>
                        {waiting
                            ? ` · ${audience === "admin" ? "CIEL PK" : "University"} cannot skip the supervisor — remind them to review.`
                            : revision
                              ? " · Student must revise and resubmit."
                              : " · This record will not be published."}
                    </div>
                </div>
                {waiting && supervisorEmail ? (
                    <div className="mt-[11px] rounded-xl border border-[#e8edef] bg-[#fafbfb] px-3 py-[11px]">
                        <b className="mb-1 block text-[10px] font-black uppercase tracking-[0.05em] text-[#71828e]">Remind supervisor {faculty} (workflow owner)</b>
                        <div className="flex flex-wrap gap-1.5">
                            <a href={mailtoHref(supervisorEmail, remindFacultySubject, remindFacultyBody)} className="inline-flex items-center rounded-[9px] bg-[#edf4fb] px-2.5 py-1.5 text-[10px] font-black text-[#376d9f]">
                                ✉️ Email {facultyLast}
                            </a>
                            <a href={whatsappShareHref(`${remindFacultySubject}\n\n${remindFacultyBody}`)} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-[9px] bg-[#e6f7ee] px-2.5 py-1.5 text-[10px] font-black text-[#137a4b]">
                                💬 WhatsApp {facultyLast}
                            </a>
                        </div>
                    </div>
                ) : null}
                {revision && studentEmail ? (
                    <div className="mt-[11px] rounded-xl border border-[#e8edef] bg-[#fafbfb] px-3 py-[11px]">
                        <b className="mb-1 block text-[10px] font-black uppercase tracking-[0.05em] text-[#71828e]">Remind {student} — revision in progress</b>
                        <div className="flex flex-wrap gap-1.5">
                            <a href={mailtoHref(studentEmail, remindStudentSubject, remindStudentBody)} className="inline-flex items-center rounded-[9px] bg-[#edf4fb] px-2.5 py-1.5 text-[10px] font-black text-[#376d9f]">
                                ✉️ Email {studentFirst}
                            </a>
                            <a href={whatsappShareHref(`${remindStudentSubject}\n\n${remindStudentBody}`)} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-[9px] bg-[#e6f7ee] px-2.5 py-1.5 text-[10px] font-black text-[#137a4b]">
                                💬 WhatsApp {studentFirst}
                            </a>
                        </div>
                    </div>
                ) : null}
                {rejected && entry.supervisorApprovalNote ? (
                    <div className="mt-[11px] rounded-xl border border-[#e8edef] bg-[#fafbfb] px-3 py-[11px] text-[11px] leading-relaxed text-[#31405a]">
                        <b className="mb-1 block text-[10px] font-black uppercase tracking-[0.05em] text-[#71828e]">Decision</b>
                        “{entry.supervisorApprovalNote}” — {faculty}
                        {entry.supervisorApprovalAt ? `, ${formatDay(entry.supervisorApprovalAt)}` : ""}
                    </div>
                ) : null}
            </div>
            <div className="border-[#dde5ea] max-md:border-t max-md:pt-3 md:border-l md:pl-3.5">
                <div className="mb-2.5 rounded-[11px] border border-[#dde5ea] bg-[#f8fafb] px-2.5 py-2.5">
                    <b className="block text-[11px] text-[#16313d]">Current workflow owner</b>
                    <small className="mt-[3px] block text-[10px] leading-relaxed text-[#70808a]">
                        {waiting ? `Supervisor — ${faculty}` : revision ? "Student — revise & resubmit" : `Closed — ${st.label}`}
                    </small>
                </div>
                <button type="button" onClick={onOpenFlashcard} className="inline-flex w-full items-center justify-center gap-1 rounded-[9px] bg-[#174b43] px-3.5 py-[11px] text-[11px] font-black text-white">
                    🃏 VIEW FYP FLASHCARD
                </button>
                {files ? (
                    entry.deliverables?.[files - 1]?.fileUrl ? (
                        <a href={entry.deliverables[files - 1].fileUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded-[9px] bg-[#eef2f3] px-2.5 py-2 text-[10px] font-black text-[#29454f]">
                            📎 {files} FILE{files === 1 ? "" : "S"}
                        </a>
                    ) : (
                        <button
                            type="button"
                            onClick={() => toast.message(`${files} evidence file${files === 1 ? "" : "s"} ${files === 1 ? "is" : "are"} attached to this record.`)}
                            className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded-[9px] bg-[#eef2f3] px-2.5 py-2 text-[10px] font-black text-[#29454f]"
                        >
                            📎 {files} FILE{files === 1 ? "" : "S"}
                        </button>
                    )
                ) : null}
            </div>
        </div>
    );
}

function facultyWorkBucket(entry: FypMeritEntry): "approved" | "review" | "in_progress" {
    if (isPathEntryApproved(entry)) return "approved";
    if (entry.status === "draft") return "in_progress";
    return "review";
}

function facultyPublishedCount(faculty: string) {
    try {
        const raw = sessionStorage.getItem("ciel-fyp-studio-log-FACULTY");
        const rows = raw ? (JSON.parse(raw) as { mode?: string; cohortName?: string }[]) : [];
        return rows.filter((x) => x.mode === "PUBLISHED_FINAL" && (x.cohortName || "").includes(faculty)).length;
    } catch {
        return 0;
    }
}

function fwStat(rows: FypMeritEntry[]) {
    const approved = rows.filter(isPathEntryApproved);
    const scores = approved.map((r) => r.aiAnalysis?.final).filter((n): n is number => typeof n === "number");
    return {
        n: rows.length,
        a: approved.length,
        u: rows.filter(isPathEntryWaiting).length,
        p: rows.filter((r) => r.status === "draft").length,
        avg: scores.length ? (scores.reduce((x, y) => x + y, 0) / scores.length).toFixed(1) : "—",
    };
}

/** Super Admin · Faculty Work — all universities: every supervisor's FYP flashcards, reviews and badges. */
export function AdminFypFacultyWorkPanel({
    entries,
    onOpenFlashcard,
    onOpenReview,
}: {
    entries: FypMeritEntry[];
    onOpenFlashcard: (id: string) => void;
    onOpenReview: (id: string) => void;
}) {
    const [uni, setUni] = useState("");
    const [fac, setFac] = useState("");
    const [status, setStatus] = useState<"all" | "approved" | "review" | "in_progress">("all");
    const [q, setQ] = useState("");

    const supervised = useMemo(
        () => entries.filter((e) => (e.projectInfo?.supervisorName || "").trim()),
        [entries],
    );
    const unis = useMemo(
        () => Array.from(new Set(supervised.map((e) => e.projectInfo?.university || e.student?.institution || "University").filter(Boolean))).sort(),
        [supervised],
    );
    const facs = useMemo(
        () =>
            Array.from(
                new Set(
                    supervised
                        .filter((e) => !uni || (e.projectInfo?.university || e.student?.institution) === uni)
                        .map((e) => e.projectInfo?.supervisorName)
                        .filter((n): n is string => Boolean(n)),
                ),
            ).sort(),
        [supervised, uni],
    );

    const rows = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return supervised.filter((e) => {
            const university = e.projectInfo?.university || e.student?.institution || "";
            const faculty = e.projectInfo?.supervisorName || "";
            if (uni && university !== uni) return false;
            if (fac && faculty !== fac) return false;
            const bucket = facultyWorkBucket(e);
            if (status !== "all" && bucket !== status) return false;
            if (!needle) return true;
            const hay = [
                e.projectInfo?.title,
                e.projectTitle,
                e.student?.name,
                e.projectInfo?.studentName,
                faculty,
                university,
                e.projectInfo?.school,
                displayFypId(e),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return hay.includes(needle);
        });
    }, [supervised, uni, fac, status, q]);

    const tot = fwStat(supervised);
    const groups = useMemo(() => {
        const map = new Map<string, FypMeritEntry[]>();
        for (const e of rows) {
            const key = `${e.projectInfo?.supervisorName || "Supervisor"}|${e.projectInfo?.university || e.student?.institution || "University"}`;
            const list = map.get(key) || [];
            list.push(e);
            map.set(key, list);
        }
        const order: Record<string, number> = { review: 0, approved: 1, in_progress: 2 };
        for (const list of map.values()) {
            list.sort((a, b) => (order[facultyWorkBucket(a)] ?? 9) - (order[facultyWorkBucket(b)] ?? 9));
        }
        return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [rows]);

    const tabs: { key: typeof status; label: string }[] = [
        { key: "all", label: "All" },
        { key: "approved", label: "Approved" },
        { key: "review", label: "Under review / revision" },
        { key: "in_progress", label: "In progress" },
    ];

    return (
        <div className="space-y-3.5">
            <div className="flex flex-wrap items-center gap-2">
                <select value={uni} onChange={(e) => { setUni(e.target.value); setFac(""); }} className="min-w-[180px] rounded-[10px] border border-[#dde5ea] bg-white px-2.5 py-2 text-[11px] text-[#4c5d65]">
                    <option value="">All universities</option>
                    {unis.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                <select value={fac} onChange={(e) => setFac(e.target.value)} className="min-w-[180px] rounded-[10px] border border-[#dde5ea] bg-white px-2.5 py-2 text-[11px] text-[#4c5d65]">
                    <option value="">All faculty members</option>
                    {facs.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search project, student, faculty…"
                    className="min-w-[220px] flex-1 rounded-[10px] border border-[#dde5ea] bg-white px-2.5 py-2 text-[11px] text-[#4c5d65] outline-none"
                />
                <div className="flex flex-wrap gap-2">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => setStatus(t.key)}
                            className={`rounded-[18px] border px-2.5 py-[7px] text-[11px] font-extrabold ${
                                status === t.key ? "border-[#153f47] bg-[#153f47] text-white" : "border-[#dde5ea] bg-white text-[#5c6d76]"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>
            <p className="text-[11px] text-[#70808a]">
                {tot.n} projects supervised by {new Set(supervised.map((e) => e.projectInfo?.supervisorName)).size} faculty members across {unis.length} universit{unis.length === 1 ? "y" : "ies"} · {tot.a} approved · {tot.u} under review · {tot.p} in progress · average CIEL PK score of approved work {tot.avg}
            </p>
            {groups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#dde5ea] px-6 py-10 text-center text-sm text-[#70808a]">No faculty work matches these filters.</div>
            ) : (
                groups.map(([key, group]) => {
                    const [faculty, university] = key.split("|");
                    const sameFac = supervised.filter((e) => e.projectInfo?.supervisorName === faculty && (e.projectInfo?.university || e.student?.institution) === university);
                    const s = fwStat(sameFac);
                    const published = facultyPublishedCount(faculty);
                    const dept = group[0]?.projectInfo?.school;
                    const email = group.find((e) => e.projectInfo?.supervisorEmail)?.projectInfo?.supervisorEmail;
                    return (
                        <div key={key} className="overflow-hidden rounded-2xl border border-[#dde5ea] bg-white">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6ecf0] bg-[linear-gradient(120deg,#f4f7fb,#fff)] px-4 py-3.5">
                                <div>
                                    <div className="text-sm font-black text-[#14202b]">🧑‍🏫 {faculty}</div>
                                    <div className="text-[10.5px] text-[#70808a]">{university}{dept ? ` · ${dept}` : ""}{email ? ` · ${email}` : ""}</div>
                                </div>
                                <div className="flex flex-wrap gap-3.5 text-center">
                                    {([
                                        [s.n, "projects"],
                                        [s.a, "approved"],
                                        [s.u, "under review"],
                                        [s.p, "in progress"],
                                        [s.avg, "avg CIEL PK score"],
                                        [`${published}/3`, "rankings published"],
                                    ] as const).map(([n, label]) => (
                                        <span key={label} className="flex min-w-[52px] flex-col items-center text-[9.5px] font-bold text-[#70808a]">
                                            <b className="text-[15px] text-[#14202b]">{n}</b>
                                            {label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="px-4 py-1.5">
                                {group.map((entry) => {
                                    const st = fypStatusLabel(entry);
                                    const bucket = facultyWorkBucket(entry);
                                    const title = entry.projectInfo?.title || entry.projectTitle || "Untitled Final Year Project";
                                    const student = entry.student?.name || entry.projectInfo?.studentName || "Student";
                                    const team = normalizeFypTeamMembers(entry.projectInfo?.teamMembers).map((m) => m.name?.trim()).filter(Boolean);
                                    const fileList = entry.deliverables || [];
                                    const latestFile = fileList[fileList.length - 1];
                                    const pill =
                                        bucket === "approved"
                                            ? "bg-[#e8f5ef] text-[#1d765d]"
                                            : st.tone === "rejected" || st.tone === "revision_requested"
                                              ? "bg-[#fdeeee] text-[#b34c4c]"
                                              : bucket === "in_progress"
                                                ? "bg-[#edf4fb] text-[#376d9f]"
                                                : "bg-[#fff3dc] text-[#a66d11]";
                                    const ribbons = fypRankRibbons(entry);
                                    return (
                                        <div key={entry.id} className="grid grid-cols-1 items-start gap-3.5 border-t border-dashed border-[#e6ecf0] py-3 first:border-t-0 md:grid-cols-[minmax(0,1fr)_230px]">
                                            <div>
                                                <div className="text-[13px] font-extrabold text-[#14202b]">
                                                    {title} <SdgTiles entry={entry} compact />
                                                </div>
                                                <div className="mt-0.5 text-[10.5px] text-[#70808a]">
                                                    {displayFypId(entry)} · {team.length ? `Group — ${team.join(", ")}` : student} · {entry.projectInfo?.degree || entry.projectInfo?.officialProgram || "Programme"} · {entry.projectInfo?.university || entry.student?.institution} · Batch {entry.projectInfo?.graduationYear || "—"}
                                                </div>
                                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                    <span className={`rounded-[18px] px-2 py-[5px] text-[9.5px] font-black uppercase ${pill}`}>{st.label}</span>
                                                    {bucket === "approved" && typeof entry.aiAnalysis?.final === "number" ? (
                                                        <span className="rounded-[18px] bg-[#ede6ff] px-2 py-[5px] text-[9.5px] font-black text-[#6d3df5]">🎓 CIEL PK SCORE {entry.aiAnalysis.final} · {entry.aiAnalysis.classification}</span>
                                                    ) : bucket === "review" && typeof entry.aiAnalysis?.final === "number" ? (
                                                        <span className="rounded-[18px] bg-[#fff3dc] px-2 py-[5px] text-[9.5px] font-black text-[#a66d11]">📋 Detailed Review with supervisor · preliminary {entry.aiAnalysis.final}</span>
                                                    ) : bucket === "in_progress" ? (
                                                        <span className="rounded-[18px] bg-[#edf4fb] px-2 py-[5px] text-[9.5px] font-black text-[#376d9f]">{completionPct(entry)}% · {sectionsDone(entry)} of {SECTION_TOTAL} sections</span>
                                                    ) : null}
                                                </div>
                                                {ribbons.length ? (
                                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                        {ribbons.map(({ kind, ribbon }) => (
                                                            <span key={kind} className="rounded-full border border-[#dde5ea] bg-[#f8fafb] px-2.5 py-1 text-[9.5px] font-black text-[#31405a]">
                                                                {kind === "faculty" ? "🏅 Faculty AI Analyser" : kind === "university" ? "🏛️ University AI Analyser" : "🌐 CIEL PK Live"} · #{ribbon.rank} of {ribbon.of}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : null}
                                            </div>
                                            <div className="flex flex-col items-stretch gap-1">
                                                {entry.id ? (
                                                    <button type="button" onClick={() => onOpenFlashcard(entry.id as string)} className="rounded-[9px] bg-[#174b43] px-3.5 py-2.5 text-[11px] font-black text-white">
                                                        🃏 FLASHCARD
                                                    </button>
                                                ) : null}
                                                {entry.aiAnalysis && entry.id ? (
                                                    <button type="button" onClick={() => onOpenReview(entry.id as string)} className="rounded-[9px] bg-[#6d3df5] px-3.5 py-2 text-[10px] font-black text-white">
                                                        📋 DETAILED REVIEW
                                                    </button>
                                                ) : null}
                                                {latestFile?.fileUrl ? (
                                                    <a href={latestFile.fileUrl} target="_blank" rel="noreferrer" className="rounded-[9px] bg-[#eef2f3] px-2.5 py-2 text-center text-[10px] font-black text-[#29454f]">
                                                        📎 {fileList.length}
                                                    </a>
                                                ) : fileList.length ? (
                                                    <button type="button" onClick={() => toast.message(`${fileList.length} file(s) attached.`)} className="rounded-[9px] bg-[#eef2f3] px-2.5 py-2 text-[10px] font-black text-[#29454f]">
                                                        📎 {fileList.length}
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}
