"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Users, ShieldAlert, Clock } from "lucide-react";
import clsx from "clsx";
import { sdgData } from "@/utils/sdgData";
import {
    type FypEntry,
    composeFypSummaries,
    normalizeFypTeamMembers,
    fypRouteFor,
    FYP_MODES,
    FYP_SECTION_LABELS,
    FYP_SECTION_KEYS,
} from "@/utils/fypTypes";

const ROUTE_EMOJI: Record<string, string> = {
    scholar: "📜",
    maker: "🧵",
    builder: "🖥️",
    storyteller: "🎬",
    consultant: "📊",
};

/** One flash card per FYP / thesis record — closed shows a 5-second read, "View all" expands the full story. */
export default function ThesisCard({
    entry,
    defaultOpen = false,
    studentName,
    onSupervisorReview,
    reviewing = false,
}: {
    entry: FypEntry;
    defaultOpen?: boolean;
    /** Override for the ribbon's student name display (e.g. on a faculty/university deck showing someone else's card). */
    studentName?: string;
    /** Supplying this renders Approve/Reject actions in the footer — the supervisor-review gate that makes a submitted entry "go live" for Merit Model ranking. */
    onSupervisorReview?: (action: "approve" | "reject") => void;
    reviewing?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);

    const pi = entry.projectInfo || {};
    const find = entry.findings || {};
    const sm = entry.sdgMapping || {};
    const summaries = entry.sectionSummaries && Object.keys(entry.sectionSummaries).length ? entry.sectionSummaries : composeFypSummaries(entry);
    const route = fypRouteFor(pi);
    const teamMembers = normalizeFypTeamMembers(pi.teamMembers).filter((m) => m.name?.trim());
    const isTeam = teamMembers.length > 0;
    const displayName = studentName || pi.studentName || "Student";
    const approval = entry.supervisorApprovalStatus;
    // A brand-new, still-empty draft reads as broken if labelled "Untitled" — it's just not started yet.
    const displayTitle = pi.title || entry.projectTitle || (entry.status === "draft" ? "New FYP / thesis record — tap to continue" : "Untitled thesis");

    return (
        <div className="overflow-hidden rounded-ciel-lg border border-ciel-border bg-white shadow-sm">
            {/* Ribbon */}
            <div className="border-b border-ciel-border bg-ciel-page/60 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-ciel-sm bg-ciel-purple-deep text-lg text-white">
                            {ROUTE_EMOJI[route]}
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-base font-black text-ciel-text">{displayTitle}</p>
                            <p className="mt-0.5 truncate text-xs font-semibold uppercase tracking-wide text-ciel-text-soft">
                                {pi.school ? `${pi.school} · ` : ""}
                                {pi.degree || "Thesis"} · {displayName}
                                {pi.graduationYear ? ` · Class of ${pi.graduationYear}` : ""}
                            </p>
                        </div>
                    </div>
                    {entry.status === "submitted" && approval === "approved" ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> Approved & live
                        </span>
                    ) : entry.status === "submitted" && approval === "rejected" ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-red-700">
                            <ShieldAlert className="h-3 w-3" /> Changes requested
                        </span>
                    ) : entry.status === "submitted" ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700">
                            <Clock className="h-3 w-3" /> Awaiting supervisor approval
                        </span>
                    ) : (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700">
                            Draft
                        </span>
                    )}
                </div>

                {sm.noSdgApplies ? (
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-ciel-text-soft">➖ No SDG applies — flagged for review</span>
                    </div>
                ) : (sm.entries?.length ?? 0) > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-ciel-text-soft">SDGs</span>
                        {(sm.entries || []).map((en, i) => {
                            const sdg = sdgData.find((s) => s.number === en.goalNumber);
                            if (!sdg) return null;
                            return (
                                <span key={en.goalNumber} className="flex items-center gap-1.5 rounded-ciel-xs px-2 py-1 text-[10px] font-black text-white" style={{ backgroundColor: sdg.color }}>
                                    {i === 0 ? <span aria-hidden>★</span> : null}
                                    <span>{sdg.number}</span>
                                    <span className="hidden sm:inline">{sdg.title.toUpperCase()}</span>
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Ten-second story */}
            <div className="p-5">
                <p className="text-sm leading-relaxed text-ciel-text">{summaries.project || summaries.background || "No summary yet."}</p>
                {summaries.findings ? (
                    <p className="mt-2.5 rounded-ciel-xs border border-dashed border-ciel-border bg-ciel-page/60 px-3 py-2 text-xs font-semibold text-ciel-text-mid">
                        📎 {summaries.findings}
                    </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-ciel-purple-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ciel-purple-deep">
                        {FYP_MODES[route].name}
                    </span>
                    {find.evidenceStatus ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ciel-amber-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ciel-amber">
                            {find.evidenceStatus}
                        </span>
                    )
                    : null}
                    {entry.deliverables?.length ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ciel-green-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ciel-green-deep">
                            <CheckCircle2 className="h-3 w-3" /> Repository attached
                        </span>
                    ) : null}
                    {isTeam && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ciel-page px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ciel-text-mid">
                            <Users className="h-3 w-3" /> {teamMembers.length + 1} co-authors
                        </span>
                    )}
                </div>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setOpen((o) => !o);
                    }}
                    className="ciel-transition mt-4 flex w-full items-center justify-center gap-2 rounded-ciel-sm border border-ciel-border py-2.5 text-xs font-bold text-ciel-text-mid hover:border-ciel-purple/40 hover:text-ciel-purple-deep"
                >
                    <span>📖</span>
                    <span>{open ? "Close" : "View all — the whole thesis, summarised"}</span>
                    <ChevronDown className={clsx("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
                </button>

                {open && (
                    <div className="mt-4 space-y-3 border-t border-ciel-border pt-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-ciel-text-soft">Opened — every section in one read</p>
                        {FYP_SECTION_KEYS.map((key) => {
                            const text = summaries[key];
                            if (!text) return null;
                            const meta = FYP_SECTION_LABELS[key];
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
                        {isTeam && (
                            <div className="flex items-start gap-3">
                                <span className="text-base">👥</span>
                                <div className="min-w-0">
                                    <p className="text-xs font-black uppercase tracking-wide text-ciel-text-soft">Co-authors</p>
                                    <ul className="mt-1 space-y-1">
                                        {teamMembers.map((m, i) => (
                                            <li key={i} className="text-sm leading-relaxed text-ciel-text">
                                                {m.role?.trim() ? `${m.name} (${m.role})` : m.name}
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
                    {(pi.supervisorName || "? ?").split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?"}
                </span>
                <p className="min-w-0 flex-1 text-xs leading-relaxed text-ciel-text-mid">
                    {entry.status === "submitted" && approval === "approved" ? (
                        <>Approved by <b className="text-ciel-text">{pi.supervisorName || "supervisor"}</b>{pi.supervisorEmail ? ` · ${pi.supervisorEmail}` : ""} — live in Merit Model rankings</>
                    ) : entry.status === "submitted" && approval === "rejected" ? (
                        <>Changes requested by <b className="text-ciel-text">{pi.supervisorName || "supervisor"}</b>{entry.supervisorApprovalNote ? `: "${entry.supervisorApprovalNote}"` : ""}</>
                    ) : entry.status === "submitted" ? (
                        <>Awaiting one-click confirmation: <b className="text-ciel-text">{pi.supervisorName || "supervisor"}</b>{pi.supervisorEmail ? ` · ${pi.supervisorEmail}` : ""} — not yet ranked</>
                    ) : (
                        <>Supervised by <b className="text-ciel-text">{pi.supervisorName || "supervisor"}</b>{pi.supervisorEmail ? ` · ${pi.supervisorEmail}` : ""}</>
                    )}
                    <br />
                    On approval: 🧑‍🎓 co-author profiles · 🧑‍🏫 faculty deck · 🏫 university portal
                </p>
                {onSupervisorReview && entry.status === "submitted" && approval !== "approved" && (
                    <div className="flex shrink-0 gap-2">
                        <button
                            type="button"
                            onClick={() => onSupervisorReview("reject")}
                            disabled={reviewing}
                            className="ciel-transition rounded-ciel-xs border-2 border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                            Request changes
                        </button>
                        <button
                            type="button"
                            onClick={() => onSupervisorReview("approve")}
                            disabled={reviewing}
                            className="ciel-transition rounded-ciel-xs border-2 border-ciel-purple bg-ciel-purple px-3 py-2 text-xs font-bold text-white hover:bg-ciel-purple-deep disabled:opacity-50"
                        >
                            ✓ Approve — make live
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
