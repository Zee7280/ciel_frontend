"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { sdgData } from "@/utils/sdgData";
import RichSummaryText from "@/components/ciel/RichSummaryText";
import { type CourseProjectEntry, resolveSectionSummaries } from "@/utils/courseProjectTypes";
import {
    FLASH_SECTIONS,
    courseworkApprovedFiles,
    courseworkFlashHeadline,
    courseworkFlashHighlights,
    courseworkFlashMetaLine,
    courseworkFlashStatement,
    courseworkHistoryLines,
    courseworkPrimaryTargetLabel,
    courseworkRankTrend,
    courseworkRecordCode,
    courseworkRibbonBadgeClass,
    fileNameFromUrl,
    formatFlashDate,
} from "@/utils/courseworkFlashCard";

function openApprovedFile(entry: CourseProjectEntry) {
    const files = courseworkApprovedFiles(entry);
    if (!files.length) {
        toast.message("No files attached (optional)");
        return;
    }
    window.open(files[0], "_blank", "noopener,noreferrer");
}

export default function CourseworkFlashCardModal({
    entry,
    onClose,
}: {
    entry: CourseProjectEntry;
    onClose: () => void;
}) {
    const si = entry.studentInfo || {};
    const sm = entry.sdgMapping || {};
    const sdgEntries = sm.entries || [];
    const summaries = resolveSectionSummaries(entry);
    const highlights = courseworkFlashHighlights(entry);
    const files = courseworkApprovedFiles(entry);
    const ribbon = entry.meritRibbon;
    const trend = courseworkRankTrend(entry);
    const targetLabel = courseworkPrimaryTargetLabel(entry);
    const history = courseworkHistoryLines(entry);
    const badgeKind = courseworkRibbonBadgeClass(ribbon?.scope);
    const approvedOn = formatFlashDate(entry.facultyApprovalAt);
    const status = "APPROVED — ON IMPACT WALLS";

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-auto bg-[rgba(7,28,35,.62)] p-[22px]"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="cw-flash-title"
                className="relative my-auto w-[min(940px,97vw)] overflow-hidden rounded-[24px] bg-white text-[#1a1d2b] shadow-[0_30px_80px_rgba(0,0,0,.35)]"
            >
                <div
                    className="relative px-6 pb-4 pt-5 text-white"
                    style={{ background: "linear-gradient(120deg,#14202b 0%,#243b4d 55%,#6b4a0a 140%)" }}
                >
                    <span className="absolute bottom-0 left-0 right-0 h-1 bg-[linear-gradient(90deg,#e8b64a,#c98a04,#3F7E44,#26BDE2)]" />
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="absolute right-3.5 top-3.5 grid h-[34px] w-[34px] place-items-center rounded-full bg-[rgba(255,255,255,.16)] text-[17px] font-black text-white"
                    >
                        ×
                    </button>
                    <span className="absolute right-[60px] top-4 rounded-full border border-white/22 bg-[rgba(255,255,255,.14)] px-2.5 py-1.5 text-[8.5px] font-black tracking-[0.08em]">
                        {status}
                    </span>
                    <p className="pr-40 text-[8.5px] font-extrabold tracking-[0.2em] text-[#e8c76a]">
                        CIEL PK FLASH CARD · COURSEWORK SUSTAINABILITY RECORD · {courseworkRecordCode(entry)}
                    </p>
                    <h2 id="cw-flash-title" className="mt-1.5 text-[19px] font-extrabold leading-snug">
                        🃏 {entry.projectTitle || "Untitled coursework"}
                    </h2>
                    <p className="mt-1 text-[11px] text-[#c8d5dd]">{courseworkFlashMetaLine(entry)}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {sdgEntries.length > 0 ? (
                            <>
                                <span className="text-[8px] font-extrabold tracking-[0.1em] text-[#c8bfa2]">
                                    SDGs
                                    <br />
                                    LINKED
                                </span>
                                {sdgEntries.map((en, i) => {
                                    const sdg = sdgData.find((s) => s.number === en.goalNumber);
                                    return (
                                        <div
                                            key={en.goalNumber}
                                            title={sdg ? `SDG ${sdg.number} ${sdg.title}` : `SDG ${en.goalNumber}`}
                                            className="relative flex h-10 w-10 flex-col items-center justify-center rounded-[10px] text-white shadow-[0_4px_10px_rgba(0,0,0,.28)]"
                                            style={{ background: sdg?.color || "#596971" }}
                                        >
                                            {i === 0 ? (
                                                <span className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-[#14202b] text-[9px] text-[#ffd76a]">
                                                    ★
                                                </span>
                                            ) : null}
                                            <span className="text-[13px] font-extrabold leading-none">{en.goalNumber}</span>
                                            <span className="mt-px px-0.5 text-center text-[5.5px] font-extrabold leading-[1.15]">
                                                {(sdg?.title || "").toUpperCase()}
                                            </span>
                                        </div>
                                    );
                                })}
                            </>
                        ) : null}
                        {targetLabel ? (
                            <span className="text-[8px] font-extrabold tracking-[0.1em] text-[#c8bfa2]">★ {targetLabel.toUpperCase()}</span>
                        ) : null}
                    </div>
                </div>

                <div className="max-h-[calc(100vh-300px)] overflow-auto">
                    <div className="mx-[22px] mt-3.5 flex items-start gap-3 rounded-[14px] border border-[#bfe8cc] bg-[#e5f8ef] px-[15px] py-3 text-[11.5px] leading-[1.55] text-[#087858]">
                        <span className="text-xl">✅</span>
                        <div>
                            <b>
                                Approved by {si.teacherName || "faculty"}
                                {approvedOn ? ` on ${approvedOn}` : ""}.
                            </b>
                            {entry.facultyApprovalNote ? ` “${entry.facultyApprovalNote}”` : ""}
                            <br />
                            <span className="text-[10.5px]">
                                Published to: 🧑‍🎓 Student → My Coursework Impact · 🧑‍🏫 Faculty → Approved Coursework · 🏫 University → Coursework Impact Wall · 🌐 CIEL PK → Approved Coursework
                            </span>
                            {ribbon ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    <span
                                        className={
                                            badgeKind === "fac"
                                                ? "inline-flex flex-col rounded-xl border border-[#f1d68a] bg-[#fff6df] px-2.5 py-1.5 text-[10.5px] font-black leading-tight text-[#7a5a08]"
                                                : badgeKind === "uni"
                                                  ? "inline-flex flex-col rounded-xl border border-[#c9d6ff] bg-[#eef3ff] px-2.5 py-1.5 text-[10.5px] font-black leading-tight text-[#2b3f8f]"
                                                  : "inline-flex flex-col rounded-xl border border-[#dccfff] bg-[#f3edff] px-2.5 py-1.5 text-[10.5px] font-black leading-tight text-[#5a2fd1]"
                                        }
                                    >
                                        <span>
                                            {badgeKind === "uni" ? "🏛️" : badgeKind === "live" ? "🌐" : "🏅"} {ribbon.badgeLevel || "Ranked"} #{ribbon.rank} of {ribbon.of}
                                            {trend ? (
                                                <b
                                                    className={
                                                        trend.kind === "UP"
                                                            ? "ml-1 text-[#15966d]"
                                                            : trend.kind === "DOWN"
                                                              ? "ml-1 text-[#cc5260]"
                                                              : trend.kind === "NEW"
                                                                ? "ml-1 text-[#6d3df5]"
                                                                : "ml-1 text-[#85939b]"
                                                    }
                                                >
                                                    {trend.symbol}
                                                </b>
                                            ) : null}
                                        </span>
                                        <small className="text-[8.5px] font-bold opacity-80">
                                            {ribbon.scope}
                                            {ribbon.at ? ` · ${formatFlashDate(ribbon.at)}` : ""}
                                        </small>
                                    </span>
                                </div>
                            ) : (
                                <div className="mt-2">
                                    <span className="inline-flex rounded-xl border border-[#e3e8ec] bg-[#f7f8fa] px-2.5 py-1.5 text-[10.5px] font-semibold text-[#70808a]">
                                        No ranking badge yet — badges arrive when your faculty or university publish a final ranking, and CIEL PK&apos;s live rank updates continuously.
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-[linear-gradient(180deg,#fbf7ec,#fff)] px-[22px] pb-1.5 pt-3.5">
                        <p className="text-[8.5px] font-extrabold tracking-[0.16em] text-[#c98a04]">
                            ✨ HIGHLIGHTS — THE IMPORTANT POINTS FROM EVERY SECTION
                        </p>
                        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                            {highlights.map((h) => (
                                <div
                                    key={`${h.label}-${h.value.slice(0, 24)}`}
                                    className={`relative min-w-0 overflow-hidden rounded-xl border border-[#eee3c8] bg-white py-2.5 pl-3.5 pr-2.5 ${h.wide ? "sm:col-span-2 md:col-span-3" : ""}`}
                                >
                                    <span className="absolute bottom-0 left-0 top-0 w-1" style={{ background: h.color }} />
                                    <div className="text-[7.5px] font-extrabold uppercase tracking-[0.12em] text-[#7a8095]">
                                        {h.emoji} {h.label}
                                    </div>
                                    <div
                                        className={`mt-0.5 text-[11.5px] leading-[1.45] text-[#14202b] [&_b]:text-[16px] [&_b]:font-bold [&_b]:text-[color:var(--hc,#c98a04)] ${h.wide ? "font-semibold italic" : "font-bold"}`}
                                        style={{ ["--hc" as string]: h.color }}
                                    >
                                        <RichSummaryText text={h.value} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mx-[22px] mt-3 rounded-[14px] bg-[linear-gradient(120deg,#e4d5ff,#f3e3b8_60%,#cde8d2)] p-[1.5px]">
                        <div className="rounded-[13px] bg-white px-[15px] py-3.5">
                            <p className="text-[8.5px] font-extrabold tracking-[0.14em] text-[#6d3df5]">
                                ✨ AI STATEMENT — THE WHOLE COURSEWORK IN ONE READ
                            </p>
                            <p className="mt-1.5 text-[15px] font-extrabold leading-snug text-[#14202b]">{courseworkFlashHeadline(entry)}</p>
                            <p className="mt-1.5 text-[12.5px] leading-[1.7] text-[#2a3350]">{courseworkFlashStatement(entry)}</p>
                        </div>
                    </div>

                    <div className="px-[22px] pb-[18px] pt-1.5">
                        <p className="flex items-center gap-2 py-3 text-[9px] font-extrabold tracking-[0.12em] text-[#c98a04]">
                            THE WHOLE COURSEWORK — SEVEN SECTIONS, SEVEN SUMMARIES
                        </p>
                        {FLASH_SECTIONS.map((sec, i) => {
                            const text = summaries[sec.key];
                            if (!text) return null;
                            return (
                                <div key={sec.key} className="grid grid-cols-[36px_1fr] gap-[11px] border-b border-dashed border-[#eee3c8] py-3 last:border-0">
                                    <div className="flex h-9 w-9 flex-col items-center justify-center rounded-[10px] border border-[#eee3c8] bg-[#fffdf6] text-sm leading-none">
                                        {sec.emoji}
                                        <small className="mt-0.5 text-[7px] font-extrabold text-[#c98a04]">0{i + 1}</small>
                                    </div>
                                    <div>
                                        <div className="text-[8.5px] font-extrabold uppercase tracking-[0.06em] text-[#7a8095]">{sec.label}</div>
                                        <div className="mt-0.5 text-[11.5px] leading-[1.65] text-[#31405a]">
                                            <RichSummaryText text={text} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {history.length > 0 ? (
                        <p className="mx-[22px] mb-0 text-[10.5px] leading-[1.7] text-[#70808a]">
                            <b className="text-[#31405a]">Record history:</b> {history.join(" · ")}
                        </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-2.5 border-t border-[#dde5ea] bg-[#fafbfd] px-[22px] py-3 text-[10.5px] text-[#70808a]">
                        📎 {files.length ? `${files.length} file(s) attached — ${files.map(fileNameFromUrl).join(", ")}` : "No files attached (optional)"} · 🖋️ Declared accurate by student · Instructor:{" "}
                        <b className="text-[#14202b]">{si.teacherName || "—"}</b>
                        {si.teacherEmail ? ` · ${si.teacherEmail}` : ""}
                    </div>
                </div>

                <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-[#dde5ea] bg-white px-[22px] py-3">
                    <span className="flex-1 text-[11px] text-[#70808a]">
                        This is your approved coursework file. Scores and rankings stay with your faculty.
                    </span>
                    <button
                        type="button"
                        onClick={() => openApprovedFile(entry)}
                        className="inline-flex items-center gap-1 rounded-[9px] bg-[#174b43] px-2.5 py-2 text-[10px] font-black text-white"
                    >
                        ⬇️ DOWNLOAD APPROVED FILE
                    </button>
                </div>
            </div>
        </div>
    );
}
