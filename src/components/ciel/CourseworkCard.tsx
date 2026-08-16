"use client";

import { useState } from "react";
import { CheckCircle2, Sparkles, Users, ChevronDown } from "lucide-react";
import clsx from "clsx";
import { sdgData } from "@/utils/sdgData";
import {
    type CourseProjectEntry,
    resolveSectionSummaries,
    courseProjectStory,
    activeSectionKeys,
    SECTION_LABELS,
    stripEmoji,
} from "@/utils/courseProjectTypes";

function formatBadgeEmoji(format?: string) {
    if (!format) return "📄";
    const m = format.match(/^[^\s]+/);
    return m ? m[0] : "📄";
}

/** One flash card per submitted (or draft) coursework report — closed shows a 5-second read, "View all" expands the full story. */
export default function CourseworkCard({
    entry,
    defaultOpen = false,
    studentName,
}: {
    entry: CourseProjectEntry;
    defaultOpen?: boolean;
    /** Override for the ribbon's student name display (e.g. on a faculty/university deck showing someone else's card). */
    studentName?: string;
}) {
    const [open, setOpen] = useState(defaultOpen);

    const si = entry.studentInfo || {};
    const ai = entry.assignmentInfo || {};
    const sm = entry.sdgMapping || {};
    const sdgEntries = sm.entries || [];
    const summaries = resolveSectionSummaries(entry);
    const story = courseProjectStory(entry);
    const groupSize = (si.groupMembers || []).filter(Boolean).length + 1;
    const displayName = studentName || si.studentName || "Student";
    const initials = (si.teacherName || "? ?").split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

    const proof = entry.resultsInfo?.findings?.[0] || entry.resultsInfo?.measurableImpact;

    return (
        <div className="overflow-hidden rounded-ciel-lg border border-ciel-border bg-white shadow-sm">
            {/* Ribbon */}
            <div className="border-b border-ciel-border bg-ciel-page/60 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-ciel-sm bg-ciel-navy text-lg text-white">
                            {formatBadgeEmoji(ai.format)}
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-base font-black text-ciel-text">{entry.projectTitle || "Untitled coursework"}</p>
                            <p className="mt-0.5 truncate text-xs font-semibold uppercase tracking-wide text-ciel-text-soft">
                                {ai.format ? stripEmoji(ai.format).split(" (")[0] + " · " : ""}
                                {entry.course || "Course"} · {displayName}
                                {si.semester ? ` · ${si.semester}` : ""}
                                {si.universityName ? ` · ${si.universityName}` : ""}
                            </p>
                        </div>
                    </div>
                    {entry.status === "submitted" ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> Verified
                        </span>
                    ) : (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700">
                            Draft
                        </span>
                    )}
                </div>

                {sdgEntries.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-ciel-text-soft">SDGs</span>
                        {sdgEntries.map((en) => {
                            const sdg = sdgData.find((s) => s.number === en.goalNumber);
                            if (!sdg) return null;
                            return (
                                <span key={en.goalNumber} className="flex items-center gap-1.5 rounded-ciel-xs px-2 py-1 text-[10px] font-black text-white" style={{ backgroundColor: sdg.color }}>
                                    <span>{sdg.number}</span>
                                    <span className="hidden sm:inline">{sdg.title.toUpperCase()}</span>
                                </span>
                            );
                        })}
                        {sdgEntries.some((e) => e.targets.length) && (
                            <span className="text-[10px] font-semibold text-ciel-text-soft">
                                + targets {sdgEntries.flatMap((e) => e.targets).join(", ")}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Ten-second story */}
            <div className="p-5">
                <p className="text-sm leading-relaxed text-ciel-text">{story}</p>
                {proof ? (
                    <p className="mt-2.5 rounded-ciel-xs border border-dashed border-ciel-border bg-ciel-page/60 px-3 py-2 text-xs font-semibold text-ciel-text-mid">
                        📎 Strongest proof: {proof}
                    </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                    {sm.origin?.includes("own idea") ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ciel-indigo-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ciel-indigo">
                            <Sparkles className="h-3 w-3" /> Student-initiated SDG
                        </span>
                    ) : null}
                    {!!entry.evidenceUrls?.length && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ciel-green-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ciel-green-deep">
                            <CheckCircle2 className="h-3 w-3" /> Evidence attached
                        </span>
                    )}
                    {groupSize > 1 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ciel-page px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ciel-text-mid">
                            <Users className="h-3 w-3" /> Group of {groupSize}
                        </span>
                    )}
                    {entry.reflectionInfo?.sdgLinkHonesty ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ciel-page px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ciel-text-mid">
                            {stripEmoji(entry.reflectionInfo.sdgLinkHonesty)}
                        </span>
                    ) : null}
                </div>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setOpen((o) => !o);
                    }}
                    className="ciel-transition mt-4 flex w-full items-center justify-center gap-2 rounded-ciel-sm border border-ciel-border py-2.5 text-xs font-bold text-ciel-text-mid hover:border-ciel-green/40 hover:text-ciel-navy"
                >
                    <span>📖</span>
                    <span>{open ? "Close" : "View all — summary of every section"}</span>
                    <ChevronDown className={clsx("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
                </button>

                {open && (
                    <div className="mt-4 space-y-3 border-t border-ciel-border pt-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-ciel-text-soft">Opened — the whole assignment, section by section</p>
                        {activeSectionKeys(entry).map((key) => {
                            const text = summaries[key];
                            if (!text) return null;
                            const meta = SECTION_LABELS[key];
                            return (
                                <div key={key} className="flex items-start gap-3">
                                    <span className="text-base">{meta.emoji}</span>
                                    <div className="min-w-0">
                                        <p className="text-xs font-black uppercase tracking-wide text-ciel-text-soft">{meta.label}</p>
                                        <p className="mt-0.5 text-sm leading-relaxed text-ciel-text">{text}</p>
                                    </div>
                                </div>
                            );
                        })}
                        {entry.addedNote ? (
                            <div className="flex items-start gap-3">
                                <span className="text-base">➕</span>
                                <div className="min-w-0">
                                    <p className="text-xs font-black uppercase tracking-wide text-ciel-text-soft">Student added</p>
                                    <p className="mt-0.5 text-sm leading-relaxed text-ciel-text">{entry.addedNote}</p>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 border-t border-ciel-border bg-ciel-page/60 px-5 py-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ciel-navy text-[10px] font-black text-white">
                    {initials || "?"}
                </span>
                <p className="min-w-0 text-xs leading-relaxed text-ciel-text-mid">
                    {entry.status === "submitted" ? (
                        <>Verified by <b className="text-ciel-text">{si.teacherName || "supervisor"}</b>{si.teacherEmail ? ` · ${si.teacherEmail}` : ""}</>
                    ) : (
                        <>Awaiting confirmation by <b className="text-ciel-text">{si.teacherName || "supervisor"}</b>{si.teacherEmail ? ` · ${si.teacherEmail}` : ""}</>
                    )}
                    <br />
                    Live on: 🧑‍🎓 student portfolio · 🧑‍🏫 faculty deck
                </p>
            </div>
        </div>
    );
}
