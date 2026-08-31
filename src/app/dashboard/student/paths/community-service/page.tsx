"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, FileText, ListChecks, UploadCloud, Send, Award, Pencil, Trash2 } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import { fetchStudentDashboardData } from "@/utils/student-dashboard-fetch";
import type { ActiveProject } from "@/app/dashboard/student/types";
import PathWorkspaceShell from "@/components/ciel/PathWorkspaceShell";
import EmptyState from "@/components/ciel/EmptyState";
import StatusPill, { type CielHourStatus } from "@/components/ciel/StatusPill";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";
import CommunityServiceHub from "./CommunityServiceHub";
import CommunityImpactWall from "./CommunityImpactWall";
import { HubBackButton } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import StudentCommunityGuide from "@/components/report/StudentCommunityGuide";

type ApprovalLineStatus = "pending" | "approved" | "rejected" | null | undefined;

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
    sessionHours: number;
    organizationName: string;
    activityType: string;
    description: string;
    evidenceUrl: string | null;
    entryStatus: "pending" | "verified" | "flagged";
    approvalStatus: string | null;
}

function hourStatus(log: AttendanceLog): CielHourStatus {
    if (log.entryStatus === "verified" || log.approvalStatus === "approved") return "verified";
    if (log.approvalStatus === "pending") return "pending";
    return "logged";
}

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
    const wallView = searchParams.get("view") === "wall";
    const guideView = searchParams.get("view") === "guide";
    const activeTab = TABS.some((t) => t.key === rawTab) ? rawTab! : "engagements";

    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<ActiveProject[]>([]);
    const [verifiedHours, setVerifiedHours] = useState(0);
    const [wallCount, setWallCount] = useState(0);

    useEffect(() => {
        let cancelled = false;
        fetchStudentDashboardData({ redirectToLogin: false }).then((data) => {
            if (cancelled) return;
            setProjects(data?.activeProjects ?? []);
            setVerifiedHours(data?.overview?.totalVerifiedHours ?? data?.stats?.hoursVolunteered ?? 0);
            setWallCount(data?.overview?.impactHistoryBadgeCount ?? data?.overview?.completedCount ?? 0);
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (rawTab === "find") {
            router.replace("/dashboard/student/browse");
        }
    }, [rawTab, router]);

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

    if (showHub && wallView) {
        return <CommunityImpactWall />;
    }

    if (showHub && guideView) {
        return (
            <div className="mx-auto max-w-[980px] pb-16">
                <HubBackButton href="/dashboard/student/paths/community-service" />
                <StudentCommunityGuide showHero />
            </div>
        );
    }

    if (showHub) {
        return <CommunityServiceHub projects={projects} verifiedHours={verifiedHours} wallCount={wallCount} />;
    }

    return (
        <div>
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
                {activeTab === "engagements" && <EngagementsTab projects={projects} />}
                {activeTab === "log-hours" && <LogHoursTab projects={projects} />}
                {activeTab === "reports" && <ReportsTab projects={projects} />}
            </PathWorkspaceShell>
        </div>
    );
}

type ApprovalStagePill = { label: string; state: "done" | "current" | "waiting" | "rejected" };

/** Faculty → Partner → CIEL PK, one pill per stage, derived from the same workflow fields the
 * admin/faculty dashboards already key off (`workflow_stage`, `*_approval_status`). */
function approvalStages(op: CreatedOpportunity): ApprovalStagePill[] {
    const stage = op.workflow_stage ?? "";
    const facultyDone = op.faculty_approval_status === "approved" || (stage !== "pending_faculty" && stage !== "");
    const facultyRejected = op.faculty_approval_status === "rejected";
    const facultyState: ApprovalStagePill["state"] = facultyRejected
        ? "rejected"
        : facultyDone
          ? "done"
          : "current";

    const needsPartner = op.requires_partner_approval;
    const partnerDone = op.partner_approval_status === "approved";
    const partnerRejected = op.partner_approval_status === "rejected";
    const partnerState: ApprovalStagePill["state"] = !needsPartner
        ? "done"
        : partnerRejected
          ? "rejected"
          : partnerDone
            ? "done"
            : facultyState === "done"
              ? "current"
              : "waiting";

    const adminDone = op.admin_approval_status === "approved" || op.status === "live";
    const adminRejected = op.admin_approval_status === "rejected" || op.status === "rejected";
    const adminState: ApprovalStagePill["state"] = adminRejected
        ? "rejected"
        : adminDone
          ? "done"
          : facultyState === "done" && partnerState === "done"
            ? "current"
            : "waiting";

    return [
        { label: "Faculty", state: facultyState },
        { label: needsPartner ? "Partner" : "Partner — not required", state: partnerState },
        { label: "CIEL PK", state: adminState },
    ];
}

const APPROVAL_PILL_CLASS: Record<ApprovalStagePill["state"], string> = {
    done: "border-emerald-200 bg-emerald-50 text-emerald-700",
    current: "border-amber-200 bg-amber-50 text-amber-700",
    waiting: "border-ciel-border bg-ciel-page text-ciel-text-soft",
    rejected: "border-rose-200 bg-rose-50 text-rose-700",
};

const APPROVAL_PILL_ICON: Record<ApprovalStagePill["state"], string> = {
    done: "✓",
    current: "…",
    waiting: "·",
    rejected: "✕",
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

function EngagementsTab({ projects }: { projects: ActiveProject[] }) {
    const [createdOpportunities, setCreatedOpportunities] = useState<CreatedOpportunity[]>([]);
    const [createdLoading, setCreatedLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        authenticatedFetch("/api/v1/student/opportunity/mine", {}, { redirectToLogin: false })
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (cancelled || !result?.success) return;
                const rows = Array.isArray(result.data) ? (result.data as Record<string, unknown>[]) : [];
                // Drafts belong on the Create Opportunity screen's drafts list, not the approval tracker here.
                const submitted = rows.filter((r) => r.status !== "draft");
                setCreatedOpportunities(
                    submitted.map((r) => ({
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
            })
            .finally(() => {
                if (!cancelled) setCreatedLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const handleDelete = async (id: string, title: string) => {
        if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
        setDeletingId(id);
        try {
            const res = await authenticatedFetch(`/api/v1/opportunities/${id}`, { method: "DELETE" }, { redirectToLogin: false });
            if (!res?.ok) {
                const err = await res?.json().catch(() => null);
                throw new Error((err?.error as string) || (err?.message as string) || "Could not delete this listing");
            }
            setCreatedOpportunities((prev) => prev.filter((o) => o.id !== id));
            toast.success("Listing deleted");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not delete this listing");
        } finally {
            setDeletingId(null);
        }
    };

    const createdSection =
        !createdLoading && createdOpportunities.length > 0 ? (
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
    const [sendingVerificationId, setSendingVerificationId] = useState<string | null>(null);

    const loadLogs = useCallback((id: string) => {
        if (!id) return;
        setLogsLoading(true);
        authenticatedFetch(`/api/v1/engagement/${id}/attendance`, {}, { redirectToLogin: false })
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => setLogs(Array.isArray(result?.data) ? result.data : []))
            .finally(() => setLogsLoading(false));
    }, []);

    /** `/engagement/:id/attendance` expects the participation id, not the opportunity id — resolve it first. */
    useEffect(() => {
        if (!selectedProjectId) return;
        let cancelled = false;
        setResolvingParticipation(true);
        setParticipationError(null);
        setParticipationId(null);
        setLogs([]);
        authenticatedFetch(`/api/v1/student/projects/${selectedProjectId}/my-participation`, {}, { redirectToLogin: false })
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (cancelled) return;
                const id = result?.data?.participation_id;
                if (id) {
                    setParticipationId(id);
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
        setEvidenceFile(file);
        setUploading(true);
        setError(null);
        try {
            const presignRes = await authenticatedFetch(
                "/api/v1/engagement/attendance/evidence/presign",
                { method: "POST", body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }) },
                { redirectToLogin: false },
            );
            const presign = presignRes?.ok ? await presignRes.json() : null;
            const { uploadUrl, publicUrl } = presign?.data ?? {};
            if (!uploadUrl || !publicUrl) throw new Error("Could not prepare the upload");
            await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
            setEvidenceUrl(publicUrl);
        } catch {
            setError("Evidence upload failed. You can still log hours without it.");
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
                throw new Error(err?.message || "Could not log hours");
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

    const sendForVerification = async (log: AttendanceLog) => {
        setSendingVerificationId(log.id);
        try {
            await authenticatedFetch(
                `/api/v1/engagement/project/${log.projectId}/attendance/verify-request`,
                { method: "POST", body: JSON.stringify({ projectId: log.projectId, requestedAt: new Date().toISOString() }) },
                { redirectToLogin: false },
            );
            if (participationId) loadLogs(participationId);
        } finally {
            setSendingVerificationId(null);
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
                    <label className={clsx("ciel-transition flex cursor-pointer items-center gap-3 rounded-ciel-sm border-2 border-dashed border-ciel-border px-4 py-3 text-sm font-semibold text-ciel-text-mid hover:border-ciel-green/40", uploading && "opacity-60")}>
                        <UploadCloud className="h-4 w-4" />
                        {uploading ? "Uploading..." : evidenceUrl ? "Evidence attached" : evidenceFile ? evidenceFile.name : "Upload a photo"}
                        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                    </label>
                </div>
                {participationError && <p className="text-xs font-semibold text-red-600">{participationError}</p>}
                {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
                <button
                    type="submit"
                    disabled={submitting || uploading || resolvingParticipation || !participationId}
                    className="ciel-transition flex w-full items-center justify-center gap-2 rounded-ciel-sm bg-ciel-navy px-5 py-3 text-sm font-bold text-white hover:bg-ciel-navy/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green focus-visible:ring-offset-2"
                >
                    {resolvingParticipation ? "Loading engagement..." : submitting ? "Logging..." : "Log hours"}
                </button>
            </form>

            <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Recent entries</h3>
                {logsLoading ? (
                    <div className="h-32 animate-pulse rounded-ciel-lg bg-ciel-border/50" />
                ) : !logs.length ? (
                    <EmptyState emoji="📋" heading="No hours logged yet" line="Entries you log for this engagement appear here." />
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="rounded-ciel-md border border-ciel-border bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-bold text-ciel-text">{log.activityType} · {log.sessionHours}h</p>
                                    <p className="text-xs text-ciel-text-soft">{log.dateOfEngagement} · {log.startTime}–{log.endTime}</p>
                                </div>
                                <StatusPill status={hourStatus(log)} />
                            </div>
                            {hourStatus(log) === "logged" && (
                                <button
                                    onClick={() => sendForVerification(log)}
                                    disabled={sendingVerificationId === log.id}
                                    className="ciel-transition mt-3 inline-flex items-center gap-1.5 rounded-ciel-xs border border-ciel-border px-3 py-1.5 text-xs font-bold text-ciel-text-mid hover:border-ciel-green hover:text-ciel-green-deep disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green"
                                >
                                    <Send className="h-3 w-3" /> {sendingVerificationId === log.id ? "Sending..." : "Send for verification"}
                                </button>
                            )}
                        </div>
                    ))
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
