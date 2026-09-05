"use client";

import { toast } from "sonner";
import { sdgData } from "@/utils/sdgData";
import { type CourseProjectEntry } from "@/utils/courseProjectTypes";
import {
    courseworkApprovedMetaLine,
    courseworkFlashHeadline,
    courseworkRankTrend,
    courseworkRibbonBadgeClass,
    formatFlashDate,
} from "@/utils/courseworkFlashCard";

function openApprovedFile(entry: CourseProjectEntry) {
    const files = [...(entry.assignmentFileUrl ? [entry.assignmentFileUrl] : []), ...(entry.evidenceUrls || [])].filter(Boolean);
    if (!files.length) {
        toast.message("No files attached (optional)");
        return;
    }
    window.open(files[0], "_blank", "noopener,noreferrer");
}

export default function CourseworkImpactListCard({
    entry,
    onOpenFlashcard,
}: {
    entry: CourseProjectEntry;
    onOpenFlashcard: () => void;
}) {
    const sdgEntries = entry.sdgMapping?.entries || [];
    const ribbon = entry.meritRibbon;
    const trend = courseworkRankTrend(entry);
    const badgeKind = courseworkRibbonBadgeClass(ribbon?.scope);

    return (
        <div className="grid grid-cols-1 items-start gap-4 rounded-2xl border border-[#dde5ea] bg-white p-[15px] md:grid-cols-[minmax(0,1fr)_290px]">
            <div>
                <h4 className="m-0 text-[15px] font-semibold text-[#16313d]">
                    {entry.projectTitle || "Untitled coursework"}{" "}
                    <span className="inline-flex align-middle gap-1">
                        {sdgEntries.map((en) => {
                            const sdg = sdgData.find((s) => s.number === en.goalNumber);
                            return (
                                <span
                                    key={en.goalNumber}
                                    title={sdg ? `SDG ${sdg.number} ${sdg.title}` : `SDG ${en.goalNumber}`}
                                    className="inline-grid h-[22px] w-[22px] place-items-center rounded-md text-[9px] font-black text-white"
                                    style={{ background: sdg?.color || "#596971" }}
                                >
                                    {en.goalNumber}
                                </span>
                            );
                        })}
                    </span>
                </h4>
                {entry.isOwner === false ? (
                    <p className="mt-1 text-[10.5px] font-semibold text-[#4f46e5]">
                        Team project — led by {entry.studentInfo?.studentName || "a teammate"}
                    </p>
                ) : null}
                <p className="mt-0.5 text-[10.5px] text-[#70808a]">{courseworkApprovedMetaLine(entry)}</p>
                <div className="mt-3 rounded-xl border border-[#e8edef] bg-[#fafbfb] px-3 py-2.5">
                    <span className="inline-block rounded-[18px] bg-[#e8f5ef] px-2 py-1 text-[9.5px] font-black text-[#1d765d]">
                        ✓ FACULTY APPROVED
                    </span>
                    <p className="mt-2 text-[11px] text-[#31405a]">{courseworkFlashHeadline(entry)}</p>
                </div>
                {ribbon ? (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
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
                    <div className="mt-2.5">
                        <span className="inline-flex rounded-xl border border-[#e3e8ec] bg-[#f7f8fa] px-2.5 py-1.5 text-[10.5px] font-semibold text-[#70808a]">
                            No ranking badge yet — badges arrive when your faculty or university publish a final ranking, and CIEL PK&apos;s live rank updates continuously.
                        </span>
                    </div>
                )}
            </div>
            <div className="border-t border-[#dde5ea] pt-3 md:border-l md:border-t-0 md:pl-3.5 md:pt-0">
                <div className="mb-2.5 rounded-[11px] border border-[#dde5ea] bg-[#f8fafb] px-2.5 py-2.5">
                    <b className="block text-[11px] text-[#16313d]">Published to</b>
                    <small className="mt-0.5 block text-[10px] text-[#70808a]">🧑‍🎓 Student · 🧑‍🏫 Faculty · 🏫 University · 🌐 CIEL PK</small>
                </div>
                <button
                    type="button"
                    onClick={onOpenFlashcard}
                    className="mr-1 mt-0.5 inline-flex items-center gap-1 rounded-[9px] bg-[#174b43] px-2.5 py-2 text-[10px] font-black text-white"
                >
                    🃏 OPEN FLASHCARD
                </button>
                <button
                    type="button"
                    onClick={() => openApprovedFile(entry)}
                    className="mt-0.5 inline-flex items-center gap-1 rounded-[9px] bg-[#eef2f3] px-2.5 py-2 text-[10px] font-black text-[#29454f]"
                >
                    ⬇️ FILE
                </button>
            </div>
        </div>
    );
}
