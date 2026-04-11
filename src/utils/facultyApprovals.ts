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
};

function pickStr(raw: Record<string, unknown>, ...keys: string[]): string {
    for (const k of keys) {
        const v = raw[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
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
