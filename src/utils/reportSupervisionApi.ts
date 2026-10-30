/**
 * Faculty supervision before an impact report starts: the named primary faculty supervisor confirms
 * the student (or team) first. Every read treats a missing endpoint (older backend) as "no gate".
 */
import { authenticatedFetch } from "@/utils/api";

export const FACULTY_REPORT_SUPERVISION_HREF = "/dashboard/faculty/report-supervision";

export type ReportSupervisionState = {
    required: boolean;
    confirmed: boolean;
    blocked: boolean;
    report_started: boolean;
    faculty_email: string | null;
    faculty_name: string | null;
    faculty_registered: boolean;
    confirmed_at: string | null;
    requested_at: string | null;
};

export type FacultySupervisionRow = {
    participation_id: string;
    opportunity_id: string;
    opportunity_title: string;
    student_name: string;
    student_email: string | null;
    university: string | null;
    department: string | null;
    participation_type: "team" | "individual";
    team_members: Array<{ name: string; email: string | null; lead: boolean }>;
    requested_at: string | null;
    confirmed_at: string | null;
    /** The faculty email the seat waits on (newer API). */
    faculty_email?: string | null;
};

async function readJson<T>(res: Response | null | undefined): Promise<T | null> {
    if (!res) return null;
    return (await res.json().catch(() => null)) as T | null;
}

function messageOf(body: unknown, fallback: string): string {
    const m = (body as { message?: unknown } | null)?.message;
    if (Array.isArray(m)) return m.filter(Boolean).join(" ") || fallback;
    return typeof m === "string" && m.trim() ? m : fallback;
}

/** Null when unknown (older backend, network): callers then show no gate. */
export async function fetchReportSupervision(projectId: string): Promise<ReportSupervisionState | null> {
    try {
        const res = await authenticatedFetch(`/api/v1/student/reports/${encodeURIComponent(projectId)}/supervision`, {}, { redirectToLogin: false });
        if (!res?.ok) return null;
        const body = await readJson<{ data?: ReportSupervisionState }>(res);
        return body?.data && typeof body.data.blocked === "boolean" ? body.data : null;
    } catch {
        return null;
    }
}

/** "30 Oct 2026, 14:05 (PKT)" for the throttle notice. */
export function formatPktDateTime(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? iso
        : `${d.toLocaleString("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} (PKT)`;
}

export async function remindReportSupervision(projectId: string): Promise<{ ok: boolean; message: string }> {
    try {
        const res = await authenticatedFetch(`/api/v1/student/reports/${encodeURIComponent(projectId)}/supervision/remind`, { method: "POST" });
        const body = await readJson<{ sent?: boolean; message?: string; next_allowed_at?: string }>(res);
        if (res?.ok && body?.sent === false && body.next_allowed_at) {
            // Throttled, not failed: one email per 12 hours.
            return { ok: true, message: `A reminder was already sent recently. You can send the next one after ${formatPktDateTime(body.next_allowed_at)}.` };
        }
        return { ok: Boolean(res?.ok && body?.sent), message: messageOf(body, "The reminder could not be sent. Try again later.") };
    } catch {
        return { ok: false, message: "Could not reach CIEL PK. Check your connection and try again." };
    }
}

export async function fetchFacultySupervisionRequests(): Promise<{ pending: FacultySupervisionRow[]; confirmed: FacultySupervisionRow[] } | null> {
    try {
        const res = await authenticatedFetch("/api/v1/faculty/report-supervision", {}, { redirectToLogin: false });
        if (!res?.ok) return null;
        const body = await readJson<{ data?: { pending?: FacultySupervisionRow[]; confirmed?: FacultySupervisionRow[] } }>(res);
        return { pending: body?.data?.pending ?? [], confirmed: body?.data?.confirmed ?? [] };
    } catch {
        return null;
    }
}

/** CIEL PK admin: every seat still waiting for its faculty's confirmation, across all faculty. */
export async function fetchAdminSupervisionRequests(): Promise<FacultySupervisionRow[] | null> {
    try {
        const res = await authenticatedFetch("/api/v1/admin/report-supervision", {}, { redirectToLogin: false });
        if (!res?.ok) return null;
        const body = await readJson<{ data?: { pending?: FacultySupervisionRow[] } }>(res);
        return body?.data?.pending ?? [];
    } catch {
        return null;
    }
}

/** Faculty confirms (or CIEL PK admin on their behalf). */
export async function confirmReportSupervision(participationId: string): Promise<{ ok: boolean; message: string }> {
    try {
        const res = await authenticatedFetch(`/api/v1/faculty/report-supervision/${encodeURIComponent(participationId)}/confirm`, { method: "POST" });
        const body = await readJson<Record<string, unknown>>(res);
        return res?.ok
            ? { ok: true, message: "Confirmed. The student can now start the report." }
            : { ok: false, message: messageOf(body, "Could not confirm. Try again.") };
    } catch {
        return { ok: false, message: "Could not reach CIEL PK. Check your connection and try again." };
    }
}
