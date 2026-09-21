/** Why this row appears for the logged-in faculty (see backend FacultyService.getApprovals). */
export type FacultyApprovalVisibility = "named_supervisor" | "university_scope" | "both";

/** Which approve/reject API the Faculty Hub must call (`partner_ack` uses `/partner/approvals`). */
export type FacultyApprovalAction = "faculty_review" | "partner_ack";

export type ApprovalHistoryEntry = {
    line: "faculty" | "partner" | "admin";
    action: "approved" | "rejected" | "revision_requested";
    actorId?: string | null;
    actorName?: string | null;
    at: string;
    version: number;
    reason?: string | null;
};

export type FacultyApprovalRow = {
    id: string;
    projectTitle: string;
    studentName: string;
    studentId: string;
    studentEmail?: string | null;
    submittedDate: string;
    totalHours?: number;
    eisScore?: number;
    sdg?: string;
    opportunityStatus?: string;
    workflowStage?: string | null;
    approvalVisibility?: FacultyApprovalVisibility;
    approvalAction?: FacultyApprovalAction;
    /** Approval-chain data — same fields the Create Opportunity tab's pipeline already uses. */
    requiresPartnerApproval?: boolean;
    facultyApprovalStatus?: string | null;
    partnerApprovalStatus?: string | null;
    adminApprovalStatus?: string | null;
    /** Creator role — lets NGO/Partner show "Acknowledge" instead of "Approve" when Faculty created it. */
    createdByRole?: string | null;
    version?: number;
    approvalHistory?: ApprovalHistoryEntry[];
};

function pickStr(raw: Record<string, unknown>, ...keys: string[]): string {
    for (const k of keys) {
        const v = raw[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
}

function pickApprovalVisibility(raw: Record<string, unknown>): FacultyApprovalVisibility | undefined {
    const v = pickStr(raw, "approvalVisibility", "approval_visibility");
    if (v === "named_supervisor" || v === "university_scope" || v === "both") return v;
    return undefined;
}

function pickApprovalAction(raw: Record<string, unknown>): FacultyApprovalAction | undefined {
    const v = pickStr(raw, "approvalAction", "approval_action").toLowerCase();
    if (v === "partner_ack") return "partner_ack";
    if (v === "faculty_review") return "faculty_review";
    return undefined;
}

function pickNum(raw: Record<string, unknown>, ...keys: string[]): number | undefined {
    for (const k of keys) {
        const v = raw[k];
        if (typeof v === "number" && !Number.isNaN(v)) return v;
        if (typeof v === "string" && v.trim() !== "") {
            const n = Number(v);
            if (!Number.isNaN(n)) return n;
        }
    }
    return undefined;
}

function pickBool(raw: Record<string, unknown>, ...keys: string[]): boolean | undefined {
    for (const k of keys) {
        const v = raw[k];
        if (typeof v === "boolean") return v;
    }
    return undefined;
}

function pickApprovalHistory(raw: Record<string, unknown>): ApprovalHistoryEntry[] | undefined {
    const v = raw.approvalHistory ?? raw.approval_history;
    if (!Array.isArray(v)) return undefined;
    const entries = v.filter(
        (x): x is ApprovalHistoryEntry =>
            !!x && typeof x === "object" && typeof (x as ApprovalHistoryEntry).line === "string",
    );
    return entries.length ? entries : undefined;
}

function formatSubmitted(raw: Record<string, unknown>): string {
    const s = pickStr(raw, "submittedDate", "submitted_at", "created_at", "submittedAt", "createdAt");
    if (!s) return "—";
    const t = Date.parse(s);
    if (!Number.isNaN(t)) return new Date(t).toLocaleDateString();
    return s;
}

export function extractFacultyApprovalsArray(payload: unknown): unknown[] {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object") {
        const o = payload as Record<string, unknown>;
        for (const k of ["data", "items", "opportunities", "results", "rows"] as const) {
            const v = o[k];
            if (Array.isArray(v)) return v;
        }
    }
    return [];
}

export function mapFacultyApprovalBackendRow(raw: unknown): FacultyApprovalRow | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const id = pickStr(r, "id", "opportunity_id", "project_id", "opportunityId");
    if (!id) return null;
    return {
        id,
        projectTitle: pickStr(r, "projectTitle", "project_title", "title") || "Student opportunity",
        studentName: pickStr(r, "studentName", "student_name", "creator_name", "student", "submitted_by_name") || "—",
        studentId: pickStr(r, "studentId", "student_id", "creator_id", "creatorId", "student_user_id") || "—",
        studentEmail: pickStr(r, "studentEmail", "student_email", "creator_email", "email") || null,
        submittedDate: formatSubmitted(r),
        totalHours: pickNum(r, "totalHours", "total_hours", "verified_hours"),
        eisScore: pickNum(r, "eisScore", "eis_score"),
        sdg: pickStr(r, "sdg", "primary_sdg", "sdg_label") || undefined,
        opportunityStatus: pickStr(r, "opportunityStatus", "status", "opportunity_status") || undefined,
        workflowStage: pickStr(r, "workflowStage", "workflow_stage", "approval_stage") || null,
        approvalVisibility: pickApprovalVisibility(r),
        approvalAction: pickApprovalAction(r),
        requiresPartnerApproval: pickBool(r, "requiresPartnerApproval", "requires_partner_approval"),
        facultyApprovalStatus: pickStr(r, "facultyApprovalStatus", "faculty_approval_status") || null,
        partnerApprovalStatus: pickStr(r, "partnerApprovalStatus", "partner_approval_status") || null,
        adminApprovalStatus: pickStr(r, "adminApprovalStatus", "admin_approval_status") || null,
        createdByRole: pickStr(r, "createdByRole", "created_by_role", "creator_role", "creatorRole") || null,
        version: pickNum(r, "version"),
        approvalHistory: pickApprovalHistory(r),
    };
}

export function normalizeFacultyApprovalsResponse(payload: unknown): FacultyApprovalRow[] {
    if (payload && typeof payload === "object" && (payload as Record<string, unknown>).success === false) {
        return [];
    }
    return extractFacultyApprovalsArray(payload)
        .map(mapFacultyApprovalBackendRow)
        .filter(Boolean) as FacultyApprovalRow[];
}
