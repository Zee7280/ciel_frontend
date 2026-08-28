"use client";

import { useState } from "react";
import { CheckCircle2, Sparkles, Users, ChevronDown, Star, Paperclip, ShieldAlert, AlertTriangle, Clock } from "lucide-react";
import clsx from "clsx";
import { sdgData } from "@/utils/sdgData";
import RichSummaryText from "@/components/ciel/RichSummaryText";
import {
    type CourseProjectEntry,
    resolveSectionSummaries,
    courseProjectStory,
    activeSectionKeys,
    SECTION_LABELS,
    stripEmoji,
    normalizeGroupMembers,
    rankMovement,
} from "@/utils/courseProjectTypes";
import { courseworkStatusLabel } from "@/utils/courseworkSectionReview";

const BADGE_EMOJI: Record<string, string> = { Gold: "🥇", Silver: "🥈", Bronze: "🥉", Participant: "🎖️" };

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
    onFacultyReview,
    reviewing = false,
}: {
    entry: CourseProjectEntry;
    defaultOpen?: boolean;
    /** Override for the ribbon's student name display (e.g. on a faculty/university deck showing someone else's card). */
    studentName?: string;
    /** Supplying this renders Approve/Reject actions in the footer — the faculty-review gate that makes a submitted entry "go live" for Merit Model ranking. */
    onFacultyReview?: (action: "approve" | "reject" | "revision") => void;
    reviewing?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);

    const si = entry.studentInfo || {};
    const ai = entry.assignmentInfo || {};
    const sm = entry.sdgMapping || {};
    const re = entry.resultsInfo || {};
    const sdgEntries = sm.entries || [];
    const primaryFormat = ai.formats?.[0] ?? ai.format;
    const summaries = resolveSectionSummaries(entry);
    const story = courseProjectStory(entry);
    const isTeam = !!si.teamMode && si.teamMode !== "Individual" && si.teamMode !== "Solo";
    const groupMembers = normalizeGroupMembers(si.groupMembers).filter((m) => m.name?.trim());
    const groupSize = groupMembers.length + 1;
    const displayName = studentName || si.studentName || "Student";
    const initials = (si.teacherName || "? ?").split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
    const integration = entry.reflectionInfo?.integrationLevel || entry.reflectionInfo?.sdgLinkHonesty;

    const proof = re.findings?.[0] || re.metrics?.[0]?.meaning || re.measurableImpact;
    const evidenceLabel = re.metrics?.length ? (re.metrics.some((m) => m.status === "Actual — measured") ? "Actual measured result" : re.metrics[0].status || "Result declared") : re.measured ? stripEmoji(re.measured) : re.evidenceStatus;
    const approval = entry.facultyApprovalStatus;
    const ribbon = entry.meritRibbon;
    const statusLabel = courseworkStatusLabel(entry);
    const movement = rankMovement(ribbon);
    // A brand-new, still-empty draft reads as a broken/orphaned record if labelled "Untitled" —
    // it's just not started yet. Once anything's been typed, fall back to the generic label instead.
    const displayTitle = entry.projectTitle || (entry.status === "draft" ? "New coursework report — tap to continue" : "Untitled coursework");

    return (
        <div className="overflow-hidden rounded-ciel-lg border border-ciel-border bg-white shadow-sm">
            {ribbon && entry.status === "submitted" && approval === "approved" ? (
                <div className="bg-[linear-gradient(90deg,#f59e0b,#fbbf24)] px-4 py-2 text-[10px] font-black uppercase tracking-wide text-[#3b2202]">
                    {ribbon.rank === 1 ? "🥇" : ribbon.rank === 2 ? "🥈" : ribbon.rank === 3 ? "🥉" : "🏅"}{" "}
                    Ranked #{ribbon.rank} of {ribbon.of}
                    {ribbon.scope ? ` · ${ribbon.scope}` : ""}
                    {ribbon.total != null ? ` · ${ribbon.total}/100` : ""}
                    {ribbon.badgeLevel ? ` · ${BADGE_EMOJI[ribbon.badgeLevel]} ${ribbon.badgeLevel}` : ""}
                    {movement ? ` · ${movement.symbol} ${movement.label}` : ""}
                </div>
            ) : null}
            {/* Ribbon */}
            <div className="border-b border-ciel-border bg-ciel-page/60 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-ciel-sm bg-ciel-navy text-lg text-white">
                            {formatBadgeEmoji(primaryFormat)}
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-base font-black text-ciel-text">{displayTitle}</p>
                            <p className="mt-0.5 truncate text-xs font-semibold uppercase tracking-wide text-ciel-text-soft">
                                {primaryFormat ? stripEmoji(primaryFormat).split(" (")[0] + " · " : ""}
                                {entry.course || "Course"} · {displayName}
                                {si.semester ? ` · ${si.semester}` : ""}
                                {si.universityName ? ` · ${si.universityName}` : ""}
                            </p>
                        </div>
                    </div>
                    {statusLabel.tone === "approved" ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> Approved & live
                        </span>
                    ) : statusLabel.tone === "rejected" ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-red-700">
                            <ShieldAlert className="h-3 w-3" /> Rejected
                        </span>
                    ) : statusLabel.tone === "revision_requested" ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-800">
                            <AlertTriangle className="h-3 w-3" /> Revision requested
                        </span>
                    ) : statusLabel.tone === "under_review" ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700">
                            <Clock className="h-3 w-3" /> Awaiting faculty approval
                        </span>
                    ) : (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700">
                            Draft
                        </span>
                    )}
                </div>

                {sdgEntries.length > 0 && (
                    <div className="mt-4 flex min-w-0 items-center gap-1.5 overflow-x-auto">
                        <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-ciel-text-soft">SDGs</span>
                        {sdgEntries.map((en, i) => {
                            const sdg = sdgData.find((s) => s.number === en.goalNumber);
                            if (!sdg) return null;
                            const hint = [
                                `${sdg.number} ${sdg.title}`,
                                en.targets.length ? en.targets.join(", ") : "",
                            ]
                                .filter(Boolean)
                                .join(" · ");
                            return (
                                <span
                                    key={en.goalNumber}
                                    title={hint}
                                    className="inline-flex min-w-0 max-w-[9.75rem] shrink-0 items-center gap-1 whitespace-nowrap rounded-ciel-xs px-2 py-1 text-[10px] font-black text-white"
                                    style={{ backgroundColor: sdg.color }}
                                >
                                    {i === 0 ? <Star className="h-2.5 w-2.5 shrink-0 fill-current" /> : null}
                                    <span className="shrink-0">{sdg.number}</span>
                                    <span className="min-w-0 truncate">{sdg.title.toUpperCase()}</span>
                                    {en.targets.length ? (
                                        <span className="shrink-0 font-semibold opacity-90">· {en.targets.join(", ")}</span>
                                    ) : null}
                                </span>
                            );
                        })}
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
                    {sm.origin && /student/i.test(sm.origin) ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ciel-indigo-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ciel-indigo">
                            <Sparkles className="h-3 w-3" /> Student-initiated SDG
                        </span>
                    ) : null}
                    {evidenceLabel ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ciel-amber-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ciel-amber">
                            {evidenceLabel}
                        </span>
                    ) : null}
                    {entry.assignmentFileUrl ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ciel-green-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ciel-green-deep">
                            <Paperclip className="h-3 w-3" /> Assignment attached — verifiable
                        </span>
                    ) : !!entry.evidenceUrls?.length && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ciel-green-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ciel-green-deep">
                            <CheckCircle2 className="h-3 w-3" /> Evidence attached
                        </span>
                    )}
                    {isTeam && groupSize > 1 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ciel-page px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ciel-text-mid">
                            <Users className="h-3 w-3" /> {si.teamMode} of {groupSize}
                        </span>
                    )}
                    {integration ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ciel-page px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ciel-text-mid">
                            {stripEmoji(integration)}
                        </span>
                    ) : null}
                </div>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setOpen((o) => !o);
                    }}
                    className="ciel-transition mt-4 flex w-full items-center justify-center gap-2 rounded-ciel-sm border border-ciel-border py-2.5 text-xs font-bold text-ciel-text-mid hover:border-ciel-gold/40 hover:text-ciel-navy"
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
                                        <p className="mt-0.5 text-sm leading-relaxed text-ciel-text"><RichSummaryText text={text} /></p>
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
                        {groupMembers.length > 0 && (
                            <div className="flex items-start gap-3">
                                <span className="text-base">👥</span>
                                <div className="min-w-0">
                                    <p className="text-xs font-black uppercase tracking-wide text-ciel-text-soft">Team members</p>
                                    <ul className="mt-1 space-y-1">
                                        {groupMembers.map((m, i) => (
                                            <li key={i} className="text-sm leading-relaxed text-ciel-text">
                                                {m.name}
                                                {m.email ? (
                                                    m.inviteStatus === "accepted" ? (
                                                        <span className="ml-1.5 text-xs font-bold text-ciel-green-deep">✅ Confirmed</span>
                                                    ) : (
                                                        <span className="ml-1.5 text-xs font-bold text-ciel-gold-deep">✉️ Invited</span>
                                                    )
                                                ) : null}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center gap-3 border-t border-ciel-border bg-ciel-page/60 px-5 py-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ciel-navy text-[10px] font-black text-white">
                    {initials || "?"}
                </span>
                <p className="min-w-0 flex-1 text-xs leading-relaxed text-ciel-text-mid">
                    {statusLabel.tone === "approved" ? (
                        <>Approved by <b className="text-ciel-text">{si.teacherName || "supervisor"}</b>{si.teacherEmail ? ` · ${si.teacherEmail}` : ""} — live in Merit Model rankings</>
                    ) : statusLabel.tone === "rejected" ? (
                        <>Rejected by <b className="text-ciel-text">{si.teacherName || "supervisor"}</b>{entry.facultyApprovalNote ? `: "${entry.facultyApprovalNote}"` : ""}</>
                    ) : statusLabel.tone === "revision_requested" ? (
                        <>Revision requested by <b className="text-ciel-text">{si.teacherName || "supervisor"}</b>{entry.facultyApprovalNote ? `: "${entry.facultyApprovalNote}"` : ""}</>
                    ) : statusLabel.tone === "under_review" ? (
                        <>Awaiting approval by <b className="text-ciel-text">{si.teacherName || "supervisor"}</b>{si.teacherEmail ? ` · ${si.teacherEmail}` : ""} — not yet ranked</>
                    ) : (
                        <>Draft — not yet submitted to <b className="text-ciel-text">{si.teacherName || "supervisor"}</b></>
                    )}
                    <br />
                    Live on: 🧑‍🎓 student portfolio · 🧑‍🏫 faculty deck
                </p>
                {onFacultyReview && entry.status === "submitted" && approval !== "approved" && (
                    <div className="flex shrink-0 gap-2">
                        <button
                            type="button"
                            onClick={() => onFacultyReview("reject")}
                            disabled={reviewing}
                            className="ciel-transition rounded-ciel-xs border-2 border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                            Reject
                        </button>
                        <button
                            type="button"
                            onClick={() => onFacultyReview("revision")}
                            disabled={reviewing}
                            className="ciel-transition rounded-ciel-xs border-2 border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                        >
                            Request revision
                        </button>
                        <button
                            type="button"
                            onClick={() => onFacultyReview("approve")}
                            disabled={reviewing}
                            className="ciel-transition rounded-ciel-xs border-2 border-ciel-green bg-ciel-green px-3 py-2 text-xs font-bold text-white hover:bg-ciel-green-deep disabled:opacity-50"
                        >
                            ✓ Approve — make live
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
