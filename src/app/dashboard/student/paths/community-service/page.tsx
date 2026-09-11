"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, FileText, ListChecks, UploadCloud, Send, Award, Pencil, Trash2 } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import { uploadFileViaPresign } from "@/utils/presignedFileUpload";
import { fetchStudentDashboardData } from "@/utils/student-dashboard-fetch";
import type { ActiveProject } from "@/app/dashboard/student/types";
import PathWorkspaceShell from "@/components/ciel/PathWorkspaceShell";
import EmptyState from "@/components/ciel/EmptyState";
import StatusPill, { type CielHourStatus } from "@/components/ciel/StatusPill";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";
import CommunityServiceHub, { CommunityCreateOpportunityView } from "./CommunityServiceHub";
import CommunityServiceWorkspace from "./CommunityServiceWorkspace";
import CommunityServiceRankings from "./CommunityServiceRankings";
import { HubBackButton } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import StudentCommunityGuide from "@/components/report/StudentCommunityGuide";
import { fetchImpactSummary } from "@/utils/cielImpactSummary";
import { readStoredCurrentUser } from "@/utils/currentUser";

/** Mirrors Nest `LINE_STATUS` (opportunity-workflow.service.ts) — every value the API can send. */
type ApprovalLineStatus =
    | "pending"
    | "approved"
    | "rejected"
    | "revision_requested"
    | "skipped"
    | "not_applicable"
    | "not_required"
    | null
    | undefined;

interface CreatedOpportunity {
    id: string;
    title: string;
    status?: string;
    workflow_stage?: string | null;
    faculty_approval_status?: ApprovalLineStatus;
    partner_approval_status?: ApprovalLineStatus;
    admin_approval_status?: ApprovalLineStatus;
    requires_partner_approval?: boolean;
}

interface AttendanceLog {
    id: string;
    projectId: string;
    dateOfEngagement: string;
    startTime: string;
    endTime: string;
    /** Postgres `decimal` — TypeORM serialises it as a string ("3.00"), so never render it raw. */
    sessionHours: number | string;
    organizationName: string;
    activityType: string;
    description: string;
    evidenceUrl: string | null;
    entryStatus: "pending" | "verified" | "flagged";
    approvalStatus: string | null;
    /** Reviewer's note recorded alongside a reject/flag decision. */
    approvalActionReason?: string | null;
}

/** "3.00" → "3", "2.50" → "2.5". */
function formatHours(value: number | string): string {
    const n = Number(value);
    return Number.isFinite(n) ? String(Math.round(n * 100) / 100) : String(value);
}

/** Postgres `time` comes back as "09:00:00" — students read HH:mm. */
function formatClock(value: string): string {
    const match = /^(\d{1,2}):(\d{2})/.exec(String(value ?? ""));
    return match ? `${match[1].padStart(2, "0")}:${match[2]}` : String(value ?? "");
}

function hourStatus(log: AttendanceLog): CielHourStatus {
    if (log.entryStatus === "verified" || log.approvalStatus === "approved") return "verified";
    if (log.approvalStatus === "rejected") return "rejected";
    if (log.entryStatus === "flagged" || log.approvalStatus === "flagged") return "flagged";
    if (log.approvalStatus === "pending") return "pending";
    return "logged";
}

const HUB = "/dashboard/student/paths/community-service";

const TABS = [
    { key: "engagements", label: "My engagements" },
    { key: "log-hours", label: "Log hours" },
    { key: "reports", label: "Reports" },
    { key: "find", label: "Find opportunities" },
];

function CommunityServiceContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const rawTab = searchParams.get("tab");
    const showHub = !rawTab;
    const rawFilter = searchParams.get("filter");
    const workspaceFilter =
        rawFilter === "opportunity" ||
        rawFilter === "report" ||
        rawFilter === "review" ||
        rawFilter === "revision" ||
        rawFilter === "closed"
            ? rawFilter
            : "all";
    const wallView = searchParams.get("view") === "wall";
    const guideView = searchParams.get("view") === "guide";
    const createView = searchParams.get("view") === "create";
    const workspaceView = searchParams.get("view") === "workspace";
    const rankingsView = searchParams.get("view") === "rankings";
    const activeTab = TABS.some((t) => t.key === rawTab) ? rawTab! : "engagements";

    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [projects, setProjects] = useState<ActiveProject[]>([]);
    const [verifiedHours, setVerifiedHours] = useState(0);
    const [wallCount, setWallCount] = useState(0);
    const [completion, setCompletion] = useState(0);
    const [bestCii, setBestCii] = useState<number | null>(null);
    const [displayName, setDisplayName] = useState("");
    const [myOpportunities, setMyOpportunities] = useState<CreatedOpportunity[]>([]);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            fetchStudentDashboardData({ redirectToLogin: false }),
            fetchImpactSummary({ redirectToLogin: false }),
            authenticatedFetch("/api/v1/student/opportunity/mine", {}, { redirectToLogin: false })
                .then((res) => (res?.ok ? res.json() : null))
                .catch(() => null),
            authenticatedFetch("/api/v1/students/community-service/rankings", {}, { redirectToLogin: false })
                .then((res) => (res?.ok ? res.json() : null))
                .catch(() => null),
        ]).then(([data, summary, oppResult, rankingsResult]) => {
            if (cancelled) return;
            // `data === null` means the dashboard call failed (offline / expired session) — say so
            // instead of rendering a hub full of confident zeros.
            setLoadFailed(!data);
            setProjects(data?.activeProjects ?? []);
            setVerifiedHours(data?.overview?.totalVerifiedHours ?? data?.stats?.hoursVolunteered ?? 0);
            setWallCount(data?.overview?.impactHistoryBadgeCount ?? data?.overview?.completedCount ?? 0);
            setCompletion(Math.round(summary?.pathsStatus?.communityService?.progress ?? 0));
            const rankingRows = Array.isArray(rankingsResult?.data)
                ? (rankingsResult.data as { cii?: number }[])
                : [];
            const rankingBest = rankingRows.reduce<number | null>((max, row) => {
                const n = typeof row.cii === "number" ? row.cii : null;
                if (n == null) return max;
                return max == null ? n : Math.max(max, n);
            }, null);
            setBestCii(rankingBest);
            const storedName = readStoredCurrentUser()?.name;
            setDisplayName(typeof storedName === "string" ? storedName.trim() : "");
            const rows = Array.isArray(oppResult?.data) ? (oppResult.data as Record<string, unknown>[]) : [];
            setMyOpportunities(
                rows
                    .filter((r) => r.status !== "draft")
                    .map((r) => ({
                        id: String(r.id),
                        title: String(r.title ?? "Untitled opportunity"),
                        status: typeof r.status === "string" ? r.status : undefined,
                        workflow_stage: (r.workflow_stage as string | null) ?? null,
                        faculty_approval_status: r.faculty_approval_status as ApprovalLineStatus,
                        partner_approval_status: r.partner_approval_status as ApprovalLineStatus,
                        admin_approval_status: r.admin_approval_status as ApprovalLineStatus,
                        requires_partner_approval: Boolean(r.requires_partner_approval),
                    })),
            );
            setLoading(false);
        }).catch(() => {
            if (cancelled) return;
            setLoadFailed(true);
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const attention = useMemo(() => {
        const revisionOpp = myOpportunities.find((o) => o.workflow_stage === "revision");
        const oppAction = myOpportunities.filter((o) => o.workflow_stage === "revision").length;
        const oppApprovals = myOpportunities.filter((o) =>
            ["pending_faculty", "pending_partner", "pending_admin"].includes(o.workflow_stage ?? ""),
        ).length;
        const readyProjects = projects.filter((p) => !p.report_status);
        const reportAction = projects.filter((p) => p.report_status === "rejected").length;
        const reportsInProgress = projects.filter(
            (p) => p.report_status && !["verified", "paid", "rejected"].includes(p.report_status),
        ).length;
        return [
            {
                key: "oppAction",
                n: oppAction,
                title: "Opportunity action",
                sub: oppAction ? "Revision waiting inside Create Opportunity" : "No proposal revision waiting",
                href: revisionOpp
                    ? `/dashboard/student/create-opportunity?edit=${encodeURIComponent(revisionOpp.id)}`
                    : `${HUB}?view=create`,
                urgent: oppAction > 0,
                tone: oppAction > 0 ? ("bad" as const) : ("default" as const),
            },
            {
                key: "oppApprovals",
                n: oppApprovals,
                title: "Opportunity approvals",
                sub: "Faculty / Partner / CIEL PK decisions tracked in Create Opportunity",
                href: `${HUB}?view=workspace&filter=opportunity`,
                urgent: false,
                tone: "default" as const,
            },
            {
                key: "readyToStart",
                n: readyProjects.length,
                title: "Ready to start",
                sub: "Approved projects waiting in Workspace",
                href: `${HUB}?view=workspace&filter=report`,
                urgent: false,
                tone: readyProjects.length > 0 ? ("warn" as const) : ("default" as const),
            },
            {
                key: "reportAction",
                n: reportAction,
                title: "Report action",
                sub: reportAction ? "Faculty requested a report revision" : "No report revision waiting",
                href: `${HUB}?view=workspace&filter=revision`,
                urgent: reportAction > 0,
                tone: reportAction > 0 ? ("bad" as const) : ("default" as const),
            },
            {
                key: "reportsInProgress",
                n: reportsInProgress,
                title: "Reports in progress",
                sub: reportsInProgress ? "Continue your active report(s)" : "No active reports",
                href: `${HUB}?view=workspace&filter=report`,
                urgent: false,
                tone: reportsInProgress > 0 ? ("warn" as const) : ("default" as const),
            },
        ];
    }, [myOpportunities, projects]);

    useEffect(() => {
        if (rawTab === "find") {
            router.replace("/dashboard/student/browse");
        }
        if (wallView) {
            router.replace("/dashboard/student/impact?area=Community%20Service");
        }
    }, [rawTab, wallView, router]);

    const setTab = (key: string) => {
        if (key === "find") {
            router.push("/dashboard/student/browse");
            return;
        }
        const qs = new URLSearchParams(Array.from(searchParams.entries()));
        qs.set("tab", key);
        router.replace(`/dashboard/student/paths/community-service?${qs.toString()}`);
    };

    if (loading) return <WorkspaceSkeleton />;
    if (rawTab === "find") return <WorkspaceSkeleton />;
    if (wallView) return <WorkspaceSkeleton />;

    if (showHub && guideView) {
        return (
            <div className="mx-auto max-w-[980px] pb-16">
                <HubBackButton href="/dashboard/student/paths/community-service" label="← Back to Community Service" />
                <StudentCommunityGuide showHero />
            </div>
        );
    }

    if (showHub && createView) {
        return (
            <CommunityCreateOpportunityView
                projects={projects}
                verifiedHours={verifiedHours}
                wallCount={wallCount}
                completion={completion}
            />
        );
    }

    if (showHub && workspaceView) {
        return (
            <CommunityServiceWorkspace
                projects={projects}
                verifiedHours={verifiedHours}
                wallCount={wallCount}
                completion={completion}
                initialFilter={workspaceFilter}
            />
        );
    }

    if (showHub && rankingsView) {
        return (
            <div className="mx-auto max-w-[1500px] pb-16">
                <HubBackButton href={HUB} label="← Back to Community Service" />
                <CommunityServiceRankings />
            </div>
        );
    }

    if (showHub) {
        const reportInProgress = attention.some((item) => item.key === "reportsInProgress" && item.n > 0);
        const recordIds = new Set(projects.map((p) => p.id));
        myOpportunities.forEach((o) => recordIds.add(o.id));
        return (
            <>
                <LoadFailedBanner show={loadFailed} />
                <CommunityServiceHub
                    projects={projects}
                    verifiedHours={verifiedHours}
                    wallCount={wallCount}
                    completion={completion}
                    attention={attention}
                    displayName={displayName}
                    bestCii={bestCii}
                    reportInProgress={reportInProgress}
                    recordCount={recordIds.size}
                />
            </>
        );
    }

    return (
        <div>
            <LoadFailedBanner show={loadFailed} />
            <Link
                href="/dashboard/student/paths/community-service"
                className="mb-3 inline-flex items-center text-xs font-extrabold text-[#0e7d74] hover:underline"
            >
                ← Community Service hub
            </Link>
            <PathWorkspaceShell
                title="Community Service"
                primaryActionLabel="Log hours"
                onPrimaryAction={() => setTab("log-hours")}
                stats={[
                    { label: "Active engagements", value: String(projects.length), icon: ListChecks },
                    { label: "Verified hours", value: String(Math.round(verifiedHours)), icon: Clock, hint: "Contributes to sections 1, 4 of your impact score" },
                ]}
                tabs={TABS}
                activeTab={activeTab}
                onTabChange={setTab}
            >
                {activeTab === "engagements" && (
                    <EngagementsTab
                        projects={projects}
                        createdOpportunities={myOpportunities}
                        onOpportunityDeleted={(id) => setMyOpportunities((prev) => prev.filter((o) => o.id !== id))}
                    />
                )}
                {activeTab === "log-hours" && <LogHoursTab projects={projects} />}
                {activeTab === "reports" && <ReportsTab projects={projects} />}
            </PathWorkspaceShell>
        </div>
    );
}

/** Shown when the dashboard call failed, so an empty hub never masquerades as "you have nothing". */
function LoadFailedBanner({ show }: { show: boolean }) {
    if (!show) return null;
    return (
        <div className="mx-auto mb-3 flex max-w-[1500px] flex-wrap items-center justify-between gap-3 rounded-ciel-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
            <span>We couldn&apos;t load your Community Service data just now, so counts below may be incomplete.</span>
            <button
                type="button"
                onClick={() => window.location.reload()}
                className="ciel-transition rounded-ciel-xs border border-amber-300 bg-white px-3 py-1.5 font-bold text-amber-900 hover:bg-amber-100"
            >
                Retry
            </button>
        </div>
    );
}

type ApprovalStagePill = { label: string; state: "done" | "current" | "waiting" | "rejected" | "revision" };

/** Lines the backend marks as never applying to this proposal (e.g. a private candidate has no faculty line). */
function lineNotRequired(status: ApprovalLineStatus): boolean {
    return status === "not_applicable" || status === "not_required" || status === "skipped";
}

/** Faculty → Partner → CIEL PK, one pill per stage, derived from the same workflow fields the
 * admin/faculty dashboards already key off (`workflow_stage`, `*_approval_status`). */
function approvalStages(op: CreatedOpportunity): ApprovalStagePill[] {
    const stage = op.workflow_stage ?? "";
    const facultyNotRequired = lineNotRequired(op.faculty_approval_status);
    const facultyDone =
        op.faculty_approval_status === "approved" ||
        facultyNotRequired ||
        (stage !== "pending_faculty" && stage !== "" && stage !== "revision");
    const facultyState: ApprovalStagePill["state"] =
        op.faculty_approval_status === "rejected"
            ? "rejected"
            : // A revision request is neither done nor a rejection — it needs the student to act.
              op.faculty_approval_status === "revision_requested"
              ? "revision"
              : facultyDone
                ? "done"
                : "current";

    const needsPartner = op.requires_partner_approval && !lineNotRequired(op.partner_approval_status);
    const partnerState: ApprovalStagePill["state"] = !needsPartner
        ? "done"
        : op.partner_approval_status === "rejected"
          ? "rejected"
          : op.partner_approval_status === "revision_requested"
            ? "revision"
            : op.partner_approval_status === "approved"
              ? "done"
              : facultyState === "done"
                ? "current"
                : "waiting";

    const adminDone = op.admin_approval_status === "approved" || op.status === "live";
    // Only blame the CIEL PK line for an overall `rejected` status when no earlier line owns the
    // rejection — otherwise a faculty/partner rejection painted all three pills red.
    const earlierLineRejected = facultyState === "rejected" || partnerState === "rejected";
    const adminRejected =
        op.admin_approval_status === "rejected" || (op.status === "rejected" && !earlierLineRejected);
    const adminState: ApprovalStagePill["state"] = adminRejected
        ? "rejected"
        : op.admin_approval_status === "revision_requested"
          ? "revision"
          : adminDone
            ? "done"
            : facultyState === "done" && partnerState === "done"
              ? "current"
              : "waiting";

    return [
        { label: facultyNotRequired ? "Faculty — not required" : "Faculty", state: facultyState },
        { label: needsPartner ? "Partner" : "Partner — not required", state: partnerState },
        { label: "CIEL PK", state: adminState },
    ];
}

const APPROVAL_PILL_CLASS: Record<ApprovalStagePill["state"], string> = {
    done: "border-emerald-200 bg-emerald-50 text-emerald-700",
    current: "border-amber-200 bg-amber-50 text-amber-700",
    waiting: "border-ciel-border bg-ciel-page text-ciel-text-soft",
    rejected: "border-rose-200 bg-rose-50 text-rose-700",
    revision: "border-orange-300 bg-orange-50 text-orange-800",
};

const APPROVAL_PILL_ICON: Record<ApprovalStagePill["state"], string> = {
    done: "✓",
    current: "…",
    waiting: "·",
    rejected: "✕",
    revision: "↺",
};

function ApprovalJourney({ opportunity }: { opportunity: CreatedOpportunity }) {
    if (opportunity.status === "live") {
        return (
            <div className="mt-3 rounded-ciel-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                ✓ All approvals complete — this opportunity is live. Log hours and start your report from My Projects.
            </div>
        );
    }
    const stages = approvalStages(opportunity);
    return (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {stages.map((s, i) => (
                <span key={s.label} className="flex items-center gap-1.5">
                    <span className={`rounded-full border px-2.5 py-1 text-[10.5px] font-bold ${APPROVAL_PILL_CLASS[s.state]}`}>
                        {APPROVAL_PILL_ICON[s.state]} {s.label}
                    </span>
                    {i < stages.length - 1 ? <span className="text-ciel-text-soft">→</span> : null}
                </span>
            ))}
        </div>
    );
}

function EngagementsTab({
    projects,
    createdOpportunities,
    onOpportunityDeleted,
}: {
    projects: ActiveProject[];
    /** Already fetched once by the page — never re-request `/student/opportunity/mine` here. */
    createdOpportunities: CreatedOpportunity[];
    onOpportunityDeleted: (id: string) => void;
}) {
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (id: string, title: string) => {
        if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
        setDeletingId(id);
        try {
            const res = await authenticatedFetch(`/api/v1/opportunities/${id}`, { method: "DELETE" }, { redirectToLogin: false });
            if (!res?.ok) {
                const err = await res?.json().catch(() => null);
                throw new Error((err?.error as string) || (err?.message as string) || "Could not delete this listing");
            }
            onOpportunityDeleted(id);
            toast.success("Listing deleted");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not delete this listing");
        } finally {
            setDeletingId(null);
        }
    };

    const createdSection =
        createdOpportunities.length > 0 ? (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Community Service Workspace · Opportunity approval</h3>
                    <Link href="/dashboard/student/projects" className="text-xs font-semibold text-ciel-green-deep hover:underline">
                        Manage all →
                    </Link>
                </div>
                <div className="space-y-3">
                    {createdOpportunities.map((op) => (
                        <div key={op.id} className="rounded-ciel-lg border border-ciel-border bg-white p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-ciel-text">{op.title}</p>
                                    {op.status && <p className="mt-0.5 text-xs capitalize text-ciel-text-soft">{op.status.replace(/_/g, " ")}</p>}
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <Link
                                        href={`/dashboard/student/create-opportunity?edit=${encodeURIComponent(op.id)}`}
                                        className="ciel-transition inline-flex h-8 items-center gap-1.5 rounded-full border border-ciel-border px-3 text-xs font-bold text-ciel-text-mid hover:bg-slate-50 hover:text-ciel-navy"
                                    >
                                        <Pencil className="h-3.5 w-3.5" /> Edit
                                    </Link>
                                    <button
                                        type="button"
                                        disabled={deletingId === op.id}
                                        onClick={() => handleDelete(op.id, op.title)}
                                        className="ciel-transition inline-flex h-8 items-center gap-1.5 rounded-full border border-rose-200 px-3 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" /> {deletingId === op.id ? "Deleting…" : "Delete"}
                                    </button>
                                </div>
                            </div>
                            <ApprovalJourney opportunity={op} />
                        </div>
                    ))}
                </div>
            </div>
        ) : null;

    if (!projects.length) {
        return (
            <div className="space-y-6">
                {createdSection}
                <EmptyState
                    emoji="⛺"
                    heading="No engagements yet"
                    line="Join a community service opportunity to start logging verified hours."
                    actionLabel="Find opportunities"
                    href="/dashboard/student/browse"
                />
            </div>
        );
    }
    return (
        <div className="space-y-6">
            {createdSection}
            <div className="space-y-3">
                {projects.map((project) => (
                    <div key={project.id} className="rounded-ciel-lg border border-ciel-border bg-white p-4 sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-ciel-text">{project.title}</h3>
                                <p className="mt-0.5 text-xs text-ciel-text-soft">{project.category} · Joined {new Date(project.assignedAt).toLocaleDateString()}</p>
                            </div>
                            <span className="rounded-ciel-xs bg-ciel-page px-2.5 py-1 text-xs font-semibold text-ciel-text-mid capitalize">{project.status}</span>
                        </div>
                        {typeof project.required_hours_per_student === "number" && (
                            <div className="mt-3">
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-ciel-border">
                                    <div className="h-full rounded-full bg-ciel-green ciel-transition" style={{ width: `${Math.max(0, Math.min(100, project.progress))}%` }} />
                                </div>
                                <p className="mt-1 text-xs text-ciel-text-soft">{project.progress}% of {project.required_hours_per_student}h target</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function LogHoursTab({ projects }: { projects: ActiveProject[] }) {
    const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");
    const [participationId, setParticipationId] = useState<string | null>(null);
    const [participationError, setParticipationError] = useState<string | null>(null);
    const [resolvingParticipation, setResolvingParticipation] = useState(false);
    const [logs, setLogs] = useState<AttendanceLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsError, setLogsError] = useState<string | null>(null);
    const [attendanceLocked, setAttendanceLocked] = useState(false);
    /** Ignores an in-flight logs response once the student has switched engagement. */
    const activeParticipationRef = useRef<string | null>(null);

    const [form, setForm] = useState({
        dateOfEngagement: "",
        startTime: "",
        endTime: "",
        organizationName: "",
        activityType: "",
        description: "",
    });
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
    const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadLogs = useCallback((id: string) => {
        if (!id) return;
        setLogsLoading(true);
        setLogsError(null);
        authenticatedFetch(`/api/v1/engagement/${id}/attendance`, {}, { redirectToLogin: false })
            .then(async (res) => {
                if (!res?.ok) throw new Error("load failed");
                return res.json();
            })
            .then((result) => {
                if (activeParticipationRef.current !== id) return;
                const rows: AttendanceLog[] = Array.isArray(result?.data) ? result.data : [];
                // The API returns relation order, not newest-first — this list is headed "Recent entries".
                setLogs(
                    [...rows].sort((a, b) =>
                        String(b.dateOfEngagement ?? "").localeCompare(String(a.dateOfEngagement ?? "")),
                    ),
                );
            })
            .catch(() => {
                if (activeParticipationRef.current !== id) return;
                setLogs([]);
                setLogsError("We couldn't load your logged sessions for this engagement.");
            })
            .finally(() => {
                if (activeParticipationRef.current === id) setLogsLoading(false);
            });
    }, []);

    /** `/engagement/:id/attendance` expects the participation id, not the opportunity id — resolve it first. */
    useEffect(() => {
        if (!selectedProjectId) return;
        let cancelled = false;
        setResolvingParticipation(true);
        setParticipationError(null);
        setParticipationId(null);
        setLogs([]);
        setLogsError(null);
        setAttendanceLocked(false);
        activeParticipationRef.current = null;
        authenticatedFetch(`/api/v1/student/projects/${selectedProjectId}/my-participation`, {}, { redirectToLogin: false })
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (cancelled) return;
                const id = result?.data?.participation_id;
                if (id) {
                    setParticipationId(id);
                    setAttendanceLocked(result?.data?.attendance_locked === true);
                    activeParticipationRef.current = id;
                    loadLogs(id);
                } else {
                    setParticipationError("Could not find your enrollment record for this engagement.");
                }
            })
            .catch(() => {
                if (!cancelled) setParticipationError("Could not find your enrollment record for this engagement.");
            })
            .finally(() => {
                if (!cancelled) setResolvingParticipation(false);
            });
        return () => {
            cancelled = true;
        };
    }, [selectedProjectId, loadLogs]);

    const handleFile = async (file: File) => {
        if (uploading) return;
        setEvidenceFile(file);
        setUploading(true);
        setError(null);
        try {
            const publicUrl = await uploadFileViaPresign("/api/v1/engagement/attendance/evidence/presign", file);
            setEvidenceUrl(publicUrl);
        } catch (err) {
            setError(err instanceof Error ? `${err.message} You can still log hours without it.` : "Evidence upload failed. You can still log hours without it.");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!participationId) {
            setError("We couldn't find your enrollment record for this engagement yet — try again in a moment.");
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const body = new FormData();
            body.append("dateOfEngagement", form.dateOfEngagement);
            body.append("startTime", form.startTime);
            body.append("endTime", form.endTime);
            body.append("organizationName", form.organizationName);
            body.append("activityType", form.activityType);
            body.append("description", form.description);
            if (evidenceUrl) {
                body.append("evidenceUrl", evidenceUrl);
                body.append("evidenceUploaded", "true");
            }
            const res = await authenticatedFetch(`/api/v1/engagement/${participationId}/attendance`, { method: "POST", body }, { redirectToLogin: false });
            if (!res?.ok) {
                const err = await res?.json().catch(() => null);
                // Nest validation errors arrive as `message: string[]` — never show "[object Object]".
                const raw = err?.message ?? err?.error;
                const detail = Array.isArray(raw) ? raw.join(" ") : typeof raw === "string" ? raw : "";
                throw new Error(detail || "Could not log hours");
            }
            setForm({ dateOfEngagement: "", startTime: "", endTime: "", organizationName: "", activityType: "", description: "" });
            setEvidenceFile(null);
            setEvidenceUrl(null);
            loadLogs(participationId);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not log hours");
        } finally {
            setSubmitting(false);
        }
    };

    if (!projects.length) {
        return (
            <EmptyState
                emoji="🕒"
                heading="Nothing to log yet"
                line="Join a community service opportunity before logging hours against it."
                actionLabel="Find opportunities"
                href="/dashboard/student/browse"
            />
        );
    }

    const fieldClass = "w-full rounded-ciel-sm border-2 border-ciel-border bg-ciel-page/50 px-4 py-3 text-sm font-semibold text-ciel-text outline-none focus:border-ciel-green focus:bg-white focus-visible:ring-2 focus-visible:ring-ciel-green";

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
            <form onSubmit={handleSubmit} className="space-y-4 rounded-ciel-lg border border-ciel-border bg-white p-5">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Engagement</label>
                    <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className={fieldClass}>
                        {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Date</label>
                        <input required type="date" value={form.dateOfEngagement} onChange={(e) => setForm((f) => ({ ...f, dateOfEngagement: e.target.value }))} className={fieldClass} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Start</label>
                        <input required type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} className={fieldClass} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">End</label>
                        <input required type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} className={fieldClass} />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Organization</label>
                    <input required type="text" value={form.organizationName} onChange={(e) => setForm((f) => ({ ...f, organizationName: e.target.value }))} className={fieldClass} placeholder="e.g. Edhi Foundation" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Activity type</label>
                    <input required type="text" value={form.activityType} onChange={(e) => setForm((f) => ({ ...f, activityType: e.target.value }))} className={fieldClass} placeholder="e.g. Teaching support" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Description</label>
                    <textarea required rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={fieldClass} placeholder="What did you do in this session?" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Evidence (optional)</label>
                    <label className={clsx("ciel-transition flex cursor-pointer items-center gap-3 rounded-ciel-sm border-2 border-dashed border-ciel-border px-4 py-3 text-sm font-semibold text-ciel-text-mid hover:border-ciel-green/40", uploading && "pointer-events-none opacity-60")}>
                        <UploadCloud className="h-4 w-4" />
                        {uploading ? "Uploading..." : evidenceUrl ? "Evidence attached" : evidenceFile ? evidenceFile.name : "Upload a photo"}
                        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) handleFile(file); }} />
                    </label>
                </div>
                {/* Attendance is locked once verification has been requested — say so instead of
                    letting the student fill the form and hit a server-side refusal. */}
                {attendanceLocked && (
                    <div className="rounded-ciel-xs border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                        <b>Attendance is locked for this engagement.</b> You have already sent these hours for
                        verification, so no new sessions can be added until your reviewer decides.
                    </div>
                )}
                {participationError && <p className="text-xs font-semibold text-red-600">{participationError}</p>}
                {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
                <button
                    type="submit"
                    disabled={submitting || uploading || resolvingParticipation || !participationId || attendanceLocked}
                    className="ciel-transition flex w-full items-center justify-center gap-2 rounded-ciel-sm bg-ciel-navy px-5 py-3 text-sm font-bold text-white hover:bg-ciel-navy/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green focus-visible:ring-offset-2"
                >
                    {resolvingParticipation
                        ? "Loading engagement..."
                        : attendanceLocked
                          ? "Attendance locked"
                          : submitting
                            ? "Logging..."
                            : "Log hours"}
                </button>
            </form>

            <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Recent entries</h3>
                {logsLoading ? (
                    <div className="h-32 animate-pulse rounded-ciel-lg bg-ciel-border/50" />
                ) : logsError ? (
                    <div className="rounded-ciel-md border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">
                        {logsError}{" "}
                        <button
                            type="button"
                            onClick={() => participationId && loadLogs(participationId)}
                            className="underline"
                        >
                            Try again
                        </button>
                    </div>
                ) : !logs.length ? (
                    <EmptyState emoji="📋" heading="No hours logged yet" line="Entries you log for this engagement appear here." />
                ) : (
                    logs.map((log) => {
                        const status = hourStatus(log);
                        return (
                        <div key={log.id} className="rounded-ciel-md border border-ciel-border bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-bold text-ciel-text">{log.activityType} · {formatHours(log.sessionHours)}h</p>
                                    <p className="text-xs text-ciel-text-soft">{log.dateOfEngagement} · {formatClock(log.startTime)}–{formatClock(log.endTime)}</p>
                                </div>
                                <StatusPill status={status} />
                            </div>
                            {/* A rejected/flagged session must never look like a fresh entry — surface the
                                reviewer's decision (and note) instead of silently re-offering "Send for verification". */}
                            {status === "rejected" && (
                                <div className="mt-3 rounded-ciel-xs border border-red-200 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-900">
                                    <b>Rejected by your reviewer.</b>{" "}
                                    {log.approvalActionReason
                                        ? `${log.approvalActionReason} `
                                        : "No reason was recorded. "}
                                    These hours won&apos;t count — log a corrected session, or speak to your reviewer before re-logging.
                                </div>
                            )}
                            {status === "flagged" && (
                                <div className="mt-3 rounded-ciel-xs border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                                    <b>Flagged for a closer look.</b>{" "}
                                    {log.approvalActionReason
                                        ? `${log.approvalActionReason} `
                                        : "Your reviewer needs more detail or clearer evidence. "}
                                    Nothing is penalised — your reviewer will follow up.
                                </div>
                            )}
                            {status === "pending" && (
                                <p className="mt-3 text-xs leading-relaxed text-ciel-text-soft">
                                    Waiting on your reviewer — approved sessions are the only ones that count toward your
                                    verified hours.
                                </p>
                            )}
                            {/* Requesting verification runs the oath + approver choice in the report's
                                Section 1; posting the bare legacy request from here would skip both gates. */}
                            {status === "logged" && (
                                <Link
                                    href={`/dashboard/student/report?projectId=${encodeURIComponent(log.projectId)}`}
                                    className="ciel-transition mt-3 inline-flex items-center gap-1.5 rounded-ciel-xs border border-ciel-border px-3 py-1.5 text-xs font-bold text-ciel-text-mid hover:border-ciel-green hover:text-ciel-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green"
                                >
                                    <Send className="h-3 w-3" /> Request verification in your report
                                </Link>
                            )}
                        </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function ReportsTab({ projects }: { projects: ActiveProject[] }) {
    const reportable = projects.filter((p) => p.report_status);
    if (!reportable.length) {
        return (
            <EmptyState
                emoji="📝"
                heading="No reports started"
                line="Once you've logged hours, start your reflection report to earn verified impact."
                actionLabel="Start a report"
                href={projects[0] ? `/dashboard/student/report?projectId=${projects[0].id}` : "/dashboard/student/report"}
            />
        );
    }
    return (
        <div className="space-y-3">
            {reportable.map((project) => (
                <div key={project.id} className="flex flex-wrap items-center justify-between gap-3 rounded-ciel-lg border border-ciel-border bg-white p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-ciel-text-soft" />
                        <div>
                            <p className="text-sm font-bold text-ciel-text">{project.title}</p>
                            <p className="text-xs text-ciel-text-soft capitalize">{(project.report_status ?? "").replace(/_/g, " ")}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href={`/dashboard/student/report?projectId=${project.id}`} className="ciel-transition rounded-ciel-xs border border-ciel-border px-3 py-1.5 text-xs font-bold text-ciel-text-mid hover:border-ciel-green hover:text-ciel-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green">
                            Open report
                        </Link>
                        {(project.report_status === "verified" || project.report_status === "paid") && (
                            <Link href={`/dashboard/student/impact?projectId=${project.id}`} className="ciel-transition inline-flex items-center gap-1.5 rounded-ciel-xs bg-ciel-green-soft px-3 py-1.5 text-xs font-bold text-ciel-green-deep hover:bg-ciel-green/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green">
                                <Award className="h-3 w-3" /> Final letter
                            </Link>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function CommunityServicePage() {
    return (
        <Suspense fallback={<WorkspaceSkeleton />}>
            <CommunityServiceContent />
        </Suspense>
    );
}
