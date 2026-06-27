"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import DataTable from "react-data-table-component";
import type { TableColumn } from "react-data-table-component";
import { Search, Filter, MoreVertical, Briefcase, MapPin, Eye, FileDown, Trash2, Users, Loader2, X, UserMinus, Pencil, Mail, ClipboardList, GitMerge, Unlock, Lock, Layers2, Sparkles, Wrench } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { ProjectTrackerModal } from "@/app/dashboard/admin/projects/ProjectTrackerModal";
import {
    attendanceUnlockLabel,
    attendanceUnlockTone,
    parseAdminEnrollmentAttendanceRows,
    type AdminEnrollmentAttendanceMeta,
} from "@/utils/adminEnrollmentAttendance";

type AdminProjectRow = {
    id: string;
    title: string;
    subtitle: string;
    displayStatus: string;
    statusKey: string;
    locationLabel: string;
    locationKey: string;
    /** Current enrolled / joined volunteers */
    volunteers: number;
    /** Capacity target when API sends volunteers_required */
    volunteersRequired: number | null;
    remainingSeats: number | null;
    remainingMembers: number | null;
    hours: number;
    remainingHours: number | null;
    raw: Record<string, unknown>;
    /** Present when listing is scoped with `student_email` query — role on that opportunity. */
    studentMatch: { role: string; matchSource: "enrollment" | "application_pipeline" } | null;
};

function lower(v: unknown): string {
    if (v == null) return "";
    return String(v).trim().toLowerCase();
}

function extractAdminProjectsList(body: unknown): Record<string, unknown>[] {
    if (Array.isArray(body)) return body as Record<string, unknown>[];
    if (body && typeof body === "object") {
        const o = body as Record<string, unknown>;
        if (o.success === false && !Array.isArray(o.data)) return [];
        for (const k of ["data", "projects", "opportunities", "items", "results", "rows"] as const) {
            const v = o[k];
            if (Array.isArray(v)) return v as Record<string, unknown>[];
        }
    }
    return [];
}

function pickLocation(p: Record<string, unknown>): string {
    const loc = p.location;
    if (typeof loc === "string" && loc.trim()) return loc.trim();
    if (loc && typeof loc === "object") {
        const l = loc as Record<string, unknown>;
        const city = typeof l.city === "string" ? l.city : "";
        const venue = typeof l.venue === "string" ? l.venue : "";
        const joined = [venue, city].filter(Boolean).join(", ");
        if (joined) return joined;
    }
    if (typeof p.city === "string" && p.city.trim()) return p.city.trim();
    return "Unknown";
}

function subtitleFromRaw(raw: Record<string, unknown>): string {
    const c = raw.creator && typeof raw.creator === "object" ? (raw.creator as Record<string, unknown>) : null;
    const fromCreator = c && typeof c.name === "string" ? c.name.trim() : "";
    return (
        (typeof raw.partner_name === "string" && raw.partner_name.trim()) ||
        (typeof raw.org === "string" && raw.org.trim()) ||
        (typeof raw.organization_name === "string" && raw.organization_name.trim()) ||
        fromCreator ||
        "—"
    );
}

/** Faculty supervisor official email only — not partner names or partner emails. */
function pickFacultySupervisorEmail(raw: Record<string, unknown>): string {
    const sup =
        raw.supervision && typeof raw.supervision === "object"
            ? (raw.supervision as Record<string, unknown>)
            : null;
    const contact = String(sup?.contact ?? "").trim();
    if (contact.includes("@")) return contact.toLowerCase();
    return "";
}

function optionalPositiveNumber(raw: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
        const n = Number(raw[key]);
        if (Number.isFinite(n) && n >= 0) return n;
    }
    return null;
}

function normalizeAdminProjectRow(raw: Record<string, unknown>): AdminProjectRow | null {
    const id = String(raw.id ?? raw.opportunity_id ?? "").trim();
    if (!id) return null;
    const title = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "Untitled";
    const workflow = lower(raw.workflow_stage ?? raw.approval_stage);
    const status = lower(raw.status);
    const fac = lower(raw.faculty_approval_status);
    const part = lower(raw.partner_approval_status);

    let statusKey = workflow || status || "unknown";
    if (!workflow && status === "pending" && fac === "pending") statusKey = "pending_faculty";
    if (!workflow && fac === "approved" && part === "pending") statusKey = "pending_partner";

    let displayStatus = statusKey.replace(/_/g, " ").trim() || "unknown";
    if (workflow) displayStatus = String(raw.workflow_stage ?? raw.approval_stage ?? displayStatus).replace(/_/g, " ");
    else if (status) displayStatus = String(raw.status).replace(/_/g, " ");
    displayStatus = displayStatus.toUpperCase();

    const timeline = raw.timeline && typeof raw.timeline === "object" ? (raw.timeline as Record<string, unknown>) : null;
    /** Enrolled count only — never use volunteers_required here (capacity is separate). */
    const volunteers = Number(raw.volunteers ?? raw.volunteers_count) || 0;
    const vrFromRoot = optionalPositiveNumber(raw, ["volunteers_required"]);
    const vrFromTimeline = timeline ? optionalPositiveNumber(timeline, ["volunteers_required"]) : null;
    const volunteersRequired = vrFromRoot ?? vrFromTimeline;

    const hours =
        Number(raw.hours ?? raw.total_hours ?? raw.verified_hours ?? timeline?.expected_hours ?? raw.impact_hours) || 0;

    const parseNonNegInt = (v: unknown): number | null =>
        v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : null;

    const remainingHours = parseNonNegInt(raw.remaining_hours);
    const remainingSeats = parseNonNegInt(raw.remaining_seats);
    const remainingMembers = parseNonNegInt(raw.remaining_members);

    let studentMatch: AdminProjectRow["studentMatch"] = null;
    const sm = raw.student_match;
    if (sm && typeof sm === "object" && !Array.isArray(sm)) {
        const o = sm as Record<string, unknown>;
        const role = typeof o.role === "string" ? o.role.trim() : "";
        const ms = typeof o.match_source === "string" ? o.match_source.trim().toLowerCase() : "";
        const matchSource: "application_pipeline" | "enrollment" =
            ms === "application_pipeline" ? "application_pipeline" : "enrollment";
        if (role) {
            studentMatch = { role, matchSource };
        }
    }

    return {
        id,
        title,
        subtitle: subtitleFromRaw(raw),
        displayStatus,
        statusKey,
        locationLabel: pickLocation(raw),
        locationKey: pickLocation(raw).toLowerCase(),
        volunteers,
        volunteersRequired: volunteersRequired !== null && volunteersRequired > 0 ? volunteersRequired : null,
        remainingSeats,
        remainingMembers,
        hours,
        remainingHours,
        raw,
        studentMatch,
    };
}

type IncompleteReportApplicantRow = {
    applicationId: string;
    studentName: string;
    studentEmail: string;
    reportStatusRaw: string;
    reportStatusLabel: string;
};

type IncompleteApplicantStatusFilter = "all" | "not_started" | "draft_or_progress";

function normalizeReportStatusKey(value: string): string {
    return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function humanizeIncompleteApplicantStatus(raw: string): string {
    const key = normalizeReportStatusKey(raw);
    if (key === "not_started") return "No report started";
    if (key === "draft") return "Draft";
    if (key === "in_progress" || key === "inprogress") return "In progress";
    if (key === "incomplete") return "Incomplete";
    return raw.replace(/_/g, " ");
}

function incompleteApplicantBadgeClass(reportStatusRaw: string): string {
    const key = normalizeReportStatusKey(reportStatusRaw);
    if (key === "not_started")
        return "bg-slate-100 text-slate-700 border border-slate-200";
    if (key === "draft") return "bg-amber-50 text-amber-900 border border-amber-100";
    return "bg-amber-50 text-amber-800 border border-amber-100";
}

/** Matches backend Participation / patch DTO enums. */
const YEAR_OF_STUDY_OPTIONS = [
    "1st Year",
    "2nd Year",
    "3rd Year",
    "4th Year",
    "Graduate",
    "Postgraduate",
] as const;

const ACADEMIC_INTEGRATION_OPTIONS = [
    "Voluntary",
    "Course-Linked",
    "Credit-Bearing",
    "Capstone / Thesis",
    "Research-Integrated",
] as const;

type TeamMemberRow = {
    id: string;
    name: string;
    email: string;
    role: string;
    reportStatus: string;
    reportAvailable: boolean;
    supportsAdminPatch: boolean;
    phoneNumber: string;
    cnicDisplay: string;
    universityId: string;
    universityName: string;
    academicProgram: string;
    department: string;
    yearOfStudy: string;
    academicIntegrationType: string;
    attendanceMeta?: AdminEnrollmentAttendanceMeta;
    studentUserId?: string;
    duplicateSeatCount?: number;
    studentIdMislinked?: boolean;
};

type TeamMemberEditorDraft = {
    full_name: string;
    mobile: string;
    cnic: string;
    university_id: string;
    university_name: string;
    academic_program: string;
    department: string;
    year_of_study: string;
    academic_integration_type: string;
    sync_linked_user_profile: boolean;
};

type TeamMemberEditorState = {
    teamId: string;
    memberId: string;
    headline: string;
    draft: TeamMemberEditorDraft;
};

type ParticipationMode = "team" | "individual";

type TeamOverviewRow = {
    id: string;
    teamName: string;
    leadName: string;
    reportStatus: string;
    reportAvailable: boolean;
    members: TeamMemberRow[];
    participationMode: ParticipationMode;
};

function normalizeParticipationMode(raw: Record<string, unknown>): ParticipationMode {
    const v = lower(raw.participation_mode ?? raw.participationMode);
    if (v === "individual") return "individual";
    return "team";
}

/** Listing-only synthetic group key; DELETE .../teams/:teamId expects a persisted Participation.teamId. */
function isSyntheticIndividualGroupId(teamId: string): boolean {
    const id = String(teamId).trim();
    return /^individual:/i.test(id) || /^pending-individual:/i.test(id);
}

const PARTICIPATION_UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Enrolled participation seats only — excludes pending pipeline synthetic roster ids. */
function isMergeableTeamMember(member: TeamMemberRow): boolean {
    if (!member.supportsAdminPatch) return false;
    if (/^pending:/i.test(member.id.trim())) return false;
    return PARTICIPATION_UUID_RE.test(member.id.trim());
}

type MergeableEnrollmentOption = {
    participationId: string;
    name: string;
    email: string;
    groupLabel: string;
    participationMode: ParticipationMode;
};

function flattenMergeableEnrollments(rows: TeamOverviewRow[]): MergeableEnrollmentOption[] {
    const out: MergeableEnrollmentOption[] = [];
    for (const team of rows) {
        for (const member of team.members) {
            if (!isMergeableTeamMember(member)) continue;
            out.push({
                participationId: member.id,
                name: member.name,
                email: member.email,
                groupLabel: team.teamName,
                participationMode: team.participationMode,
            });
        }
    }
    return out;
}


function mergeTeamRowsWithEnrollmentAttendance(
    rows: TeamOverviewRow[],
    attendanceByParticipation: Map<string, AdminEnrollmentAttendanceMeta>,
    enrollmentStudentIdsByParticipation: Map<string, string>,
    enrollmentEmailsByParticipation: Map<string, string>,
): TeamOverviewRow[] {
    return rows.map((team) => ({
        ...team,
        members: team.members.map((member) => {
            const participationId = member.id.trim();
            let attendanceMeta = attendanceByParticipation.get(participationId);
            if (!attendanceMeta) {
                const studentUserId = member.studentUserId?.trim();
                const email = member.email.trim().toLowerCase();
                for (const [enrollmentParticipationId, meta] of attendanceByParticipation) {
                    const enrollmentStudentId = enrollmentStudentIdsByParticipation
                        .get(enrollmentParticipationId)
                        ?.trim();
                    const enrollmentEmail = enrollmentEmailsByParticipation
                        .get(enrollmentParticipationId)
                        ?.trim()
                        .toLowerCase();
                    if (
                        (studentUserId && enrollmentStudentId && studentUserId === enrollmentStudentId) ||
                        (email && enrollmentEmail && email === enrollmentEmail)
                    ) {
                        attendanceMeta = meta;
                        break;
                    }
                }
            }
            return attendanceMeta ? { ...member, attendanceMeta } : member;
        }),
    }));
}

function teamOverviewRemoveGroupDisabled(team: TeamOverviewRow): boolean {
    return isSyntheticIndividualGroupId(team.id);
}

type OpportunityPipelineSummary = {
    title: string | null;
    status: string | null;
    adminApproved: boolean;
    facultyVerificationStatus: string | null;
    facultyVerified: boolean;
    executionVerificationStatus: string | null;
    executionVerified: boolean;
    awaitingPartnerOrFaculty: string | null;
};

type TeamOverviewSummary = {
    registeredTeams: number;
    completedReports: number;
    reportsAvailable: number;
    pipeline: OpportunityPipelineSummary | null;
    applicationsByInternalStatus: Record<string, number>;
    applicationsPipelineTotalNonWithdrawn: number;
};

const EMPTY_TEAM_OVERVIEW_SUMMARY: TeamOverviewSummary = {
    registeredTeams: 0,
    completedReports: 0,
    reportsAvailable: 0,
    pipeline: null,
    applicationsByInternalStatus: {
        pending_faculty: 0,
        pending_partner: 0,
        pending_admin: 0,
        approved: 0,
        faculty_rejected: 0,
        partner_rejected: 0,
        admin_rejected: 0,
    },
    applicationsPipelineTotalNonWithdrawn: 0,
};

/** Backend returns { data: [...] }; keep fallbacks for older payloads only. */
function extractIncompleteApplicantsList(body: unknown): Record<string, unknown>[] {
    if (Array.isArray(body)) return body as Record<string, unknown>[];
    if (body && typeof body === "object") {
        const o = body as Record<string, unknown>;
        const data = o.data;
        if (Array.isArray(data)) return data as Record<string, unknown>[];
        for (const k of ["applicants", "items", "rows", "students"] as const) {
            const v = o[k];
            if (Array.isArray(v)) return v as Record<string, unknown>[];
        }
    }
    return [];
}

function mapIncompleteApplicant(raw: Record<string, unknown>): IncompleteReportApplicantRow | null {
    const applicationId = String(raw.application_id ?? raw.applicationId ?? "").trim();
    if (!applicationId) return null;
    const name =
        (typeof raw.student_name === "string" && raw.student_name.trim()) ||
        (typeof raw.studentName === "string" && raw.studentName.trim()) ||
        "—";
    const email =
        (typeof raw.student_email === "string" && raw.student_email.trim()) ||
        (typeof raw.studentEmail === "string" && raw.studentEmail.trim()) ||
        "";
    const reportStatusRaw =
        (typeof raw.report_status === "string" && raw.report_status.trim()) ||
        (typeof raw.reportStatus === "string" && raw.reportStatus.trim()) ||
        "incomplete";
    return {
        applicationId,
        studentName: name,
        studentEmail: email,
        reportStatusRaw,
        reportStatusLabel: humanizeIncompleteApplicantStatus(reportStatusRaw),
    };
}

function incompleteApplicantMatchesFilter(row: IncompleteReportApplicantRow, filter: IncompleteApplicantStatusFilter): boolean {
    if (filter === "all") return true;
    const key = normalizeReportStatusKey(row.reportStatusRaw);
    if (filter === "not_started") return key === "not_started";
    if (filter === "draft_or_progress") return key !== "not_started";
    return true;
}

function pickString(raw: Record<string, unknown>, keys: string[], fallback = ""): string {
    for (const key of keys) {
        const value = raw[key];
        if (typeof value === "string" && value.trim()) return value.trim();
        if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
    return fallback;
}

function pickBoolean(raw: Record<string, unknown>, keys: string[], fallback = false): boolean {
    for (const key of keys) {
        const value = raw[key];
        if (typeof value === "boolean") return value;
        if (typeof value === "number") return value > 0;
        if (typeof value === "string") {
            const s = value.trim().toLowerCase();
            if (["true", "1", "yes", "available", "completed"].includes(s)) return true;
            if (["false", "0", "no", "unavailable"].includes(s)) return false;
        }
    }
    return fallback;
}

function pickLooseString(raw: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
        const value = raw[key];
        if (value === null || value === undefined) continue;
        if (typeof value === "string") return value.trim();
        if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
    return "";
}

function normalizeApplicationsByInternalStatus(summaryRaw: Record<string, unknown>): {
    counts: Record<string, number>;
    pipelineTotalNonWithdrawnFromApi: number | null;
} {
    const keys = [
        "pending_faculty",
        "pending_partner",
        "pending_admin",
        "approved",
        "faculty_rejected",
        "partner_rejected",
        "admin_rejected",
    ] as const;

    const counts = {
        pending_faculty: 0,
        pending_partner: 0,
        pending_admin: 0,
        approved: 0,
        faculty_rejected: 0,
        partner_rejected: 0,
        admin_rejected: 0,
    } satisfies Record<(typeof keys)[number], number>;

    const block =
        (summaryRaw.applications_by_internal_status as unknown) ??
        (summaryRaw.applicationsByInternalStatus as unknown);

    if (block && typeof block === "object" && !Array.isArray(block)) {
        for (const k of keys) {
            const n = Number((block as Record<string, unknown>)[k]);
            counts[k] = Number.isFinite(n) ? n : 0;
        }
    }

    const totalRaw =
        summaryRaw.applications_pipeline_total_non_withdrawn ?? summaryRaw.applicationsPipelineTotalNonWithdrawn;
    const totalParsed = Number(totalRaw);
    return {
        counts,
        pipelineTotalNonWithdrawnFromApi: Number.isFinite(totalParsed) ? totalParsed : null,
    };
}

function extractOpportunityPipelineSummary(summaryRaw: Record<string, unknown>): OpportunityPipelineSummary | null {
    const oRaw = summaryRaw.opportunity ?? summaryRaw.opportunitySnapshot;
    if (!oRaw || typeof oRaw !== "object" || Array.isArray(oRaw)) return null;
    const o = oRaw as Record<string, unknown>;

    const statusPick =
        typeof o.status === "string" && o.status.trim()
            ? o.status.trim()
            : typeof (o.workflowStage ?? o.workflow_stage) === "string" &&
                String(o.workflowStage ?? o.workflow_stage).trim()
              ? String(o.workflowStage ?? o.workflow_stage).trim()
              : null;

    return {
        title: typeof o.title === "string" && o.title.trim() ? o.title.trim() : null,
        status: statusPick,
        adminApproved: typeof o.admin_approved === "boolean" ? o.admin_approved : Boolean(o.adminApproved),
        facultyVerificationStatus: pickLooseString(o, ["faculty_verification_status", "facultyVerificationStatus"]),
        facultyVerified: typeof o.faculty_verified === "boolean" ? o.faculty_verified : Boolean(o.facultyVerified),
        executionVerificationStatus: pickLooseString(o, [
            "execution_verification_status",
            "executionVerificationStatus",
        ]),
        executionVerified:
            typeof o.execution_verified === "boolean" ? o.execution_verified : Boolean(o.executionVerified),
        awaitingPartnerOrFaculty: pickLooseString(o, [
            "awaiting_partner_or_faculty",
            "awaitingPartnerOrFaculty",
        ]),
    };
}

/** Two-step browser confirm so a single mis-click cannot delete a whole team/member seat. */
function confirmDangerSequence(messages: readonly string[]): boolean {
    for (const msg of messages) {
        if (!globalThis.window.confirm(msg)) return false;
    }
    return true;
}

function mapTeamMember(raw: Record<string, unknown>): TeamMemberRow | null {
    const id = pickString(raw, ["id", "member_id", "memberId", "student_id", "studentId", "application_id", "applicationId"]);
    if (!id) return null;
    let supportsAdminPatch: boolean;
    if (typeof raw.supports_admin_patch === "boolean") {
        supportsAdminPatch = raw.supports_admin_patch;
    } else if (typeof raw.supportsAdminPatch === "boolean") {
        supportsAdminPatch = raw.supportsAdminPatch;
    } else {
        supportsAdminPatch = true;
    }
    return {
        id,
        name: pickString(raw, ["name", "student_name", "studentName", "full_name", "fullName"], "—"),
        email: pickString(raw, ["email", "student_email", "studentEmail"], ""),
        role: pickString(raw, ["role", "member_role", "memberRole"], "Member"),
        reportStatus: pickString(raw, ["report_status", "reportStatus", "status"], "not_started").replace(/_/g, " "),
        reportAvailable: pickBoolean(raw, ["report_available", "reportAvailable", "is_report_available", "isReportAvailable"]),
        supportsAdminPatch,
        phoneNumber: pickLooseString(raw, ["phone_number", "phoneNumber", "mobile", "phone"]),
        cnicDisplay: pickLooseString(raw, ["cnic_display", "cnicDisplay", "cnic"]),
        universityId: pickLooseString(raw, ["university_id", "universityId"]),
        universityName: pickLooseString(raw, ["university_name", "universityName"]),
        academicProgram: pickLooseString(raw, ["academic_program", "academicProgram", "major"]),
        department: pickLooseString(raw, ["department"]),
        yearOfStudy: pickLooseString(raw, ["year_of_study", "yearOfStudy"]),
        academicIntegrationType: pickLooseString(raw, ["academic_integration_type", "academicIntegrationType"]),
        studentUserId: pickLooseString(raw, ["student_user_id", "studentUserId", "student_id", "studentId"]),
        duplicateSeatCount: Math.max(
            0,
            Number(raw.duplicate_seat_count ?? raw.duplicateSeatCount) || 0,
        ) || undefined,
        studentIdMislinked:
            raw.student_id_mislinked === true || raw.studentIdMislinked === true,
    };
}

function extractTeamRows(body: unknown): TeamOverviewRow[] {
    const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    const listCandidate = payload ? payload.data ?? payload.teams ?? payload.items ?? payload.rows : body;
    const list = Array.isArray(listCandidate) ? listCandidate : [];
    return list
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const raw = item as Record<string, unknown>;
            const id = pickString(raw, ["id", "team_id", "teamId", "application_id", "applicationId"]);
            if (!id) return null;
            const participationMode = normalizeParticipationMode(raw);
            const membersCandidate = raw.members ?? raw.team_members ?? raw.teamMembers ?? raw.students;
            const members = Array.isArray(membersCandidate)
                ? membersCandidate.map((m) => (m && typeof m === "object" ? mapTeamMember(m as Record<string, unknown>) : null)).filter(Boolean) as TeamMemberRow[]
                : [];
            return {
                id,
                teamName: pickString(raw, ["team_name", "teamName", "name"], "Untitled team"),
                leadName: pickString(raw, ["lead_name", "leadName", "student_name", "studentName"], members[0]?.name || "—"),
                reportStatus: pickString(raw, ["report_status", "reportStatus", "status"], "not_started").replace(/_/g, " "),
                reportAvailable: pickBoolean(raw, ["report_available", "reportAvailable", "is_report_available", "isReportAvailable"]),
                members,
                participationMode,
            };
        })
        .filter(Boolean) as TeamOverviewRow[];
}

function extractTeamSummary(body: unknown, rows: TeamOverviewRow[]): TeamOverviewSummary {
    const baseApps: Record<string, number> = {
        pending_faculty: 0,
        pending_partner: 0,
        pending_admin: 0,
        approved: 0,
        faculty_rejected: 0,
        partner_rejected: 0,
        admin_rejected: 0,
    };

    const deriveFromRows = () => ({
        registeredTeams: rows.length,
        completedReports: rows.filter((team) => lower(team.reportStatus) === "completed").length,
        reportsAvailable: rows.filter((team) => team.reportAvailable).length,
    });

    const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    const summaryRaw = payload && typeof payload.summary === "object" ? (payload.summary as Record<string, unknown>) : null;

    if (!summaryRaw) {
        const derived = deriveFromRows();
        return {
            ...derived,
            pipeline: null,
            applicationsByInternalStatus: baseApps,
            applicationsPipelineTotalNonWithdrawn: 0,
        };
    }

    const { counts, pipelineTotalNonWithdrawnFromApi } = normalizeApplicationsByInternalStatus(summaryRaw);

    const reg = Number(summaryRaw.registered_teams ?? summaryRaw.registeredTeams);
    const cmp = Number(summaryRaw.completed_reports ?? summaryRaw.completedReports);
    const rpt = Number(summaryRaw.reports_available ?? summaryRaw.reportsAvailable);
    const rowDerived = deriveFromRows();

    const registeredTeams = Number.isFinite(reg) && reg >= 0 ? reg : rowDerived.registeredTeams;
    const completedReports = Number.isFinite(cmp) && cmp >= 0 ? cmp : rowDerived.completedReports;
    const reportsAvailable = Number.isFinite(rpt) && rpt >= 0 ? rpt : rowDerived.reportsAvailable;

    const summed = Object.values(counts).reduce((a, b) => a + b, 0);

    return {
        registeredTeams,
        completedReports,
        reportsAvailable,
        pipeline: extractOpportunityPipelineSummary(summaryRaw),
        applicationsByInternalStatus: counts,
        applicationsPipelineTotalNonWithdrawn: pipelineTotalNonWithdrawnFromApi ?? summed,
    };
}

const APPLICATION_INTERNAL_STATUS_KEYS = [
    "pending_faculty",
    "pending_partner",
    "pending_admin",
    "approved",
    "faculty_rejected",
    "partner_rejected",
    "admin_rejected",
] as const;

function applicationInternalStatusLabel(key: string): string {
    const map: Record<string, string> = {
        pending_faculty: "Pending faculty",
        pending_partner: "Pending partner",
        pending_admin: "Pending admin",
        approved: "Approved",
        faculty_rejected: "Faculty rejected",
        partner_rejected: "Partner rejected",
        admin_rejected: "Admin rejected",
    };
    return map[key] ?? key.replace(/_/g, " ");
}

/** Backend coarse hint for listing (see `/teams` summary `awaiting_partner_or_faculty`). */
function humanizeApprovalLane(code: string | null | undefined): string | null {
    if (!code?.trim()) return null;
    const c = code.trim().toLowerCase();
    if (c === "faculty_gate") return "Opportunity awaits faculty verification";
    if (c === "execution_partner_gate") return "Opportunity awaits partner / execution verification";
    return null;
}

function statusBadgeClass(statusKey: string): string {
    const s = statusKey.toLowerCase();
    if (s === "active" || s === "live" || s === "approved") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    if (s === "completed") return "bg-blue-50 text-blue-700 border border-blue-200";
    if (s === "rejected") return "bg-rose-50 text-rose-700 border border-rose-200";
    if (s.includes("pending_faculty") || s === "pending_faculty" || s.includes("faculty"))
        return "bg-slate-100 text-slate-700 border border-slate-200";
    if (s.includes("pending_partner") || s.includes("partner")) return "bg-violet-50 text-violet-800 border border-violet-200";
    if (s.includes("pending_admin") || s.includes("pending_approval") || s.includes("admin"))
        return "bg-amber-50 text-amber-800 border border-amber-200";
    return "bg-slate-50 text-slate-600 border border-slate-200";
}

export default function AdminProjectsPage() {
    const [rows, setRows] = useState<AdminProjectRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [studentEmailInput, setStudentEmailInput] = useState("");
    const [studentEmailApplied, setStudentEmailApplied] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [locationFilter, setLocationFilter] = useState("all");
    const [degreeFilter, setDegreeFilter] = useState("all");
    const [facultyEmailFilter, setFacultyEmailFilter] = useState("all");
    const [activeMenu, setActiveMenu] = useState<{ id: string; top: number; right: number } | null>(null);
    const [applicantsModal, setApplicantsModal] = useState<{ opportunityId: string; title: string } | null>(null);
    const [incompleteApplicants, setIncompleteApplicants] = useState<IncompleteReportApplicantRow[]>([]);
    const [applicantsLoading, setApplicantsLoading] = useState(false);
    const [deletingApplicationId, setDeletingApplicationId] = useState<string | null>(null);
    const [trackerModalRow, setTrackerModalRow] = useState<AdminProjectRow | null>(null);
    const [teamOverviewModal, setTeamOverviewModal] = useState<{ opportunityId: string; title: string } | null>(null);
    const [teamOverviewRows, setTeamOverviewRows] = useState<TeamOverviewRow[]>([]);
    const [teamOverviewSummary, setTeamOverviewSummary] = useState<TeamOverviewSummary>(() => ({ ...EMPTY_TEAM_OVERVIEW_SUMMARY }));
    const [teamOverviewLoading, setTeamOverviewLoading] = useState(false);
    const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);
    const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
    const [teamMemberEditor, setTeamMemberEditor] = useState<TeamMemberEditorState | null>(null);
    const [memberSaveLoading, setMemberSaveLoading] = useState(false);
    const [teamOverviewParticipationFilter, setTeamOverviewParticipationFilter] = useState<"all" | "team" | "individual">("all");
    const [teamMergePanelOpen, setTeamMergePanelOpen] = useState(false);
    const [teamMergeSelectedIds, setTeamMergeSelectedIds] = useState<string[]>([]);
    const [teamMergeLeadId, setTeamMergeLeadId] = useState("");
    const [teamMergeTargetTeamId, setTeamMergeTargetTeamId] = useState("");
    const [teamMergeSubmitting, setTeamMergeSubmitting] = useState(false);
    const [attendanceToggleParticipationId, setAttendanceToggleParticipationId] = useState<string | null>(null);
    const [dedupeSeatsStudentUserId, setDedupeSeatsStudentUserId] = useState<string | null>(null);
    const [reconcileEnrollmentsLoading, setReconcileEnrollmentsLoading] = useState(false);
    const [healEnrollmentsLoading, setHealEnrollmentsLoading] = useState(false);
    const [incompleteApplicantStatusFilter, setIncompleteApplicantStatusFilter] = useState<IncompleteApplicantStatusFilter>("all");
    /** Bumps when the modal closes or reopens so in-flight fetches cannot apply stale rows. */
    const incompleteApplicantsLoadSeq = useRef(0);

    useEffect(() => {
        const id = setTimeout(() => {
            setStudentEmailApplied(studentEmailInput.trim().toLowerCase());
        }, 450);
        return () => clearTimeout(id);
    }, [studentEmailInput]);

    const loadProjects = useCallback(async () => {
        setIsLoading(true);
        try {
            const qp = studentEmailApplied.trim();
            const path =
                qp.length > 0
                    ? `/api/v1/admin/projects?student_email=${encodeURIComponent(qp)}`
                    : `/api/v1/admin/projects`;
            const res = await authenticatedFetch(path);
            if (!res || !res.ok) {
                const err = res ? await res.json().catch(() => ({})) : {};
                toast.error(typeof (err as { error?: string }).error === "string" ? (err as { error: string }).error : "Could not load projects");
                setRows([]);
                return;
            }
            const data = await res.json();
            const list = extractAdminProjectsList(data);
            const mapped = list.map(normalizeAdminProjectRow).filter(Boolean) as AdminProjectRow[];
            setRows(mapped);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load projects");
            setRows([]);
        } finally {
            setIsLoading(false);
        }
    }, [studentEmailApplied]);

    useEffect(() => {
        void loadProjects();
    }, [loadProjects]);

    const loadIncompleteApplicants = useCallback(async (opportunityId: string, seq: number) => {
        setApplicantsLoading(true);
        setIncompleteApplicants([]);
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/opportunities/${encodeURIComponent(opportunityId)}/incomplete-report-applicants`,
            );
            if (seq !== incompleteApplicantsLoadSeq.current) return;
            if (!res) {
                toast.error("Could not load applicant list");
                setIncompleteApplicants([]);
                return;
            }
            const data = await res.json().catch(() => ({}));
            if (seq !== incompleteApplicantsLoadSeq.current) return;
            if (!res.ok) {
                const msg =
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : "Could not load applicant list";
                toast.error(msg);
                setIncompleteApplicants([]);
                return;
            }
            const list = extractIncompleteApplicantsList(data)
                .map(mapIncompleteApplicant)
                .filter(Boolean) as IncompleteReportApplicantRow[];
            if (seq !== incompleteApplicantsLoadSeq.current) return;
            setIncompleteApplicants(list);
        } catch {
            if (seq !== incompleteApplicantsLoadSeq.current) return;
            toast.error("Could not load applicant list");
            setIncompleteApplicants([]);
        } finally {
            if (seq === incompleteApplicantsLoadSeq.current) {
                setApplicantsLoading(false);
            }
        }
    }, []);

    const closeApplicantsModal = useCallback(() => {
        incompleteApplicantsLoadSeq.current += 1;
        setApplicantsModal(null);
        setIncompleteApplicants([]);
        setApplicantsLoading(false);
        setDeletingApplicationId(null);
        setIncompleteApplicantStatusFilter("all");
    }, []);

    const openApplicantsModal = (row: AdminProjectRow) => {
        setActiveMenu(null);
        incompleteApplicantsLoadSeq.current += 1;
        const seq = incompleteApplicantsLoadSeq.current;
        setApplicantsModal({ opportunityId: row.id, title: row.title });
        void loadIncompleteApplicants(row.id, seq);
    };

    const closeTeamOverviewModal = useCallback(() => {
        setTeamOverviewModal(null);
        setTeamOverviewRows([]);
        setTeamOverviewSummary({ ...EMPTY_TEAM_OVERVIEW_SUMMARY });
        setTeamOverviewLoading(false);
        setDeletingTeamId(null);
        setDeletingMemberId(null);
        setTeamMemberEditor(null);
        setMemberSaveLoading(false);
        setTeamOverviewParticipationFilter("all");
        setTeamMergePanelOpen(false);
        setTeamMergeSelectedIds([]);
        setTeamMergeLeadId("");
        setTeamMergeTargetTeamId("");
        setTeamMergeSubmitting(false);
        setAttendanceToggleParticipationId(null);
    }, []);

    const loadTeamOverview = useCallback(async (opportunityId: string) => {
        setTeamOverviewLoading(true);
        setTeamOverviewRows([]);
        setTeamOverviewSummary({ ...EMPTY_TEAM_OVERVIEW_SUMMARY });
        try {
            const [teamsRes, enrollmentsRes] = await Promise.all([
                authenticatedFetch(`/api/v1/admin/opportunities/${encodeURIComponent(opportunityId)}/teams`),
                authenticatedFetch(`/api/v1/admin/projects/${encodeURIComponent(opportunityId)}/enrollments`),
            ]);
            if (!teamsRes) {
                toast.error("Could not load team overview");
                return;
            }
            const data = await teamsRes.json().catch(() => ({}));
            if (!teamsRes.ok) {
                toast.error(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : "Could not load team overview",
                );
                return;
            }

            let attendanceByParticipation = new Map<string, AdminEnrollmentAttendanceMeta>();
            let enrollmentStudentIdsByParticipation = new Map<string, string>();
            let enrollmentEmailsByParticipation = new Map<string, string>();
            if (enrollmentsRes?.ok) {
                const enrollmentBody = await enrollmentsRes.json().catch(() => ({}));
                const enrollmentIndex = parseAdminEnrollmentAttendanceRows(enrollmentBody);
                attendanceByParticipation = enrollmentIndex.byParticipationId;
                enrollmentStudentIdsByParticipation = enrollmentIndex.studentIdsByParticipation;
                enrollmentEmailsByParticipation = enrollmentIndex.emailsByParticipation;
            }

            const mappedRows = mergeTeamRowsWithEnrollmentAttendance(
                extractTeamRows(data),
                attendanceByParticipation,
                enrollmentStudentIdsByParticipation,
                enrollmentEmailsByParticipation,
            );
            setTeamOverviewRows(mappedRows);
            setTeamOverviewSummary(extractTeamSummary(data, mappedRows));
        } catch {
            toast.error("Could not load team overview");
        } finally {
            setTeamOverviewLoading(false);
        }
    }, []);

    const openProjectTrackerModal = (row: AdminProjectRow) => {
        setActiveMenu(null);
        setTrackerModalRow(row);
    };

    const openTeamOverviewModal = (row: AdminProjectRow) => {
        setActiveMenu(null);
        setTeamOverviewModal({ opportunityId: row.id, title: row.title });
        void loadTeamOverview(row.id);
    };

    const openTeamOverviewFromTracker = () => {
        if (!trackerModalRow) return;
        openTeamOverviewModal(trackerModalRow);
        setTrackerModalRow(null);
    };

    const handleRemoveTeam = async (teamId: string) => {
        if (!teamOverviewModal) return;
        if (
            !confirmDangerSequence([
                "Remove this full team?\n\nAll team members will be removed from this project and seats will be released.\n\nThis cannot be undone.",
                "Second confirmation: delete the ENTIRE team and free all seats?\n\nType confirms with OK — Cancel stops.",
            ])
        ) {
            return;
        }
        setDeletingTeamId(teamId);
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/opportunities/${encodeURIComponent(teamOverviewModal.opportunityId)}/teams/${encodeURIComponent(teamId)}`,
                { method: "DELETE" },
            );
            if (res && (res.ok || res.status === 204)) {
                toast.success("Team removed successfully");
                await loadTeamOverview(teamOverviewModal.opportunityId);
                await loadProjects();
            } else {
                const data = res ? await res.json().catch(() => ({})) : {};
                toast.error(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : "Could not remove team",
                );
            }
        } catch {
            toast.error("Could not remove team");
        } finally {
            setDeletingTeamId(null);
        }
    };

    const handleRemoveTeamMember = async (teamId: string, memberId: string) => {
        if (!teamOverviewModal) return;
        if (
            !confirmDangerSequence([
                "Remove this member from the team?\n\nSeat and linked report/payment stubs for this person on this project will be cleared.\n\nThis cannot be undone.",
                "Second confirmation: permanently remove ONLY this member from this team?",
            ])
        ) {
            return;
        }
        setDeletingMemberId(memberId);
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/opportunities/${encodeURIComponent(teamOverviewModal.opportunityId)}/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(memberId)}`,
                { method: "DELETE" },
            );
            if (res && (res.ok || res.status === 204)) {
                toast.success("Member removed successfully");
                setTeamMemberEditor((cur) => (cur?.memberId === memberId ? null : cur));
                await loadTeamOverview(teamOverviewModal.opportunityId);
                await loadProjects();
            } else {
                const data = res ? await res.json().catch(() => ({})) : {};
                toast.error(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : "Could not remove member",
                );
            }
        } catch {
            toast.error("Could not remove member");
        } finally {
            setDeletingMemberId(null);
        }
    };

    const handleToggleMemberAttendance = async (member: TeamMemberRow, enable: boolean) => {
        if (!teamOverviewModal) return;
        if (!isMergeableTeamMember(member)) {
            toast.error("Attendance override applies only to enrolled participation seats.");
            return;
        }

        const participationId = member.id.trim();
        setAttendanceToggleParticipationId(participationId);
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/participations/${encodeURIComponent(participationId)}/attendance-editable`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ editable: enable }),
                },
            );
            const data = res ? await res.json().catch(() => ({})) : {};
            if (res?.ok) {
                toast.success(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : enable
                          ? "Attendance editing enabled for this member"
                          : "Admin attendance override removed",
                );
                await loadTeamOverview(teamOverviewModal.opportunityId);
            } else {
                toast.error(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : "Could not update attendance access",
                );
            }
        } catch {
            toast.error("Could not update attendance access");
        } finally {
            setAttendanceToggleParticipationId(null);
        }
    };

    const handleDedupeStudentSeats = async (member: TeamMemberRow) => {
        if (!teamOverviewModal) return;
        const studentUserId = member.studentUserId?.trim();
        const duplicateCount = member.duplicateSeatCount ?? 0;
        if (!studentUserId || duplicateCount < 2) return;
        if (
            !confirmDangerSequence([
                `Remove ${duplicateCount - 1} duplicate ghost seat(s) for ${member.name || "this student"}?\n\nThis ONLY removes extra rows for the SAME account.\n\nOther team members are NOT affected.\n\nTeammate emails on those rows should already be restored via Auto-fix (safe) first.`,
                "Final confirmation: delete ONLY duplicate ghost seats for this one account?",
            ])
        ) {
            return;
        }

        setDedupeSeatsStudentUserId(studentUserId);
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/projects/${encodeURIComponent(teamOverviewModal.opportunityId)}/dedupe-student-seats`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ student_user_id: studentUserId }),
                },
            );
            const data = res ? await res.json().catch(() => ({})) : {};
            if (res?.ok) {
                const removed = Number((data as { data?: { removed_count?: number } }).data?.removed_count) || 0;
                toast.success(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : removed > 0
                          ? `Removed ${removed} duplicate seat(s)`
                          : "No duplicate seats found",
                );
                await loadTeamOverview(teamOverviewModal.opportunityId);
                await loadProjects();
            } else {
                toast.error(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : "Could not remove duplicate seats",
                );
            }
        } catch {
            toast.error("Could not remove duplicate seats");
        } finally {
            setDedupeSeatsStudentUserId(null);
        }
    };

    const handleReconcileEnrollments = async () => {
        if (!teamOverviewModal) return;
        if (
            !confirm(
                "Restore missing team seats from approved applications?\n\n• Safe: does NOT delete any enrollments\n• Use Clean dupes (N) on a specific row only when that account has duplicate seats\n\nStudents do not need to re-add team members.",
            )
        ) {
            return;
        }

        setReconcileEnrollmentsLoading(true);
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/projects/${encodeURIComponent(teamOverviewModal.opportunityId)}/reconcile-enrollments`,
                { method: "POST" },
            );
            const data = res ? await res.json().catch(() => ({})) : {};
            if (res?.ok) {
                const removed = Number((data as { data?: { seats_removed?: number } }).data?.seats_removed) || 0;
                toast.success(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : removed > 0
                          ? `Fixed enrollments (removed ${removed} duplicate seat(s))`
                          : "Enrollments reconciled",
                );
                await loadTeamOverview(teamOverviewModal.opportunityId);
                await loadProjects();
            } else {
                toast.error(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : "Could not auto-fix enrollments",
                );
            }
        } catch {
            toast.error("Could not auto-fix enrollments");
        } finally {
            setReconcileEnrollmentsLoading(false);
        }
    };

    const handleHealTeamEnrollments = async () => {
        if (!teamOverviewModal) return;
        if (
            !confirm(
                "Repair enrollments on this project?\n\nThis will automatically:\n• Restore missing teammates (applications + reports)\n• Remove duplicate ghost seats\n• Fix wrong account links (e.g. teammate showing under another student's account)\n• Normalize team lead flags\n\nIt does NOT delete whole teams. Safe to run after duplicate-seat issues.",
            )
        ) {
            return;
        }

        setHealEnrollmentsLoading(true);
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/projects/${encodeURIComponent(teamOverviewModal.opportunityId)}/heal-team-enrollments`,
                { method: "POST" },
            );
            const data = res ? await res.json().catch(() => ({})) : {};
            if (res?.ok) {
                const summary = (data as { data?: Record<string, unknown> }).data;
                const parts: string[] = [];
                const n = (k: string) => Number(summary?.[k]) || 0;
                if (n("report_members_restored") > 0) parts.push(`${n("report_members_restored")} restored from reports`);
                if (n("duplicate_student_seats_removed") + n("duplicate_email_rows_removed") > 0) {
                    parts.push(`${n("duplicate_student_seats_removed") + n("duplicate_email_rows_removed")} duplicate row(s) removed`);
                }
                if (n("student_id_links_repaired") > 0) parts.push(`${n("student_id_links_repaired")} account link(s) fixed`);
                if (n("teammates_salvaged") > 0) parts.push(`${n("teammates_salvaged")} teammate(s) salvaged`);
                toast.success(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : parts.length
                          ? `Repaired: ${parts.join(", ")}`
                          : "Roster checked — no repairs needed",
                );
                await loadTeamOverview(teamOverviewModal.opportunityId);
                await loadProjects();
            } else {
                toast.error(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : "Could not repair enrollments",
                );
            }
        } catch {
            toast.error("Could not repair enrollments");
        } finally {
            setHealEnrollmentsLoading(false);
        }
    };

    const handleMergeTeamMembers = async () => {
        if (!teamOverviewModal) return;
        if (teamMergeSelectedIds.length < 2) {
            toast.error("Select at least two enrolled members to merge.");
            return;
        }
        if (!teamMergeLeadId || !teamMergeSelectedIds.includes(teamMergeLeadId)) {
            toast.error("Choose which selected member should be the team lead.");
            return;
        }
        const leadLabel =
            mergeableEnrollments.find((m) => m.participationId === teamMergeLeadId)?.name ?? "selected lead";
        if (
            !confirmDangerSequence([
                `Merge ${teamMergeSelectedIds.length} enrollments into one team?\n\nTeam lead: ${leadLabel}.\n\nDraft reports on other members may be removed or moved to the lead.`,
                "Second confirmation: apply team merge on this project?",
            ])
        ) {
            return;
        }
        setTeamMergeSubmitting(true);
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/opportunities/${encodeURIComponent(teamOverviewModal.opportunityId)}/teams/merge`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        member_participation_ids: teamMergeSelectedIds,
                        lead_participation_id: teamMergeLeadId,
                        ...(teamMergeTargetTeamId.trim()
                            ? { target_team_id: teamMergeTargetTeamId.trim() }
                            : {}),
                    }),
                },
            );
            const data = res ? await res.json().catch(() => ({})) : {};
            if (res && res.ok) {
                const msg =
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : "Team merged successfully";
                toast.success(msg);
                const mappedRows = extractTeamRows(data);
                if (mappedRows.length > 0) {
                    setTeamOverviewRows(mappedRows);
                    setTeamOverviewSummary(extractTeamSummary(data, mappedRows));
                } else {
                    await loadTeamOverview(teamOverviewModal.opportunityId);
                }
                setTeamMergeSelectedIds([]);
                setTeamMergeLeadId("");
                setTeamMergeTargetTeamId("");
                setTeamMergePanelOpen(false);
                await loadProjects();
            } else {
                toast.error(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : "Could not merge team members",
                );
            }
        } catch {
            toast.error("Could not merge team members");
        } finally {
            setTeamMergeSubmitting(false);
        }
    };

    const toggleTeamMergeMember = (participationId: string, checked: boolean) => {
        setTeamMergeSelectedIds((prev) => {
            const next = checked
                ? [...new Set([...prev, participationId])]
                : prev.filter((id) => id !== participationId);
            setTeamMergeLeadId((lead) => (lead && next.includes(lead) ? lead : ""));
            return next;
        });
    };

    const openTeamMemberEditor = (teamId: string, member: TeamMemberRow) => {
        if (!member.supportsAdminPatch) return;
        const draft: TeamMemberEditorDraft = {
            full_name: member.name.trim() === "—" ? "" : member.name.trim(),
            mobile: member.phoneNumber.trim(),
            cnic: member.cnicDisplay.trim(),
            university_id: member.universityId.trim(),
            university_name: member.universityName.trim(),
            academic_program: member.academicProgram.trim(),
            department: member.department.trim(),
            year_of_study: member.yearOfStudy.trim(),
            academic_integration_type: member.academicIntegrationType.trim(),
            sync_linked_user_profile: true,
        };
        const headline =
            [member.name.trim() !== "—" ? member.name : "", member.email.trim()].filter(Boolean).join(" · ") || member.id;
        setTeamMemberEditor({ teamId, memberId: member.id, headline, draft });
    };

    const submitTeamMemberEdit = async () => {
        if (!teamOverviewModal || !teamMemberEditor) return;
        const { draft, teamId, memberId } = teamMemberEditor;
        const body: Record<string, unknown> = {
            sync_linked_user_profile: draft.sync_linked_user_profile,
        };
        if (draft.full_name.trim()) body.full_name = draft.full_name.trim();
        if (draft.mobile.trim().length >= 6) body.mobile = draft.mobile.trim();
        if (draft.cnic.trim()) body.cnic = draft.cnic.trim();
        if (draft.university_id.trim()) body.university_id = draft.university_id.trim();
        if (draft.university_name.trim()) body.university_name = draft.university_name.trim();
        if (draft.academic_program.trim()) body.academic_program = draft.academic_program.trim();
        if (draft.department.trim()) body.department = draft.department.trim();
        if (draft.year_of_study && (YEAR_OF_STUDY_OPTIONS as readonly string[]).includes(draft.year_of_study)) {
            body.year_of_study = draft.year_of_study;
        }
        if (
            draft.academic_integration_type &&
            (ACADEMIC_INTEGRATION_OPTIONS as readonly string[]).includes(draft.academic_integration_type)
        ) {
            body.academic_integration_type = draft.academic_integration_type;
        }

        setMemberSaveLoading(true);
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/opportunities/${encodeURIComponent(teamOverviewModal.opportunityId)}/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(memberId)}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                },
            );
            const data = res ? await res.json().catch(() => ({})) : {};
            if (res?.ok) {
                toast.success("Member details updated");
                setTeamMemberEditor(null);
                await loadTeamOverview(teamOverviewModal.opportunityId);
                await loadProjects();
            } else {
                toast.error(
                    typeof (data as { message?: string }).message === "string"
                        ? (data as { message: string }).message
                        : "Could not update member",
                );
            }
        } catch {
            toast.error("Could not update member");
        } finally {
            setMemberSaveLoading(false);
        }
    };

    const handleRemoveIncompleteApplicant = async (applicationId: string) => {
        if (!applicantsModal) return;
        if (
            !confirmDangerSequence([
                "Withdraw this applicant from the project (admin)?\n\nParticipation and in-progress report data for this opportunity will be cleared, and the seat will show as available again — same occupancy rules as the rest of the app.\n\nThis cannot be undone.",
                "Second confirmation: withdraw this applicant and free their seat?",
            ])
        ) {
            return;
        }
        setDeletingApplicationId(applicationId);
        try {
            const res = await authenticatedFetch(
                `/api/v1/admin/opportunities/${encodeURIComponent(applicantsModal.opportunityId)}/applications/${encodeURIComponent(applicationId)}`,
                { method: "DELETE" },
            );
            if (res && (res.ok || res.status === 204)) {
                toast.success("Applicant withdrawn; seat freed");
                setIncompleteApplicants((prev) => prev.filter((r) => r.applicationId !== applicationId));
                await loadProjects();
            } else {
                const body = res ? await res.json().catch(() => ({})) : {};
                toast.error(
                    typeof (body as { message?: string }).message === "string"
                        ? (body as { message: string }).message
                        : "Could not remove applicant",
                );
            }
        } catch {
            toast.error("Could not remove applicant");
        } finally {
            setDeletingApplicationId(null);
        }
    };

    useEffect(() => {
        if (!activeMenu) return;
        if (!rows.some((r) => r.id === activeMenu.id)) {
            setActiveMenu(null);
            return;
        }
        const close = () => setActiveMenu(null);
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
        return () => {
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
        };
    }, [activeMenu, rows]);

    const statusOptions = useMemo(() => {
        const set = new Set<string>();
        rows.forEach((r) => set.add(r.statusKey));
        return ["all", ...Array.from(set).sort()];
    }, [rows]);

    const locationOptions = useMemo(() => {
        const set = new Set<string>();
        rows.forEach((r) => {
            if (r.locationLabel && r.locationLabel !== "Unknown") set.add(r.locationLabel);
        });
        return ["all", ...Array.from(set).sort()];
    }, [rows]);

    const degreeOptions = useMemo(() => {
        const set = new Set<string>();
        rows.forEach((r) => {
            const raw = r.raw;
            const scope = raw.participation_scope && typeof raw.participation_scope === "object"
                ? (raw.participation_scope as Record<string, unknown>)
                : null;
            const depts = Array.isArray(scope?.departments) ? (scope!.departments as unknown[]) : [];
            depts.forEach((d) => {
                const v = String(d ?? "").trim();
                if (v) set.add(v);
            });
        });
        return ["all", ...Array.from(set).sort()];
    }, [rows]);

    const facultyEmailOptions = useMemo(() => {
        const set = new Set<string>();
        rows.forEach((r) => {
            const email = pickFacultySupervisorEmail(r.raw);
            if (email) set.add(email);
        });
        return ["all", ...Array.from(set).sort()];
    }, [rows]);

    const filteredRows = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return rows.filter((r) => {
            if (statusFilter !== "all" && r.statusKey !== statusFilter) return false;
            if (locationFilter !== "all" && r.locationLabel !== locationFilter) return false;
            if (degreeFilter !== "all") {
                const raw = r.raw;
                const scope = raw.participation_scope && typeof raw.participation_scope === "object"
                    ? (raw.participation_scope as Record<string, unknown>)
                    : null;
                const depts = Array.isArray(scope?.departments) ? (scope!.departments as unknown[]) : [];
                const match = depts.some((d) => String(d ?? "").trim() === degreeFilter);
                if (!match) return false;
            }
            if (facultyEmailFilter !== "all") {
                const email = pickFacultySupervisorEmail(r.raw);
                if (email !== facultyEmailFilter) return false;
            }
            if (!q) return true;
            return (
                r.title.toLowerCase().includes(q) ||
                r.subtitle.toLowerCase().includes(q) ||
                r.locationLabel.toLowerCase().includes(q) ||
                r.displayStatus.toLowerCase().includes(q)
            );
        });
    }, [rows, searchQuery, statusFilter, locationFilter, degreeFilter, facultyEmailFilter]);

    const filteredTeamOverviewRows = useMemo(() => {
        if (teamOverviewParticipationFilter === "all") return teamOverviewRows;
        return teamOverviewRows.filter((t) =>
            teamOverviewParticipationFilter === "individual" ? t.participationMode === "individual" : t.participationMode === "team",
        );
    }, [teamOverviewRows, teamOverviewParticipationFilter]);

    const mergeableEnrollments = useMemo(
        () => flattenMergeableEnrollments(teamOverviewRows),
        [teamOverviewRows],
    );

    const persistedTeamIdOptions = useMemo(
        () =>
            teamOverviewRows
                .filter((t) => t.participationMode === "team" && !isSyntheticIndividualGroupId(t.id))
                .map((t) => ({ id: t.id, label: t.teamName })),
        [teamOverviewRows],
    );

    const incompleteApplicantsFiltered = useMemo(
        () => incompleteApplicants.filter((r) => incompleteApplicantMatchesFilter(r, incompleteApplicantStatusFilter)),
        [incompleteApplicants, incompleteApplicantStatusFilter],
    );

    const incompleteApplicantStatusCounts = useMemo(() => {
        let notStarted = 0;
        let other = 0;
        for (const r of incompleteApplicants) {
            if (normalizeReportStatusKey(r.reportStatusRaw) === "not_started") notStarted += 1;
            else other += 1;
        }
        return { notStarted, other, total: incompleteApplicants.length };
    }, [incompleteApplicants]);

    const teamRegisteredMetricLabel = teamOverviewRows.some((r) => r.participationMode === "individual")
        ? "Enrollments"
        : "Registered teams";

    const duplicateAccountCount = useMemo(() => {
        const seen = new Set<string>();
        let count = 0;
        for (const team of teamOverviewRows) {
            for (const member of team.members) {
                const sid = member.studentUserId?.trim();
                const em = member.email.trim().toLowerCase();
                const key = sid || em;
                if (!key || seen.has(key)) continue;
                const hasDupes = (member.duplicateSeatCount ?? 0) >= 2;
                const mislinked = member.studentIdMislinked === true;
                if (!hasDupes && !mislinked) continue;
                seen.add(key);
                count += 1;
            }
        }
        return count;
    }, [teamOverviewRows]);

    const teamOverviewPipelineRibbon = useMemo(() => {
        if (teamOverviewLoading) return null;
        const p = teamOverviewSummary.pipeline;
        const counts = teamOverviewSummary.applicationsByInternalStatus;
        const awaiting = humanizeApprovalLane(p?.awaitingPartnerOrFaculty ?? null);
        const statusChips = APPLICATION_INTERNAL_STATUS_KEYS.map((k) => ({
            key: k,
            label: applicationInternalStatusLabel(k),
            n: counts[k] ?? 0,
        })).filter((x) => x.n > 0);
        const totalPipeline = teamOverviewSummary.applicationsPipelineTotalNonWithdrawn;

        const showOppStripe = Boolean(p && (awaiting || p.status || p.facultyVerificationStatus || p.executionVerificationStatus));

        if (!showOppStripe && statusChips.length === 0 && totalPipeline <= 0) return null;

        return (
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/80 shrink-0 space-y-2.5">
                {showOppStripe ? (
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Approvals</div>
                        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-800">
                            {awaiting ?
                                <span className={`inline-flex px-2 py-1 rounded-lg border bg-rose-50 text-rose-800 border-rose-100`}>
                                    {awaiting}
                                </span>
                            : null}
                            {p?.status ?
                                <span className={`inline-flex px-2 py-1 rounded-lg border capitalize ${statusBadgeClass(p.status)}`}>
                                    Project: {humanizeIncompleteApplicantStatus(p.status)}
                                </span>
                            : null}
                            <span
                                className={`inline-flex px-2 py-1 rounded-lg border ${
                                    p?.adminApproved
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                                        : "bg-amber-50 text-amber-900 border-amber-100"
                                }`}
                            >
                                Internal admin cleared: {p?.adminApproved ? "yes" : "no"}
                            </span>
                            {p?.facultyVerificationStatus ?
                                <span
                                    className={`inline-flex px-2 py-1 rounded-lg border ${statusBadgeClass(p.facultyVerificationStatus)}`}
                                >
                                    Faculty: {humanizeIncompleteApplicantStatus(p.facultyVerificationStatus)}
                                    {typeof p.facultyVerified === "boolean"
                                        ? p.facultyVerified
                                            ? " · verified"
                                            : " · not verified"
                                        : ""}
                                </span>
                            : null}
                            {p?.executionVerificationStatus ?
                                <span
                                    className={`inline-flex px-2 py-1 rounded-lg border ${statusBadgeClass(p.executionVerificationStatus)}`}
                                >
                                    Partner / exec:{" "}
                                    {humanizeIncompleteApplicantStatus(p.executionVerificationStatus)}
                                    {typeof p.executionVerified === "boolean"
                                        ? p.executionVerified
                                            ? " · verified"
                                            : " · not verified"
                                        : ""}
                                </span>
                            : null}
                        </div>
                    </div>
                ) : null}
                {totalPipeline > 0 || statusChips.length > 0 ?
                    <div>
                        <div className="flex flex-wrap items-baseline gap-2 mb-2">
                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                Pipeline applications / seats
                            </div>
                            <div className="text-[11px] font-semibold text-slate-700">
                                {totalPipeline}{" "}
                                <span className="text-slate-500 font-medium">total non-withdrawn</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {statusChips.map((c) => (
                                <span
                                    key={c.key}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold capitalize ${statusBadgeClass(c.key)}`}
                                >
                                    {c.label}: {c.n}
                                </span>
                            ))}
                            {totalPipeline > 0 && !statusChips.length ?
                                <span className="inline-flex px-2 py-1 rounded-lg border text-[11px] font-semibold text-slate-600 bg-white border-slate-200">
                                    Detailed status breakdown unavailable
                                </span>
                            : null}
                        </div>
                    </div>
                : null}
            </div>
        );
    }, [teamOverviewLoading, teamOverviewSummary]);

    const handleExport = () => {
        if (!filteredRows.length) {
            toast.message("No rows to export");
            return;
        }
        const headers = [
            "ID",
            "Title",
            "Organization / creator",
            "Status",
            ...(studentEmailApplied.trim() ? (["Their role", "Seat vs application"] as const) : []),
            "Volunteers enrolled",
            "Volunteers required",
            "Remaining seats",
            "Remaining members",
            "Hours logged",
            "Remaining hours",
            "Location",
        ];
        const csvContent = [
            headers.join(","),
            ...filteredRows.map((r) => {
                const seatVsApp =
                    r.studentMatch?.matchSource === "application_pipeline"
                        ? "Application pipeline"
                        : r.studentMatch
                          ? "Enrolled seat"
                          : "";
                const extra =
                    studentEmailApplied.trim().length > 0 ?
                        [
                            `"${String(r.studentMatch?.role ?? "").replace(/"/g, '""')}"`,
                            `"${seatVsApp.replace(/"/g, '""')}"`,
                        ]
                    :   [];
                return [
                    r.id,
                    `"${r.title.replace(/"/g, '""')}"`,
                    `"${r.subtitle.replace(/"/g, '""')}"`,
                    `"${r.displayStatus.replace(/"/g, '""')}"`,
                    ...extra,
                    r.volunteers,
                    r.volunteersRequired ?? "",
                    r.remainingSeats ?? "",
                    r.remainingMembers ?? "",
                    r.hours,
                    r.remainingHours ?? "",
                    `"${r.locationLabel.replace(/"/g, '""')}"`,
                ].join(",");
            }),
        ].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `projects_report_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Export started");
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const res = await authenticatedFetch(`/api/v1/admin/opportunities/${id}/status`, {
                method: "PUT",
                body: JSON.stringify({ status: newStatus }),
            });
            if (res?.ok) {
                toast.success("Status updated");
                setActiveMenu(null);
                await loadProjects();
            } else {
                toast.error("Could not update status");
            }
        } catch {
            toast.error("Could not update status");
        }
    };

    const handleDeleteOpportunity = async (id: string) => {
        const target = rows.find((row) => row.id === id);
        const label = target?.title?.trim() || "this opportunity";
        if (!confirm(`Delete "${label}"?\n\nThis should also remove related dependent records from the backend and cannot be undone.`)) {
            return;
        }

        setDeletingId(id);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/opportunities/${id}`, {
                method: "DELETE",
            });

            if (!res) {
                toast.error("Failed to delete opportunity");
                return;
            }

            if (res.ok) {
                toast.success("Opportunity deleted successfully");
                setActiveMenu(null);
                await loadProjects();
                return;
            }

            const body = await res.json().catch(() => ({}));
            const message =
                typeof (body as { message?: string; error?: string }).message === "string"
                    ? (body as { message: string }).message
                    : typeof (body as { message?: string; error?: string }).error === "string"
                      ? (body as { error: string }).error
                      : "Failed to delete opportunity";
            toast.error(message);
        } catch (error) {
            console.error("Delete opportunity failed:", error);
            toast.error("Failed to delete opportunity");
        } finally {
            setDeletingId(null);
        }
    };

    const activeMenuRow = activeMenu ? rows.find((r) => r.id === activeMenu.id) : null;

    const studentEmailFiltered = Boolean(studentEmailApplied.trim());

    const columns: TableColumn<AdminProjectRow>[] = useMemo(() => {
        const studentRoleColumn: TableColumn<AdminProjectRow> = {
            name: "Their role",
            grow: 1,
            sortable: true,
            selector: (r) => r.studentMatch?.role ?? "",
            cell: (r) => (
                <div className="py-1">
                    <div className="text-sm font-bold text-slate-900 capitalize">{r.studentMatch?.role ?? "—"}</div>
                    {r.studentMatch ? (
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-0.5">
                            {r.studentMatch.matchSource === "application_pipeline" ? "application (pending seat)" : "enrolled"}
                        </div>
                    ) : null}
                </div>
            ),
        };

        const baseColumns: TableColumn<AdminProjectRow>[] = [
            {
                name: "Project",
                grow: 2,
                sortable: true,
                selector: (r) => r.title,
                cell: (r) => (
                    <div className="py-2 pr-2">
                        <Link
                            href={`/dashboard/student/browse/${encodeURIComponent(r.id)}`}
                            className="font-bold text-slate-900 hover:text-blue-600 transition-colors line-clamp-1"
                        >
                            {r.title}
                        </Link>
                        <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                            <Briefcase className="w-3 h-3 shrink-0" />
                            <span className="line-clamp-1">{r.subtitle}</span>
                        </div>
                    </div>
                ),
            },
        ];

        const restColumns: TableColumn<AdminProjectRow>[] = [
            {
                name: "Status",
                sortable: true,
                selector: (r) => r.displayStatus,
                cell: (r) => (
                    <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass(r.statusKey)}`}
                    >
                        {r.displayStatus}
                    </span>
                ),
            },
            {
                name: "Location",
                sortable: true,
                selector: (r) => r.locationLabel,
                cell: (r) => (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="line-clamp-2">{r.locationLabel}</span>
                    </div>
                ),
            },
            {
                name: "Volunteers",
                sortable: true,
                width: "132px",
                selector: (r) => r.volunteers,
                cell: (r) => (
                    <div className="text-center w-full py-1">
                        <span className="text-sm font-bold text-slate-900">
                            {r.volunteersRequired != null ? `${r.volunteers} / ${r.volunteersRequired}` : r.volunteers}
                        </span>
                        {r.remainingSeats != null || r.remainingMembers != null ? (
                            <div className="text-[10px] font-medium text-slate-500 mt-0.5 leading-snug">
                                {r.remainingSeats != null ? `${r.remainingSeats} seat${r.remainingSeats === 1 ? "" : "s"} left` : null}
                                {r.remainingSeats != null && r.remainingMembers != null && r.remainingMembers !== r.remainingSeats ? " · " : null}
                                {r.remainingMembers != null && r.remainingMembers !== r.remainingSeats
                                    ? `${r.remainingMembers} member slot${r.remainingMembers === 1 ? "" : "s"}`
                                    : null}
                                {r.remainingSeats == null && r.remainingMembers != null
                                    ? `${r.remainingMembers} member slot${r.remainingMembers === 1 ? "" : "s"} left`
                                    : null}
                            </div>
                        ) : null}
                    </div>
                ),
            },
            {
                name: "Hours",
                sortable: true,
                width: "112px",
                selector: (r) => r.hours,
                cell: (r) => (
                    <div className="text-center w-full py-1">
                        <span className="text-sm font-bold text-slate-900">{r.hours}</span>
                        {r.remainingHours != null ? (
                            <div className="text-[10px] font-medium text-slate-500 mt-0.5">{r.remainingHours} h remaining</div>
                        ) : null}
                    </div>
                ),
            },
            {
                name: "Actions",
                width: "120px",
                cell: (r) => (
                    <div className="relative flex justify-end items-center gap-0.5 py-1 w-full">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                openProjectTrackerModal(r);
                            }}
                            className="text-blue-600 hover:text-blue-800 p-1.5 rounded-full hover:bg-blue-50 transition-colors"
                            aria-label="Track project pipeline"
                            title="Track project — details, applicants, stages"
                        >
                            <ClipboardList className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveMenu((prev) =>
                                    prev?.id === r.id
                                        ? null
                                        : { id: r.id, top: rect.bottom + 6, right: window.innerWidth - rect.right },
                                );
                            }}
                            className="admin-project-menu-trigger text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 transition-colors"
                            aria-label="More actions"
                            aria-expanded={activeMenu?.id === r.id}
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>
                    </div>
                ),
            },
        ];

        return studentEmailFiltered ? [...baseColumns, studentRoleColumn, ...restColumns] : [...baseColumns, ...restColumns];
    }, [studentEmailFiltered, activeMenu]);

    return (
        <div className="mx-auto max-w-7xl p-0 lg:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Projects Overview</h1>
                    <p className="text-slate-500 mt-1 text-base">Monitor all active and past social impact projects.</p>
                </div>
                <button
                    type="button"
                    onClick={handleExport}
                    disabled={!filteredRows.length}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                    <FileDown className="w-4 h-4" /> Export report
                </button>
            </div>

            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col gap-3">
                <div className="flex flex-col lg:flex-row gap-3">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="search"
                            placeholder="Search projects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all outline-none font-medium text-slate-700 text-sm"
                        />
                    </div>
                    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:shrink-0">
                        <div className="relative min-w-0 sm:min-w-[160px]">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-700 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none appearance-none cursor-pointer"
                                aria-label="Filter by status"
                            >
                                {statusOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt === "all" ? "All statuses" : opt.replace(/_/g, " ")}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="relative min-w-0 sm:min-w-[160px]">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            <select
                                value={locationFilter}
                                onChange={(e) => setLocationFilter(e.target.value)}
                                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-700 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none appearance-none cursor-pointer"
                                aria-label="Filter by location"
                            >
                                {locationOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt === "all" ? "All locations" : opt}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="relative min-w-0 sm:min-w-[160px]">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            <select
                                value={degreeFilter}
                                onChange={(e) => setDegreeFilter(e.target.value)}
                                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-700 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none appearance-none cursor-pointer"
                                aria-label="Filter by degree"
                            >
                                {degreeOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt === "all" ? "All degrees" : opt.replace(/_/g, " ")}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="relative min-w-0 sm:min-w-[160px]">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            <select
                                value={facultyEmailFilter}
                                onChange={(e) => setFacultyEmailFilter(e.target.value)}
                                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-700 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none appearance-none cursor-pointer"
                                aria-label="Filter by faculty email"
                            >
                                {facultyEmailOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt === "all" ? "All faculty emails" : opt}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center border-t border-slate-100 pt-3">
                    <div className="relative flex-1 min-w-0">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                            type="email"
                            autoComplete="off"
                            placeholder="Student email — show only projects where they applied or enrolled…"
                            value={studentEmailInput}
                            onChange={(e) => setStudentEmailInput(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all outline-none font-medium text-slate-700 text-sm"
                            aria-label="Filter projects by student email"
                        />
                        {studentEmailInput.trim() ? (
                            <button
                                type="button"
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                                aria-label="Clear student email filter"
                                onClick={() => setStudentEmailInput("")}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        ) : null}
                    </div>
                    <p className="text-[11px] text-slate-500 sm:max-w-[14rem] shrink-0 leading-snug">
                        Includes team lead, teammate on application, or enrolled seat. Reloads shortly after you pause typing.
                    </p>
                </div>
            </div>

            <div className="min-h-[320px] overflow-x-auto overflow-y-visible rounded-2xl border border-slate-100 bg-white shadow-sm">
                {filteredRows.length === 0 && !isLoading ? (
                    <div className="text-center py-24 px-4">
                        <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-900">No projects found</h3>
                        <p className="text-slate-500 text-sm mt-1">
                            {studentEmailApplied.trim() ?
                                "No projects found for this student email (no application or enrolled seat with that address)."
                            :   "Try adjusting search or filters, or check the API response."}
                        </p>
                    </div>
                ) : (
                    <DataTable<AdminProjectRow>
                        columns={columns}
                        data={filteredRows}
                        progressPending={isLoading}
                        pagination
                        paginationPerPage={10}
                        paginationRowsPerPageOptions={[10, 25, 50, 100]}
                        highlightOnHover
                        responsive
                        dense
                        customStyles={{
                            headRow: {
                                style: {
                                    backgroundColor: "#f8fafc",
                                    borderBottomWidth: "1px",
                                    borderBottomColor: "#e2e8f0",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    color: "#64748b",
                                },
                            },
                            table: { style: { overflow: "visible" } },
                            tableWrapper: { style: { overflow: "visible" } },
                            rows: { style: { overflow: "visible", position: "relative" } },
                            cells: { style: { overflow: "visible" } },
                        }}
                    />
                )}
                {activeMenu && activeMenuRow && (
                    <>
                        <div className="fixed inset-0 z-40" aria-hidden onClick={() => setActiveMenu(null)} />
                        <div
                            role="menu"
                            className="admin-project-menu-panel fixed w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden text-left py-0.5"
                            style={{ top: activeMenu.top, right: activeMenu.right }}
                        >
                            <Link
                                href={`/dashboard/student/browse/${encodeURIComponent(activeMenuRow.id)}`}
                                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                onClick={() => setActiveMenu(null)}
                            >
                                <Eye className="w-4 h-4" /> View details
                            </Link>
                            {(() => {
                                const c = activeMenuRow.raw.creator && typeof activeMenuRow.raw.creator === "object"
                                    ? (activeMenuRow.raw.creator as Record<string, unknown>)
                                    : null;
                                const rawPhone = String(c?.phone ?? activeMenuRow.raw.contact_phone ?? activeMenuRow.raw.owner_phone ?? "").trim();
                                const digits = rawPhone.replace(/\D/g, "");
                                const waPhone = rawPhone.startsWith("+") ? digits : digits.length >= 10 ? `92${digits.slice(-10)}` : digits;
                                if (!waPhone) return null;
                                const waIcon = (
                                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0" aria-hidden>
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.556 4.12 1.527 5.855L.057 23.25a.75.75 0 0 0 .916.919l5.556-1.458A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.712 9.712 0 0 1-4.953-1.355l-.355-.213-3.684.966.984-3.595-.232-.371A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
                                    </svg>
                                );
                                const rejectionTemplate = `Dear Student,\n\nYour opportunity has been rejected because the partner organization has not been added. Since your activity requires a partner, please click the Edit button and revise your opportunity by adding the organization where you plan to conduct the activity.\n\nOnce the partner is added, please ensure that the partner logs in or registers on the dashboard using the same email address you entered, and then approves the opportunity.\n\nAfter partner approval, your opportunity will be cleared and made live.`;
                                return (
                                    <>
                                        <a
                                            href={`https://wa.me/${waPhone}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                                            onClick={() => setActiveMenu(null)}
                                        >
                                            {waIcon}
                                            WhatsApp creator
                                        </a>
                                        <a
                                            href={`https://wa.me/${waPhone}?text=${encodeURIComponent(rejectionTemplate)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                                            onClick={() => setActiveMenu(null)}
                                        >
                                            {waIcon}
                                            Send rejection template
                                        </a>
                                    </>
                                );
                            })()}
                            <button
                                type="button"
                                onClick={() => openProjectTrackerModal(activeMenuRow)}
                                className="w-full text-left px-3 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50 flex items-center gap-2"
                            >
                                <ClipboardList className="w-4 h-4" /> Project tracker
                            </button>
                            <button
                                type="button"
                                onClick={() => openApplicantsModal(activeMenuRow)}
                                className="w-full text-left px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                                <Users className="w-4 h-4" /> Applicant list
                            </button>
                            <button
                                type="button"
                                onClick={() => openTeamOverviewModal(activeMenuRow)}
                                className="w-full text-left px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                                <Users className="w-4 h-4" /> Teams &amp; enrollments
                            </button>
                            {lower(activeMenuRow.raw.status) === "active" && (
                                <button
                                    type="button"
                                    onClick={() => void handleStatusUpdate(activeMenuRow.id, "pending_approval")}
                                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                                >
                                    Revert to pending
                                </button>
                            )}
                            {lower(activeMenuRow.raw.status) === "pending_approval" && (
                                <button
                                    type="button"
                                    onClick={() => void handleStatusUpdate(activeMenuRow.id, "active")}
                                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50 flex items-center gap-2"
                                >
                                    Mark active
                                </button>
                            )}
                            {lower(activeMenuRow.raw.status) !== "rejected" && (
                                <button
                                    type="button"
                                    onClick={() => void handleStatusUpdate(activeMenuRow.id, "rejected")}
                                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                    Reject
                                </button>
                            )}
                            <div className="h-px bg-slate-100 my-0.5" />
                            <button
                                type="button"
                                onClick={() => void handleDeleteOpportunity(activeMenuRow.id)}
                                disabled={deletingId === activeMenuRow.id}
                                className="w-full text-left px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <Trash2 className="w-4 h-4" />
                                {deletingId === activeMenuRow.id ? "Deleting..." : "Delete opportunity"}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {applicantsModal && (
                <>
                    <div className="fixed inset-0 z-[60] bg-slate-900/40" aria-hidden onClick={closeApplicantsModal} />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="incomplete-applicants-title"
                        className="fixed left-1/2 top-1/2 z-[70] flex max-h-[min(85vh,32rem)] w-[calc(100vw-1.5rem)] max-w-[28rem] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                    >
                        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
                            <div className="min-w-0">
                                <h2 id="incomplete-applicants-title" className="text-lg font-extrabold text-slate-900 tracking-tight">
                                    Incomplete reports
                                </h2>
                                <p className="text-sm text-slate-500 mt-0.5 line-clamp-2" title={applicantsModal.title}>
                                    Students without a completed report (including no draft started) —{" "}
                                    <span className="font-semibold text-slate-700">{applicantsModal.title}</span>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeApplicantsModal}
                                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
                            {applicantsLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                    <p className="text-sm font-medium">Loading applicants…</p>
                                </div>
                            ) : incompleteApplicants.length === 0 ? (
                                <div className="text-center py-10 px-2">
                                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-sm font-semibold text-slate-800">No incomplete reports</p>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        No applicants are returned for this project&apos;s incomplete-report queue (everyone is complete or not listed here).
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {incompleteApplicantStatusCounts.total > 0 ? (
                                        <p className="text-[11px] font-medium text-slate-500">
                                            {incompleteApplicantStatusCounts.total} applicant
                                            {incompleteApplicantStatusCounts.total !== 1 ? "s" : ""}
                                            {incompleteApplicantStatusCounts.notStarted > 0 ? (
                                                <>
                                                    {" · "}
                                                    {incompleteApplicantStatusCounts.notStarted} no report started
                                                </>
                                            ) : null}
                                            {incompleteApplicantStatusCounts.other > 0 ? (
                                                <>
                                                    {" · "}
                                                    {incompleteApplicantStatusCounts.other} draft / in progress
                                                </>
                                            ) : null}
                                        </p>
                                    ) : null}
                                    <div className="relative">
                                        <label htmlFor="incomplete-report-status-filter" className="sr-only">
                                            Filter by report status
                                        </label>
                                        <select
                                            id="incomplete-report-status-filter"
                                            value={incompleteApplicantStatusFilter}
                                            onChange={(e) =>
                                                setIncompleteApplicantStatusFilter(e.target.value as IncompleteApplicantStatusFilter)
                                            }
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                        >
                                            <option value="all">All statuses</option>
                                            <option value="not_started">No report started</option>
                                            <option value="draft_or_progress">Draft or in progress</option>
                                        </select>
                                    </div>
                                    {incompleteApplicantsFiltered.length === 0 ? (
                                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-4 text-center text-xs font-medium text-slate-600">
                                            Nothing matches this filter. Choose &ldquo;All statuses&rdquo; or another option.
                                        </div>
                                    ) : (
                                        <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                                            {incompleteApplicantsFiltered.map((r) => (
                                                <li
                                                    key={`${r.applicationId}:${r.studentEmail || r.studentName}`}
                                                    className="bg-white px-3 py-3 first:pt-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between"
                                                >
                                            <div className="min-w-0 flex-1">
                                                <div className="font-bold text-slate-900 text-sm truncate">{r.studentName}</div>
                                                {r.studentEmail ? (
                                                    <div className="text-xs text-slate-500 truncate mt-0.5">{r.studentEmail}</div>
                                                ) : null}
                                                <span
                                                    className={`inline-flex mt-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${incompleteApplicantBadgeClass(r.reportStatusRaw)}`}
                                                >
                                                    {r.reportStatusLabel}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => void handleRemoveIncompleteApplicant(r.applicationId)}
                                                disabled={deletingApplicationId === r.applicationId}
                                                className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {deletingApplicationId === r.applicationId ? (
                                                    <>
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Withdrawing…
                                                    </>
                                                ) : (
                                                    <>
                                                        <Trash2 className="w-3.5 h-3.5" /> Withdraw & free seat
                                                    </>
                                                )}
                                            </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {teamOverviewModal && (
                <>
                    <div className="fixed inset-0 z-[80] bg-slate-900/40" aria-hidden onClick={closeTeamOverviewModal} />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="team-overview-title"
                        className="fixed left-1/2 top-1/2 z-[90] flex max-h-[min(90vh,46rem)] w-[calc(100vw-1.5rem)] max-w-[72rem] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                    >
                        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
                            <div className="min-w-0">
                                <h2 id="team-overview-title" className="text-lg font-extrabold text-slate-900 tracking-tight">
                                    Teams &amp; enrollments
                                </h2>
                                <p className="text-sm text-slate-500 mt-0.5 line-clamp-3">
                                    Team and individual participation plus report progress for{" "}
                                    <span className="font-semibold text-slate-700">{teamOverviewModal.title}</span>.
                                    Use <span className="font-semibold text-emerald-700">Enable attendance</span> when gates
                                    block a member from logging hours.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeTeamOverviewModal}
                                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-5 py-4 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{teamRegisteredMetricLabel}</div>
                                <div className="mt-1 text-2xl font-black text-slate-900">{teamOverviewSummary.registeredTeams}</div>
                            </div>
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Completed reports</div>
                                <div className="mt-1 text-2xl font-black text-emerald-800">{teamOverviewSummary.completedReports}</div>
                            </div>
                            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Reports available</div>
                                <div className="mt-1 text-2xl font-black text-blue-800">{teamOverviewSummary.reportsAvailable}</div>
                            </div>
                        </div>
                        {!teamOverviewLoading ? (
                            <div className="px-5 py-3 border-b border-slate-100 shrink-0 bg-amber-50/30">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-xs leading-relaxed text-slate-600 max-w-2xl">
                                        {duplicateAccountCount > 0 ? (
                                            <>
                                                <span className="font-semibold text-amber-800">
                                                    {duplicateAccountCount} account(s) need enrollment repair
                                                    (duplicate seats or wrong account link).
                                                </span>{" "}
                                                Use <span className="font-semibold">Repair enrollments</span> to auto-fix
                                                ghost rows, wrong account links, and missing teammates. Per-row{" "}
                                                <span className="font-semibold">Clean dupes</span> only when the same
                                                account has 2+ seats.
                                            </>
                                        ) : (
                                            <>
                                                <span className="font-semibold">Repair enrollments</span> checks the roster,
                                                restores missing members, removes duplicate ghost seats, and fixes wrong
                                                account links. Does not delete whole teams.
                                            </>
                                        )}
                                    </p>
                                    <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => void handleHealTeamEnrollments()}
                                        disabled={healEnrollmentsLoading || reconcileEnrollmentsLoading}
                                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-300 bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
                                    >
                                        {healEnrollmentsLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Wrench className="h-4 w-4" />
                                        )}
                                        Repair enrollments
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleReconcileEnrollments()}
                                        disabled={reconcileEnrollmentsLoading || healEnrollmentsLoading}
                                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-bold text-amber-900 shadow-sm hover:bg-amber-50 disabled:opacity-60"
                                    >
                                        {reconcileEnrollmentsLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Sparkles className="h-4 w-4" />
                                        )}
                                        Auto-fix (safe)
                                    </button>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                        {teamOverviewPipelineRibbon}
                        {!teamOverviewLoading && mergeableEnrollments.length >= 2 ? (
                            <div className="px-5 py-3 border-b border-slate-100 bg-indigo-50/40">
                                <button
                                    type="button"
                                    onClick={() => setTeamMergePanelOpen((v) => !v)}
                                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-indigo-200/80 bg-white px-4 py-2.5 text-left shadow-sm hover:bg-indigo-50/50"
                                >
                                    <span className="inline-flex items-center gap-2 text-sm font-bold text-indigo-900">
                                        <GitMerge className="h-4 w-4 shrink-0" />
                                        Merge enrollments into one team
                                    </span>
                                    <span className="text-xs font-semibold text-indigo-600">
                                        {teamMergePanelOpen ? "Hide" : "Show"}
                                    </span>
                                </button>
                                {teamMergePanelOpen ? (
                                    <div className="mt-3 space-y-3 rounded-xl border border-indigo-100 bg-white p-4">
                                        <p className="text-xs leading-relaxed text-slate-600">
                                            Select enrolled members from different individual/team rows, pick the team lead,
                                            then merge. Pending pipeline applicants (not yet enrolled) cannot be merged here.
                                        </p>
                                        <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-100 p-2">
                                            {mergeableEnrollments.map((member) => {
                                                const checked = teamMergeSelectedIds.includes(member.participationId);
                                                const isLead = teamMergeLeadId === member.participationId;
                                                return (
                                                    <div
                                                        key={member.participationId}
                                                        className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={(e) =>
                                                                toggleTeamMergeMember(member.participationId, e.target.checked)
                                                            }
                                                            className="h-4 w-4 rounded border-slate-300"
                                                            aria-label={`Select ${member.name}`}
                                                        />
                                                        <label className="min-w-0 flex-1 cursor-pointer text-sm">
                                                            <span className="font-semibold text-slate-900">{member.name}</span>
                                                            {member.email ? (
                                                                <span className="text-slate-500"> · {member.email}</span>
                                                            ) : null}
                                                            <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                                                {member.groupLabel} · {member.participationMode}
                                                            </span>
                                                        </label>
                                                        {checked ? (
                                                            <label className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-800">
                                                                <input
                                                                    type="radio"
                                                                    name="team-merge-lead"
                                                                    checked={isLead}
                                                                    onChange={() => setTeamMergeLeadId(member.participationId)}
                                                                    className="h-3.5 w-3.5"
                                                                />
                                                                Team lead
                                                            </label>
                                                        ) : null}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 shrink-0">
                                                Target team id
                                            </label>
                                            <select
                                                value={teamMergeTargetTeamId}
                                                onChange={(e) => setTeamMergeTargetTeamId(e.target.value)}
                                                className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                                            >
                                                <option value="">Auto (keep existing or generate)</option>
                                                {persistedTeamIdOptions.map((t) => (
                                                    <option key={t.id} value={t.id}>
                                                        {t.label} — {t.id}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={
                                                teamMergeSubmitting ||
                                                teamMergeSelectedIds.length < 2 ||
                                                !teamMergeLeadId
                                            }
                                            onClick={() => void handleMergeTeamMembers()}
                                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {teamMergeSubmitting ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Merging…
                                                </>
                                            ) : (
                                                <>
                                                    <GitMerge className="h-4 w-4" />
                                                    Merge {teamMergeSelectedIds.length || 0} members
                                                </>
                                            )}
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                        <div className="px-5 py-4">
                            {teamOverviewLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                    <p className="text-sm font-medium">Loading team overview…</p>
                                </div>
                            ) : teamOverviewRows.length === 0 ? (
                                <div className="text-center py-14 px-2">
                                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-sm font-semibold text-slate-800">No enrollments found</p>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        No team or individual registrations are available for this project yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <label htmlFor="team-overview-participation-filter" className="sr-only">
                                            Filter by participation
                                        </label>
                                        <select
                                            id="team-overview-participation-filter"
                                            value={teamOverviewParticipationFilter}
                                            onChange={(e) =>
                                                setTeamOverviewParticipationFilter(e.target.value as "all" | "team" | "individual")
                                            }
                                            className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                        >
                                            <option value="all">All: teams &amp; individuals</option>
                                            <option value="team">Teams only</option>
                                            <option value="individual">Individuals only</option>
                                        </select>
                                    </div>
                                    {filteredTeamOverviewRows.length === 0 ? (
                                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-4 text-center text-sm font-medium text-slate-600">
                                            Nothing matches this filter. Switch back to &ldquo;All&rdquo; or pick the other enrollment type.
                                        </div>
                                    ) : null}
                                    {filteredTeamOverviewRows.map((team) => {
                                        const disableRemoveGroup = teamOverviewRemoveGroupDisabled(team);
                                        return (
                                        <div key={team.id} className="rounded-xl border border-slate-200 overflow-hidden">
                                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span
                                                            className="font-bold text-slate-900 break-words"
                                                            title={team.teamName}
                                                        >
                                                            {team.teamName}
                                                        </span>
                                                        <span
                                                            className={`inline-flex shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                                                                team.participationMode === "individual"
                                                                    ? "bg-violet-50 text-violet-800 border-violet-100"
                                                                    : "bg-emerald-50 text-emerald-800 border-emerald-100"
                                                            }`}
                                                        >
                                                            {team.participationMode === "individual" ? "Individual" : "Team"}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-0.5">
                                                        {team.participationMode === "individual"
                                                            ? `Participant: ${team.leadName}`
                                                            : `Lead: ${team.leadName}`}
                                                    </div>
                                                    {team.participationMode === "team" && !isSyntheticIndividualGroupId(team.id) ? (
                                                        <div
                                                            className="mt-1 text-[11px] font-mono text-slate-600 break-all"
                                                            title={team.id}
                                                        >
                                                            Team ID: {team.id}
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="inline-flex px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-800 border border-amber-100">
                                                        {team.reportStatus}
                                                    </span>
                                                    <span
                                                        className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                                                            team.reportAvailable
                                                                ? "bg-blue-50 text-blue-800 border-blue-100"
                                                                : "bg-slate-100 text-slate-600 border-slate-200"
                                                        }`}
                                                    >
                                                        {team.reportAvailable ? "report available" : "report unavailable"}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleRemoveTeam(team.id)}
                                                        disabled={deletingTeamId === team.id || disableRemoveGroup}
                                                        title={
                                                            disableRemoveGroup
                                                                ? "This row uses a listing-only group id (individual:…), not a persisted team id. Use per-member removal or application withdraw until the API supports synthetic ids."
                                                                : undefined
                                                        }
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 border border-red-100 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {deletingTeamId === team.id ? (
                                                            <>
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Removing…
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Trash2 className="w-3.5 h-3.5" /> Remove full team
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-[1280px] w-full text-left text-sm">
                                                    <thead className="bg-white border-b border-slate-100">
                                                        <tr>
                                                            <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                                                Member
                                                            </th>
                                                            <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                                                CNIC
                                                            </th>
                                                            <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                                                Phone
                                                            </th>
                                                            <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                                                Academic
                                                            </th>
                                                            <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                                                Role
                                                            </th>
                                                            <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                                                Report
                                                            </th>
                                                            <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                                                Availability
                                                            </th>
                                                            <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                                                Attendance
                                                            </th>
                                                            <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 text-right">
                                                                Action
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {team.members.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={9} className="px-4 py-4 text-xs text-slate-500">
                                                                    No members found.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            team.members.map((member) => {
                                                                const academicBits = [
                                                                    member.yearOfStudy,
                                                                    member.department,
                                                                    member.academicIntegrationType,
                                                                ].filter(Boolean);
                                                                const attendanceMeta = member.attendanceMeta;
                                                                const attendanceTone = attendanceUnlockTone(attendanceMeta);
                                                                const attendanceLabel = attendanceUnlockLabel(attendanceMeta);
                                                                const canToggleAttendance = isMergeableTeamMember(member);
                                                                const attendanceBusy = attendanceToggleParticipationId === member.id;
                                                                const adminOverrideOn =
                                                                    attendanceMeta?.adminAttendanceEditable === true ||
                                                                    attendanceMeta?.attendanceUnlock?.admin_override === true;
                                                                const duplicateSeatCount = member.duplicateSeatCount ?? 0;
                                                                const showDedupeSeats =
                                                                    duplicateSeatCount >= 2 &&
                                                                    Boolean(member.studentUserId?.trim()) &&
                                                                    isMergeableTeamMember(member);
                                                                const dedupeBusy =
                                                                    dedupeSeatsStudentUserId === member.studentUserId?.trim();
                                                                return (
                                                                    <tr key={member.id}>
                                                                        <td className="px-4 py-3">
                                                                            <div className="font-semibold text-slate-900">{member.name}</div>
                                                                            {member.email ? (
                                                                                <div className="text-xs text-slate-500 mt-0.5">{member.email}</div>
                                                                            ) : null}
                                                                            {showDedupeSeats ? (
                                                                                <div className="mt-1.5">
                                                                                    <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-900 border border-amber-100">
                                                                                        {duplicateSeatCount} seats · same account
                                                                                    </span>
                                                                                </div>
                                                                            ) : member.studentIdMislinked ? (
                                                                                <div className="mt-1.5">
                                                                                    <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-rose-50 text-rose-900 border border-rose-100">
                                                                                        Wrong account link
                                                                                    </span>
                                                                                </div>
                                                                            ) : null}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                                                                            {member.cnicDisplay.trim() || "—"}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                                                                            {member.phoneNumber.trim() || "—"}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-xs text-slate-700 max-w-[260px]">
                                                                            {member.universityName.trim() ? (
                                                                                <div className="font-medium text-slate-800">{member.universityName}</div>
                                                                            ) : null}
                                                                            {member.universityId.trim() ? (
                                                                                <div className="text-slate-500 mt-0.5">ID: {member.universityId}</div>
                                                                            ) : null}
                                                                            {member.academicProgram.trim() ? (
                                                                                <div className="mt-1 text-slate-600">{member.academicProgram}</div>
                                                                            ) : null}
                                                                            {academicBits.length ? (
                                                                                <div className="text-slate-500 mt-1 leading-snug">{academicBits.join(" · ")}</div>
                                                                            ) : null}
                                                                            {!member.universityName.trim() &&
                                                                            !member.universityId.trim() &&
                                                                            !member.academicProgram.trim() &&
                                                                            academicBits.length === 0 ?
                                                                                <span className="text-slate-400">—</span>
                                                                            : null}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-slate-700 capitalize">{member.role}</td>
                                                                        <td className="px-4 py-3 text-slate-700">{member.reportStatus}</td>
                                                                        <td className="px-4 py-3">
                                                                            <span
                                                                                className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                                                                                    member.reportAvailable
                                                                                        ? "bg-blue-50 text-blue-800 border-blue-100"
                                                                                        : "bg-slate-100 text-slate-600 border-slate-200"
                                                                                }`}
                                                                            >
                                                                                {member.reportAvailable ? "available" : "unavailable"}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-3 align-top">
                                                                            <div className="space-y-2">
                                                                                <span
                                                                                    className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                                                                                        attendanceTone === "enabled"
                                                                                            ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                                                                                            : attendanceTone === "unlocked"
                                                                                              ? "bg-blue-50 text-blue-800 border-blue-100"
                                                                                              : attendanceTone === "locked"
                                                                                                ? "bg-amber-50 text-amber-800 border-amber-100"
                                                                                                : "bg-slate-100 text-slate-600 border-slate-200"
                                                                                    }`}
                                                                                >
                                                                                    {attendanceLabel}
                                                                                </span>
                                                                                {canToggleAttendance ? (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            void handleToggleMemberAttendance(
                                                                                                member,
                                                                                                !adminOverrideOn,
                                                                                            )
                                                                                        }
                                                                                        disabled={attendanceBusy || memberSaveLoading}
                                                                                        title={
                                                                                            adminOverrideOn
                                                                                                ? "Remove admin attendance override"
                                                                                                : "Allow this member to log attendance even when identity or verification gates are incomplete"
                                                                                        }
                                                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                    >
                                                                                        {attendanceBusy ? (
                                                                                            <>
                                                                                                <Loader2 className="w-3 h-3 animate-spin" /> Saving…
                                                                                            </>
                                                                                        ) : adminOverrideOn ? (
                                                                                            <>
                                                                                                <Lock className="w-3 h-3" /> Revoke access
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                <Unlock className="w-3 h-3" /> Enable attendance
                                                                                            </>
                                                                                        )}
                                                                                    </button>
                                                                                ) : (
                                                                                    <span className="block text-[10px] text-slate-400">
                                                                                        Pending pipeline only
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right">
                                                                            <div className="inline-flex flex-wrap items-center justify-end gap-1">
                                                                                {showDedupeSeats ? (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => void handleDedupeStudentSeats(member)}
                                                                                        disabled={dedupeBusy}
                                                                                        title="Remove extra enrollment rows for this student account (keeps team lead / attendance seat)"
                                                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                    >
                                                                                        {dedupeBusy ? (
                                                                                            <>
                                                                                                <Loader2 className="w-3 h-3 animate-spin" /> Cleaning…
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                <Layers2 className="w-3 h-3" /> Clean dupes (
                                                                                                {duplicateSeatCount - 1})
                                                                                            </>
                                                                                        )}
                                                                                    </button>
                                                                                ) : null}
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => openTeamMemberEditor(team.id, member)}
                                                                                    disabled={!member.supportsAdminPatch || memberSaveLoading}
                                                                                    title={
                                                                                        member.supportsAdminPatch
                                                                                            ? "Correct CNIC, phone, or academic profile fields"
                                                                                            : "Correction is blocked for this row"
                                                                                    }
                                                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                >
                                                                                    <Pencil className="w-3 h-3" /> Update
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => void handleRemoveTeamMember(team.id, member.id)}
                                                                                    disabled={deletingMemberId === member.id}
                                                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold text-red-700 bg-red-50 border border-red-100 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                >
                                                                                    {deletingMemberId === member.id ? (
                                                                                        <>
                                                                                            <Loader2 className="w-3 h-3 animate-spin" /> Removing…
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <UserMinus className="w-3 h-3" />{" "}
                                                                                            {team.participationMode === "individual"
                                                                                                ? "Remove from project"
                                                                                                : "Remove"}
                                                                                        </>
                                                                                    )}
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        </div>
                    </div>
                    {teamMemberEditor ? (
                        <>
                            <div
                                className="fixed inset-0 z-[94] bg-slate-900/30"
                                aria-hidden
                                onClick={() => {
                                    if (!memberSaveLoading) setTeamMemberEditor(null);
                                }}
                            />
                            <div
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="team-member-edit-title"
                                className="fixed left-1/2 top-1/2 z-[95] flex max-h-[min(88vh,44rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                            >
                                <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-2 shrink-0">
                                    <div className="min-w-0">
                                        <h3 id="team-member-edit-title" className="text-base font-extrabold text-slate-900">
                                            Update enrollment
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{teamMemberEditor.headline}</p>
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            CNIC format <span className="font-mono">12345-1234567-1</span>. Phone: saved on the enrollment seat (+92 or
                                            local both supported).
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={memberSaveLoading}
                                        onClick={() => setTeamMemberEditor(null)}
                                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                                        aria-label="Close editor"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0 space-y-3 text-sm">
                                    <label className="block">
                                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Full name</span>
                                        <input
                                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                                            value={teamMemberEditor.draft.full_name}
                                            onChange={(e) =>
                                                setTeamMemberEditor((prev) =>
                                                    prev ?
                                                        { ...prev, draft: { ...prev.draft, full_name: e.target.value } }
                                                    :   null,
                                                )
                                            }
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Mobile / phone</span>
                                        <input
                                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                                            value={teamMemberEditor.draft.mobile}
                                            onChange={(e) =>
                                                setTeamMemberEditor((prev) =>
                                                    prev ?
                                                        { ...prev, draft: { ...prev.draft, mobile: e.target.value } }
                                                    :   null,
                                                )
                                            }
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">CNIC</span>
                                        <input
                                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 font-mono"
                                            placeholder="12345-1234567-1"
                                            value={teamMemberEditor.draft.cnic}
                                            onChange={(e) =>
                                                setTeamMemberEditor((prev) =>
                                                    prev ? { ...prev, draft: { ...prev.draft, cnic: e.target.value } } : null,
                                                )
                                            }
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">University ID</span>
                                        <input
                                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                                            value={teamMemberEditor.draft.university_id}
                                            onChange={(e) =>
                                                setTeamMemberEditor((prev) =>
                                                    prev ?
                                                        { ...prev, draft: { ...prev.draft, university_id: e.target.value } }
                                                    :   null,
                                                )
                                            }
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">University name</span>
                                        <input
                                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                                            value={teamMemberEditor.draft.university_name}
                                            onChange={(e) =>
                                                setTeamMemberEditor((prev) =>
                                                    prev ?
                                                        { ...prev, draft: { ...prev.draft, university_name: e.target.value } }
                                                    :   null,
                                                )
                                            }
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                            Academic program / major
                                        </span>
                                        <input
                                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                                            value={teamMemberEditor.draft.academic_program}
                                            onChange={(e) =>
                                                setTeamMemberEditor((prev) =>
                                                    prev ?
                                                        { ...prev, draft: { ...prev.draft, academic_program: e.target.value } }
                                                    :   null,
                                                )
                                            }
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Department</span>
                                        <input
                                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                                            value={teamMemberEditor.draft.department}
                                            onChange={(e) =>
                                                setTeamMemberEditor((prev) =>
                                                    prev ?
                                                        { ...prev, draft: { ...prev.draft, department: e.target.value } }
                                                    :   null,
                                                )
                                            }
                                        />
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <label className="block">
                                            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Year of study</span>
                                            <select
                                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 bg-white"
                                                value={teamMemberEditor.draft.year_of_study}
                                                onChange={(e) =>
                                                    setTeamMemberEditor((prev) =>
                                                        prev ?
                                                            { ...prev, draft: { ...prev.draft, year_of_study: e.target.value } }
                                                        :   null,
                                                    )
                                                }
                                            >
                                                <option value="">— unchanged —</option>
                                                {YEAR_OF_STUDY_OPTIONS.map((y) => (
                                                    <option key={y} value={y}>
                                                        {y}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="block">
                                            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                                Academic integration type
                                            </span>
                                            <select
                                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 bg-white"
                                                value={teamMemberEditor.draft.academic_integration_type}
                                                onChange={(e) =>
                                                    setTeamMemberEditor((prev) =>
                                                        prev ?
                                                            {
                                                                ...prev,
                                                                draft: {
                                                                    ...prev.draft,
                                                                    academic_integration_type: e.target.value,
                                                                },
                                                            }
                                                        :   null,
                                                    )
                                                }
                                            >
                                                <option value="">— unchanged —</option>
                                                {ACADEMIC_INTEGRATION_OPTIONS.map((y) => (
                                                    <option key={y} value={y}>
                                                        {y}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>
                                    <label className="flex items-start gap-2 cursor-pointer select-none pt-1">
                                        <input
                                            type="checkbox"
                                            className="mt-0.5 rounded border-slate-300"
                                            checked={teamMemberEditor.draft.sync_linked_user_profile}
                                            onChange={(e) =>
                                                setTeamMemberEditor((prev) =>
                                                    prev ?
                                                        {
                                                            ...prev,
                                                            draft: {
                                                                ...prev.draft,
                                                                sync_linked_user_profile: e.target.checked,
                                                            },
                                                        }
                                                    :   null,
                                                )
                                            }
                                        />
                                        <span className="text-xs text-slate-600 leading-snug">
                                            Also mirror these fields onto the linked student profile (when a platform account exists).
                                        </span>
                                    </label>
                                </div>
                                <div className="px-5 py-3 border-t border-slate-100 flex flex-wrap justify-end gap-2 shrink-0 bg-slate-50">
                                    <button
                                        type="button"
                                        disabled={memberSaveLoading}
                                        onClick={() => setTeamMemberEditor(null)}
                                        className="px-4 py-2 rounded-xl text-sm font-bold text-slate-700 border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={memberSaveLoading}
                                        onClick={() => void submitTeamMemberEdit()}
                                        className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
                                    >
                                        {memberSaveLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                                            </>
                                        ) : (
                                            "Save changes"
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : null}
                </>
            )}

            {trackerModalRow ? (
                <ProjectTrackerModal
                    row={trackerModalRow}
                    onClose={() => setTrackerModalRow(null)}
                    onOpenTeamsEnrollments={openTeamOverviewFromTracker}
                />
            ) : null}
        </div>
    );
}
