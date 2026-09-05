"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Users, ShieldAlert, Clock, Mail, MessageCircle } from "lucide-react";
import clsx from "clsx";
import { sdgData } from "@/utils/sdgData";
import { rankMovement } from "@/utils/courseProjectTypes";
import RichSummaryText from "@/components/ciel/RichSummaryText";
import { mailtoHref, whatsappShareHref } from "@/utils/reminderLinks";
import {
    type FypEntry,
    type FypSectionSummaries,
    composeFypSummaries,
    normalizeFypTeamMembers,
    fypRouteFor,
    FYP_MODES,
    FYP_SECTION_LABELS,
    FYP_SECTION_KEYS,
} from "@/utils/fypTypes";
import { hydrateV9 } from "@/app/dashboard/student/paths/fyp-thesis/FypV9FormUi";
import { composeFypV9Summaries } from "@/utils/fypV9Catalog";

const ROUTE_EMOJI: Record<string, string> = {
    scholar: "📜",
    maker: "🧵",
    builder: "🖥️",
    storyteller: "🎬",
    consultant: "📊",
};

const BADGE_EMOJI: Record<string, string> = { Gold: "🥇", Silver: "🥈", Bronze: "🥉", Participant: "🎖️" };

/** Same 7-summary → section-key mapping FypV9Workspace's own step-7 preview uses (no "literature"
 * key — V9's route model covers non-research work too, so there's no literature-review step). */
function v9PreviewSummaries(entry: FypEntry): FypSectionSummaries {
    const v9 = hydrateV9(entry);
    const team = normalizeFypTeamMembers(entry.projectInfo?.teamMembers).filter((m) => m.name?.trim());
    const [project, background, objectives, methodology, findings, sdg, reflection] = composeFypV9Summaries({
        title: entry.projectInfo?.title || entry.projectTitle || "",
        university: entry.projectInfo?.university || "",
        degree: entry.projectInfo?.degree || "",
        supervisor: entry.projectInfo?.supervisorName || "",
        teamNames: team.map((m) => m.name).filter(Boolean),
        v9,
    });
    return { project, background, objectives, methodology, findings, sdg, reflection };
}

/** One flash card per FYP / thesis record — closed shows a 5-second read, "View all" expands the full story. */
export default function ThesisCard({
    entry,
    defaultOpen = false,
    studentName,
    onSupervisorReview,
    reviewing = false,
    studentReminder,
    remindDraftOwner = false,
    studentEmail,
}: {
    entry: FypEntry;
    defaultOpen?: boolean;
    /** Override for the ribbon's student name display (e.g. on a faculty/university deck showing someone else's card). */
    studentName?: string;
    /** Supplying this renders Approve/Request revision/Reject actions in the footer — the supervisor-review gate that makes a submitted entry "go live" for Merit Model ranking. */
    onSupervisorReview?: (action: "approve" | "reject" | "revision", note?: string) => void;
    reviewing?: boolean;
    /** "team" renders Email/WhatsApp buttons to nudge co-authors on a draft; "faculty" renders the same to nudge the reviewing supervisor on a submitted record. */
    studentReminder?: "team" | "faculty";
    /** Opposite direction from studentReminder: renders Email/WhatsApp buttons for a faculty/university/admin viewer to nudge the student who owns this (still in-progress) draft. Requires studentEmail. */
    remindDraftOwner?: boolean;
    /** The draft owner's email — needed for remindDraftOwner (a plain FypEntry has no joined student record of its own). */
    studentEmail?: string;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const [reviewNote, setReviewNote] = useState("");

    const pi = entry.projectInfo || {};
    const find = entry.findings || {};
    const sm = entry.sdgMapping || {};
    // A V9-drafted entry has no sectionSummaries until final submit — falling back to the old (V8)
    // composer here misreads V9's field semantics (e.g. it labels the student's actual problem
    // statement as "deliberately out of scope"), so an in-progress V9 draft needs the V9 composer
    // instead, fed by the same hydration `FypV9Workspace` itself uses to resume a saved draft.
    const summaries =
        entry.sectionSummaries && Object.keys(entry.sectionSummaries).length
            ? entry.sectionSummaries
            : entry.projectInfo?.v9Form
              ? v9PreviewSummaries(entry)
              : composeFypSummaries(entry);
    const route = fypRouteFor(pi);
    const teamMembers = normalizeFypTeamMembers(pi.teamMembers).filter((m) => m.name?.trim());
    const isTeam = teamMembers.length > 0;
    const displayName = studentName || pi.studentName || "Student";
    const approval = entry.supervisorApprovalStatus;
    const ribbon = entry.meritRibbon;
    const movement = rankMovement(ribbon);
    // A brand-new, still-empty draft reads as broken if labelled "Untitled" — it's just not started yet.
    const displayTitle = pi.title || entry.projectTitle || (entry.status === "draft" ? "New FYP / thesis record — tap to continue" : "Untitled thesis");

    const teamEmails = teamMembers.map((m) => m.email).filter((e): e is string => !!e);
    const completionPct = Math.round(((entry.stepCompleted ?? 0) / 8) * 100);
    const reminder: { to: string; subject: string; body: string } | null =
        studentReminder === "faculty" && pi.supervisorEmail
            ? {
                  to: pi.supervisorEmail,
                  subject: `Reminder: "${displayTitle}" is awaiting your review on CIEL PK`,
                  body: `Hi ${pi.supervisorName || "there"},\n\nJust a friendly reminder that my Final Year Project record "${displayTitle}" has been submitted and is waiting for your approval on CIEL PK.\n\nThank you,\n${displayName}`,
              }
            : studentReminder === "team" && teamEmails.length
              ? {
                    to: teamEmails.join(","),
                    subject: `Reminder: let's finish "${displayTitle}" on CIEL PK`,
                    body: `Hi team,\n\nA quick reminder to help finish our Final Year Project record "${displayTitle}" on CIEL PK so we can submit it for supervisor review.\n\nThanks,\n${displayName}`,
                }
              : remindDraftOwner && studentEmail
                ? {
                      to: studentEmail,
                      subject: `Reminder: continue "${displayTitle}" on CIEL PK`,
                      body: `Hi ${displayName},\n\nYour Final Year Project record "${displayTitle}" is ${completionPct}% complete on CIEL PK. Please continue and submit it for supervisor review when it's ready.\n\nThanks,\n${pi.supervisorName || "Your supervisor"}`,
                  }
                : null;

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
                            <ShieldAlert className="h-3 w-3" /> Rejected
                        </span>
                    ) : entry.status === "submitted" && approval === "revision_requested" ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700">
                            <ShieldAlert className="h-3 w-3" /> Revision requested
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

                {entry.status === "draft" && (
                    <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] font-bold text-ciel-text-mid">
                            <span>{entry.stepCompleted ?? 0} of 8 steps complete</span>
                            <span>{completionPct}%</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ciel-page">
                            <div className="h-full rounded-full bg-ciel-purple" style={{ width: `${completionPct}%` }} />
                        </div>
                    </div>
                )}

                {sm.noSdgApplies ? (
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-ciel-text-soft">➖ No SDG applies — flagged for review</span>
                    </div>
                ) : (sm.entries?.length ?? 0) > 0 && (
                    <div className="mt-4 flex min-w-0 items-center gap-1.5 overflow-x-auto">
                        <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-ciel-text-soft">SDGs</span>
                        {(sm.entries || []).map((en, i) => {
                            const sdg = sdgData.find((s) => s.number === en.goalNumber);
                            if (!sdg) return null;
                            return (
                                <span
                                    key={en.goalNumber}
                                    title={`${sdg.number} ${sdg.title}`}
                                    className="inline-flex min-w-0 max-w-[9.75rem] shrink-0 items-center gap-1 whitespace-nowrap rounded-ciel-xs px-2 py-1 text-[10px] font-black text-white"
                                    style={{ backgroundColor: sdg.color }}
                                >
                                    {i === 0 ? <span aria-hidden className="shrink-0">★</span> : null}
                                    <span className="shrink-0">{sdg.number}</span>
                                    <span className="min-w-0 truncate">{sdg.title.toUpperCase()}</span>
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Ten-second story */}
            <div className="p-5">
                <p className="text-sm leading-relaxed text-ciel-text"><RichSummaryText text={summaries.project || summaries.background || "No summary yet."} /></p>
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
                        <>Rejected by <b className="text-ciel-text">{pi.supervisorName || "supervisor"}</b>{entry.supervisorApprovalNote ? `: "${entry.supervisorApprovalNote}"` : ""}</>
                    ) : entry.status === "submitted" && approval === "revision_requested" ? (
                        <>Revision requested by <b className="text-ciel-text">{pi.supervisorName || "supervisor"}</b>{entry.supervisorApprovalNote ? `: "${entry.supervisorApprovalNote}"` : ""}</>
                    ) : entry.status === "submitted" ? (
                        <>Awaiting one-click confirmation: <b className="text-ciel-text">{pi.supervisorName || "supervisor"}</b>{pi.supervisorEmail ? ` · ${pi.supervisorEmail}` : ""} — not yet ranked</>
                    ) : (
                        <>Supervised by <b className="text-ciel-text">{pi.supervisorName || "supervisor"}</b>{pi.supervisorEmail ? ` · ${pi.supervisorEmail}` : ""}</>
                    )}
                    <br />
                    On approval: 🧑‍🎓 co-author profiles · 🧑‍🏫 faculty deck · 🏫 university portal
                </p>
                {reminder && (
                    <div className="flex shrink-0 gap-2">
                        <a
                            href={mailtoHref(reminder.to, reminder.subject, reminder.body)}
                            onClick={(e) => e.stopPropagation()}
                            className="ciel-transition flex items-center gap-1.5 rounded-ciel-xs border-2 border-ciel-border bg-white px-3 py-2 text-xs font-bold text-ciel-text-mid hover:border-ciel-purple/40"
                        >
                            <Mail className="h-3.5 w-3.5" /> Email
                        </a>
                        <a
                            href={whatsappShareHref(`${reminder.subject}\n\n${reminder.body}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="ciel-transition flex items-center gap-1.5 rounded-ciel-xs border-2 border-ciel-border bg-white px-3 py-2 text-xs font-bold text-ciel-text-mid hover:border-ciel-purple/40"
                        >
                            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                        </a>
                    </div>
                )}
                {onSupervisorReview && entry.status === "submitted" && approval !== "approved" && (
                    <div className="flex w-full flex-col gap-2 pt-2">
                        <textarea
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            placeholder="Optional note for the student (visible on reject / request revision)…"
                            rows={2}
                            className="w-full rounded-ciel-xs border border-ciel-border px-2.5 py-1.5 text-xs text-ciel-text placeholder:text-ciel-text-soft focus:border-ciel-purple/50 focus:outline-none"
                        />
                        <div className="flex shrink-0 flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => onSupervisorReview("reject", reviewNote.trim() || undefined)}
                                disabled={reviewing}
                                className="ciel-transition rounded-ciel-xs border-2 border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                                ❌ Reject
                            </button>
                            <button
                                type="button"
                                onClick={() => onSupervisorReview("revision", reviewNote.trim() || undefined)}
                                disabled={reviewing}
                                className="ciel-transition rounded-ciel-xs border-2 border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                            >
                                🔁 Request revision
                            </button>
                            <button
                                type="button"
                                onClick={() => onSupervisorReview("approve", reviewNote.trim() || undefined)}
                                disabled={reviewing}
                                className="ciel-transition rounded-ciel-xs border-2 border-ciel-purple bg-ciel-purple px-3 py-2 text-xs font-bold text-white hover:bg-ciel-purple-deep disabled:opacity-50"
                            >
                                ✓ Approve — make live
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
