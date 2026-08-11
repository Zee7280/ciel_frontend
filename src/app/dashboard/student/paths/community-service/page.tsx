"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, FileText, Compass, ListChecks, UploadCloud, Send, Award } from "lucide-react";
import clsx from "clsx";
import { authenticatedFetch } from "@/utils/api";
import { fetchStudentDashboardData } from "@/utils/student-dashboard-fetch";
import type { ActiveProject } from "@/app/dashboard/student/types";
import PathWorkspaceShell from "@/components/ciel/PathWorkspaceShell";
import EmptyState from "@/components/ciel/EmptyState";
import StatusPill, { type CielHourStatus } from "@/components/ciel/StatusPill";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";

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
    const activeTab = TABS.some((t) => t.key === searchParams.get("tab")) ? searchParams.get("tab")! : "engagements";

    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<ActiveProject[]>([]);
    const [verifiedHours, setVerifiedHours] = useState(0);

    useEffect(() => {
        let cancelled = false;
        fetchStudentDashboardData({ redirectToLogin: false }).then((data) => {
            if (cancelled) return;
            setProjects(data?.activeProjects ?? []);
            setVerifiedHours(data?.overview?.totalVerifiedHours ?? data?.stats?.hoursVolunteered ?? 0);
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const setTab = (key: string) => {
        const qs = new URLSearchParams(Array.from(searchParams.entries()));
        qs.set("tab", key);
        router.replace(`/dashboard/student/paths/community-service?${qs.toString()}`);
    };

    if (loading) return <WorkspaceSkeleton />;

    return (
        <PathWorkspaceShell
            title="Community Service"
            primaryActionLabel={activeTab === "find" ? undefined : "Log hours"}
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
            {activeTab === "find" && <FindOpportunitiesTab />}
        </PathWorkspaceShell>
    );
}

function EngagementsTab({ projects }: { projects: ActiveProject[] }) {
    if (!projects.length) {
        return (
            <EmptyState
                emoji="⛺"
                heading="No engagements yet"
                line="Join a community service opportunity to start logging verified hours."
                actionLabel="Find opportunities"
                href="/dashboard/student/browse"
            />
        );
    }
    return (
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
                <div className="grid grid-cols-3 gap-3">
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

interface OpportunityCard {
    id: string;
    title: string;
    organization_name?: string;
    organization?: string;
    types?: string[];
}

function FindOpportunitiesTab() {
    const [loading, setLoading] = useState(true);
    const [opportunities, setOpportunities] = useState<OpportunityCard[]>([]);

    useEffect(() => {
        authenticatedFetch("/api/v1/students/opportunities/recommended", {}, { redirectToLogin: false })
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => setOpportunities(Array.isArray(result?.data) ? result.data.slice(0, 6) : []))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="h-40 animate-pulse rounded-ciel-lg bg-ciel-border/50" />;

    if (!opportunities.length) {
        return (
            <EmptyState
                emoji="🧭"
                heading="No recommendations yet"
                line="Browse the full opportunity board to find your next community service engagement."
                actionLabel="Browse all opportunities"
                href="/dashboard/student/browse"
            />
        );
    }

    return (
        <div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {opportunities.map((opp) => (
                    <Link
                        key={opp.id}
                        href={`/dashboard/student/browse/${opp.id}`}
                        className="ciel-transition rounded-ciel-lg border border-ciel-border bg-white p-4 hover:border-ciel-green/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green"
                    >
                        <Compass className="h-4 w-4 text-ciel-green-deep" />
                        <p className="mt-2 text-sm font-bold text-ciel-text">{opp.title}</p>
                        <p className="mt-0.5 text-xs text-ciel-text-soft">{opp.organization_name || opp.organization || "CIEL partner"}</p>
                        {!!opp.types?.length && (
                            <span className="mt-2 inline-block rounded-ciel-xs bg-ciel-indigo-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ciel-indigo">
                                {opp.types[0]}
                            </span>
                        )}
                    </Link>
                ))}
            </div>
            <Link href="/dashboard/student/browse" className="ciel-transition mt-4 inline-block text-sm font-bold text-ciel-green-deep hover:underline">
                Browse all opportunities →
            </Link>
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
