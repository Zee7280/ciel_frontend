"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { namedTimeGreeting } from "@/utils/timeGreeting";
import { CourseworkCrumb, CourseworkHero, HubBackButton, HubTile } from "@/components/ciel/coursework/CourseworkHubChrome";
import EmptyState from "@/components/ciel/EmptyState";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";
import { isPathEntryApproved, isPathEntryWaiting } from "@/utils/reviewQueue";
import { ventureStatusLabel } from "@/utils/pathReviewStatus";
import { mailtoHref, whatsappShareHref } from "@/utils/reminderLinks";

const BASE = "/dashboard/student/paths/startup-business";
const WORKSPACE_HREF = `${BASE}?view=workspace`;
const CREATE_HREF = `${BASE}?view=create`;
const GUIDE_HREF = `${BASE}?view=guide`;
const WALL_HREF = `${BASE}?view=wall`;
const IN_PROGRESS_HREF = `${BASE}?view=in-progress`;
const UNDER_REVIEW_HREF = `${BASE}?view=under-review`;

const HUB_VIEW_LABEL: Record<string, string> = {
    guide: "How the loop works",
    wall: "Impact Wall",
    "in-progress": "Startup Workspace",
    "under-review": "Under Review",
};

const LOOP_STEPS = [
    "Create → fill the sections (auto-saved as a draft in your Startup Workspace; your faculty and university see your progress live).",
    "Reach a complete record → Submit. Your record locks, a Venture Card is generated and it moves to Ventures Under Review.",
    "Faculty accepts, requests revision (it comes back to your workspace — fix and resubmit) or rejects (record kept, never published).",
    'Accepted ventures publish to every Ventures Impact Wall. If you ticked "open to investors", it also goes to the CIEL Investor Hub.',
    "You receive your faculty score, remarks and analysis. Rankings from faculty / university / CIEL PK appear as badges on your card.",
];

type HubVenture = {
    id?: string;
    ventureName?: string | null;
    status?: "draft" | "submitted";
    stepCompleted?: number;
    completenessPercent?: number;
    isVisible?: boolean;
    isOwner?: boolean;
    stage?: string | null;
    updatedAt?: string;
    ideaInfo?: { sector?: string; city?: string; pitch?: string } | null;
    academicSetup?: { supervisorName?: string; supervisorEmail?: string; university?: string } | null;
    team?: { name?: string; email?: string }[] | null;
    publishSettings?: { audience?: string; acceptIntros?: boolean } | null;
    reviewPipeline?: {
        supervisorStatus?: string | null;
        supervisorNote?: string | null;
    } | null;
    gates?: { academicOk: boolean; showcaseOk: boolean; investmentReadyOk: boolean };
    meritRibbon?: {
        rank: number;
        of: number;
        scope: string;
        total?: number;
        badgeLevel?: "Gold" | "Silver" | "Bronze" | "Participant";
    } | null;
    sectionSummaries?: Record<string, string | undefined> | null;
};

function firstName() {
    const user = readStoredCurrentUser();
    const name = typeof user?.name === "string" ? user.name.split(" ")[0] : "";
    return name || "there";
}

function isRevision(entry: HubVenture) {
    return entry.reviewPipeline?.supervisorStatus === "revisions_requested";
}

function isInvestorOpen(entry: HubVenture) {
    return entry.publishSettings?.acceptIntros === true || entry.publishSettings?.audience === "investors";
}

function completionPct(entry: HubVenture) {
    if (typeof entry.completenessPercent === "number") return Math.max(0, Math.min(100, entry.completenessPercent));
    return Math.round(((entry.stepCompleted ?? 0) / 6) * 100);
}

function facultyReminders(entry: HubVenture) {
    const faculty = entry.academicSetup?.supervisorName?.trim() || "your faculty";
    const to = entry.academicSetup?.supervisorEmail?.trim() || "";
    const title = entry.ventureName?.trim() || "my venture";
    const subject = `Reminder: ${title} is waiting for your review`;
    const body = `Hi ${faculty.split(" ")[0]},\n\nJust a nudge — my venture card "${title}" is with you on CIEL PK.\n\nThank you.`;
    return { to, subject, body, faculty };
}

function teamReminders(entry: HubVenture) {
    const title = entry.ventureName?.trim() || "our venture";
    const emails = (entry.team || []).map((m) => m.email?.trim()).filter(Boolean) as string[];
    const subject = `Please continue ${title} on CIEL PK`;
    const body = `Hi team,\n\nOur startup record "${title}" is still in progress on CIEL PK. Please open the Startup Workspace and add your pieces.\n`;
    return { emails, subject, body };
}

function StatusChip({ entry }: { entry: HubVenture }) {
    const { tone, label } = ventureStatusLabel(entry);
    const cls =
        tone === "approved"
            ? "bg-[#e6f6ec] text-[#1c8a52]"
            : tone === "rejected"
              ? "bg-[#eceff1] text-[#455a64]"
              : tone === "revision_requested"
                ? "bg-[#fdecea] text-[#b3261e]"
                : tone === "under_review"
                  ? "bg-[#e5f1fb] text-[#1f6fc2]"
                  : "bg-[#fff3e0] text-[#c65b00]";
    return (
        <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide ${cls}`}>
            {isRevision(entry) ? "Revision requested" : label}
        </span>
    );
}

function ReminderButtons({
    mailto,
    whatsappText,
    disabled,
}: {
    mailto: string;
    whatsappText: string;
    disabled?: boolean;
}) {
    if (disabled) return null;
    return (
        <div className="flex flex-wrap gap-2">
            <a
                href={mailto}
                className="inline-flex items-center rounded-[10px] bg-[#3b5ba9] px-3 py-1.5 text-[12.5px] font-bold text-white hover:brightness-105"
            >
                Email
            </a>
            <a
                href={whatsappShareHref(whatsappText)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-[10px] bg-[#25d366] px-3 py-1.5 text-[12.5px] font-bold text-white hover:brightness-105"
            >
                WhatsApp
            </a>
        </div>
    );
}

function VentureListRow({
    entry,
    mode,
    onOpen,
}: {
    entry: HubVenture;
    mode: "workspace" | "review" | "wall";
    onOpen: () => void;
}) {
    const pct = completionPct(entry);
    const faculty = facultyReminders(entry);
    const team = teamReminders(entry);
    const meta = [entry.id ? `ID ${entry.id.slice(0, 8)}` : null, entry.stage, entry.ideaInfo?.sector, entry.ideaInfo?.city]
        .filter(Boolean)
        .join(" · ");

    return (
        <div className="grid grid-cols-1 items-center gap-4 rounded-[18px] border border-[#e3e9ee] bg-white p-5 md:grid-cols-[1.6fr_1fr]">
            <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                    <p className="m-0 text-[17px] font-extrabold text-[#14212b]">{entry.ventureName || "Untitled venture"}</p>
                    <StatusChip entry={entry} />
                </div>
                {meta ? <p className="text-[13px] text-[#5d6c78]">{meta}</p> : null}
                {mode === "workspace" && (
                    <>
                        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#e9eef2]">
                            <i
                                className="block h-full rounded-full"
                                style={{
                                    width: `${pct}%`,
                                    background: isRevision(entry)
                                        ? "linear-gradient(90deg,#f6a021,#e57a0f)"
                                        : "linear-gradient(90deg,#19b8a8,#0b8b86)",
                                }}
                            />
                        </div>
                        <div className="mt-1 flex justify-between text-[12.5px] font-semibold text-[#5d6c78]">
                            <span>
                                {entry.stepCompleted ?? 0}/6 steps · {pct}%
                            </span>
                            <span>{isRevision(entry) ? "Returned for revision" : "Auto-saved draft"}</span>
                        </div>
                    </>
                )}
                {mode === "review" && (
                    <p className="mt-1 text-[13px] text-[#5d6c78]">
                        With {faculty.faculty} — nudge them if the review is taking time.
                    </p>
                )}
                {mode === "wall" && entry.meritRibbon && (
                    <p className="mt-1 text-[13px] font-semibold text-[#0b4b57]">
                        Ranked #{entry.meritRibbon.rank} of {entry.meritRibbon.of}
                        {entry.meritRibbon.total != null ? ` · ${entry.meritRibbon.total}/100` : ""}
                        {entry.meritRibbon.badgeLevel ? ` · ${entry.meritRibbon.badgeLevel}` : ""}
                    </p>
                )}
                {mode === "wall" && isInvestorOpen(entry) && (
                    <span className="mt-2 inline-block rounded-lg border border-[#f8bbd0] bg-[#fce4ec] px-2 py-0.5 text-[11px] font-extrabold text-[#c2185b]">
                        Open to investors
                    </span>
                )}
            </div>
            <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
                {mode === "workspace" && (
                    <>
                        <span className="rounded-full bg-[#eef3f6] px-2.5 py-1 text-[12px] font-bold text-[#0b4b57]">
                            Action with: {isRevision(entry) ? "You" : team.emails.length ? "Team" : "Faculty"}
                        </span>
                        <ReminderButtons
                            mailto={mailtoHref(team.emails[0] || faculty.to, team.emails.length ? team.subject : faculty.subject, team.emails.length ? team.body : faculty.body)}
                            whatsappText={team.emails.length ? `${team.subject}\n\n${team.body}` : `${faculty.subject}\n\n${faculty.body}`}
                            disabled={!team.emails.length && !faculty.to}
                        />
                    </>
                )}
                {mode === "review" && (
                    <>
                        <span className="rounded-full bg-[#eef3f6] px-2.5 py-1 text-[12px] font-bold text-[#0b4b57]">
                            Action with: Faculty
                        </span>
                        <ReminderButtons
                            mailto={mailtoHref(faculty.to, faculty.subject, faculty.body)}
                            whatsappText={`${faculty.subject}\n\n${faculty.body}`}
                            disabled={!faculty.to}
                        />
                    </>
                )}
                <button
                    type="button"
                    onClick={onOpen}
                    className="rounded-[10px] bg-[#eef3f6] px-3 py-1.5 text-[12.5px] font-bold text-[#0b4b57] hover:bg-[#e1eaef]"
                >
                    {mode === "wall" ? "View Venture Card" : mode === "review" ? "View Venture Card" : "Continue"}
                </button>
            </div>
        </div>
    );
}

function WallCard({ entry, onOpen }: { entry: HubVenture; onOpen: () => void }) {
    const ribbon = entry.meritRibbon;
    return (
        <div className="flex flex-col overflow-hidden rounded-[20px] border border-[#e3e9ee] bg-white">
            <div className="bg-[linear-gradient(120deg,#0b4b57,#0f8f8a)] px-[18px] py-4 text-white">
                <small className="text-[11px] font-bold tracking-wide text-[#bfe8e4]">
                    {(entry.academicSetup?.university || "VENTURE CARD").toUpperCase()}
                </small>
                <h4 className="m-0 mt-1 text-[17px] font-bold">{entry.ventureName || "Untitled venture"}</h4>
            </div>
            <div className="flex-1 px-[18px] py-3.5 text-[13.5px] leading-relaxed text-[#14212b]">
                <p className="line-clamp-3 text-[#5d6c78]">{entry.ideaInfo?.pitch || entry.sectionSummaries?.opportunity || "Approved venture record."}</p>
                {ribbon ? (
                    <p className="mt-2 font-bold text-[#0b4b57]">
                        #{ribbon.rank} of {ribbon.of}
                        {ribbon.total != null ? ` · ${ribbon.total}/100` : ""}
                        {ribbon.badgeLevel ? ` · ${ribbon.badgeLevel}` : ""}
                    </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {isInvestorOpen(entry) ? (
                        <span className="rounded-lg border border-[#f8bbd0] bg-[#fce4ec] px-2 py-0.5 text-[11px] font-extrabold text-[#c2185b]">
                            Investor Hub
                        </span>
                    ) : null}
                    {entry.gates?.showcaseOk ? (
                        <span className="rounded-lg border border-[#9fdcd7] bg-[#e0f2f1] px-2 py-0.5 text-[11px] font-extrabold text-[#0b6f6c]">
                            Showcase ready
                        </span>
                    ) : null}
                </div>
            </div>
            <div className="flex gap-2 border-t border-[#e3e9ee] px-[18px] py-3">
                <button
                    type="button"
                    onClick={onOpen}
                    className="rounded-[10px] bg-[#0f8f8a] px-3 py-1.5 text-[12.5px] font-bold text-white"
                >
                    Open card
                </button>
            </div>
        </div>
    );
}

export default function StartupBusinessHub({
    view,
}: {
    view: "home" | "guide" | "wall" | "in-progress" | "under-review";
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [entry, setEntry] = useState<HubVenture | null>(null);
    const [name, setName] = useState("there");

    useEffect(() => {
        setName(firstName());
        authenticatedFetch("/api/v1/paths/startup-business", {}, { redirectToLogin: true })
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (result?.data) setEntry(result.data as HubVenture);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <WorkspaceSkeleton />;

    const hasEntry = !!entry && (!!entry.ventureName || (entry.stepCompleted ?? 0) > 0 || entry.status === "submitted");
    const approved = !!entry && isPathEntryApproved(entry);
    const underReview = !!entry && isPathEntryWaiting(entry);
    const revision = !!entry && isRevision(entry);
    const inProgress = !!entry && hasEntry && !approved && !underReview;
    const investorOpen = !!entry && approved && isInvestorOpen(entry);

    const workspaceBadge = [
        inProgress ? "1 in progress" : "0 in progress",
        revision ? "1 revision" : null,
    ]
        .filter(Boolean)
        .join(" · ");
    const wallBadge = [approved ? "1 approved" : "0 approved", investorOpen ? "1 investor interest" : null]
        .filter(Boolean)
        .join(" · ");

    return (
        <div className="mx-auto max-w-[1040px] pb-16">
            <CourseworkCrumb
                role="Student"
                pathLabel="Startup / Venture"
                view={view === "home" ? undefined : HUB_VIEW_LABEL[view] ?? view}
            />
            <CourseworkHero
                kicker="MY PATHS · STARTUP / VENTURE"
                title={namedTimeGreeting(name, "🚀")}
                subtitle="Build your venture profile section by section, submit your venture card to faculty, collect your approved ventures here — and open the door to investors when you are ready."
                gradient="radial-gradient(120% 140% at 100% 0%, #0d8e88 0%, #0b4b57 45%, #0a2f3d 100%)"
                roleBadge="STUDENT"
                stats={[
                    { value: approved ? "1" : "0", label: "APPROVED", href: WALL_HREF },
                    { value: underReview ? "1" : "0", label: "UNDER REVIEW", href: UNDER_REVIEW_HREF },
                    { value: inProgress ? "1" : "0", label: "IN PROGRESS", href: IN_PROGRESS_HREF },
                ]}
            />

            {view === "guide" && (
                <div className="mt-4">
                    <HubBackButton href={BASE} label="← Startup / Venture hub" />
                    <div className="rounded-[22px] p-7 text-white shadow-[0_8px_30px_rgba(10,30,40,.08)]" style={{ background: "linear-gradient(135deg,#8f5bea,#6a35c8)" }}>
                        <span className="float-right rounded-full bg-white px-4 py-2 text-[11.5px] font-extrabold tracking-wide text-[#6a35c8]">
                            GUIDE INSIDE
                        </span>
                        <h3 className="m-0 text-[22px] font-bold">📘 How the venture loop works</h3>
                        <ol className="mt-2 list-decimal space-y-1 pl-5 text-[14.5px] leading-relaxed">
                            {LOOP_STEPS.map((step) => (
                                <li key={step}>{step}</li>
                            ))}
                        </ol>
                    </div>
                </div>
            )}

            {view === "in-progress" && (
                <div className="mt-4">
                    <HubBackButton href={BASE} label="← Startup / Venture hub" />
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h2 className="m-0 text-[21px] font-semibold text-[#16313d]">
                                🧩 Startup Workspace — {inProgress ? 1 : 0} in progress
                            </h2>
                            <p className="mt-1 text-[12.5px] text-[#70808a]">
                                Everything you type in the form lands here automatically. Faculty and university see the same completion bar. Returned revisions also sit here until you resubmit.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => router.push(CREATE_HREF)}
                            className="rounded-xl bg-[#0f8f8a] px-4 py-2 text-[13.5px] font-bold text-white"
                        >
                            ＋ Create Startup Record
                        </button>
                    </div>
                    {inProgress && entry ? (
                        <VentureListRow entry={entry} mode="workspace" onOpen={() => router.push(WORKSPACE_HREF)} />
                    ) : (
                        <EmptyState
                            emoji="🧩"
                            heading="No drafts"
                            line="Create a startup record to begin — your draft saves as you go."
                            actionLabel="Create Startup Record"
                            onAction={() => router.push(CREATE_HREF)}
                        />
                    )}
                </div>
            )}

            {view === "under-review" && (
                <div className="mt-4">
                    <HubBackButton href={BASE} label="← Startup / Venture hub" />
                    <div className="mb-3">
                        <h2 className="m-0 text-[21px] font-semibold text-[#16313d]">
                            📬 Ventures Under Review — {underReview ? 1 : 0}
                        </h2>
                        <p className="mt-1 text-[12.5px] text-[#70808a]">
                            Your venture card is locked and with your faculty. You can nudge them by Email or WhatsApp.
                        </p>
                    </div>
                    {underReview && entry ? (
                        <VentureListRow entry={entry} mode="review" onOpen={() => router.push(WORKSPACE_HREF)} />
                    ) : (
                        <EmptyState
                            emoji="📬"
                            heading="Nothing under review right now"
                            line="Submit a completed venture card and it lands here while faculty decides."
                            actionLabel="Open Startup form"
                            onAction={() => router.push(WORKSPACE_HREF)}
                        />
                    )}
                </div>
            )}

            {view === "wall" && (
                <div className="mt-4">
                    <HubBackButton href={BASE} label="← Startup / Venture hub" />
                    <div className="mb-3">
                        <h2 className="m-0 text-[21px] font-semibold text-[#16313d]">
                            🏅 My Ventures Impact Wall — {approved ? 1 : 0} approved
                        </h2>
                        <p className="mt-1 text-[12.5px] text-[#70808a]">
                            Approved ventures only. Open a card to see faculty score, remarks, ranking badges and investor interest. The same card appears on your University wall and CIEL PK.
                        </p>
                    </div>
                    {approved && entry ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <WallCard entry={entry} onOpen={() => router.push(WORKSPACE_HREF)} />
                        </div>
                    ) : (
                        <EmptyState
                            emoji="🏅"
                            heading="Your impact wall is waiting"
                            line="Submit the venture record and it hangs here once faculty approves it."
                            actionLabel="Create Startup Record"
                            onAction={() => router.push(CREATE_HREF)}
                        />
                    )}
                </div>
            )}

            {view === "home" && (
                <>
                    <div className="mt-[22px] grid grid-cols-1 gap-[22px] sm:grid-cols-2">
                        <HubTile
                            href={CREATE_HREF}
                            badge="START"
                            badgeClass="text-[#0b4b57]"
                            emoji="🚀"
                            title="Create Startup Record"
                            subtitle="Open the CIEL PK Venture Studio form. Each section auto-saves; your first saved fields create a venture record shared with your team, faculty, university and CIEL PK. No pre-approval needed."
                            background="linear-gradient(135deg,#19b8a8,#0b8b86)"
                        />
                        <HubTile
                            href={IN_PROGRESS_HREF}
                            badge={workspaceBadge}
                            badgeClass="text-[#c65b00]"
                            emoji="🧩"
                            title="Startup Workspace"
                            subtitle="Drafts you are still filling in and ventures returned for revision — completion bar, status tracker, and Email / WhatsApp reminders for your team or your faculty."
                            background="linear-gradient(135deg,#f6a021,#e57a0f)"
                        />
                        <HubTile
                            href={UNDER_REVIEW_HREF}
                            badge={`${underReview ? 1 : 0} under review`}
                            badgeClass="text-[#1f6fc2]"
                            emoji="📬"
                            title="Ventures Under Review"
                            subtitle="Submitted venture cards waiting for faculty decision — Accept, Request revision or Reject — with Email / WhatsApp buttons to remind your faculty."
                            background="linear-gradient(135deg,#3aa2e4,#1f6fc2)"
                        />
                        <HubTile
                            href={WALL_HREF}
                            badge={wallBadge}
                            badgeClass="text-[#1c8a52]"
                            emoji="🏅"
                            title="My Ventures Impact Wall"
                            subtitle="Your approved ventures with faculty score, remarks and analysis. Approved cards also appear on your University's Ventures Impact Wall, CIEL PK, and — if you opted in — the CIEL Investor Hub."
                            background="linear-gradient(135deg,#2fb96b,#1c8a52)"
                        />
                    </div>
                    <a
                        href={GUIDE_HREF}
                        className="relative mt-[22px] block overflow-hidden rounded-[22px] p-7 text-white shadow-[0_8px_30px_rgba(10,30,40,.08)] transition hover:-translate-y-0.5"
                        style={{ background: "linear-gradient(135deg,#8f5bea,#6a35c8)" }}
                    >
                        <span className="absolute right-[22px] top-[22px] rounded-full bg-white px-4 py-2 text-[11.5px] font-extrabold tracking-wide text-[#6a35c8]">
                            GUIDE INSIDE
                        </span>
                        <h3 className="m-0 pr-36 text-[22px] font-bold">📘 How the venture loop works</h3>
                        <ol className="mt-2 mb-0 max-w-[900px] list-decimal space-y-1 pl-5 text-[14.5px] leading-relaxed">
                            {LOOP_STEPS.map((step) => (
                                <li key={step}>{step}</li>
                            ))}
                        </ol>
                    </a>
                </>
            )}
        </div>
    );
}
