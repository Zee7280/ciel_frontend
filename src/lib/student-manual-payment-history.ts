import { authenticatedFetch } from "@/utils/api";

/** Logged-in student id from persisted session (matches other student flows). */
export function readStudentIdFromCielUser(): string | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem("ciel_user");
        if (!raw) return null;
        const u = JSON.parse(raw) as { id?: string; studentId?: string; userId?: string };
        const id = u.id ?? u.studentId ?? u.userId;
        return id != null && String(id).trim() !== "" ? String(id) : null;
    } catch {
        return null;
    }
}

export type StudentManualPaymentStatus = "pending" | "approved" | "rejected";

export interface StudentManualPaymentOpportunity {
    id: string;
    title: string;
    status: string;
    organizationName: string | null;
}

export interface StudentManualPaymentHistoryRow {
    payment: {
        id: string;
        status: StudentManualPaymentStatus;
        amount: string;
        paidAmountPkr: number | null;
        proofUrl: string;
        feedback: string | null;
        submittedAt: string;
        updatedAt: string;
    };
    opportunityId: string | null;
    opportunity: StudentManualPaymentOpportunity | null;
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string {
    for (const k of keys) {
        const v = obj[k];
        if (v != null && String(v).trim() !== "") return String(v);
    }
    return "";
}

function pickStrOrNull(obj: Record<string, unknown>, keys: string[]): string | null {
    const s = pickStr(obj, keys);
    return s === "" ? null : s;
}

function pickPaidAmountPkr(obj: Record<string, unknown>): number | null {
    const keys = ["paid_amount", "paidAmount"];
    for (const k of keys) {
        const v = obj[k];
        if (v == null) continue;
        if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
        const n = Number(String(v).replace(/,/g, ""));
        if (Number.isFinite(n) && !Number.isNaN(n)) return Math.round(n);
    }
    return null;
}

function normalizeStatus(raw: string): StudentManualPaymentStatus {
    const s = raw.toLowerCase();
    if (s === "approved" || s === "rejected" || s === "pending") return s;
    return "pending";
}

function normalizeOpportunity(raw: unknown): StudentManualPaymentOpportunity | null {
    if (!raw || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;
    const id = pickStr(o, ["id"]);
    if (!id) return null;
    let organizationName = pickStrOrNull(o, ["organizationName", "organization_name"]);
    const org = o.organization;
    if (organizationName == null && org && typeof org === "object") {
        organizationName = pickStrOrNull(org as Record<string, unknown>, ["name"]);
    }
    return {
        id,
        title: pickStr(o, ["title"]),
        status: pickStr(o, ["status"]),
        organizationName,
    };
}

/** Accepts flat API rows or `{ payment: { … } }` wrappers; tolerates snake_case. */
export function normalizeStudentManualPaymentHistoryItem(raw: unknown): StudentManualPaymentHistoryRow | null {
    if (!raw || typeof raw !== "object") return null;
    const row = raw as Record<string, unknown>;
    const paymentSource =
        typeof row.payment === "object" && row.payment !== null ? (row.payment as Record<string, unknown>) : row;

    const id = pickStr(paymentSource, ["id"]);
    if (!id) return null;

    const status = normalizeStatus(pickStr(paymentSource, ["status"]));
    const amount = pickStr(paymentSource, ["amount"]);
    const proofUrl = pickStr(paymentSource, ["proofUrl", "proof_url"]);
    const feedback = pickStrOrNull(paymentSource, ["feedback", "admin_feedback", "adminFeedback"]);
    const submittedAt = pickStr(paymentSource, ["submittedAt", "submitted_at", "created_at", "createdAt"]);
    const updatedAt = pickStr(paymentSource, ["updatedAt", "updated_at"]);
    const paidAmountPkr = pickPaidAmountPkr(paymentSource);

    const opportunityId = pickStrOrNull(row, ["opportunityId", "opportunity_id"]);
    const opportunity = normalizeOpportunity(row.opportunity);

    return {
        payment: {
            id,
            status,
            amount: amount || "—",
            paidAmountPkr,
            proofUrl,
            feedback,
            submittedAt: submittedAt || "",
            updatedAt: updatedAt || submittedAt || "",
        },
        opportunityId: opportunityId ?? (opportunity?.id ?? null),
        opportunity,
    };
}

export function parseStudentManualPaymentHistoryResponse(payload: unknown): StudentManualPaymentHistoryRow[] {
    if (!payload || typeof payload !== "object") return [];
    const obj = payload as { data?: unknown };
    const data = obj.data;
    let list: unknown[] = [];
    if (Array.isArray(data)) {
        list = data;
    } else if (data && typeof data === "object" && Array.isArray((data as { payments?: unknown[] }).payments)) {
        list = (data as { payments: unknown[] }).payments;
    } else {
        return [];
    }
    return list.map(normalizeStudentManualPaymentHistoryItem).filter((x): x is StudentManualPaymentHistoryRow => x != null);
}

/** GET `/api/v1/student/payments/history?studentId=…` → backend `student/payments/history` (newest first). */
export async function fetchStudentManualPaymentHistory(
    config: { redirectToLogin?: boolean; studentId?: string | null } = {},
): Promise<StudentManualPaymentHistoryRow[]> {
    const { redirectToLogin = true, studentId: studentIdOpt } = config;
    const studentId = studentIdOpt !== undefined ? studentIdOpt : readStudentIdFromCielUser();
    const qs =
        studentId != null && String(studentId).trim() !== ""
            ? `?studentId=${encodeURIComponent(String(studentId).trim())}`
            : "";
    try {
        const res = await authenticatedFetch(`/api/v1/student/payments/history${qs}`, { method: "GET" }, { redirectToLogin });
        if (!res?.ok) return [];
        const json = await res.json().catch(() => null);
        if (!json || typeof json !== "object") return [];
        if ((json as { success?: boolean }).success !== true) return [];
        return parseStudentManualPaymentHistoryResponse(json);
    } catch {
        return [];
    }
}
