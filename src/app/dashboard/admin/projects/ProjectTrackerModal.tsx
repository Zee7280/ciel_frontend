"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { ClipboardList, ExternalLink, Info, Loader2, Users, X } from "lucide-react";

export type ProjectTrackerRow = {
    id: string;
    title: string;
    subtitle: string;
    displayStatus: string;
    locationLabel: string;
    volunteers: number;
    volunteersRequired: number | null;
    remainingSeats: number | null;
    hours: number;
    raw: Record<string, unknown>;
};

type AttendanceSessionPreview = {
    id: string;
    dateOfEngagement: string;
    startTime: string;
    endTime: string;
    sessionHours: number;
    activityType: string;
    organizationName: string;
    description: string;
    entryStatus: string;
    approvalStatus: string | null;
    assignedApproverType: string | null;
    evidenceUploaded: boolean;
    needsReview: boolean;
};

type ApplicationRosterRow = {
    id: string;
    studentName: string;
    studentEmail: string;
    internalStatus: string;
    applicationStatus: string;
    /** Legacy pipeline corner (often null once approved). */
    applicationStage: string | null;
    joinStageDisplay: string;
    participationType: string;
    teamMembers: Array<{ name?: string; email?: string }>;
    createdAt: string | null;
    enrollmentWarning: string | null;
    attendanceSessionsTotal: number | null;
    attendanceSessionsPendingReview: number | null;
    attendanceApproverType: string | null;
    /** Newest-first session rows for this seat (team lead seat on roster row). */
    attendanceSessionsPreview: AttendanceSessionPreview[];
    impactReportSummary: string | null;
    impactReportPartnerStatus: string | null;
    impactReportAdminStatus: string | null;
    impactReportFacultyStatus: string | null;
    impactReportRawStatus: string | null;
};

type TrackerOpportunitySnapshot = {
    organizationName: string | null;
    executingOrganizationName: string | null;
    executingOrganizationEmail: string | null;
    partnerOrganizationName: string | null;
    partnerOrganizationEmail: string | null;
    partnerContactPerson: string | null;
    facultySupervisorName: string | null;
    facultySupervisorEmail: string | null;
    attendanceRoutingOverride: "auto" | "partner" | "faculty";
    awaitingLane: string | null;
    pipeline: Record<string, number>;
    pipelineTotal: number;
};

type Props = {
    row: ProjectTrackerRow;
    onClose: () => void;
    onOpenTeamsEnrollments: () => void;
};

function pickInt(raw: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
        const v = raw[key];
        const n = Number(v);
        if (Number.isFinite(n)) return n;
    }
    return null;
}

function pickString(raw: Record<string, unknown>, keys: string[], fallback = ""): string {
    for (const key of keys) {
        const value = raw[key];
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return fallback;
}

function applicationInternalStatusLabel(key: string): string {
    const map: Record<string, string> = {
        pending_faculty: "Pending faculty",
        pending_partner: "Pending partner",
        pending_admin: "Pending admin",
        approved: "Approved (enrolled)",
        faculty_rejected: "Faculty rejected",
        partner_rejected: "Partner rejected",
        admin_rejected: "Admin rejected",
    };
    return map[key] ?? key.replace(/_/g, " ");
}

function applicationStatusBadgeClass(key: string): string {
    const s = key.toLowerCase();
    if (s === "approved") return "bg-emerald-50 text-emerald-800 border-emerald-100";
    if (s.includes("rejected")) return "bg-rose-50 text-rose-800 border-rose-100";
    if (s.includes("pending_admin")) return "bg-amber-50 text-amber-900 border-amber-100";
    if (s.includes("pending_partner")) return "bg-violet-50 text-violet-800 border-violet-100";
    if (s.includes("pending_faculty")) return "bg-slate-100 text-slate-700 border-slate-200";
    return "bg-slate-50 text-slate-600 border-slate-200";
}

function humanizeApprovalLane(code: string | null): string | null {
    if (!code?.trim()) return null;
    const c = code.trim().toLowerCase();
    if (c === "faculty_gate") return "Listing awaits faculty verification";
    if (c === "execution_partner_gate") return "Listing awaits partner / execution verification";
    return null;
}

function approvalGateChipClass(kind: string | null | undefined): string {
    const s = String(kind ?? "")
        .trim()
        .toLowerCase();
    if (s === "approved") return "bg-emerald-50 text-emerald-800 border-emerald-100";
    if (s === "verified") return "bg-emerald-50 text-emerald-800 border-emerald-100";
    if (s === "pending") return "bg-amber-50 text-amber-900 border-amber-100";
    if (s === "rejected") return "bg-rose-50 text-rose-800 border-rose-100";
    if (s === "flagged") return "bg-orange-50 text-orange-900 border-orange-100";
    return "bg-slate-50 text-slate-600 border-slate-200";
}

function pickBoolLoose(raw: Record<string, unknown>, keys: string[]): boolean {
    for (const key of keys) {
        const v = raw[key];
        if (typeof v === "boolean") return v;
        if (v === 1 || v === "1") return true;
    }
    return false;
}

function mapAttendanceSessionPreview(raw: Record<string, unknown>): AttendanceSessionPreview | null {
    const id = pickString(raw, ["id"]);
    if (!id) return null;
    const hoursRaw = raw.session_hours ?? raw.sessionHours;
    let sessionHours = 0;
    if (typeof hoursRaw === "number" && Number.isFinite(hoursRaw)) {
        sessionHours = hoursRaw;
    } else if (typeof hoursRaw === "string" && hoursRaw.trim()) {
        const n = Number(hoursRaw);
        if (Number.isFinite(n)) sessionHours = n;
    }
    return {
        id,
        dateOfEngagement: pickString(raw, ["date_of_engagement", "dateOfEngagement"], "—"),
        startTime: pickString(raw, ["start_time", "startTime"], "—"),
        endTime: pickString(raw, ["end_time", "endTime"], "—"),
        sessionHours,
        activityType: pickString(raw, ["activity_type", "activityType"], "—"),
        organizationName: pickString(raw, ["organization_name", "organizationName"], "—"),
        description: pickString(raw, ["description"], ""),
        entryStatus: pickString(raw, ["entry_status", "entryStatus"], "—"),
        approvalStatus:
            typeof raw.approval_status === "string" && raw.approval_status.trim()
                ? raw.approval_status.trim()
                : typeof raw.approvalStatus === "string" && raw.approvalStatus.trim()
                  ? raw.approvalStatus.trim()
                  : null,
        assignedApproverType:
            typeof raw.assigned_approver_type === "string" && raw.assigned_approver_type.trim()
                ? raw.assigned_approver_type.trim()
                : typeof raw.assignedApproverType === "string" && raw.assignedApproverType.trim()
                  ? raw.assignedApproverType.trim()
                  : null,
        evidenceUploaded: pickBoolLoose(raw, ["evidence_uploaded", "evidenceUploaded"]),
        needsReview: pickBoolLoose(raw, ["needs_review", "needsReview"]),
    };
}

function humanizeAttendanceEntryStatus(s: string): string {
    const k = s.trim().toLowerCase();
    if (k === "pending") return "Logged · awaiting check";
    if (k === "verified") return "Verified on entry";
    if (k === "flagged") return "Flagged for review";
    return s.replace(/_/g, " ") || "—";
}

function humanizeAttendanceApprovalStatus(s: string | null): string {
    if (s == null || !String(s).trim()) return "Review not finalized";
    const k = s.trim().toLowerCase();
    if (k === "pending") return "Awaiting reviewer";
    if (k === "approved") return "Reviewer approved";
    if (k === "rejected") return "Reviewer rejected";
    if (k === "flagged") return "Flagged";
    return s.trim();
}

/** Expandable session list — answers “which 4 sessions?” for admins. */
function AttendanceSessionsBreakdown({ sessions }: { sessions: AttendanceSessionPreview[] }) {
    if (!sessions.length) return null;
    return (
        <details className="mt-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
            <summary className="cursor-pointer text-[11px] font-bold text-blue-700 underline-offset-2 hover:underline select-none">
                Show each session ({sessions.length}) — dates, times, hours, review status
            </summary>
            <ul className="mt-2 max-h-64 overflow-y-auto space-y-2 pr-1" aria-label="Attendance sessions list">
                {sessions.map((s) => (
                    <li
                        key={s.id}
                        className={`rounded-md border px-2 py-2 text-[11px] leading-snug ${
                            s.needsReview ? "border-amber-300 bg-amber-50/60" : "border-slate-100 bg-slate-50"
                        }`}
                    >
                        <div className="font-bold text-slate-900">
                            <time dateTime={s.dateOfEngagement}>{s.dateOfEngagement}</time>
                            <span className="text-slate-500 font-semibold mx-1">·</span>
                            <span>{s.startTime}</span>
                            <span className="text-slate-400">–</span>
                            <span>{s.endTime}</span>
                            <span className="text-slate-500 font-semibold mx-1">·</span>
                            <span>{s.sessionHours % 1 === 0 ? s.sessionHours : s.sessionHours.toFixed(2)} h</span>
                        </div>
                        <div className="mt-1 text-slate-700">
                            <span className="text-slate-500">Activity:</span> {s.activityType}
                            {s.organizationName && s.organizationName !== "—" ? (
                                <>
                                    {" "}
                                    <span className="text-slate-400">|</span>{" "}
                                    <span className="text-slate-500">Org:</span> {s.organizationName}
                                </>
                            ) : null}
                        </div>
                        {s.description ? (
                            <p className="mt-1 text-slate-600 italic line-clamp-3">{s.description}</p>
                        ) : null}
                        <div className="flex flex-wrap gap-1 mt-2">
                            <span
                                className={`inline-flex px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wide ${approvalGateChipClass(s.entryStatus)}`}
                            >
                                Entry: {humanizeAttendanceEntryStatus(s.entryStatus)}
                            </span>
                            <span
                                className={`inline-flex px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wide ${approvalGateChipClass(s.approvalStatus ?? "pending")}`}
                            >
                                Review: {humanizeAttendanceApprovalStatus(s.approvalStatus)}
                            </span>
                            {s.needsReview ? (
                                <span className="inline-flex px-1.5 py-0.5 rounded border border-amber-400 bg-amber-100 text-[9px] font-black uppercase tracking-wide text-amber-950">
                                    Needs reviewer action
                                </span>
                            ) : (
                                <span className="inline-flex px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-[9px] font-bold uppercase text-emerald-900">
                                    Cleared queue
                                </span>
                            )}
                            {s.evidenceUploaded ? (
                                <span className="text-[9px] font-bold text-slate-600 border border-slate-200 rounded px-1.5 py-0.5">
                                    Evidence attached
                                </span>
                            ) : null}
                            {s.assignedApproverType ? (
                                <span className="text-[9px] text-slate-500 capitalize">
                                    Route: {s.assignedApproverType}
                                </span>
                            ) : null}
                        </div>
                        <p className="mt-1 font-mono text-[9px] text-slate-400 break-all">ID: {s.id}</p>
                    </li>
                ))}
            </ul>
        </details>
    );
}

/** In-dialog context for admins — keeps the table self-explanatory. */
function TrackerReadingGuide() {
    return (
        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-slate-50 to-blue-50/40 px-4 py-3 text-xs text-slate-700 leading-relaxed space-y-3">
            <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" aria-hidden />
                <div>
                    <p className="font-extrabold text-slate-900 text-[11px] uppercase tracking-wider">How to read this</p>
                    <p className="mt-1 text-slate-600">
                        Each row is one <strong className="text-slate-800">join application</strong> (usually the team lead).
                        After admin approves join, a seat is created — then impact report and attendance columns apply.
                    </p>
                </div>
            </div>
            <ul className="list-none space-y-2 pl-6 sm:pl-0 sm:grid sm:grid-cols-2 sm:gap-x-4 sm:gap-y-2 border-t border-slate-200/70 pt-3">
                <li>
                    <strong className="text-slate-900">Join stage</strong> — where the application is in the join queue
                    (faculty / partner org / admin). &ldquo;Gate&rdquo; is the internal step name.
                </li>
                <li>
                    <strong className="text-slate-900">Impact report</strong> — post-activity report workflow. Badges show{" "}
                    <strong>Partner</strong>, <strong>Admin</strong>, and <strong>Faculty</strong> gates (pending / approved / rejected).
                    The small <strong className="text-slate-800">DB status</strong> line is the raw record state from the database.
                </li>
                <li>
                    <strong className="text-slate-900">Attendance</strong> — summary counts for{" "}
                    <strong>this student&apos;s seat</strong> on the project (on a team row that is usually the lead).
                    Use <strong>Show each session</strong> to see date, start/end time, hours, activity, and reviewer
                    status line-by-line.
                </li>
                <li>
                    <strong className="text-slate-900">Status</strong> — join application pipeline outcome (enrolled, rejected, or
                    still in queue). This is not the same as report &ldquo;verified&rdquo;.
                </li>
            </ul>
            <p className="text-[11px] text-slate-500 border-t border-slate-200/70 pt-3">
                Tip: Approve join requests in{" "}
                <Link href="/dashboard/admin/join-applications" className="font-bold text-blue-700 hover:underline">
                    Join applications
                </Link>
                . Per-member detail, edit roster, and team report rollups: use{" "}
                <strong className="text-slate-700">Teams &amp; enrollments</strong> below. Partners review attendance in{" "}
                <strong className="text-slate-700">Partner Hub → Attendance review</strong>; faculty in{" "}
                <strong className="text-slate-700">Faculty Hub → Attendance review</strong>.
            </p>
        </div>
    );
}

function formatDetailValue(v: unknown): string {
    if (v == null || v === "") return "—";
    if (typeof v === "string") return v.trim() || "—";
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (Array.isArray(v)) return v.length ? v.map((x) => formatDetailValue(x)).join(", ") : "—";
    if (typeof v === "object") {
        try {
            const s = JSON.stringify(v);
            return s.length > 120 ? `${s.slice(0, 117)}…` : s;
        } catch {
            return "—";
        }
    }
    return String(v);
}

function extractApplicationsRoster(summaryRaw: Record<string, unknown> | null): ApplicationRosterRow[] {
    const list = summaryRaw?.applications_roster ?? summaryRaw?.applicationsRoster;
    if (!Array.isArray(list)) return [];
    return list
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const raw = item as Record<string, unknown>;
            const id = pickString(raw, ["id", "application_id", "applicationId"]);
            if (!id) return null;
            const teamRaw = raw.team_members ?? raw.teamMembers;
            const teamMembers = Array.isArray(teamRaw)
                ? (teamRaw as Array<Record<string, unknown>>).map((m) => ({
                      name: typeof m.name === "string" ? m.name : undefined,
                      email: typeof m.email === "string" ? m.email : undefined,
                  }))
                : [];
            const joinStageDisplay =
                pickString(raw, ["join_stage_display", "joinStageDisplay"]) ||
                pickString(raw, ["application_stage", "applicationStage"]) ||
                "";

            const enrollRaw = raw.enrollment_tracking ?? raw.enrollmentTracking;
            const et =
                enrollRaw && typeof enrollRaw === "object" && !Array.isArray(enrollRaw)
                    ? (enrollRaw as Record<string, unknown>)
                    : null;

            let enrollmentWarning: string | null = null;
            let attendanceSessionsTotal: number | null = null;
            let attendanceSessionsPendingReview: number | null = null;
            let attendanceApproverType: string | null = null;
            let impactReportSummary: string | null = null;
            let impactReportPartnerStatus: string | null = null;
            let impactReportAdminStatus: string | null = null;
            let impactReportFacultyStatus: string | null = null;
            let impactReportRawStatus: string | null = null;
            let attendanceSessionsPreview: AttendanceSessionPreview[] = [];

            if (et) {
                enrollmentWarning =
                    pickString(et, ["enrollment_warning", "enrollmentWarning"]) || null;
                attendanceSessionsTotal = pickInt(et, [
                    "attendance_sessions_total",
                    "attendanceSessionsTotal",
                ]);
                attendanceSessionsPendingReview = pickInt(et, [
                    "attendance_sessions_pending_review",
                    "attendanceSessionsPendingReview",
                ]);
                const approverPick = pickString(et, [
                    "attendance_approver_type",
                    "attendanceApproverType",
                ]);
                attendanceApproverType = approverPick ? approverPick : null;
                impactReportSummary =
                    pickString(et, ["impact_report_summary", "impactReportSummary"]) || null;
                impactReportPartnerStatus =
                    pickString(et, ["impact_report_partner_status", "impactReportPartnerStatus"]) || null;
                impactReportAdminStatus =
                    pickString(et, ["impact_report_admin_status", "impactReportAdminStatus"]) || null;
                impactReportFacultyStatus =
                    pickString(et, ["impact_report_faculty_status", "impactReportFacultyStatus"]) || null;
                impactReportRawStatus =
                    pickString(et, ["impact_report_status", "impactReportStatus"]) || null;

                const previewRaw = et.attendance_sessions_preview ?? et.attendanceSessionsPreview;
                if (Array.isArray(previewRaw)) {
                    attendanceSessionsPreview = previewRaw
                        .map((x) =>
                            x && typeof x === "object"
                                ? mapAttendanceSessionPreview(x as Record<string, unknown>)
                                : null,
                        )
                        .filter(Boolean) as AttendanceSessionPreview[];
                }
            }

            const internalStatus = pickString(raw, ["internal_status", "internalStatus"], "unknown");

            return {
                id,
                studentName: pickString(raw, ["student_name", "studentName"], "—"),
                studentEmail: pickString(raw, ["student_email", "studentEmail"]),
                internalStatus,
                applicationStatus: pickString(raw, ["application_status", "applicationStatus"], ""),
                applicationStage: pickString(raw, ["application_stage", "applicationStage"]) || null,
                joinStageDisplay:
                    joinStageDisplay ||
                    (internalStatus === "approved" ? "Approved — enrollment" : "Awaiting approvals"),
                participationType: pickString(raw, ["participation_type", "participationType"], "individual"),
                teamMembers,
                createdAt:
                    typeof raw.created_at === "string"
                        ? raw.created_at
                        : raw.created_at instanceof Date
                          ? raw.created_at.toISOString()
                          : null,
                enrollmentWarning,
                attendanceSessionsTotal,
                attendanceSessionsPendingReview,
                attendanceApproverType,
                attendanceSessionsPreview,
                impactReportSummary,
                impactReportPartnerStatus,
                impactReportAdminStatus,
                impactReportFacultyStatus,
                impactReportRawStatus,
            };
        })
        .filter(Boolean) as ApplicationRosterRow[];
}

function extractTrackerSnapshot(summaryRaw: Record<string, unknown> | null): TrackerOpportunitySnapshot {
    const basePipeline: Record<string, number> = {
        pending_faculty: 0,
        pending_partner: 0,
        pending_admin: 0,
        approved: 0,
        faculty_rejected: 0,
        partner_rejected: 0,
        admin_rejected: 0,
    };
    const block =
        summaryRaw?.applications_by_internal_status ?? summaryRaw?.applicationsByInternalStatus;
    if (block && typeof block === "object" && !Array.isArray(block)) {
        for (const k of Object.keys(basePipeline)) {
            const n = Number((block as Record<string, unknown>)[k]);
            basePipeline[k] = Number.isFinite(n) ? n : 0;
        }
    }
    const totalRaw =
        summaryRaw?.applications_pipeline_total_non_withdrawn ??
        summaryRaw?.applicationsPipelineTotalNonWithdrawn;
    const totalParsed = Number(totalRaw);
    const pipelineTotal = Number.isFinite(totalParsed)
        ? totalParsed
        : Object.values(basePipeline).reduce((a, b) => a + b, 0);

    const oRaw = summaryRaw?.opportunity;
    const o = oRaw && typeof oRaw === "object" && !Array.isArray(oRaw) ? (oRaw as Record<string, unknown>) : null;

    return {
        organizationName: pickString(o ?? {}, ["organization_name", "organizationName"]) || null,
        executingOrganizationName:
            pickString(o ?? {}, ["executing_organization_name", "executingOrganizationName"]) || null,
        executingOrganizationEmail:
            pickString(o ?? {}, ["executing_organization_email", "executingOrganizationEmail"]) || null,
        partnerOrganizationName:
            pickString(o ?? {}, ["partner_organization_name", "partnerOrganizationName"]) || null,
        partnerOrganizationEmail:
            pickString(o ?? {}, ["partner_organization_email", "partnerOrganizationEmail"]) || null,
        partnerContactPerson:
            pickString(o ?? {}, ["partner_contact_person", "partnerContactPerson"]) || null,
        facultySupervisorName:
            pickString(o ?? {}, ["faculty_supervisor_name", "facultySupervisorName"]) || null,
        facultySupervisorEmail:
            pickString(o ?? {}, ["faculty_supervisor_email", "facultySupervisorEmail"]) || null,
        attendanceRoutingOverride: (() => {
            const rawOverride = pickString(o ?? {}, [
                "attendance_routing_override",
                "attendanceRoutingOverride",
            ]);
            if (rawOverride === "partner" || rawOverride === "faculty") return rawOverride;
            return "auto";
        })(),
        awaitingLane: humanizeApprovalLane(
            pickString(o ?? {}, ["awaiting_partner_or_faculty", "awaitingPartnerOrFaculty"]) || null,
        ),
        pipeline: basePipeline,
        pipelineTotal,
    };
}

export function ProjectTrackerModal({ row, onClose, onOpenTeamsEnrollments }: Props) {
    const [loading, setLoading] = useState(true);
    const [roster, setRoster] = useState<ApplicationRosterRow[]>([]);
    const [snapshot, setSnapshot] = useState<TrackerOpportunitySnapshot | null>(null);
    const [enrollmentCount, setEnrollmentCount] = useState(0);
    const [attendanceRoutingOverride, setAttendanceRoutingOverride] = useState<"auto" | "partner" | "faculty">("auto");
    const [attendanceRoutingSaving, setAttendanceRoutingSaving] = useState(false);
    const [facultySupervisorName, setFacultySupervisorName] = useState("");
    const [facultySupervisorEmail, setFacultySupervisorEmail] = useState("");
    const [partnerOrganizationName, setPartnerOrganizationName] = useState("");
    const [partnerContactPerson, setPartnerContactPerson] = useState("");
    const [partnerContactEmail, setPartnerContactEmail] = useState("");
    const [contactsSaving, setContactsSaving] = useState(false);

    const syncContactFormFromSnapshot = useCallback((nextSnapshot: TrackerOpportunitySnapshot | null) => {
        setFacultySupervisorName(nextSnapshot?.facultySupervisorName ?? "");
        setFacultySupervisorEmail(nextSnapshot?.facultySupervisorEmail ?? "");
        setPartnerOrganizationName(
            nextSnapshot?.executingOrganizationName ?? nextSnapshot?.partnerOrganizationName ?? "",
        );
        setPartnerContactPerson(nextSnapshot?.partnerContactPerson ?? "");
        setPartnerContactEmail(
            nextSnapshot?.executingOrganizationEmail ?? nextSnapshot?.partnerOrganizationEmail ?? "",
        );
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/opportunities/${encodeURIComponent(row.id)}/teams`,
            );
            if (!res) {
                toast.error("Could not load project tracker");
                setRoster([]);
                setSnapshot(null);
                return;
            }
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : "Could not load project tracker",
                );
                setRoster([]);
                setSnapshot(null);
                return;
            }
            const payload = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
            const summaryRaw =
                payload?.summary && typeof payload.summary === "object"
                    ? (payload.summary as Record<string, unknown>)
                    : null;
            setRoster(extractApplicationsRoster(summaryRaw));
            const nextSnapshot = extractTrackerSnapshot(summaryRaw);
            setSnapshot(nextSnapshot);
            setAttendanceRoutingOverride(nextSnapshot?.attendanceRoutingOverride ?? "auto");
            syncContactFormFromSnapshot(nextSnapshot);
            const reg = Number(summaryRaw?.registered_teams ?? summaryRaw?.registeredTeams);
            setEnrollmentCount(Number.isFinite(reg) && reg >= 0 ? reg : 0);
        } catch {
            toast.error("Could not load project tracker");
            setRoster([]);
            setSnapshot(null);
        } finally {
            setLoading(false);
        }
    }, [row.id, syncContactFormFromSnapshot]);

    const contactsDirty = useMemo(() => {
        if (!snapshot) return false;
        const savedPartnerName =
            snapshot.executingOrganizationName ?? snapshot.partnerOrganizationName ?? "";
        const savedPartnerEmail =
            snapshot.executingOrganizationEmail ?? snapshot.partnerOrganizationEmail ?? "";
        return (
            facultySupervisorName.trim() !== (snapshot.facultySupervisorName ?? "").trim() ||
            facultySupervisorEmail.trim() !== (snapshot.facultySupervisorEmail ?? "").trim() ||
            partnerOrganizationName.trim() !== savedPartnerName.trim() ||
            partnerContactPerson.trim() !== (snapshot.partnerContactPerson ?? "").trim() ||
            partnerContactEmail.trim() !== savedPartnerEmail.trim()
        );
    }, [
        facultySupervisorEmail,
        facultySupervisorName,
        partnerContactEmail,
        partnerContactPerson,
        partnerOrganizationName,
        snapshot,
    ]);

    const saveContacts = useCallback(async () => {
        setContactsSaving(true);
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/opportunities/${encodeURIComponent(row.id)}/contacts`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        faculty_supervisor_name: facultySupervisorName.trim(),
                        faculty_supervisor_email: facultySupervisorEmail.trim(),
                        partner_organization_name: partnerOrganizationName.trim(),
                        partner_contact_person: partnerContactPerson.trim(),
                        partner_contact_email: partnerContactEmail.trim(),
                    }),
                },
            );
            const data = res ? await res.json().catch(() => ({})) : {};
            if (res?.ok) {
                const payload =
                    data && typeof data === "object"
                        ? (data as { data?: { propagation?: Record<string, number>; faculty_account_linked?: boolean } }).data
                        : undefined;
                const propagation = payload?.propagation;
                const facultyLinked = payload?.faculty_account_linked === true;
                const parts = [
                    propagation?.participations_updated
                        ? `${propagation.participations_updated} enrollment(s)`
                        : null,
                    propagation?.applications_updated
                        ? `${propagation.applications_updated} application(s)`
                        : null,
                    propagation?.reports_updated ? `${propagation.reports_updated} report(s)` : null,
                ].filter(Boolean);
                toast.success(
                    parts.length
                        ? `Contacts updated — rebound ${parts.join(", ")}`
                        : "Faculty and partner contacts updated",
                );
                if (facultySupervisorEmail.trim() && !facultyLinked) {
                    toast.message(
                        "Faculty email saved. Hub access will activate when that person registers a CIEL faculty account with this email.",
                    );
                }
                await load();
            } else {
                toast.error(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : "Could not update contacts",
                );
            }
        } catch {
            toast.error("Could not update contacts");
        } finally {
            setContactsSaving(false);
        }
    }, [
        facultySupervisorEmail,
        facultySupervisorName,
        load,
        partnerContactEmail,
        partnerContactPerson,
        partnerOrganizationName,
        row.id,
    ]);

    const saveAttendanceRouting = useCallback(async () => {
        setAttendanceRoutingSaving(true);
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/opportunities/${encodeURIComponent(row.id)}/attendance-routing`,
                {
                    method: "PATCH",
                    body: JSON.stringify({ override: attendanceRoutingOverride }),
                },
            );
            const data = res ? await res.json().catch(() => ({})) : {};
            if (res?.ok) {
                toast.success("Attendance routing updated");
                setSnapshot((prev) =>
                    prev ? { ...prev, attendanceRoutingOverride } : prev,
                );
            } else {
                toast.error(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : "Could not update attendance routing",
                );
            }
        } catch {
            toast.error("Could not update attendance routing");
        } finally {
            setAttendanceRoutingSaving(false);
        }
    }, [attendanceRoutingOverride, row.id]);

    useEffect(() => {
        void load();
    }, [load]);

    const creator = useMemo(() => {
        const c = row.raw.creator;
        return c && typeof c === "object" ? (c as Record<string, unknown>) : null;
    }, [row.raw.creator]);

    const detailRows = useMemo(() => {
        const timeline =
            row.raw.timeline && typeof row.raw.timeline === "object"
                ? (row.raw.timeline as Record<string, unknown>)
                : null;
        const scope =
            row.raw.participation_scope && typeof row.raw.participation_scope === "object"
                ? (row.raw.participation_scope as Record<string, unknown>)
                : null;
        const departments = Array.isArray(scope?.departments)
            ? (scope.departments as unknown[]).map((d) => String(d)).filter(Boolean)
            : [];
        return [
            { label: "Project ID", value: row.id },
            { label: "Listing status", value: row.displayStatus },
            { label: "Location", value: row.locationLabel },
            {
                label: "Volunteers (filled / capacity)",
                value:
                    row.volunteersRequired != null
                        ? `${row.volunteers} / ${row.volunteersRequired}`
                        : String(row.volunteers),
            },
            {
                label: "Seats remaining",
                value: row.remainingSeats != null ? String(row.remainingSeats) : "—",
            },
            { label: "Verified hours logged", value: String(row.hours) },
            { label: "Expected hours (per person)", value: formatDetailValue(timeline?.expected_hours) },
            { label: "Activity mode", value: formatDetailValue(row.raw.mode ?? timeline?.type) },
            { label: "Eligible departments", value: departments.length ? departments.join(", ") : "—" },
            { label: "Creator", value: formatDetailValue(creator?.name) },
            { label: "Creator email", value: formatDetailValue(creator?.email) },
            { label: "Creator phone", value: formatDetailValue(creator?.phone) },
            {
                label: "Partner org (linked account)",
                value: snapshot?.organizationName ?? row.subtitle,
            },
            {
                label: "Attendance routing (effective)",
                value:
                    snapshot?.attendanceRoutingOverride === "partner"
                        ? "Partner (admin override)"
                        : snapshot?.attendanceRoutingOverride === "faculty"
                          ? "Faculty (admin override)"
                          : snapshot?.partnerOrganizationEmail || snapshot?.executingOrganizationEmail
                            ? "Partner (auto)"
                            : "Faculty (auto)",
            },
        ];
    }, [row, creator, snapshot]);

    const pipelineChips = useMemo(() => {
        if (!snapshot) return [];
        return Object.entries(snapshot.pipeline)
            .filter(([, n]) => n > 0)
            .map(([k, n]) => ({ key: k, label: applicationInternalStatusLabel(k), n }));
    }, [snapshot]);

    const pendingAdminCount =
        (snapshot?.pipeline.pending_admin ?? 0) + (snapshot?.pipeline.pending_partner ?? 0);

    return (
        <>
            <div className="fixed inset-0 z-[85] bg-slate-900/45" aria-hidden onClick={onClose} />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="project-tracker-title"
                className="fixed left-1/2 top-1/2 z-[95] flex max-h-[min(92vh,56rem)] w-[calc(100vw-0.75rem)] max-w-6xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 shrink-0">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-blue-700">
                            <ClipboardList className="h-5 w-5 shrink-0" />
                            <h2 id="project-tracker-title" className="text-lg font-extrabold text-slate-900 tracking-tight">
                                Project tracker
                            </h2>
                        </div>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                            Full picture for <span className="font-semibold text-slate-700">{row.title}</span> — join
                            queue, impact report approvals, attendance reviews, and enrollments.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 min-h-0 px-5 py-4 space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                            <p className="text-sm font-medium">Loading tracker…</p>
                        </div>
                    ) : (
                        <>
                            {snapshot?.awaitingLane ? (
                                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
                                    {snapshot.awaitingLane}
                                    {!snapshot.partnerOrganizationName && !snapshot.organizationName ? (
                                        <p className="mt-1 text-xs font-medium text-rose-800/90">
                                            No partner organization is linked yet — attendance review and partner gates may
                                            not appear until the student adds and the partner approves the listing.
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}

                            <section>
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                                    Project details
                                </h3>
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                    {detailRows.map((d) => (
                                        <div key={d.label} className="min-w-0 border-b border-slate-50 pb-2">
                                            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                                {d.label}
                                            </dt>
                                            <dd className="font-semibold text-slate-800 break-words mt-0.5">{d.value}</dd>
                                        </div>
                                    ))}
                                </dl>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Link
                                        href={`/dashboard/student/browse/${encodeURIComponent(row.id)}`}
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" /> Open public listing
                                    </Link>
                                </div>
                            </section>

                            <section className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                                <div className="flex items-start gap-2 mb-3">
                                    <Info className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
                                            Faculty &amp; partner contacts
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Update supervising faculty or partner contact. Pending attendance reviews and
                                            approval routing will rebind to the new contacts; live listings stay published.
                                        </p>
                                    </div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="text-sm sm:col-span-2">
                                        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                                            Faculty supervisor name
                                        </span>
                                        <input
                                            type="text"
                                            value={facultySupervisorName}
                                            onChange={(e) => setFacultySupervisorName(e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                                            placeholder="e.g. Nighat Akbar"
                                        />
                                    </label>
                                    <label className="text-sm sm:col-span-2">
                                        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                                            Faculty supervisor email
                                        </span>
                                        <input
                                            type="email"
                                            value={facultySupervisorEmail}
                                            onChange={(e) => setFacultySupervisorEmail(e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                                            placeholder="faculty@university.edu"
                                        />
                                    </label>
                                    <label className="text-sm sm:col-span-2">
                                        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                                            Partner / execution org (form)
                                        </span>
                                        <input
                                            type="text"
                                            value={partnerOrganizationName}
                                            onChange={(e) => setPartnerOrganizationName(e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                                            placeholder="Organization name"
                                        />
                                    </label>
                                    <label className="text-sm">
                                        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                                            Partner contact person
                                        </span>
                                        <input
                                            type="text"
                                            value={partnerContactPerson}
                                            onChange={(e) => setPartnerContactPerson(e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                                            placeholder="Optional"
                                        />
                                    </label>
                                    <label className="text-sm">
                                        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                                            Partner contact email
                                        </span>
                                        <input
                                            type="email"
                                            value={partnerContactEmail}
                                            onChange={(e) => setPartnerContactEmail(e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                                            placeholder="partner@org.org"
                                        />
                                    </label>
                                </div>
                                <div className="mt-3 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => void saveContacts()}
                                        disabled={contactsSaving || !contactsDirty}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                                    >
                                        {contactsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                        Save contacts
                                    </button>
                                </div>
                            </section>

                            <section className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                                <div className="flex items-start gap-2 mb-3">
                                    <Info className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
                                            Attendance routing override
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Auto follows partner contact when present, otherwise faculty. Override only when
                                            you need to force a queue.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                                    <label className="flex-1 text-sm">
                                        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                                            Queue
                                        </span>
                                        <select
                                            value={attendanceRoutingOverride}
                                            onChange={(e) =>
                                                setAttendanceRoutingOverride(
                                                    e.target.value as "auto" | "partner" | "faculty",
                                                )
                                            }
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                                        >
                                            <option value="auto">Auto (partner if contact exists)</option>
                                            <option value="partner">Force partner queue</option>
                                            <option value="faculty">Force faculty queue</option>
                                        </select>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => void saveAttendanceRouting()}
                                        disabled={
                                            attendanceRoutingSaving ||
                                            attendanceRoutingOverride === snapshot?.attendanceRoutingOverride
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                                    >
                                        {attendanceRoutingSaving ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : null}
                                        Save routing
                                    </button>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                                    Join applications pipeline
                                </h3>
                                {pipelineChips.length === 0 && snapshot?.pipelineTotal === 0 ? (
                                    <p className="text-sm text-slate-600">No join applications yet.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {pipelineChips.map((c) => (
                                            <span
                                                key={c.key}
                                                className={`inline-flex px-2.5 py-1 rounded-lg border text-xs font-bold ${applicationStatusBadgeClass(c.key)}`}
                                            >
                                                {c.label}: {c.n}
                                            </span>
                                        ))}
                                        {snapshot && snapshot.pipelineTotal > 0 ? (
                                            <span className="inline-flex px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600">
                                                Total: {snapshot.pipelineTotal}
                                            </span>
                                        ) : null}
                                    </div>
                                )}
                                {pendingAdminCount > 0 ? (
                                    <p className="mt-2 text-xs text-amber-800 font-medium">
                                        {pendingAdminCount} waiting on admin — approve in{" "}
                                        <Link
                                            href="/dashboard/admin/join-applications"
                                            className="font-bold underline hover:text-amber-900"
                                        >
                                            Join applications
                                        </Link>
                                        .
                                    </p>
                                ) : null}
                                <p className="mt-2 text-[11px] text-slate-500 leading-snug">
                                    Counts include all non-withdrawn join applications for this project. Withdrawn applications
                                    disappear from this list.
                                </p>
                            </section>

                            <section>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                                        Who applied — join, report &amp; attendance
                                    </h3>
                                    <span className="text-[11px] font-bold text-slate-500">{roster.length} total</span>
                                </div>
                                {roster.length === 0 ? (
                                    <p className="text-sm text-slate-600 rounded-xl border border-slate-100 bg-slate-50 px-4 py-6 text-center">
                                        No applications on record (or all withdrawn).
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        <TrackerReadingGuide />
                                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                                        <table className="min-w-[920px] w-full text-left text-sm">
                                            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                <tr>
                                                    <th
                                                        className="px-3 py-2.5"
                                                        title="Applicant (team lead for team applications)"
                                                    >
                                                        Student
                                                    </th>
                                                    <th className="px-3 py-2.5" title="Individual or team join">
                                                        Type
                                                    </th>
                                                    <th
                                                        className="px-3 py-2.5"
                                                        title="Join queue position: faculty, partner, admin, or enrolled"
                                                    >
                                                        Join stage
                                                    </th>
                                                    <th
                                                        className="px-3 py-2.5"
                                                        title="Impact report after activity — partner, admin, faculty gates"
                                                    >
                                                        Impact report
                                                    </th>
                                                    <th
                                                        className="px-3 py-2.5"
                                                        title="Daily attendance logs — pending until partner/faculty verifies"
                                                    >
                                                        Attendance
                                                    </th>
                                                    <th
                                                        className="px-3 py-2.5"
                                                        title="Join application outcome vs report verified"
                                                    >
                                                        Status
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {roster.map((a) => {
                                                    const showEnrollmentExtras = a.internalStatus === "approved";
                                                    const totalAtt = a.attendanceSessionsTotal ?? 0;
                                                    const pendAtt = a.attendanceSessionsPendingReview ?? 0;
                                                    return (
                                                    <tr key={a.id} className="bg-white">
                                                        <td className="px-3 py-2.5 min-w-[140px]">
                                                            <div className="font-bold text-slate-900">{a.studentName}</div>
                                                            {a.studentEmail ? (
                                                                <div className="text-xs text-slate-500 truncate">{a.studentEmail}</div>
                                                            ) : null}
                                                            {a.teamMembers.length > 0 ? (
                                                                <div className="text-[10px] text-slate-500 mt-1">
                                                                    +{a.teamMembers.length} teammate
                                                                    {a.teamMembers.length === 1 ? "" : "s"}
                                                                </div>
                                                            ) : null}
                                                        </td>
                                                        <td className="px-3 py-2.5 capitalize text-slate-700 font-medium">
                                                            {a.participationType}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-slate-800 text-xs leading-snug max-w-[11rem]">
                                                            <div className="font-semibold">{a.joinStageDisplay}</div>
                                                            {a.applicationStage ? (
                                                                <div className="text-[10px] text-slate-500 mt-0.5">
                                                                    Gate: {a.applicationStage}
                                                                </div>
                                                            ) : null}
                                                        </td>
                                                        <td className="px-3 py-2.5 align-top min-w-[180px] max-w-[240px]">
                                                            {!showEnrollmentExtras ? (
                                                                <span className="text-slate-400 text-xs">After seat issued</span>
                                                            ) : a.enrollmentWarning ? (
                                                                <span className="text-amber-800 text-xs font-medium leading-snug">
                                                                    {a.enrollmentWarning}
                                                                </span>
                                                            ) : (
                                                                <div className="space-y-1.5">
                                                                    <div className="font-semibold text-xs text-slate-900 leading-snug">
                                                                        {a.impactReportSummary ?? "—"}
                                                                    </div>
                                                                    {a.impactReportRawStatus ? (
                                                                        <div className="text-[10px] text-slate-500">
                                                                            DB status:{" "}
                                                                            <span className="font-mono">{a.impactReportRawStatus}</span>
                                                                        </div>
                                                                    ) : null}
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {a.impactReportPartnerStatus ? (
                                                                            <span
                                                                                title="Partner organisation gate on impact report"
                                                                                className={`inline-flex px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wide ${approvalGateChipClass(a.impactReportPartnerStatus)}`}
                                                                            >
                                                                                Partner: {a.impactReportPartnerStatus}
                                                                            </span>
                                                                        ) : null}
                                                                        {a.impactReportAdminStatus ? (
                                                                            <span
                                                                                title="CIEL admin gate on impact report"
                                                                                className={`inline-flex px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wide ${approvalGateChipClass(a.impactReportAdminStatus)}`}
                                                                            >
                                                                                Admin: {a.impactReportAdminStatus}
                                                                            </span>
                                                                        ) : null}
                                                                        {a.impactReportFacultyStatus ? (
                                                                            <span
                                                                                title="Faculty gate on impact report"
                                                                                className={`inline-flex px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wide ${approvalGateChipClass(a.impactReportFacultyStatus)}`}
                                                                            >
                                                                                Faculty: {a.impactReportFacultyStatus}
                                                                            </span>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2.5 align-top min-w-[200px] max-w-[min(24rem,92vw)]">
                                                            {!showEnrollmentExtras ? (
                                                                <span className="text-slate-400 text-xs">After seat issued</span>
                                                            ) : a.enrollmentWarning ? (
                                                                <span className="text-amber-800 text-xs">See warning</span>
                                                            ) : (
                                                                <div className="space-y-1 text-xs text-slate-800">
                                                                    {pendAtt > 0 ? (
                                                                        <div className="font-bold text-amber-900">
                                                                            {pendAtt} session{pendAtt === 1 ? "" : "s"} pending
                                                                            review
                                                                        </div>
                                                                    ) : totalAtt > 0 ? (
                                                                        <div className="font-semibold text-emerald-800">
                                                                            No pending attendance reviews
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-slate-600">No sessions logged</div>
                                                                    )}
                                                                    {totalAtt > 0 ? (
                                                                        <div className="text-[10px] text-slate-500">
                                                                            {totalAtt} logged total
                                                                        </div>
                                                                    ) : null}
                                                                    {a.attendanceApproverType ? (
                                                                        <div
                                                                            className="text-[10px] text-slate-500 capitalize"
                                                                            title="Who should verify attendance logs in their hub before hours count as cleared"
                                                                        >
                                                                            Reviewer route: {a.attendanceApproverType}
                                                                        </div>
                                                                    ) : null}
                                                                    <AttendanceSessionsBreakdown sessions={a.attendanceSessionsPreview} />
                                                                    {totalAtt > 0 &&
                                                                    a.attendanceSessionsPreview.length === 0 ? (
                                                                        <p className="text-[10px] text-amber-900/90 mt-1 leading-snug">
                                                                            Session-by-session list will appear after backend
                                                                            deploy (field <code className="font-mono">attendance_sessions_preview</code>).
                                                                        </p>
                                                                    ) : null}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2.5 align-top">
                                                            <span
                                                                className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${applicationStatusBadgeClass(a.internalStatus)}`}
                                                            >
                                                                {applicationInternalStatusLabel(a.internalStatus)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        </div>
                                    </div>
                                )}
                            </section>

                            <section className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <div className="text-xs font-black uppercase tracking-wider text-blue-800">
                                        Enrollments &amp; reports
                                    </div>
                                    <p className="text-sm text-blue-900/90 mt-0.5 leading-snug">
                                        {enrollmentCount} enrolled group
                                        {enrollmentCount === 1 ? "" : "s"} (teams or individuals with active seats).
                                        Open for per-member roster, edits, aggregated report milestones, and admin actions on
                                        seats.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        onOpenTeamsEnrollments();
                                    }}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 shrink-0"
                                >
                                    <Users className="w-4 h-4" /> Teams &amp; enrollments
                                </button>
                            </section>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
