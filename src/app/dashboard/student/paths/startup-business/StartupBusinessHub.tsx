"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { namedTimeGreeting } from "@/utils/timeGreeting";
import { CourseworkCrumb, CourseworkHero, HubTile } from "@/components/ciel/coursework/CourseworkHubChrome";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";
import { isPathEntryApproved, isPathEntryWaiting } from "@/utils/reviewQueue";
import { ventureStatusLabel } from "@/utils/pathReviewStatus";
import { mailtoHref, whatsappTargetedHref } from "@/utils/reminderLinks";
import { SDG_COLORS, SDG_SHORT, V11_STAGES, V11_STEPS } from "@/utils/ventureStudioV11";

const BASE = "/dashboard/student/paths/startup-business";
const WORKSPACE_HREF = `${BASE}?view=workspace`;
const CREATE_HREF = `${BASE}?view=create`;
const GUIDE_HREF = `${BASE}?view=guide`;
const WALL_HREF = `${BASE}?view=wall`;
const IN_PROGRESS_HREF = `${BASE}?view=in-progress`;
const UNDER_REVIEW_HREF = `${BASE}?view=under-review`;
const RECORD_HREF = `${BASE}?view=record`;

const HUB_VIEW_LABEL: Record<string, string> = {
    guide: "How the loop works",
    wall: "Impact Wall",
    "in-progress": "Startup Workspace",
    "under-review": "Under Review",
    record: "Venture Card",
};

const LOOP_STEPS = [
    "Create → fill the sections (auto-saved as a draft in your Startup Workspace; your faculty and university see your progress live).",
    "Reach a complete record → Submit. Your record locks, a Venture Card is generated and it moves to Ventures Under Review.",
    "Faculty accepts, requests revision (it comes back to your workspace — fix and resubmit) or rejects (record kept, never published).",
    'Accepted ventures publish to every Ventures Impact Wall. If you ticked "open to investors", it also goes to the CIEL Investor Hub.',
    "You receive your faculty score, remarks and analysis. Rankings from faculty / university / CIEL PK appear as badges on your card.",
];

const SECTION_SHORT = ["Venture", "Problem", "Business", "SDG", "Next step", "Review"] as const;

type HubTeamMember = {
    name?: string;
    role?: string;
    email?: string;
    whatsappCode?: string;
    whatsappNumber?: string;
};

type HubVenture = {
    id?: string;
    ventureName?: string | null;
    status?: "draft" | "submitted";
    stepCompleted?: number;
    completenessPercent?: number;
    isVisible?: boolean;
    isOwner?: boolean;
    stage?: string | null;
    createdAt?: string;
    updatedAt?: string;
    description?: string | null;
    tractionRows?: { date?: string; metric?: string; value?: string; note?: string }[] | null;
    ideaInfo?: { sector?: string; city?: string; pitch?: string; problem?: string; customer?: string } | null;
    solutionInfo?: { solution?: string; advantage?: string; revenue?: string; revenueModels?: string[]; milestone12mo?: string } | null;
    academicSetup?: {
        supervisorName?: string;
        supervisorEmail?: string;
        university?: string;
        founderName?: string;
        courseRef?: string;
        courseCode?: string;
        facultyRole?: string;
    } | null;
    team?: HubTeamMember[] | null;
    publishSettings?: { audience?: string; acceptIntros?: boolean } | null;
    reviewPipeline?: {
        supervisorStatus?: string | null;
        supervisorNote?: string | null;
        studentDeclaredAt?: string;
    } | null;
    gates?: { academicOk: boolean; showcaseOk: boolean; investmentReadyOk: boolean };
    meritRibbon?: {
        rank: number;
        of: number;
        scope: string;
        total?: number;
        badgeLevel?: "Gold" | "Silver" | "Bronze" | "Participant";
        at?: string;
    } | null;
    sectionSummaries?: Record<string, string | undefined> | null;
    sdgMapping?: { entries?: { goalNumber: number }[]; mode?: string } | null;
    evidenceInfo?: { customers?: number; revenueToDate?: number; interviews?: number; pilotPartners?: number } | null;
};

type HubView = "home" | "guide" | "wall" | "in-progress" | "under-review" | "record";
type TimelineState = "done" | "now" | "warn" | "bad" | "";

function firstName() {
    const user = readStoredCurrentUser();
    const name = typeof user?.name === "string" ? user.name.split(" ")[0] : "";
    return name || "there";
}

function displayName() {
    const user = readStoredCurrentUser();
    return typeof user?.name === "string" && user.name.trim() ? user.name.trim() : firstName();
}

function isRevision(entry: HubVenture) {
    return entry.reviewPipeline?.supervisorStatus === "revisions_requested";
}

function isRejected(entry: HubVenture) {
    return entry.status === "submitted" && entry.reviewPipeline?.supervisorStatus === "rejected";
}

function isInvestorOpen(entry: HubVenture) {
    return entry.publishSettings?.acceptIntros === true || entry.publishSettings?.audience === "investors";
}

function hasRecord(entry: HubVenture | null) {
    if (!entry) return false;
    return !!entry.ventureName || (entry.stepCompleted ?? 0) > 0 || entry.status === "submitted";
}

function displayVentureId(entry: HubVenture) {
    const year = entry.createdAt ? new Date(entry.createdAt).getFullYear() : new Date().getFullYear();
    const tail = (entry.id || "").replace(/-/g, "").slice(-5).toUpperCase() || "00000";
    return `VEN-${year}-${tail}`;
}

function formatDay(value?: string | null) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value.slice(0, 10);
    return d.toISOString().slice(0, 10);
}

function shortPerson(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "contact";
    if (/^dr\.?$/i.test(parts[0]) && parts[1]) return `${parts[0].replace(/\.$/, "")}. ${parts[1]}`;
    return parts[0];
}

function sdgNumbers(entry: HubVenture) {
    return (entry.sdgMapping?.entries || []).map((e) => e.goalNumber).filter((n) => n >= 1 && n <= 17);
}

function sectionPercents(entry: HubVenture) {
    if (entry.status === "submitted" && !isRevision(entry)) return SECTION_SHORT.map(() => 100);
    const unlocked = Math.max(0, Math.min(6, entry.stepCompleted ?? 0));
    return SECTION_SHORT.map((_, i) => {
        if (i < unlocked) return 100;
        if (i === unlocked && unlocked < 6) return hasRecord(entry) ? 30 : 0;
        return 0;
    });
}

function overallPct(entry: HubVenture) {
    const secs = sectionPercents(entry);
    return Math.round(secs.reduce((sum, n) => sum + n, 0) / secs.length);
}

function categoryLabel(pct: number) {
    if (pct >= 100) return "COMPLETE";
    if (pct <= 25) return "NOT STARTED";
    return "IN PROCESS";
}

function stageLabel(stage?: string | null) {
    if (!stage) return "";
    const hit = V11_STAGES.find((s) => s.id === stage);
    return hit?.title || stage;
}

function tractionLine(entry: HubVenture) {
    if (entry.sectionSummaries?.traction?.trim()) return entry.sectionSummaries.traction.trim();
    const rows = (entry.tractionRows || []).filter((r) => r.metric || r.value);
    if (rows.length) {
        return rows
            .slice(0, 3)
            .map((r) => [r.metric, r.value].filter(Boolean).join(" "))
            .join("; ");
    }
    const ev = entry.evidenceInfo;
    const bits = [
        ev?.customers ? `${ev.customers} customers` : null,
        ev?.revenueToDate ? `PKR ${ev.revenueToDate} revenue` : null,
        ev?.interviews ? `${ev.interviews} interviews` : null,
        ev?.pilotPartners ? `${ev.pilotPartners} pilots` : null,
    ].filter(Boolean);
    return bits.join("; ");
}

function teamNames(entry: HubVenture) {
    const named = (entry.team || []).map((m) => m.name?.trim()).filter(Boolean) as string[];
    const founder = entry.academicSetup?.founderName?.trim();
    if (founder && !named.some((n) => n.toLowerCase() === founder.toLowerCase())) return [founder, ...named];
    return named.length ? named : founder ? [founder] : [];
}

function facultyReminders(entry: HubVenture) {
    const faculty = entry.academicSetup?.supervisorName?.trim() || "your faculty";
    const to = entry.academicSetup?.supervisorEmail?.trim() || "";
    const title = entry.ventureName?.trim() || "my venture";
    const subject = `Reminder: ${title} is waiting for your review`;
    const body = `Hi ${shortPerson(faculty)},\n\nJust a nudge — my venture card "${title}" is with you on CIEL PK.\n\nThank you.`;
    return { to, subject, body, faculty };
}

function actionWithLabel(entry: HubVenture) {
    if (isPathEntryApproved(entry)) return "None — Approved";
    if (isRejected(entry)) return "None — Rejected";
    if (isPathEntryWaiting(entry)) return "Faculty";
    return "Student";
}

function timelineSteps(entry: HubVenture): { label: string; state: TimelineState }[] {
    const steps: { label: string; state: TimelineState }[] = [
        { label: "Draft", state: "done" },
        { label: "Submitted", state: "" },
        { label: "Faculty Review", state: "" },
        { label: "Decision", state: "" },
        { label: "Published to Impact Walls", state: "" },
    ];
    if (entry.status !== "submitted") {
        steps[0] = { label: "Draft", state: "now" };
        return steps;
    }
    if (isRevision(entry)) {
        return [
            { label: "Revising", state: "now" },
            { label: "Submitted", state: "done" },
            { label: "Faculty Review", state: "done" },
            { label: "Revision Requested", state: "warn" },
            { label: "Published to Impact Walls", state: "" },
        ];
    }
    if (isRejected(entry)) {
        return [
            { label: "Draft", state: "done" },
            { label: "Submitted", state: "done" },
            { label: "Faculty Review", state: "done" },
            { label: "Rejected", state: "bad" },
            { label: "Not Published", state: "" },
        ];
    }
    if (isPathEntryApproved(entry)) {
        return steps.map((s, i) => ({ label: i === 3 ? "Approved" : s.label, state: "done" as TimelineState }));
    }
    steps[1].state = "done";
    steps[2].state = "now";
    return steps;
}

function timelineDot(state: TimelineState) {
    if (state === "done") return "bg-[#2e9e5b] shadow-[0_0_0_2px_#2e9e5b]";
    if (state === "now") return "bg-[#0f8f8a] shadow-[0_0_0_4px_#b5e5e1]";
    if (state === "warn") return "bg-[#f39c12] shadow-[0_0_0_2px_#f39c12]";
    if (state === "bad") return "bg-[#d64545] shadow-[0_0_0_2px_#d64545]";
    return "bg-[#dbe3e8] shadow-[0_0_0_2px_#dbe3e8]";
}

function timelineText(state: TimelineState) {
    if (state === "done") return "text-[#1c8a52]";
    if (state === "now") return "text-[#0b6f6c]";
    if (state === "warn") return "text-[#c65b00]";
    if (state === "bad") return "text-[#b3261e]";
    return "text-[#9aa8b2]";
}

function timelineLine(state: TimelineState) {
    if (state === "done") return "bg-[#2e9e5b]";
    if (state === "warn") return "bg-[#f39c12]";
    if (state === "bad") return "bg-[#d64545]";
    return "bg-[#dbe3e8]";
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
        <span className={`inline-block rounded-full px-2.5 py-1 text-[11.5px] font-extrabold uppercase tracking-wide ${cls}`}>
            {isRevision(entry) ? "Revision requested" : label}
        </span>
    );
}

function PanelBack({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="rounded-full bg-[#eef3f6] px-4 py-2 text-[13.5px] font-bold text-[#0b4b57] hover:bg-[#e1eaef]"
        >
            ← Back
        </button>
    );
}

function ContactBtn({
    href,
    kind,
    label,
}: {
    href: string;
    kind: "mail" | "wa";
    label: string;
}) {
    return (
        <a
            href={href}
            target={kind === "wa" ? "_blank" : undefined}
            rel={kind === "wa" ? "noreferrer" : undefined}
            className={`inline-flex items-center rounded-[10px] px-3 py-1.5 text-[12.5px] font-bold text-white hover:brightness-105 ${kind === "wa" ? "bg-[#25d366]" : "bg-[#3b5ba9]"}`}
        >
            {kind === "wa" ? "WhatsApp" : "Email"} {label}
        </a>
    );
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
            {email ? <ContactBtn href={mailtoHref(email, subject, body)} kind="mail" label={sn} /> : null}
            <ContactBtn href={whatsappTargetedHref(whatsappCode, whatsappNumber, text)} kind="wa" label={sn} />
        </>
    );
}

function WorkspaceReminders({ entry }: { entry: HubVenture }) {
    const me = readStoredCurrentUser();
    const myEmail = typeof me?.email === "string" ? me.email.trim().toLowerCase() : "";
    const faculty = facultyReminders(entry);
    const teammates = (entry.team || []).filter((m) => {
        const email = m.email?.trim().toLowerCase() || "";
        const name = m.name?.trim();
        if (!name && !email) return false;
        if (email && email === myEmail) return false;
        return true;
    });
    const title = entry.ventureName?.trim() || "our venture";
    return (
        <>
            {teammates.map((m, i) => (
                <RemindPair
                    key={`${m.email || m.name || i}`}
                    name={m.name || "teammate"}
                    email={m.email}
                    whatsappCode={m.whatsappCode}
                    whatsappNumber={m.whatsappNumber}
                    subject={`Please continue ${title} on CIEL PK`}
                    body={`Hi ${shortPerson(m.name || "team")},\n\nOur startup record "${title}" is still in progress on CIEL PK. Please open the Startup Workspace and add your pieces.\n`}
                />
            ))}
            <RemindPair name={faculty.faculty} email={faculty.to || undefined} subject={faculty.subject} body={faculty.body} />
        </>
    );
}

function CompletionBar({ entry }: { entry: HubVenture }) {
    const pct = overallPct(entry);
    const secs = sectionPercents(entry);
    const rev = isRevision(entry);
    return (
        <div className="mt-2">
            <div className={`h-2.5 overflow-hidden rounded-full bg-[#e9eef2] ${rev ? "rev" : ""}`}>
                <i
                    className="block h-full rounded-full"
                    style={{
                        width: `${pct}%`,
                        background: rev ? "linear-gradient(90deg,#f6a021,#e57a0f)" : "linear-gradient(90deg,#19b8a8,#0b8b86)",
                    }}
                />
            </div>
            <div className="mt-1 flex justify-between text-[12.5px] font-semibold text-[#5d6c78]">
                <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[11.5px] font-extrabold uppercase tracking-wide ${
                        pct >= 100 ? "bg-[#e6f6ec] text-[#1c8a52]" : pct <= 25 ? "bg-[#eceff1] text-[#455a64]" : "bg-[#fff3e0] text-[#c65b00]"
                    }`}
                >
                    {categoryLabel(pct)} · {pct}%
                </span>
                <span>Updated {formatDay(entry.updatedAt) || "—"}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
                {SECTION_SHORT.map((label, i) => {
                    const v = secs[i];
                    const cls = v >= 100 ? "bg-[#e6f6ec] text-[#1c8a52]" : v > 0 ? "bg-[#fff3e0] text-[#c65b00]" : "bg-[#eef3f6] text-[#5d6c78]";
                    return (
                        <span key={label} title={`${V11_STEPS[i].label} — ${v}%`} className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${cls}`}>
                            {label} {v}%
                        </span>
                    );
                })}
            </div>
        </div>
    );
}

function VentureTimeline({ entry }: { entry: HubVenture }) {
    const steps = timelineSteps(entry);
    return (
        <div className="mt-4 flex items-start">
            {steps.map((s, i) => (
                <div key={`${s.label}-${i}`} className="relative min-w-0 flex-1 text-center">
                    {i < steps.length - 1 ? (
                        <span className={`absolute left-1/2 top-[7px] z-0 h-0.5 w-full ${timelineLine(s.state)}`} />
                    ) : null}
                    <span className={`relative z-[1] mx-auto block h-3.5 w-3.5 rounded-full border-[3px] border-white ${timelineDot(s.state)}`} />
                    <span className={`mt-1.5 block text-[12px] font-bold leading-tight ${timelineText(s.state)}`}>{s.label}</span>
                </div>
            ))}
        </div>
    );
}

function SdgTags({ entry }: { entry: HubVenture }) {
    const nums = sdgNumbers(entry);
    if (!nums.length) return null;
    return (
        <div>
            {nums.map((n) => (
                <span
                    key={n}
                    title={SDG_SHORT[n]}
                    className="mr-1.5 mb-1 inline-block rounded-lg px-2 py-0.5 text-[11.5px] font-extrabold text-white"
                    style={{ background: SDG_COLORS[n] }}
                >
                    SDG {n}
                </span>
            ))}
        </div>
    );
}

function RankBadges({ entry }: { entry: HubVenture }) {
    const ribbon = entry.meritRibbon;
    if (!ribbon && !isInvestorOpen(entry)) return null;
    const when = ribbon?.at ? formatDay(ribbon.at) : "";
    const scope = ribbon?.scope || "Faculty";
    return (
        <div className="mt-2 flex flex-wrap gap-1.5">
            {ribbon ? (
                <span className="rounded-lg border border-[#b7d8f5] bg-[#e5f1fb] px-2 py-0.5 text-[11px] font-extrabold text-[#1f6fc2]">
                    🎓 Rank #{ribbon.rank} · {scope}
                    {when ? ` ${when}` : ""}
                </span>
            ) : null}
            {isInvestorOpen(entry) ? (
                <span className="rounded-lg border border-[#f8bbd0] bg-[#fce4ec] px-2 py-0.5 text-[11px] font-extrabold text-[#c2185b]">
                    🤝 Featured in Investor Hub
                </span>
            ) : null}
        </div>
    );
}

function FilterBar({
    entries,
    showStatus,
    filters,
    onChange,
}: {
    entries: HubVenture[];
    showStatus?: boolean;
    filters: { status: string; stage: string; sector: string; sdg: string; sort: string; q: string };
    onChange: (next: { status: string; stage: string; sector: string; sdg: string; sort: string; q: string }) => void;
}) {
    const sectors = [...new Set(entries.map((e) => e.ideaInfo?.sector).filter(Boolean) as string[])].sort();
    const sdgs = [...new Set(entries.flatMap(sdgNumbers))].sort((a, b) => a - b);
    const stages = V11_STAGES.map((s) => s.id);
    const selectCls = "min-w-[170px] rounded-xl border border-[#e3e9ee] bg-white px-3 py-2.5 text-sm text-[#14212b]";
    return (
        <div className="mb-4 flex flex-wrap gap-2.5">
            {showStatus ? (
                <select className={selectCls} value={filters.status} onChange={(e) => onChange({ ...filters, status: e.target.value })}>
                    <option value="">All statuses</option>
                    <option value="draft">In Progress</option>
                    <option value="revision">Revision Requested</option>
                </select>
            ) : null}
            <select className={selectCls} value={filters.stage} onChange={(e) => onChange({ ...filters, stage: e.target.value })}>
                <option value="">All stages</option>
                {stages.map((s) => (
                    <option key={s} value={s}>
                        {stageLabel(s)}
                    </option>
                ))}
            </select>
            <select className={selectCls} value={filters.sector} onChange={(e) => onChange({ ...filters, sector: e.target.value })}>
                <option value="">All sectors</option>
                {sectors.map((s) => (
                    <option key={s} value={s}>
                        {s}
                    </option>
                ))}
            </select>
            <select className={selectCls} value={filters.sdg} onChange={(e) => onChange({ ...filters, sdg: e.target.value })}>
                <option value="">All SDGs</option>
                {sdgs.map((n) => (
                    <option key={n} value={String(n)}>
                        SDG {n} — {SDG_SHORT[n]}
                    </option>
                ))}
            </select>
            <select className={selectCls} value={filters.sort} onChange={(e) => onChange({ ...filters, sort: e.target.value })}>
                <option value="updated">Recently updated</option>
                <option value="completion">Completion %</option>
                <option value="score">Faculty score</option>
                <option value="name">Name A–Z</option>
            </select>
            <input
                type="text"
                value={filters.q}
                onChange={(e) => onChange({ ...filters, q: e.target.value })}
                placeholder="Search my ventures…"
                className="min-w-[170px] flex-1 rounded-xl border border-[#e3e9ee] bg-white px-3 py-2.5 text-sm"
            />
        </div>
    );
}

function applyFilters(list: HubVenture[], filters: { status: string; stage: string; sector: string; sdg: string; sort: string; q: string }, statusMode: "workspace" | "wall") {
    let out = list.filter((e) => {
        if (filters.status === "draft" && (e.status === "submitted" || isRevision(e))) return false;
        if (filters.status === "revision" && !isRevision(e)) return false;
        if (filters.stage && e.stage !== filters.stage) return false;
        if (filters.sector && e.ideaInfo?.sector !== filters.sector) return false;
        if (filters.sdg && !sdgNumbers(e).includes(Number(filters.sdg))) return false;
        const q = filters.q.trim().toLowerCase();
        if (q) {
            const hay = [e.ventureName, displayVentureId(e), e.ideaInfo?.sector, e.stage, ...teamNames(e)].join(" ").toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });
    out = [...out].sort((a, b) => {
        if (statusMode === "workspace") {
            const rev = Number(isRevision(b)) - Number(isRevision(a));
            if (rev) return rev;
        }
        if (filters.sort === "completion") return overallPct(b) - overallPct(a);
        if (filters.sort === "score") return (b.meritRibbon?.total || 0) - (a.meritRibbon?.total || 0);
        if (filters.sort === "name") return (a.ventureName || "").localeCompare(b.ventureName || "");
        return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    });
    return out;
}

function WorkspaceRow({
    entry,
    onContinue,
    onDetails,
}: {
    entry: HubVenture;
    onContinue: () => void;
    onDetails: () => void;
}) {
    const rev = isRevision(entry);
    const metaRest = [
        entry.ideaInfo?.sector,
        stageLabel(entry.stage) || entry.stage,
        teamNames(entry).length ? `Team: ${teamNames(entry).join(", ")}` : null,
        entry.academicSetup?.supervisorName ? `Faculty: ${entry.academicSetup.supervisorName}` : null,
    ]
        .filter(Boolean)
        .join(" · ");
    const complete = overallPct(entry) >= 100;
    return (
        <div className="grid grid-cols-1 items-center gap-[18px] rounded-[18px] border border-[#e3e9ee] bg-white p-[18px_20px] md:grid-cols-[1.6fr_1fr]">
            <div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <p className="m-0 text-[17px] font-extrabold text-[#14212b]">{entry.ventureName || "Untitled venture"}</p>
                    <StatusChip entry={entry} />
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-[#5d6c78]">
                    <b className="font-semibold text-[#14212b]">{displayVentureId(entry)}</b>
                    {metaRest ? ` · ${metaRest}` : ""}
                </p>
                {rev && entry.reviewPipeline?.supervisorNote ? (
                    <div className="mt-2 rounded-[14px] border border-[#f5c2be] bg-[#fdecea] px-4 py-3 text-[13.5px] leading-relaxed">
                        <b>Faculty asked for revision ({formatDay(entry.updatedAt)}):</b> {entry.reviewPipeline.supervisorNote}
                    </div>
                ) : null}
                <CompletionBar entry={entry} />
                <VentureTimeline entry={entry} />
            </div>
            <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
                <span className="inline-flex items-center rounded-full bg-[#eef3f6] px-2.5 py-1 text-[12px] font-bold text-[#0b4b57]">
                    Action with: {actionWithLabel(entry)}
                </span>
                <WorkspaceReminders entry={entry} />
                <button type="button" onClick={onContinue} className="rounded-[10px] bg-[#0f8f8a] px-3 py-1.5 text-[12.5px] font-bold text-white hover:brightness-105">
                    {rev ? "Continue Revision" : "Continue Filling"}
                </button>
                {complete ? (
                    <button type="button" onClick={onContinue} className="rounded-[10px] bg-[#2e9e5b] px-3 py-1.5 text-[12.5px] font-bold text-white hover:brightness-105">
                        {rev ? "Resubmit Venture" : "Submit to Faculty"}
                    </button>
                ) : null}
                <button type="button" onClick={onDetails} className="rounded-[10px] bg-[#eef3f6] px-3 py-1.5 text-[12.5px] font-bold text-[#0b4b57] hover:bg-[#e1eaef]">
                    Details
                </button>
            </div>
        </div>
    );
}

function ReviewRow({ entry, onOpen }: { entry: HubVenture; onOpen: () => void }) {
    const faculty = facultyReminders(entry);
    return (
        <div className="grid grid-cols-1 items-center gap-[18px] rounded-[18px] border border-[#e3e9ee] bg-white p-[18px_20px] md:grid-cols-[1.6fr_1fr]">
            <div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <p className="m-0 text-[17px] font-extrabold text-[#14212b]">{entry.ventureName || "Untitled venture"}</p>
                    <StatusChip entry={entry} />
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-[#5d6c78]">
                    <b className="font-semibold text-[#14212b]">{displayVentureId(entry)}</b>
                    {entry.reviewPipeline?.studentDeclaredAt || entry.updatedAt
                        ? ` · Submitted ${formatDay(entry.reviewPipeline?.studentDeclaredAt || entry.updatedAt)}`
                        : ""}
                    {faculty.faculty ? ` · Reviewer: ${faculty.faculty}` : ""}
                </p>
                <VentureTimeline entry={entry} />
            </div>
            <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
                <span className="inline-flex items-center rounded-full bg-[#eef3f6] px-2.5 py-1 text-[12px] font-bold text-[#0b4b57]">Action with: Faculty</span>
                <RemindPair name={faculty.faculty} email={faculty.to || undefined} subject={faculty.subject} body={faculty.body} />
                <button type="button" onClick={onOpen} className="rounded-[10px] bg-[#eef3f6] px-3 py-1.5 text-[12.5px] font-bold text-[#0b4b57] hover:bg-[#e1eaef]">
                    View Venture Card
                </button>
            </div>
        </div>
    );
}

function WallCard({ entry, onOpen }: { entry: HubVenture; onOpen: () => void }) {
    const ribbon = entry.meritRibbon;
    const pitch = entry.solutionInfo?.solution || entry.ideaInfo?.pitch || entry.sectionSummaries?.opportunity || "Approved venture record.";
    const traction = tractionLine(entry);
    return (
        <div className="flex flex-col overflow-hidden rounded-[20px] border border-[#e3e9ee] bg-white">
            <div className="bg-[linear-gradient(120deg,#0b4b57,#0f8f8a)] px-[18px] py-4 text-white">
                <small className="text-[11px] font-bold tracking-wide text-[#bfe8e4]">
                    {displayVentureId(entry)} · {entry.academicSetup?.university || "Venture"}
                </small>
                <h4 className="m-0 mt-1 text-[17px] font-bold">{entry.ventureName || "Untitled venture"}</h4>
                <div className="mt-1 text-[12.5px] text-[#dff3f1]">
                    {[displayName(), entry.ideaInfo?.sector, stageLabel(entry.stage) || entry.stage].filter(Boolean).join(" · ")}
                </div>
            </div>
            <div className="flex-1 px-[18px] py-3.5 text-[13.5px] leading-relaxed text-[#14212b]">
                <SdgTags entry={entry} />
                <p className="my-2 line-clamp-3">{pitch}</p>
                {traction ? (
                    <p className="m-0 text-[#5d6c78]">
                        <b>Traction:</b> {traction}
                    </p>
                ) : null}
                <RankBadges entry={entry} />
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-[#e3e9ee] px-[18px] py-3">
                <span className="rounded-full bg-[#e6f6ec] px-2.5 py-1 text-[11.5px] font-extrabold uppercase tracking-wide text-[#1c8a52]">
                    Approved {formatDay(entry.updatedAt)}
                </span>
                {ribbon?.total != null ? (
                    <span className="rounded-full bg-[#e0f2f1] px-2.5 py-1 text-[11.5px] font-extrabold uppercase tracking-wide text-[#0b6f6c]">
                        Faculty score {ribbon.total}
                    </span>
                ) : null}
                {isInvestorOpen(entry) ? (
                    <span className="rounded-full bg-[#ede7f6] px-2.5 py-1 text-[11.5px] font-extrabold uppercase tracking-wide text-[#5e35b1]">
                        Investor opt-in
                    </span>
                ) : null}
                <span className="flex-1" />
                <button type="button" onClick={onOpen} className="rounded-[10px] bg-[#eef3f6] px-3 py-1.5 text-[12.5px] font-bold text-[#0b4b57] hover:bg-[#e1eaef]">
                    Open
                </button>
            </div>
        </div>
    );
}

function VentureDetailCard({ entry }: { entry: HubVenture }) {
    const faculty = facultyReminders(entry);
    const team = teamNames(entry);
    const model = entry.solutionInfo?.revenue || (entry.solutionInfo?.revenueModels || []).join(" + ");
    return (
        <div className="overflow-hidden rounded-[22px] border border-[#e3e9ee] bg-white">
            <div className="flex flex-wrap items-start justify-between gap-3.5 bg-[linear-gradient(120deg,#0b4b57,#0f8f8a)] px-6 py-5 text-white">
                <div>
                    <div className="text-[12px] font-bold tracking-wide text-[#bfe8e4]">
                        {displayVentureId(entry)} · {entry.academicSetup?.university || "Venture"}
                    </div>
                    <h4 className="m-0 mt-1 text-[22px] font-bold">{entry.ventureName || "Untitled venture"}</h4>
                    <div className="mt-1.5 text-[13px] text-[#dff3f1]">
                        {displayName()}
                        {team.length > 1 ? ` + ${team.length - 1} team member${team.length > 2 ? "s" : ""}` : ""}
                        {entry.academicSetup?.courseCode || entry.academicSetup?.courseRef ? ` · ${entry.academicSetup.courseCode || entry.academicSetup.courseRef}` : ""}
                        {faculty.faculty ? ` · Faculty: ${faculty.faculty}` : ""}
                    </div>
                </div>
                <div className="text-right">
                    <StatusChip entry={entry} />
                    <div className="mt-2 text-[12px]">{isInvestorOpen(entry) ? "🤝 Open to investors" : "🔒 Not seeking investment"}</div>
                </div>
            </div>
            <div className="px-6 py-[18px]">
                <div className="mb-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                        { k: "Sector · Stage", v: [entry.ideaInfo?.sector, stageLabel(entry.stage) || entry.stage].filter(Boolean).join(" · ") },
                        { k: "Problem", v: entry.ideaInfo?.problem || entry.sectionSummaries?.opportunity },
                        { k: "Solution", v: entry.solutionInfo?.solution },
                        { k: "Business model", v: model },
                        { k: "Traction & evidence", v: tractionLine(entry) },
                        { k: "Team", v: team.length ? team.join(", ") : displayName() },
                    ]
                        .filter((x) => x.v)
                        .map((x) => (
                            <div key={x.k} className="rounded-xl bg-[#f6f8fa] px-3 py-2.5 text-[13px] leading-snug">
                                <b className="mb-0.5 block text-[11px] font-bold uppercase tracking-wide text-[#5d6c78]">{x.k}</b>
                                {x.v}
                            </div>
                        ))}
                </div>
                <SdgTags entry={entry} />
            </div>
        </div>
    );
}

function RecordView({ entry, onBack, onContinue }: { entry: HubVenture; onBack: () => void; onContinue: () => void }) {
    const ribbon = entry.meritRibbon;
    const note = entry.reviewPipeline?.supervisorNote;
    const decided = isPathEntryApproved(entry) || isRejected(entry) || isRevision(entry);
    return (
        <div className="mt-[22px] rounded-[22px] bg-white p-[26px_30px] shadow-[0_8px_30px_rgba(10,30,40,.08)]">
            <div className="mb-[18px] flex flex-wrap items-start gap-3.5">
                <PanelBack onClick={onBack} />
                <div className="min-w-0 flex-1">
                    <h3 className="m-0 text-[22px] font-bold text-[#14212b]">{entry.ventureName || "Untitled venture"}</h3>
                    <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#5d6c78]">
                        {displayVentureId(entry)} · {ventureStatusLabel(entry).label} · Action with: {actionWithLabel(entry)}
                    </p>
                </div>
                {isRevision(entry) ? (
                    <button type="button" onClick={onContinue} className="rounded-xl bg-[#f39c12] px-4 py-2.5 text-[13.5px] font-bold text-white">
                        Continue Revision
                    </button>
                ) : null}
            </div>
            <VentureTimeline entry={entry} />
            <div className="mt-4">
                <VentureDetailCard entry={entry} />
            </div>
            {(entry.status !== "submitted" || isRevision(entry)) && (
                <div className="mt-4 rounded-[18px] border border-[#e3e9ee] p-5">
                    <b>Completion</b>
                    <CompletionBar entry={entry} />
                </div>
            )}
            {decided && !isPathEntryWaiting(entry) ? (
                <div className="mt-4 grid grid-cols-1 gap-[18px] md:grid-cols-2">
                    <div className="rounded-[18px] border border-[#e3e9ee] p-5">
                        <div className="flex items-center gap-[18px]">
                            {isPathEntryApproved(entry) && ribbon?.total != null ? (
                                <div className="text-center">
                                    <div
                                        className="relative grid h-[78px] w-[78px] place-items-center rounded-full text-[18px] font-extrabold"
                                        style={{ background: `conic-gradient(#0f8f8a ${ribbon.total}%, #e6ebef 0)` }}
                                    >
                                        <span className="absolute inset-[7px] rounded-full bg-white" />
                                        <span className="relative">{ribbon.total}</span>
                                    </div>
                                    <div className="mt-1.5 text-[11px] font-bold tracking-wide text-[#5d6c78]">FACULTY SCORE</div>
                                </div>
                            ) : null}
                            <div>
                                <b>
                                    Faculty decision — {ventureStatusLabel(entry).label}
                                </b>
                                <p className="mt-1.5 mb-0 text-sm leading-relaxed">{note || (isPathEntryApproved(entry) ? "Approved for the impact wall." : "See faculty note on this record.")}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-[18px] border border-[#e3e9ee] p-5">
                        <b>Section remarks</b>
                        <p className="mt-2 mb-0 text-[14.5px] text-[#5d6c78]">{note || "No section-level remarks."}</p>
                    </div>
                </div>
            ) : null}
            {isPathEntryApproved(entry) ? (
                <div className="mt-4 rounded-[18px] border border-[#e3e9ee] p-5">
                    <b>Analysis & recognition</b>
                    <p className="mt-1.5 mb-2 text-[13.5px] leading-relaxed">
                        {ribbon?.total != null ? `${ribbon.total}/100 faculty score.` : "Approved venture."}{" "}
                        {ribbon ? `Ranked #${ribbon.rank} of ${ribbon.of}${ribbon.badgeLevel ? ` · ${ribbon.badgeLevel}` : ""}.` : "Rankings appear here after faculty / university / CIEL PK grading."}
                    </p>
                    <RankBadges entry={entry} />
                    {isInvestorOpen(entry) ? (
                        <div className="mt-3 rounded-[14px] border border-[#b8e3c6] bg-[#e6f6ec] px-4 py-3 text-[13.5px]">
                            <b>Investor reach-outs (via CIEL Investor Hub)</b>
                            <p className="mt-1 mb-0 text-[#5d6c78]">This venture is opted in. Interest from investors will show here when the hub records it.</p>
                        </div>
                    ) : (
                        <p className="mt-2 mb-0 text-[14.5px] text-[#5d6c78]">Not opted in to investors — this venture is on the impact walls only.</p>
                    )}
                </div>
            ) : null}
        </div>
    );
}

export default function StartupBusinessHub({
    view,
}: {
    view: HubView;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [entry, setEntry] = useState<HubVenture | null>(null);
    const [name, setName] = useState("there");
    const [filters, setFilters] = useState({ status: "", stage: "", sector: "", sdg: "", sort: "updated", q: "" });

    useEffect(() => {
        setName(firstName());
        authenticatedFetch("/api/v1/paths/startup-business", {}, { redirectToLogin: true })
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (result?.data) setEntry(result.data as HubVenture);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        setFilters({ status: "", stage: "", sector: "", sdg: "", sort: "updated", q: "" });
    }, [view]);

    const all = useMemo(() => (hasRecord(entry) && entry ? [entry] : []), [entry]);
    const approved = all.filter(isPathEntryApproved);
    const underReview = all.filter(isPathEntryWaiting);
    const revision = all.filter(isRevision);
    const rejected = all.filter(isRejected);
    const inProgress = all.filter((e) => (e.status !== "submitted" || isRevision(e)) && !isPathEntryApproved(e) && !isPathEntryWaiting(e) && !isRejected(e));
    const investorOpen = approved.some(isInvestorOpen);

    const workspaceList = applyFilters(inProgress, filters, "workspace");
    const wallList = applyFilters(approved, filters, "wall");

    const workspaceBadge = [
        `${inProgress.length} in progress`,
        revision.length ? `${revision.length} revision` : null,
    ]
        .filter(Boolean)
        .join(" · ");
    const wallBadge = [`${approved.length} approved`, investorOpen ? "1 investor interest" : null].filter(Boolean).join(" · ");

    if (loading) return <WorkspaceSkeleton />;

    const openForm = () => router.push(WORKSPACE_HREF);
    const openRecord = () => router.push(RECORD_HREF);
    const recordBack = () => {
        if (entry && isPathEntryApproved(entry)) router.push(WALL_HREF);
        else if (entry && isPathEntryWaiting(entry)) router.push(UNDER_REVIEW_HREF);
        else router.push(IN_PROGRESS_HREF);
    };

    return (
        <div className="mx-auto max-w-[1040px] pb-16">
            <CourseworkCrumb
                role="Student"
                pathLabel="Startup / Venture"
                view={view === "home" ? undefined : HUB_VIEW_LABEL[view] ?? view}
            />
            <CourseworkHero
                kicker="MY PATHS · STARTUP / VENTURE"
                title={namedTimeGreeting(name === "there" ? "" : name.toUpperCase(), "🚀")}
                subtitle="Build your venture profile section by section, submit your venture card to faculty, collect your approved ventures here — and open the door to investors when you are ready."
                gradient="radial-gradient(120% 140% at 100% 0%, #0d8e88 0%, #0b4b57 45%, #0a2f3d 100%)"
                roleBadge="STUDENT"
                stats={[
                    { value: String(approved.length), label: "APPROVED", href: WALL_HREF },
                    { value: String(underReview.length), label: "UNDER REVIEW", href: UNDER_REVIEW_HREF },
                    { value: String(inProgress.length), label: "IN PROGRESS", href: IN_PROGRESS_HREF },
                ]}
            />

            {view === "guide" && (
                <div className="mt-[22px] rounded-[22px] p-7 text-white shadow-[0_8px_30px_rgba(10,30,40,.08)]" style={{ background: "linear-gradient(135deg,#8f5bea,#6a35c8)" }}>
                    <button
                        type="button"
                        onClick={() => router.push(BASE)}
                        className="mb-4 rounded-full bg-white/15 px-4 py-2 text-[13.5px] font-bold text-white hover:bg-white/25"
                    >
                        ← Back
                    </button>
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
            )}

            {view === "in-progress" && (
                <div className="mt-[22px] rounded-[22px] bg-white p-[26px_30px] shadow-[0_8px_30px_rgba(10,30,40,.08)]">
                    <div className="mb-[18px] flex flex-wrap items-start gap-3.5">
                        <PanelBack onClick={() => router.push(BASE)} />
                        <div className="min-w-0 flex-1">
                            <h3 className="m-0 text-[22px] font-bold text-[#14212b]">🧩 Startup Workspace — {inProgress.length} in progress</h3>
                            <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#5d6c78]">
                                Everything you type in the form lands here automatically. Your faculty and university see the same completion bar in their &quot;Startups in Process&quot; screens, so reminders come from them too. You can run as many startups as you like — each gets its own Venture ID.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => router.push(CREATE_HREF)}
                            className="rounded-xl bg-[#0f8f8a] px-4 py-2.5 text-[13.5px] font-bold text-white hover:brightness-105"
                        >
                            ＋ Create New Opportunity
                        </button>
                    </div>
                    <FilterBar entries={inProgress} showStatus filters={filters} onChange={setFilters} />
                    <div className="flex flex-col gap-3.5">
                        {workspaceList.length ? (
                            workspaceList.map((row) => (
                                <WorkspaceRow key={row.id || "row"} entry={row} onContinue={openForm} onDetails={openRecord} />
                            ))
                        ) : (
                            <div className="rounded-2xl border border-dashed border-[#e3e9ee] px-8 py-8 text-center text-[#5d6c78]">
                                No drafts — create a startup record to begin.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {view === "under-review" && (
                <div className="mt-[22px] rounded-[22px] bg-white p-[26px_30px] shadow-[0_8px_30px_rgba(10,30,40,.08)]">
                    <div className="mb-[18px] flex flex-wrap items-start gap-3.5">
                        <PanelBack onClick={() => router.push(BASE)} />
                        <div className="min-w-0 flex-1">
                            <h3 className="m-0 text-[22px] font-bold text-[#14212b]">📬 Ventures Under Review — {underReview.length}</h3>
                            <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#5d6c78]">
                                Your venture card is locked and with your faculty. You can nudge them by Email or WhatsApp.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3.5">
                        {underReview.length ? (
                            underReview.map((row) => <ReviewRow key={row.id || "review"} entry={row} onOpen={openRecord} />)
                        ) : (
                            <div className="rounded-2xl border border-dashed border-[#e3e9ee] px-8 py-8 text-center text-[#5d6c78]">
                                Nothing under review right now.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {view === "wall" && (
                <div className="mt-[22px] rounded-[22px] bg-white p-[26px_30px] shadow-[0_8px_30px_rgba(10,30,40,.08)]">
                    <div className="mb-[18px] flex flex-wrap items-start gap-3.5">
                        <PanelBack onClick={() => router.push(BASE)} />
                        <div className="min-w-0 flex-1">
                            <h3 className="m-0 text-[22px] font-bold text-[#14212b]">🏅 My Ventures Impact Wall — {approved.length} approved</h3>
                            <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#5d6c78]">
                                Approved ventures only. Open a card to see your faculty score, remarks and analysis, ranking badges and investor interest.
                            </p>
                        </div>
                    </div>
                    <FilterBar entries={approved} filters={filters} onChange={setFilters} />
                    {wallList.length ? (
                        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
                            {wallList.map((row) => (
                                <WallCard key={row.id || "wall"} entry={row} onOpen={openRecord} />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-[#e3e9ee] px-8 py-8 text-center text-[#5d6c78]">
                            No approved ventures yet.
                        </div>
                    )}
                    {rejected.length ? (
                        <>
                            <h3 className="mt-[26px] text-[17px] font-bold text-[#5d6c78]">Not published (rejected — kept for your record)</h3>
                            <div className="mt-2.5 flex flex-col gap-3.5">
                                {rejected.map((row) => (
                                    <div key={row.id || "rej"} className="grid grid-cols-1 items-center gap-4 rounded-[18px] border border-[#e3e9ee] p-5 md:grid-cols-[1.6fr_1fr]">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2.5">
                                                <p className="m-0 text-[17px] font-extrabold">{row.ventureName || "Untitled venture"}</p>
                                                <StatusChip entry={row} />
                                            </div>
                                            <p className="mt-1 text-[13px] text-[#5d6c78]">
                                                <b className="font-semibold text-[#14212b]">{displayVentureId(row)}</b>
                                                {row.reviewPipeline?.supervisorNote ? ` · ${row.reviewPipeline.supervisorNote}` : ""}
                                            </p>
                                        </div>
                                        <div className="flex justify-start md:justify-end">
                                            <button type="button" onClick={openRecord} className="rounded-[10px] bg-[#eef3f6] px-3 py-1.5 text-[12.5px] font-bold text-[#0b4b57]">
                                                Details
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : null}
                </div>
            )}

            {view === "record" && entry && hasRecord(entry) ? (
                <RecordView entry={entry} onBack={recordBack} onContinue={openForm} />
            ) : null}
            {view === "record" && !(entry && hasRecord(entry)) ? (
                <div className="mt-[22px] rounded-[22px] bg-white p-8 text-center text-[#5d6c78] shadow-[0_8px_30px_rgba(10,30,40,.08)]">
                    <PanelBack onClick={() => router.push(BASE)} />
                    <p className="mt-4">No venture card to open yet.</p>
                </div>
            ) : null}

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
                            badge={`${underReview.length} under review`}
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
