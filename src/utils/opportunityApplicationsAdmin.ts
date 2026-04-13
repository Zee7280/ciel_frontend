import { authenticatedFetch } from "@/utils/api";

/**
 * Normalize GET /admin/applications and GET /faculty/applications list rows.
 */

export type OpportunityApplicationListRow = {
    id: string;
    opportunityId: string;
    opportunityTitle: string;
    studentName: string;
    studentEmail: string;
    status: string;
    createdAt?: string;
    /** Join pipeline stage from API (e.g. faculty → admin). */
    applicationStage?: string;
    /** When faculty step is done (any supported key from backend). */
    facultyApprovedAt?: string;
    facultyReviewerName?: string;
    facultyApprovalStatus?: string;
    primaryFacultyEmail?: string;
};

function pickStr(raw: Record<string, unknown>, ...keys: string[]): string {
    for (const k of keys) {
        const v = raw[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
}

export function extractOpportunityApplicationsArray(payload: unknown): unknown[] {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object") {
        const o = payload as Record<string, unknown>;
        for (const k of ["data", "items", "applications", "results", "rows"] as const) {
            const v = o[k];
            if (Array.isArray(v)) return v;
        }
    }
    return [];
}

export function mapOpportunityApplicationListRow(raw: unknown): OpportunityApplicationListRow | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const id = pickStr(r, "id", "application_id", "applicationId");
    if (!id) return null;
    const opportunityId = pickStr(r, "opportunity_id", "opportunityId", "project_id", "projectId");
    const applicationStage = pickStr(r, "application_stage", "applicationStage", "stage") || undefined;
    const facultyApprovalStatus = pickStr(
        r,
        "faculty_approval_status",
        "facultyApprovalStatus",
        "faculty_review_status",
        "facultyReviewStatus",
        "faculty_status",
    ) || undefined;

    return {
        id,
        opportunityId: opportunityId || "—",
        opportunityTitle: pickStr(r, "opportunity_title", "opportunityTitle", "title", "project_title", "projectTitle") || "Opportunity",
        studentName: pickStr(r, "student_name", "studentName", "applicant_name", "name") || "—",
        studentEmail: pickStr(r, "student_email", "studentEmail", "applicant_email", "email") || "",
        status: pickStr(r, "status", "application_status", "applicationStatus") || "pending_approval",
        createdAt: pickStr(r, "created_at", "createdAt", "submitted_at", "submittedAt") || undefined,
        applicationStage,
        facultyApprovedAt:
            pickStr(
                r,
                "faculty_approved_at",
                "facultyApprovedAt",
                "faculty_reviewed_at",
                "facultyReviewedAt",
                "reviewed_by_faculty_at",
            ) || undefined,
        facultyReviewerName: pickStr(r, "faculty_reviewer_name", "facultyReviewerName", "reviewed_by_faculty_name") || undefined,
        facultyApprovalStatus,
        primaryFacultyEmail: pickStr(r, "primary_faculty_email", "primaryFacultyEmail", "faculty_email") || undefined,
    };
}

export function normalizeOpportunityApplicationsListResponse(payload: unknown): OpportunityApplicationListRow[] {
    if (payload && typeof payload === "object" && (payload as Record<string, unknown>).success === false) {
        return [];
    }
    return extractOpportunityApplicationsArray(payload)
        .map(mapOpportunityApplicationListRow)
        .filter(Boolean) as OpportunityApplicationListRow[];
}

/**
 * Backends vary: some accept `status=history`, others use `completed`, `past`, etc.
 * Try in order until one returns HTTP 2xx from the proxy.
 */
export const ADMIN_APPLICATIONS_HISTORY_STATUS_TRY_ORDER = [
    "history",
    "completed",
    "past",
    "resolved",
    "archived",
    "processed",
] as const;

type JoinApplicationsListPath = "/api/v1/admin/applications" | "/api/v1/faculty/applications";

/** Try several `status` query values — many backends reject `history` (400) but accept `completed`, etc. */
export async function fetchJoinApplicationsHistoryRows(
    listPath: JoinApplicationsListPath,
): Promise<{ rows: OpportunityApplicationListRow[]; matchedStatus: string | null }> {
    for (const status of ADMIN_APPLICATIONS_HISTORY_STATUS_TRY_ORDER) {
        const res = await authenticatedFetch(`${listPath}?status=${encodeURIComponent(status)}`);
        if (res?.ok) {
            const j = await res.json();
            return {
                rows: normalizeOpportunityApplicationsListResponse(j),
                matchedStatus: status,
            };
        }
    }
    return { rows: [], matchedStatus: null };
}
