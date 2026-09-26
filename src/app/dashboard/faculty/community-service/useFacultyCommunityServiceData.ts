"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { reportRowToAwardCard, type CommunityAwardCard } from "@/utils/communityAwardModel";
import { extractFacultyMineOpportunityRows } from "@/utils/facultyMineOpportunities";
import { normalizeFacultyApprovalsResponse, type FacultyApprovalRow } from "@/utils/facultyApprovals";
import {
    fetchJoinApplicationsHistoryRows,
    normalizeOpportunityApplicationsListResponse,
    type OpportunityApplicationListRow,
} from "@/utils/opportunityApplicationsAdmin";
import { extractPendingAttendanceRows } from "@/utils/engagementPendingAttendanceResponse";
import { isCommunityReportRejected, isFacultyCommunityLiveCard, isFacultyCommunityWaiting, normalizeReviewStatus } from "@/utils/reviewQueue";
import { formatDisplayId } from "@/utils/displayIds";
import { getStoredCurrentUserEmail } from "@/utils/currentUser";
import type { FacultyInboxItem } from "@/components/ciel/community-service/FacultyCsInbox";

export const FACULTY_CS_BASE = "/dashboard/faculty/community-service";
export const FACULTY_CS_APPROVALS = "/dashboard/faculty/approvals";
export const FACULTY_CS_JOIN_APPS = "/dashboard/faculty/join-applications";
export const FACULTY_CS_REPORTS = "/dashboard/faculty/reports";
export const FACULTY_CS_HOURS = "/dashboard/faculty/attendance-review";

export type FacultyCsReportRow = {
    id: string;
    student_name: string;
    student_email?: string;
    project_title: string;
    organization_name?: string;
    project_id?: string;
    faculty_status?: string;
    status?: string;
    hours?: number;
    submission_date?: string;
    report_submitted_at?: string;
    updated_at?: string;
    university?: string | null;
    faculty_name?: string | null;
    story?: string | null;
    evidence_count?: number;
    participation_type?: string;
    member_hours?: Array<{ name: string; hours: number; required: number }>;
    required_hours?: number;
    cii_analyser_run?: boolean;
    cii_provisional?: number | null;
    cii_locked?: boolean;
    cii_level_name?: string | null;
    cii_numeric_level?: number | null;
};

export type FacultyCsMineRow = {
    id: string;
    title: string;
    status?: string;
    workflow_stage?: string | null;
    created_at?: string;
    // Present on the raw API row (spread in below) but not always populated on legacy records —
    // used only for the create-tab pipeline/status display, so every field here stays optional.
    partner_approval_status?: string | null;
    admin_approval_status?: string | null;
    requires_partner_approval?: boolean;
    partner_contact_name?: string | null;
    partner_contact_email?: string | null;
    rejection_reason?: string | null;
};

function pickStr(item: Record<string, unknown>, ...keys: string[]): string | undefined {
    for (const key of keys) {
        const value = item[key];
        if (typeof value === "string" && value.trim()) return value;
    }
    return undefined;
}

function attendanceProjectId(row: Record<string, unknown>): string {
    const nested = row.project && typeof row.project === "object" ? (row.project as Record<string, unknown>) : null;
    for (const value of [row.projectId, row.project_id, row.opportunityId, row.opportunity_id, nested?.id, nested?._id]) {
        if (value == null) continue;
        const text = String(value).trim();
        if (text) return text;
    }
    return "";
}

export function isFacultyCsReportRevision(row: FacultyCsReportRow): boolean {
    const key = normalizeReviewStatus(row.faculty_status);
    return key === "revision_requested" || key === "revisions_requested" || key === "changes_requested" || key === "returned";
}

export function isFacultyCsOppRevision(row: FacultyApprovalRow): boolean {
    const key = normalizeReviewStatus(row.opportunityStatus || row.workflowStage);
    return key === "revision_requested" || key === "revisions_requested" || key === "returned" || key.includes("revision");
}

export function useFacultyCommunityServiceData() {
    const [rows, setRows] = useState<FacultyCsReportRow[]>([]);
    const [cards, setCards] = useState<CommunityAwardCard[]>([]);
    const [mineRows, setMineRows] = useState<FacultyCsMineRow[]>([]);
    const [pendingOppRows, setPendingOppRows] = useState<FacultyApprovalRow[]>([]);
    const [historyOppRows, setHistoryOppRows] = useState<FacultyApprovalRow[]>([]);
    const [pendingAppRows, setPendingAppRows] = useState<OpportunityApplicationListRow[]>([]);
    const [historyAppRows, setHistoryAppRows] = useState<OpportunityApplicationListRow[]>([]);
    const [hoursProjectCount, setHoursProjectCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const facultyEmail = getStoredCurrentUserEmail();
        const approvalQs = new URLSearchParams({ status: "pending" });
        const historyQs = new URLSearchParams({ status: "history" });
        if (facultyEmail) {
            approvalQs.set("faculty_email", facultyEmail);
            historyQs.set("faculty_email", facultyEmail);
        }

        Promise.all([
            authenticatedFetch("/api/v1/faculty/reports", {}, { redirectToLogin: false }).then((r) => (r?.ok ? r.json() : null)),
            authenticatedFetch("/api/v1/faculty/community-service/award-cards", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch("/api/v1/opportunities/faculty/mine?scope=authored", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch(`/api/v1/faculty/approvals?${approvalQs.toString()}`, {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch(`/api/v1/faculty/approvals?${historyQs.toString()}`, {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch("/api/v1/faculty/applications?status=pending", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            fetchJoinApplicationsHistoryRows("/api/v1/faculty/applications"),
            authenticatedFetch("/api/v1/engagement/attendance/pending", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
        ])
            .then(([list, award, mine, approvals, history, apps, appHistory, attendance]) => {
                if (cancelled) return;
                const mappedMine = extractFacultyMineOpportunityRows(mine)
                    .map((raw) => {
                        const id = String(raw.id ?? raw._id ?? raw.opportunity_id ?? "").trim();
                        return {
                            id,
                            title: pickStr(raw, "title", "name", "opportunity_title") || "Opportunity",
                            status: pickStr(raw, "status"),
                            workflow_stage: pickStr(raw, "workflow_stage", "workflowStage", "approval_stage") || null,
                            created_at: pickStr(raw, "created_at", "createdAt"),
                            ...raw,
                        } as FacultyCsMineRow;
                    })
                    .filter((row) => row.id);
                setMineRows(mappedMine);
                setPendingOppRows(normalizeFacultyApprovalsResponse(approvals));
                setHistoryOppRows(normalizeFacultyApprovalsResponse(history));
                setPendingAppRows(normalizeOpportunityApplicationsListResponse(apps));
                setHistoryAppRows(appHistory.rows);
                setHoursProjectCount(
                    new Set(extractPendingAttendanceRows(attendance).map(attendanceProjectId).filter(Boolean)).size,
                );
                setRows(
                    (Array.isArray(list?.data) ? list.data : [])
                        .filter((item: unknown) => item && typeof item === "object")
                        .map((item: Record<string, unknown>) => {
                            const metrics =
                                item.metrics && typeof item.metrics === "object"
                                    ? (item.metrics as Record<string, unknown>)
                                    : {};
                            const hoursRaw = item.hours ?? metrics.total_verified_hours ?? metrics.total_hours;
                            const hours =
                                typeof hoursRaw === "number" && Number.isFinite(hoursRaw)
                                    ? hoursRaw
                                    : typeof hoursRaw === "string" && Number.isFinite(Number(hoursRaw))
                                      ? Number(hoursRaw)
                                      : 0;
                            const ciiRaw = item.cii_provisional ?? item.ciiProvisional;
                            const ciiProvisional =
                                typeof ciiRaw === "number" && Number.isFinite(ciiRaw)
                                    ? ciiRaw
                                    : typeof ciiRaw === "string" && ciiRaw.trim() && Number.isFinite(Number(ciiRaw))
                                      ? Number(ciiRaw)
                                      : null;
                            const levelRaw = item.cii_numeric_level ?? item.ciiNumericLevel;
                            return {
                                id: String(item.id || ""),
                                student_name: pickStr(item, "student_name", "studentName") || "Student",
                                student_email: (() => {
                                    const email = pickStr(item, "student_email", "studentEmail");
                                    return email && email.includes("@") ? email : undefined;
                                })(),
                                project_title: pickStr(item, "project_title", "projectTitle") || "Report",
                                organization_name: pickStr(item, "organization_name", "organizationName"),
                                project_id: pickStr(item, "project_id", "projectId", "opportunity_id", "opportunityId"),
                                faculty_status: pickStr(item, "faculty_status", "facultyStatus"),
                                status: pickStr(item, "status"),
                                hours,
                                submission_date: pickStr(item, "submission_date", "submissionDate"),
                                report_submitted_at: pickStr(item, "report_submitted_at", "reportSubmittedAt"),
                                cii_analyser_run: item.cii_analyser_run === true || item.ciiAnalyserRun === true || ciiProvisional != null,
                                cii_provisional: ciiProvisional,
                                cii_locked:
                                    item.cii_locked === true ||
                                    item.cii_locked === "true" ||
                                    item.ciiLocked === true ||
                                    item.ciiLocked === "true",
                                cii_level_name: pickStr(item, "cii_level_name", "ciiLevelName") || null,
                                cii_numeric_level:
                                    typeof levelRaw === "number" && Number.isFinite(levelRaw)
                                        ? levelRaw
                                        : typeof levelRaw === "string" && Number.isFinite(Number(levelRaw))
                                          ? Number(levelRaw)
                                          : null,
                                university: pickStr(item, "university") || null,
                                faculty_name: pickStr(item, "faculty_name", "facultyName") || null,
                                story: pickStr(item, "story") || null,
                                evidence_count:
                                    typeof item.evidence_count === "number" && Number.isFinite(item.evidence_count)
                                        ? item.evidence_count
                                        : Number(item.evidence_count || 0) || 0,
                                participation_type: pickStr(item, "participation_type", "participationType") || "individual",
                                required_hours:
                                    typeof item.required_hours === "number" && Number.isFinite(item.required_hours)
                                        ? item.required_hours
                                        : 16,
                                member_hours: Array.isArray(item.member_hours)
                                    ? item.member_hours
                                          .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"))
                                          .map((row) => ({
                                              name: pickStr(row, "name") || "Student",
                                              hours: Number(row.hours || 0) || 0,
                                              required: Number(row.required || 16) || 16,
                                          }))
                                    : [],
                                updated_at: pickStr(item, "updated_at", "updatedAt"),
                            };
                        })
                        .filter((r: FacultyCsReportRow) => r.id),
                );
                setCards(Array.isArray(award?.data) ? award.data : []);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setRows([]);
                setCards([]);
                setMineRows([]);
                setPendingOppRows([]);
                setHistoryOppRows([]);
                setPendingAppRows([]);
                setHistoryAppRows([]);
                setHoursProjectCount(0);
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const liveRows = useMemo(() => rows.filter((r) => isFacultyCommunityLiveCard(r)), [rows]);
    const revisionReports = useMemo(() => rows.filter(isFacultyCsReportRevision), [rows]);
    const pendingReports = useMemo(
        () => rows.filter((r) => isFacultyCommunityWaiting(r) && !isFacultyCsReportRevision(r)),
        [rows],
    );
    const decidedReports = useMemo(
        () => rows.filter((r) => isFacultyCommunityLiveCard(r) || isCommunityReportRejected(r)),
        [rows],
    );
    const activeProjects = useMemo(
        () => rows.filter((r) => !isFacultyCommunityLiveCard(r) && !isCommunityReportRejected(r)),
        [rows],
    );
    const revisionOpps = useMemo(() => historyOppRows.filter(isFacultyCsOppRevision), [historyOppRows]);
    const deckCards = useMemo(() => {
        const liveIds = new Set(liveRows.map((r) => r.id));
        const byId = new Map<string, CommunityAwardCard>();
        for (const card of cards) {
            if (liveIds.has(card.id) || isFacultyCommunityLiveCard(card)) byId.set(card.id, card);
        }
        for (const row of liveRows) {
            if (!byId.has(row.id)) byId.set(row.id, reportRowToAwardCard(row));
        }
        return Array.from(byId.values());
    }, [cards, liveRows]);

    const inboxItems: FacultyInboxItem[] = useMemo(
        () => [
            ...pendingOppRows.map((row) => ({
                key: `opp-${row.id}`,
                kind: "opp" as const,
                title: row.projectTitle,
                meta: `${formatDisplayId(row.id, "OPP")} · ${row.studentName} · submitted ${row.submittedDate}`,
                href: `${FACULTY_CS_APPROVALS}?tab=pending&opportunity=${encodeURIComponent(row.id)}`,
                cta: "View Flashcard & Approve",
                studentEmail: row.studentEmail,
            })),
            ...pendingReports.map((row) => ({
                key: `rep-${row.id}`,
                kind: "report" as const,
                title: row.project_title,
                meta: `${formatDisplayId(row.id, "RPT")} · ${row.student_name}${row.hours ? ` · ${row.hours}h` : ""} · ${
                    typeof row.cii_provisional === "number"
                        ? `System CII ${Math.round(row.cii_provisional)} (Provisional)`
                        : "Analyzer not run"
                }`,
                href: `${FACULTY_CS_REPORTS}/${row.id}`,
                cta: "Open locked package",
                studentEmail: row.student_email,
            })),
        ],
        [pendingOppRows, pendingReports],
    );

    return {
        loading,
        rows,
        mineRows,
        pendingOppRows,
        historyOppRows,
        pendingAppRows,
        historyAppRows,
        hoursProjectCount,
        liveRows,
        pendingReports,
        revisionReports,
        decidedReports,
        activeProjects,
        revisionOpps,
        deckCards,
        inboxItems,
        pendingOppReviews: pendingOppRows.length,
        pendingApps: pendingAppRows.length,
    };
}
