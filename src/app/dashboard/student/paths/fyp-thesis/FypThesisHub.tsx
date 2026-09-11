"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { CourseworkCrumb, HubBackButton } from "@/components/ciel/coursework/CourseworkHubChrome";
import { MOCKUP_GRADIENTS, MockupActionCard, MockupHero, MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import PathHubGuide from "@/components/ciel/PathHubGuide";
import EmptyState from "@/components/ciel/EmptyState";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";
import { type FypEntry, normalizeFypTeamMembers } from "@/utils/fypTypes";
import { createStudentFyp, listStudentFyps } from "@/utils/fypStudentApi";
import { isPathEntryApproved } from "@/utils/reviewQueue";
import { fypStatusLabel } from "@/utils/pathReviewStatus";
import { mailtoHref, whatsappTargetedHref } from "@/utils/reminderLinks";
import { fetchStudentDashboardData } from "@/utils/student-dashboard-fetch";
import { fetchImpactSummary, readImpactSummaryCache, type CielImpactSummary } from "@/utils/cielImpactSummary";
import { CIEL_PATHS } from "@/utils/cielPaths";
import type { DashboardData } from "@/app/dashboard/student/types";
import { FYP_V9_AREAS, FYP_V9_ROUTES, FYP_V9_STEP_NAMES, type FypV9RouteKey } from "@/utils/fypV9Catalog";
import { SDG_COLORS } from "@/utils/ventureStudioV11";

const BASE = "/dashboard/student/paths/fyp-thesis";
const HOME_HREF = "/dashboard/student";
const GUIDE_HREF = `${BASE}?view=guide`;
const IN_PROGRESS_HREF = `${BASE}?view=in-progress`;
const UNDER_REVIEW_HREF = `${BASE}?view=under-review`;
const WALL_HREF = `${BASE}?view=wall`;
const SECTION_TOTAL = FYP_V9_STEP_NAMES.length;

const HUB_VIEW_LABEL: Record<string, string> = {
    guide: "Guidance",
    wall: "Impact",
    "in-progress": "In Progress",
    "under-review": "Under Review",
    create: "Create",
    workspace: "Create",
};

const FYP_GUIDE_STEPS = [
    { emoji: "🧭", title: "Route", blurb: "Title, university, discipline and the primary form of your FYP." },
    { emoji: "🎯", title: "Roadmap", blurb: "Brief, why it matters, deliverables and an editable stage plan." },
    { emoji: "🛠️", title: "Pathway", blurb: "Only the questions for your selected FYP route appear." },
    { emoji: "🔎", title: "Evidence", blurb: "How you tested or supported the work — quant, qual, or both." },
    { emoji: "✨", title: "Outcome", blurb: "Final output, headline findings and contribution." },
    { emoji: "🌍", title: "Sustainability", blurb: "Honest SDG link — or declare that none applies." },
    { emoji: "🪞", title: "Reflection", blurb: "What you learned, skills, and optional opportunity radar." },
    { emoji: "📦", title: "Review", blurb: "Accept the seven summaries, attach evidence, submit to your supervisor." },
];

type HubView = "home" | "guide" | "wall" | "in-progress" | "under-review" | "create" | "workspace";
type ReviewTab = "all" | "pending" | "revision" | "rejected";

function displayFypId(entry: FypEntry) {
    const year = entry.createdAt ? new Date(entry.createdAt).getFullYear() : new Date().getFullYear();
    const tail = (entry.id || "").replace(/-/g, "").slice(-5).toUpperCase() || "00000";
    return `FYP-${year}-${tail}`;
}

function formatDay(value?: string | null) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value.slice(0, 10);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, " ");
}

function shortPerson(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "contact";
    if (/^dr\.?$/i.test(parts[0]) && parts[1]) return `${parts[0].replace(/\.$/, "")}. ${parts[1]}`;
    return parts[0];
}

function isRevision(entry: FypEntry) {
    return entry.status === "submitted" && entry.supervisorApprovalStatus === "revision_requested";
}

function isRejected(entry: FypEntry) {
    return entry.status === "submitted" && entry.supervisorApprovalStatus === "rejected";
}

function isPendingReview(entry: FypEntry) {
    return entry.status === "submitted" && !isPathEntryApproved(entry) && !isRevision(entry) && !isRejected(entry);
}

function teamMembers(entry: FypEntry) {
    return normalizeFypTeamMembers(entry.projectInfo?.teamMembers);
}

function teamNames(entry: FypEntry) {
    return teamMembers(entry)
        .map((m) => m.name?.trim())
        .filter(Boolean) as string[];
}

function fypTitle(entry: FypEntry) {
    return entry.projectTitle?.trim() || entry.projectInfo?.title?.trim() || "Untitled Final Year Project";
}

function routeLabel(entry: FypEntry) {
    const key = entry.projectInfo?.v9Route as FypV9RouteKey | undefined;
    if (key && FYP_V9_ROUTES[key]) return FYP_V9_ROUTES[key].tag;
    return entry.projectInfo?.academicArea || FYP_V9_AREAS[entry.projectInfo?.academicAreaKey || ""]?.label || "FYP";
}

function sectionsDone(entry: FypEntry) {
    if (entry.status === "submitted" && !isRevision(entry)) return SECTION_TOTAL;
    return Math.max(0, Math.min(SECTION_TOTAL, entry.stepCompleted ?? 0));
}

function completionPct(entry: FypEntry) {
    return Math.round((sectionsDone(entry) / SECTION_TOTAL) * 100);
}

function progCat(pct: number): [string, string] {
    if (pct >= 100) return ["💯", "Ready to Submit"];
    if (pct > 75) return ["🏁", "Near Completion"];
    if (pct > 50) return ["📈", "Advanced Progress"];
    if (pct > 25) return ["🔨", "Mid Development"];
    return ["🌱", "Early Stage"];
}

function remainingSectionNames(entry: FypEntry) {
    const done = sectionsDone(entry);
    return FYP_V9_STEP_NAMES.slice(done).join(", ");
}

function headline(entry: FypEntry) {
    return (
        entry.sectionSummaries?.project?.trim() ||
        entry.sectionSummaries?.findings?.trim() ||
        entry.findings?.findings?.filter(Boolean)[0] ||
        entry.background?.problem?.trim() ||
        "Submitted FYP flashcard."
    );
}

function sdgNumbers(entry: FypEntry) {
    return (entry.sdgMapping?.entries || []).map((e) => e.goalNumber).filter((n) => n >= 1 && n <= 17);
}

function actionWithLabel(entry: FypEntry) {
    if (isPathEntryApproved(entry)) return "None — Approved";
    if (isRejected(entry)) return "None — Closed";
    if (isPendingReview(entry)) return "Faculty";
    return "Student";
}

function nextAction(entry: FypEntry) {
    const pct = completionPct(entry);
    const remaining = SECTION_TOTAL - sectionsDone(entry);
    if (isPathEntryApproved(entry)) return "No action required — published to every FYP impact wall.";
    if (isRejected(entry)) return "Closed — kept on record; never published to any impact wall.";
    if (isRevision(entry)) return "Next: press Continue Revision, edit the sections named in the comments, then resubmit from the form.";
    if (isPendingReview(entry)) return "Next: wait for your supervisor’s decision — a polite reminder is fine.";
    if (pct >= 100) return "Next: everything is complete — open the form and submit your FYP for review.";
    return `Next: continue your FYP — ${remaining} section${remaining === 1 ? "" : "s"} remaining.`;
}

function pillClass(tone: ReturnType<typeof fypStatusLabel>["tone"]) {
    if (tone === "approved") return "bg-[#e8f5ef] text-[#1d765d]";
    if (tone === "rejected" || tone === "revision_requested") return "bg-[#fdeeee] text-[#b34c4c]";
    if (tone === "under_review") return "bg-[#fff3dc] text-[#a66d11]";
    return "bg-[#edf4fb] text-[#376d9f]";
}

function RemindPair({
    name,
    email,
    whatsappCode,
    whatsappNumber,
    subject,
    body,
}: {
    name: string;
    email?: string;
    whatsappCode?: string;
    whatsappNumber?: string;
    subject: string;
    body: string;
}) {
    const sn = shortPerson(name);
    const text = `${subject}\n\n${body}`;
    return (
        <>
            {email ? (
                <a href={mailtoHref(email, subject, body)} className="inline-flex items-center gap-1 rounded-[9px] bg-[#edf4fb] px-2.5 py-1.5 text-[10px] font-black text-[#376d9f]">
                    ✉️ Email {sn}
                </a>
            ) : null}
            <a
                href={whatsappTargetedHref(whatsappCode, whatsappNumber, text)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-[9px] bg-[#e6f7ee] px-2.5 py-1.5 text-[10px] font-black text-[#137a4b]"
            >
                💬 WhatsApp {sn}
            </a>
        </>
    );
}

function SdgTiles({ entry }: { entry: FypEntry }) {
    const nums = sdgNumbers(entry);
    if (!nums.length) return null;
    return (
        <span className="ml-1.5 inline-flex align-middle gap-1">
            {nums.map((n) => (
                <span
                    key={n}
                    title={`SDG ${n}`}
                    className="inline-grid h-[22px] w-[22px] place-items-center rounded-[6px] text-[9px] font-black text-white"
                    style={{ background: SDG_COLORS[n] || "#70808a" }}
                >
                    {n}
                </span>
            ))}
        </span>
    );
}

function RankBadges({ entry }: { entry: FypEntry }) {
    const ribbon = entry.meritRibbon;
    if (!ribbon) {
        return (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
                <span className="rounded-xl border border-[#e3e8ec] bg-[#f7f8fa] px-2.5 py-1.5 text-[10.5px] font-semibold text-[#70808a]">
                    No ranking badge yet — badges arrive when your supervisor or university publish a final FYP ranking.
                </span>
            </div>
        );
    }
    const when = formatDay(ribbon.at);
    return (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="inline-flex flex-col rounded-xl border border-[#f1d68a] bg-[#fff6df] px-2.5 py-1.5 text-[10.5px] font-black leading-tight text-[#7a5a08]">
                🏅 #{ribbon.rank} of {ribbon.of}
                {ribbon.badgeLevel ? ` · ${ribbon.badgeLevel}` : ""}
                <small className="text-[8.5px] font-bold opacity-80">
                    {ribbon.scope}
                    {when ? ` · ${when}` : ""}
                </small>
            </span>
        </div>
    );
}

function ProgressCard({
    entry,
    onOpen,
    onDelete,
    deleting,
}: {
    entry: FypEntry;
    onOpen: () => void;
    onDelete?: () => void;
    deleting?: boolean;
}) {
    const pct = completionPct(entry);
    const done = sectionsDone(entry);
    const remaining = SECTION_TOTAL - done;
    const cat = progCat(pct);
    const st = fypStatusLabel(entry);
    const names = teamNames(entry);
    const teamTxt = names.length ? `Team: ${names.join(", ")}` : "Individual";
    const faculty = entry.projectInfo?.supervisorName?.trim() || "your supervisor";
    const uni = entry.projectInfo?.university?.trim() || "University";
    const me = readStoredCurrentUser();
    const myName = typeof me?.name === "string" && me.name.trim() ? me.name.trim() : "me";
    const myEmail = typeof me?.email === "string" ? me.email.trim() : "";
    const teammates = teamMembers(entry).filter((m) => {
        const email = m.email?.trim().toLowerCase() || "";
        if (email && myEmail && email === myEmail.toLowerCase()) return false;
        return Boolean(m.name?.trim());
    });
    const title = fypTitle(entry);
    const remainingList = remainingSectionNames(entry);

    return (
        <div className="relative grid grid-cols-1 items-start gap-4 rounded-2xl border border-[#dde5ea] bg-white p-[15px] md:grid-cols-[minmax(0,1fr)_290px]">
            <div>
                <h4 className="m-0 text-[15px] font-semibold text-[#14202b]">{title}</h4>
                <p className="mt-1 text-[10.5px] text-[#70808a]">
                    <b className="font-semibold text-[#14202b]">{displayFypId(entry)}</b>
                    {" · "}
                    {routeLabel(entry)}
                    {entry.projectInfo?.officialProgram ? ` · ${entry.projectInfo.officialProgram}` : ""}
                    {entry.projectInfo?.span ? ` · ${entry.projectInfo.span}` : ""}
                    {` · ${teamTxt} · Supervisor: ${faculty} · ${uni}`}
                </p>
                <div className="mt-2.5 rounded-xl border border-[#e8edef] bg-[#fafbfb] px-3 py-2.5 text-[11px] leading-relaxed">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] font-black">
                        <span>
                            {st.label}{" "}
                            <span className="ml-1 inline-block rounded-[18px] bg-[#edf4fb] px-2 py-1 text-[9.5px] font-black text-[#376d9f]">
                                {cat[0]} {cat[1]}
                            </span>
                        </span>
                        <span>{pct}% complete</span>
                    </div>
                    <div className="mt-1.5 h-2 min-w-[120px] overflow-hidden rounded-lg bg-[#e6ecee]">
                        <i className="block h-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#15a08e,#e4a73e)" }} />
                    </div>
                    <p className="mt-1.5 text-[10.5px] text-[#70808a]">
                        <b className="font-semibold text-[#14202b]">
                            {done} of {SECTION_TOTAL} Sections Completed
                        </b>
                        {` · ${remaining} remaining`}
                        {remainingList ? ` · ${remainingList}` : ""}
                    </p>
                    <p className="mt-1 text-[10.5px] text-[#70808a]">💾 Auto-saved continuously · last updated {formatDay(entry.updatedAt) || "just now"}</p>
                    <p className="mt-2 text-[11px] text-[#31405a]">
                        ⚡ <b>Action with: {actionWithLabel(entry)}</b> · {nextAction(entry)}
                    </p>
                </div>
                <div className="mt-2.5 rounded-xl border border-[#d5eee8] bg-[#f4faf8] px-3 py-2.5 text-[11px] leading-relaxed">
                    <b className="mb-1 block text-[10px] font-black uppercase tracking-wide text-[#71828e]">One master record — auto-connected</b>
                    <div className="flex flex-wrap gap-1.5">
                        {(names.length ? names : [myName]).map((n) => (
                            <span key={n} className="rounded-lg bg-white px-2 py-1 text-[10.5px] font-semibold text-[#16313d]">
                                {n === myName ? "🧑‍🎓" : "👥"} {n}
                            </span>
                        ))}
                        <span className="rounded-lg bg-white px-2 py-1 text-[10.5px] font-semibold text-[#16313d]">🧑‍🏫 {faculty}</span>
                        <span className="rounded-lg bg-white px-2 py-1 text-[10.5px] font-semibold text-[#16313d]">🏫 {uni}</span>
                        <span className="rounded-lg bg-white px-2 py-1 text-[10.5px] font-semibold text-[#16313d]">🌐 CIEL PK</span>
                    </div>
                    <p className="mt-1.5 text-[9.5px] text-[#5f7a72]">
                        All stakeholders see this same live record ({displayFypId(entry)}) — no duplicates; team members share one FYP ID.
                    </p>
                </div>
                <div className="mt-2.5 rounded-xl border border-[#e8edef] bg-[#fafbfb] px-3 py-2.5">
                    <b className="mb-1 block text-[10px] font-black uppercase tracking-wide text-[#71828e]">Stakeholder reminders — each button names its recipient</b>
                    {teammates.length ? (
                        <>
                            <p className="mb-1 text-[9.5px] text-[#70808a]">Nudge a team member to finish their part:</p>
                            <div className="flex flex-wrap gap-1">
                                {teammates.map((m) => (
                                    <RemindPair
                                        key={`${m.email || m.name}`}
                                        name={m.name}
                                        email={m.email}
                                        whatsappCode={m.whatsappCode}
                                        whatsappNumber={m.whatsappNumber}
                                        subject={`Reminder: ${title} (${displayFypId(entry)}) still needs your part`}
                                        body={`Hi ${shortPerson(m.name)},\n\nPlease help finish "${title}" on CIEL PK — our FYP draft is still in progress.\n\nThanks.`}
                                    />
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="mb-1 text-[9.5px] text-[#70808a]">Send yourself a reminder:</p>
                            <div className="flex flex-wrap gap-1">
                                <RemindPair
                                    name={myName}
                                    email={myEmail || undefined}
                                    subject={`Continue ${title} on CIEL PK`}
                                    body={`Reminder to continue my FYP "${title}" (${displayFypId(entry)}) on CIEL PK.`}
                                />
                            </div>
                        </>
                    )}
                    <p className="mb-1 mt-1.5 text-[9.5px] text-[#70808a]">Ask your supervisor {faculty} a question:</p>
                    <div className="flex flex-wrap gap-1">
                        <RemindPair
                            name={faculty}
                            email={entry.projectInfo?.supervisorEmail}
                            subject={`Question about ${title} (${displayFypId(entry)})`}
                            body={`Hi ${shortPerson(faculty)},\n\nI have a question about my FYP "${title}" on CIEL PK.\n\nThank you.`}
                        />
                    </div>
                </div>
            </div>
            <div className="border-[#dde5ea] md:border-l md:pl-3.5">
                <div className="mb-2.5 rounded-[11px] border border-[#dde5ea] bg-[#f8fafb] px-2.5 py-2.5">
                    <b className="block text-[11px] text-[#16313d]">Current workflow owner</b>
                    <small className="mt-1 block text-[10px] text-[#70808a]">
                        Student{names.length ? " team" : ""} — {pct >= 100 ? "ready to submit" : "record in progress"}
                    </small>
                </div>
                {pct >= 100 ? (
                    <>
                        <button type="button" onClick={onOpen} className="mb-1 inline-flex w-full items-center justify-center gap-1 rounded-[9px] bg-[#174b43] px-3.5 py-2.5 text-[11px] font-black text-white">
                            📤 SUBMIT FYP FOR REVIEW
                        </button>
                        <button type="button" onClick={onOpen} className="inline-flex w-full items-center justify-center gap-1 rounded-[9px] bg-[#eef2f3] px-3.5 py-2.5 text-[11px] font-black text-[#29454f]">
                            ✏️ OPEN FYP FORM
                        </button>
                    </>
                ) : (
                    <>
                        <button type="button" onClick={onOpen} className="mb-1 inline-flex w-full items-center justify-center gap-1 rounded-[9px] bg-[#174b43] px-3.5 py-[11px] text-[11px] font-black text-white">
                            ▶ CONTINUE FYP
                        </button>
                        <Link href={BASE} className="inline-flex w-full items-center justify-center gap-1 rounded-[9px] bg-[#eef2f3] px-3.5 py-2.5 text-[11px] font-black text-[#29454f]">
                            💾 SAVE & CLOSE
                        </Link>
                    </>
                )}
                {onDelete && entry.isOwner !== false ? (
                    <button
                        type="button"
                        onClick={onDelete}
                        disabled={deleting}
                        aria-label="Delete draft"
                        className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-[9px] border border-[#dde5ea] bg-white px-3 py-2 text-[10px] font-extrabold text-[#70808a] hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                    >
                        <Trash2 className="h-3.5 w-3.5" /> Delete draft
                    </button>
                ) : null}
            </div>
        </div>
    );
}

function ReviewCard({ entry, onOpen }: { entry: FypEntry; onOpen: () => void }) {
    const st = fypStatusLabel(entry);
    const pending = isPendingReview(entry);
    const names = teamNames(entry);
    const faculty = entry.projectInfo?.supervisorName?.trim() || "your supervisor";
    const uni = entry.projectInfo?.university?.trim() || "University";
    const title = fypTitle(entry);
    const files = entry.deliverables?.length || 0;
    const latestFile = entry.deliverables?.[entry.deliverables.length - 1];

    return (
        <div className="grid grid-cols-1 items-start gap-4 rounded-2xl border border-[#dde5ea] bg-white p-[15px] md:grid-cols-[minmax(0,1fr)_290px]">
            <div>
                <h4 className="m-0 text-[15px] font-semibold text-[#14202b]">
                    {title} <SdgTiles entry={entry} />
                </h4>
                <p className="mt-1 text-[10.5px] text-[#70808a]">
                    <b className="font-semibold text-[#14202b]">{displayFypId(entry)}</b>
                    {` · ${routeLabel(entry)}`}
                    {names.length ? ` · Team — ${names.join(", ")}` : ""}
                    {entry.updatedAt ? ` · Submitted ${formatDay(entry.updatedAt)}` : ""}
                    {` · Supervisor ${faculty} · ${uni}`}
                </p>
                <div className="mt-2.5 rounded-xl border border-[#e8edef] bg-[#fafbfb] px-3 py-2.5">
                    <span className={`inline-block rounded-[18px] px-2 py-1 text-[9.5px] font-black uppercase ${pillClass(st.tone)}`}>{st.label}</span>
                    <span className="ml-1.5 text-[10.5px] text-[#70808a]">
                        {pending
                            ? `Supervisor owns the next action · waiting${entry.updatedAt ? ` since ${formatDay(entry.updatedAt)}` : ""}`
                            : isRevision(entry)
                              ? "You own the next action"
                              : "Decision recorded"}
                    </span>
                    <p className="mt-2 text-[11px] text-[#31405a]">{headline(entry)}</p>
                    <p className="mt-2 text-[11px] text-[#31405a]">
                        ⚡ <b>Action with: {actionWithLabel(entry)}</b> · {nextAction(entry)}
                    </p>
                    {pending ? (
                        <p className="mt-1.5 text-[10px] text-[#70808a]">🔒 Your record is locked while under review — it reopens automatically if your supervisor requests a revision.</p>
                    ) : null}
                </div>
                {pending ? (
                    <div className="mt-2.5 rounded-xl border border-[#e8edef] bg-[#fafbfb] px-3 py-2.5">
                        <b className="mb-1 block text-[10px] font-black uppercase tracking-wide text-[#71828e]">Remind your supervisor {faculty} to review</b>
                        <div className="flex flex-wrap gap-1">
                            <RemindPair
                                name={faculty}
                                email={entry.projectInfo?.supervisorEmail}
                                subject={`Reminder: ${title} is waiting for your review`}
                                body={`Hi ${shortPerson(faculty)},\n\nJust a nudge — my FYP flashcard "${title}" (${displayFypId(entry)}) is with you on CIEL PK.\n\nThank you.`}
                            />
                        </div>
                    </div>
                ) : null}
                {isRevision(entry) ? (
                    <div className="mt-2.5 rounded-xl border border-[#e8edef] bg-[#fafbfb] px-3 py-2.5 text-[11px] leading-relaxed">
                        <b className="mb-1 block text-[10px] font-black uppercase tracking-wide text-[#71828e]">Supervisor comments — what to revise</b>
                        “{entry.supervisorApprovalNote?.trim() || "Please revise the sections named by your supervisor, then resubmit."}”
                        {entry.supervisorApprovalAt ? ` — ${faculty}, ${formatDay(entry.supervisorApprovalAt)}` : ""}
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <button type="button" onClick={onOpen} className="inline-flex items-center gap-1 rounded-[9px] bg-[#eef2f3] px-2.5 py-2 text-[10px] font-black text-[#29454f]">
                                ✏️ CONTINUE REVISION
                            </button>
                            <button type="button" onClick={onOpen} className="inline-flex items-center gap-1 rounded-[9px] bg-[#174b43] px-2.5 py-2 text-[10px] font-black text-white">
                                ↻ RESUBMIT FYP
                            </button>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                            <RemindPair
                                name={faculty}
                                email={entry.projectInfo?.supervisorEmail}
                                subject={`Question about revision of ${title}`}
                                body={`Hi ${shortPerson(faculty)},\n\nI have a question about the revision requested on "${title}" (${displayFypId(entry)}).\n\nThank you.`}
                            />
                        </div>
                    </div>
                ) : null}
                {isRejected(entry) ? (
                    <div className="mt-2.5 rounded-xl border border-[#e8edef] bg-[#fafbfb] px-3 py-2.5 text-[11px] leading-relaxed">
                        <b className="mb-1 block text-[10px] font-black uppercase tracking-wide text-[#71828e]">Reason (kept on record — never published)</b>
                        “{entry.supervisorApprovalNote?.trim() || "Not accepted."}”
                        {entry.supervisorApprovalAt ? ` — ${faculty}, ${formatDay(entry.supervisorApprovalAt)}` : ""}
                    </div>
                ) : null}
            </div>
            <div className="border-[#dde5ea] md:border-l md:pl-3.5">
                <div className="mb-2.5 rounded-[11px] border border-[#dde5ea] bg-[#f8fafb] px-2.5 py-2.5">
                    <b className="block text-[11px] text-[#16313d]">Current workflow owner</b>
                    <small className="mt-1 block text-[10px] text-[#70808a]">
                        {pending ? `Supervisor — ${faculty}` : isRevision(entry) ? "Student — revise & resubmit" : `Closed — ${st.label}`}
                    </small>
                </div>
                <button type="button" onClick={onOpen} className="inline-flex w-full items-center justify-center gap-1 rounded-[9px] bg-[#174b43] px-3.5 py-2.5 text-[11px] font-black text-white">
                    🃏 VIEW FYP FLASHCARD
                </button>
                {files && latestFile?.fileUrl ? (
                    <a
                        href={latestFile.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded-[9px] bg-[#eef2f3] px-3.5 py-2.5 text-[11px] font-black text-[#29454f]"
                    >
                        📎 {files} FILE{files > 1 ? "S" : ""}
                    </a>
                ) : null}
            </div>
        </div>
    );
}

function ApprovedCard({ entry, onOpen }: { entry: FypEntry; onOpen: () => void }) {
    const names = teamNames(entry);
    const faculty = entry.projectInfo?.supervisorName?.trim() || "supervisor";
    const uni = entry.projectInfo?.university?.trim() || "University";
    const title = fypTitle(entry);
    const latestFile = entry.deliverables?.[entry.deliverables.length - 1];

    return (
        <div className="grid grid-cols-1 items-start gap-4 rounded-2xl border border-[#dde5ea] bg-white p-[15px] md:grid-cols-[minmax(0,1fr)_290px]">
            <div>
                <h4 className="m-0 text-[15px] font-semibold text-[#14202b]">
                    {title} <SdgTiles entry={entry} />
                </h4>
                <p className="mt-1 text-[10.5px] text-[#70808a]">
                    {displayFypId(entry)}
                    {entry.projectInfo?.officialProgram ? ` · ${entry.projectInfo.officialProgram}` : ""}
                    {` · ${routeLabel(entry)}`}
                    {names.length ? ` · Group — ${names.join(", ")}` : ""}
                    {entry.projectInfo?.academicArea ? ` · ${entry.projectInfo.academicArea}` : ""}
                    {` · ${uni}`}
                    {entry.projectInfo?.graduationYear ? ` · Batch ${entry.projectInfo.graduationYear}` : ""}
                    {` · Approved by ${faculty}`}
                    {entry.supervisorApprovalAt ? ` ${formatDay(entry.supervisorApprovalAt)}` : ""}
                </p>
                <div className="mt-2.5 rounded-xl border border-[#e8edef] bg-[#fafbfb] px-3 py-2.5">
                    <span className="inline-block rounded-[18px] bg-[#e8f5ef] px-2 py-1 text-[9.5px] font-black text-[#1d765d]">✓ FACULTY APPROVED</span>
                    <p className="mt-2 text-[11px] text-[#31405a]">{headline(entry)}</p>
                </div>
                <RankBadges entry={entry} />
            </div>
            <div className="border-[#dde5ea] md:border-l md:pl-3.5">
                <div className="mb-2.5 rounded-[11px] border border-[#dde5ea] bg-[#f8fafb] px-2.5 py-2.5">
                    <b className="block text-[11px] text-[#16313d]">Published to</b>
                    <small className="mt-1 block text-[10px] text-[#70808a]">🧑‍🎓 Student · 🧑‍🏫 Supervisor · 🏫 University · 🌐 CIEL PK</small>
                </div>
                <button type="button" onClick={onOpen} className="inline-flex w-full items-center justify-center gap-1 rounded-[9px] bg-[#174b43] px-3.5 py-2.5 text-[11px] font-black text-white">
                    🃏 OPEN FLASHCARD
                </button>
                {latestFile?.fileUrl ? (
                    <a
                        href={latestFile.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded-[9px] bg-[#eef2f3] px-3.5 py-2.5 text-[11px] font-black text-[#29454f]"
                    >
                        ⬇️ FILE
                    </a>
                ) : null}
            </div>
        </div>
    );
}

function PillTabs({
    tabs,
    active,
    onChange,
}: {
    tabs: { key: ReviewTab; label: string; n: number }[];
    active: ReviewTab;
    onChange: (key: ReviewTab) => void;
}) {
    return (
        <div className="flex flex-wrap gap-1.5 px-1">
            {tabs.map((t) => (
                <button
                    key={t.key}
                    type="button"
                    onClick={() => onChange(t.key)}
                    className={`rounded-[18px] border px-2.5 py-1.5 text-[11px] font-extrabold ${
                        active === t.key ? "border-[#153f47] bg-[#153f47] text-white" : "border-[#dde5ea] bg-white text-[#5c6d76]"
                    }`}
                >
                    {t.label}
                    <span className={`ml-1.5 inline-block rounded-[9px] px-1.5 py-0.5 text-[9px] ${active === t.key ? "bg-white/20" : "bg-black/10"}`}>{t.n}</span>
                </button>
            ))}
        </div>
    );
}

export default function FypThesisHub({
    view,
}: {
    view: HubView;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<FypEntry[]>([]);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [reviewTab, setReviewTab] = useState<ReviewTab>("all");
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [summary, setSummary] = useState<CielImpactSummary | null>(null);
    const autoOpenRef = useRef(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setEntries(await listStudentFyps());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setSummary(readImpactSummaryCache());
        void load();
        void Promise.all([fetchStudentDashboardData({ redirectToLogin: false }), fetchImpactSummary({ redirectToLogin: false })]).then(
            ([dashboardData, summaryData]) => {
                setDashboard(dashboardData);
                if (summaryData) setSummary(summaryData);
            },
        );
    }, [load]);

    const createNew = useCallback(async () => {
        if (creating) return;
        setCreating(true);
        setCreateError(null);
        try {
            const id = await createStudentFyp();
            if (id) {
                router.push(`${BASE}/${id}`);
                return;
            }
            const message = "Could not open the FYP form. Please try again.";
            setCreateError(message);
            toast.error(message);
        } finally {
            setCreating(false);
        }
    }, [creating, router]);

    useEffect(() => {
        if (loading) return;
        if (view !== "workspace") return;
        if (autoOpenRef.current) return;
        autoOpenRef.current = true;
        void createNew();
    }, [view, loading, createNew]);

    const deleteDraft = async (id: string) => {
        setDeletingId(id);
        try {
            const res = await authenticatedFetch(`/api/v1/paths/fyp-theses/${id}`, { method: "DELETE" }, { redirectToLogin: false });
            if (res?.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
        } finally {
            setDeletingId(null);
        }
    };

    const openRecord = (id?: string) => {
        if (!id) return;
        router.push(`${BASE}/${id}`);
    };

    if (loading) return <WorkspaceSkeleton />;

    const drafts = entries.filter((e) => e.status !== "submitted");
    const approved = entries.filter(isPathEntryApproved);
    const underReview = entries.filter((e) => e.status === "submitted" && !isPathEntryApproved(e));
    const underReviewBadge = underReview.filter((e) => e.supervisorApprovalStatus !== "rejected").length;
    const pending = underReview.filter(isPendingReview);
    const revision = underReview.filter(isRevision);
    const rejected = underReview.filter(isRejected);
    const visibleReview = reviewTab === "all" ? underReview : reviewTab === "pending" ? pending : reviewTab === "revision" ? revision : rejected;

    const activeRecords = dashboard?.overview?.activeProjectsCount ?? dashboard?.activeProjects?.length ?? 0;
    const verifiedHours = Math.round(summary?.verifiedHours ?? dashboard?.overview?.totalVerifiedHours ?? 0);
    const portfolioCount = dashboard?.overview?.impactHistoryBadgeCount ?? dashboard?.overview?.completedCount ?? 0;
    const completion = Math.round(
        (CIEL_PATHS.reduce((sum, path) => sum + (summary?.pathsStatus[path.key]?.progress ?? 0), 0) / (CIEL_PATHS.length || 1)) || 0,
    );

    return (
        <div className="mx-auto max-w-[1500px] pb-16">
            <CourseworkCrumb
                role="Student"
                pathLabel="Final Year Project (FYP)"
                view={view === "home" ? undefined : HUB_VIEW_LABEL[view] ?? view}
            />
            <MockupHero
                title="Final Year Project (FYP)"
                subtitle="Build your Final Year Project record from first draft to faculty / supervisor verification."
                stats={[
                    { value: String(activeRecords), label: "Active Records" },
                    { value: verifiedHours ? `${verifiedHours}h` : "0h", label: "Verified Service" },
                    { value: String(portfolioCount), label: "Impact Portfolio" },
                ]}
                rightStat={{ value: `${completion}%`, label: "overall current-work completion" }}
            />

            {(view === "create" || view === "workspace") && (
                <div className="mt-1">
                    <MockupSectionHead
                        title="Create FYP Record"
                        subtitle="Your draft saves automatically; your supervisor only sees it after you submit."
                        action={
                            <Link href={BASE} className="border-0 bg-transparent text-[12.5px] font-black text-[#087c75] hover:underline">
                                ← Back to module buttons
                            </Link>
                        }
                    />
                    <section className="overflow-hidden rounded-[22px] border border-[#dde5ea] bg-white p-5 shadow-[0_8px_22px_rgba(24,52,64,.05)]">
                        {createError ? <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{createError}</p> : null}
                        <div className="mb-3.5 rounded-xl border border-[#ead8b8] bg-[#fff8ec] px-3 py-3 text-[11.5px] leading-relaxed text-[#715a2d]">
                            No pre-approval is required. The button opens the <b>CIEL PK Final Year Projects Form</b> — eight sections (Route → Roadmap → Pathway → Evidence → Outcome → Sustainability → Reflection → Review).{" "}
                            <b>Saving Section 1 creates your master FYP record</b> with a unique FYP ID (e.g. {`FYP-${new Date().getFullYear()}-00128`}) and automatically connects you, your team members, your Faculty Supervisor, your University and CIEL PK to the <b>same single record</b> — never a duplicate. Every keystroke after that is <b>auto-saved continuously</b>. Your FYP Flashcard is generated when you submit.
                        </div>
                        <button
                            type="button"
                            onClick={() => void createNew()}
                            disabled={creating}
                            className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#174b43] px-4 py-3 text-xs font-black text-white disabled:cursor-wait disabled:opacity-70"
                        >
                            🎓 {creating ? "Opening…" : "OPEN FYP FORM"}
                        </button>
                        <div className="mt-4 rounded-xl border border-[#d5eee8] bg-[#eef8f6] px-3.5 py-2.5 text-[11px] leading-relaxed text-[#4b6f68]">
                            Once you start, the record appears under <b>Final Year Project (FYP) → FYP in Progress</b> with a live progress bar and “Sections Completed” count. Your supervisor, university and CIEL PK see the same progress % in real time and can send reminders — never your unfinished text.
                        </div>
                    </section>
                </div>
            )}

            {view === "guide" && (
                <div className="mt-1">
                    <HubBackButton href={BASE} label="← Back to module buttons" />
                    <PathHubGuide kicker="HOW TO FILL YOUR FYP — EIGHT STEPS" steps={FYP_GUIDE_STEPS} />
                </div>
            )}

            {view === "wall" && (
                <div className="mt-1">
                    <MockupSectionHead
                        title="My Final Year Project Impact"
                        subtitle={`${approved.length} approved record${approved.length === 1 ? "" : "s"} · You receive the approved file; scores and rankings stay with your supervisor.`}
                        action={
                            <Link href={BASE} className="border-0 bg-transparent text-[12.5px] font-black text-[#087c75] hover:underline">
                                ← Back to module buttons
                            </Link>
                        }
                    />
                    {approved.length === 0 ? (
                        <EmptyState
                            emoji="🏅"
                            heading="Your FYP impact is waiting"
                            line="Submit an FYP and it hangs here on supervisor approval — rank, score and story."
                            actionLabel="🎓 OPEN FYP FORM"
                            onAction={() => void createNew()}
                        />
                    ) : (
                        <div className="grid gap-3">
                            {approved.map((entry) => (
                                <ApprovedCard key={entry.id} entry={entry} onOpen={() => openRecord(entry.id)} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === "in-progress" && (
                <div className="mt-1">
                    <MockupSectionHead
                        title="FYP in Progress"
                        subtitle={`${drafts.length} record${drafts.length === 1 ? "" : "s"} · Drafts save automatically. Remind your team, or ask your supervisor a question — by Email or WhatsApp.`}
                        action={
                            <Link href={BASE} className="border-0 bg-transparent text-[12.5px] font-black text-[#087c75] hover:underline">
                                ← Back to module buttons
                            </Link>
                        }
                    />
                    {drafts.length === 0 ? (
                        <EmptyState
                            emoji="🔬"
                            heading="Nothing in progress"
                            line="Nothing in progress — your Final Year Project is under review, or create a new record to start."
                            actionLabel="🎓 OPEN FYP FORM"
                            onAction={() => void createNew()}
                        />
                    ) : (
                        <div className="grid gap-3">
                            {drafts.map((entry) => (
                                <ProgressCard
                                    key={entry.id}
                                    entry={entry}
                                    onOpen={() => openRecord(entry.id)}
                                    onDelete={entry.id ? () => void deleteDraft(entry.id!) : undefined}
                                    deleting={deletingId === entry.id}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === "under-review" && (
                <div className="mt-1">
                    <MockupSectionHead
                        title="FYP Under Review"
                        subtitle="Your supervisor owns the next action while a record is pending. Use the buttons to send a polite reminder."
                        action={
                            <Link href={BASE} className="border-0 bg-transparent text-[12.5px] font-black text-[#087c75] hover:underline">
                                ← Back to module buttons
                            </Link>
                        }
                    />
                    {underReview.length === 0 ? (
                        <EmptyState
                            emoji="📤"
                            heading="Nothing under review"
                            line="Submit a completed FYP flashcard and it lands here while your supervisor reviews it."
                            actionLabel="🎓 OPEN FYP FORM"
                            onAction={() => void createNew()}
                        />
                    ) : (
                        <>
                            <PillTabs
                                tabs={[
                                    { key: "all", label: "All", n: underReview.length },
                                    { key: "pending", label: "Pending supervisor", n: pending.length },
                                    { key: "revision", label: "Revision required", n: revision.length },
                                    { key: "rejected", label: "Not accepted", n: rejected.length },
                                ]}
                                active={reviewTab}
                                onChange={setReviewTab}
                            />
                            <div className="mt-3 grid gap-3">
                                {visibleReview.length === 0 ? (
                                    <p className="rounded-2xl border border-dashed border-[#dde5ea] px-4 py-8 text-center text-[12px] text-[#70808a]">Nothing under review.</p>
                                ) : (
                                    visibleReview.map((entry) => <ReviewCard key={entry.id} entry={entry} onOpen={() => openRecord(entry.id)} />)
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {view === "home" && (
                <>
                    <MockupSectionHead
                        title="Final Year Project (FYP)"
                        subtitle="Build your Final Year Project record section by section, submit your FYP Flashcard to your supervisor, and collect the approved FYP here."
                        action={
                            <Link href={HOME_HREF} className="border-0 bg-transparent text-[12.5px] font-black text-[#087c75] hover:underline">
                                ← Back to Home
                            </Link>
                        }
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <MockupActionCard
                            onClick={() => void createNew()}
                            emoji="🎓"
                            ghost="🎓"
                            title="Create FYP Record"
                            subtitle="Open the CIEL PK Final Year Projects Form. Saving Section 1 creates your master FYP record with a unique FYP ID and auto-connects you, your team, your supervisor, your university and CIEL PK."
                            badge={creating ? "OPENING" : "START"}
                            background={MOCKUP_GRADIENTS.orange}
                        />
                        <MockupActionCard
                            href={IN_PROGRESS_HREF}
                            emoji="🔬"
                            ghost="🔬"
                            title="FYP in Progress"
                            subtitle="Records you're still writing — completion bar, and Email / WhatsApp lines to your team or supervisor."
                            badge={`${drafts.length} IN PROGRESS`}
                            background={MOCKUP_GRADIENTS.teal}
                        />
                        <MockupActionCard
                            href={UNDER_REVIEW_HREF}
                            emoji="📤"
                            ghost="📤"
                            title="FYP Under Review"
                            subtitle="Submitted flashcards waiting for supervisor approval — with Email / WhatsApp buttons to remind your supervisor."
                            badge={`${underReviewBadge} UNDER REVIEW`}
                            background={MOCKUP_GRADIENTS.blue}
                        />
                        <MockupActionCard
                            href={WALL_HREF}
                            emoji="🏅"
                            ghost="🏅"
                            title="My Final Year Project Impact"
                            subtitle="Your approved Final Year Projects — every team member sees the same approved record here, and it also appears on your University's FYP Impact Wall and CIEL PK."
                            badge={`${approved.length} APPROVED`}
                            background={MOCKUP_GRADIENTS.green}
                        />
                    </div>
                    <p className="mt-4 text-center text-[11px] text-[#7a919a]">
                        Need a walkthrough?{" "}
                        <Link href={GUIDE_HREF} className="font-extrabold text-[#0e7d74] hover:underline">
                            FYP Guidance
                        </Link>
                    </p>
                </>
            )}
        </div>
    );
}
