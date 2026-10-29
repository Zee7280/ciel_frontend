import { authenticatedFetch } from "@/utils/api";
import type { QuickWorkLog, QuickWorkStatus } from "@/utils/quickWorkRules";

export const QUICK_WORK_HREF = "/dashboard/student/paths/community-service/quick-work";
export const FACULTY_QUICK_WORK_HREF = "/dashboard/faculty/quick-work";
export const QUICK_WORK_PRESIGN_PATH = "/api/v1/quick-work/evidence/presign";
/** Fired by the faculty review page after a decision so the sidebar badge recounts. */
export const QUICK_WORK_FACULTY_PENDING_EVENT = "ciel:quick-work-faculty-pending";

export type QuickWorkMine = {
    logs: QuickWorkLog[];
    totals: { approvedMinutes: number; pendingMinutes: number; approvedActivities: number };
};

/** `approveBlockedReason` is set when this faculty member may not approve (not authorised for the students' university). */
export type FacultyQuickWorkQueue = {
    pending: (QuickWorkLog & { approveBlockedReason?: string | null })[];
    reviewed: QuickWorkLog[];
};

export type QuickWorkReviewBody = { action: "approve" | "changes" | "reject"; note?: string; verified?: boolean };

export type AdminQuickWorkFilters = {
    status?: QuickWorkStatus | "";
    search?: string;
    university?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
};

export type AdminQuickWorkRow = {
    id: string;
    title: string;
    status: QuickWorkStatus;
    activityDate: string | null;
    university: string;
    department: string;
    leadName: string;
    leadEmail: string;
    facultyName: string;
    facultyEmail: string;
    facultyHasAccount: boolean;
    participantCount: number;
    minutes: number;
    evidenceCount: number;
    submittedAt: string | null;
    reviewedAt: string | null;
    createdAt: string;
};

export type AdminQuickWorkList = {
    rows: AdminQuickWorkRow[];
    total: number;
    page: number;
    limit: number;
    counts: Record<QuickWorkStatus, number>;
    approvedMinutes: number;
};

export type AdminQuickWorkDetail = QuickWorkLog & {
    facultyAccount: { exists: boolean; name: string | null; status: string | null; authorisedUniversity: string | null };
    history: { action: string; at: string; byUserId: string; note?: string; byName: string | null; byRole: string | null }[];
};

export type AdminQuickWorkExportRow = {
    logId: string;
    title: string;
    status: QuickWorkStatus;
    activityType: string;
    activityDate: string | null;
    university: string;
    department: string;
    location: string;
    partners: string;
    facultyName: string;
    facultyEmail: string;
    studentName: string;
    studentEmail: string;
    studentId: string;
    contact: string;
    role: "lead" | "teammate";
    joinStatus: string;
    present: boolean;
    startTime: string | null;
    endTime: string | null;
    breakMinutes: number;
    minutes: number;
    submittedAt: string | null;
    reviewedAt: string | null;
    reviewNote: string | null;
};

function filterQuery(f: AdminQuickWorkFilters): string {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) {
        if (v !== undefined && v !== null && String(v).trim() !== "") p.set(k, String(v).trim());
    }
    const q = p.toString();
    return q ? `?${q}` : "";
}

/** Thrown with every readable reason the API gave (Nest sends one string or a list). */
export class QuickWorkApiError extends Error {
    constructor(readonly messages: string[]) {
        super(messages.join(" "));
    }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await authenticatedFetch(`/api/v1${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    if (!res) throw new QuickWorkApiError(["Could not reach the server. Check your connection and try again."]);
    const json = (await res.json().catch(() => ({}))) as { data?: T; message?: string | string[] };
    if (!res.ok) {
        const raw = ([] as string[]).concat(json.message ?? []).filter((m) => typeof m === "string" && m.trim());
        throw new QuickWorkApiError(raw.length ? raw : [`Request failed (HTTP ${res.status}). Try again.`]);
    }
    return json.data as T;
}

export const quickWorkApi = {
    mine: () => call<QuickWorkMine>("/quick-work/me"),
    get: (id: string) => call<QuickWorkLog>(`/quick-work/logs/${encodeURIComponent(id)}`),
    create: (body: unknown) => call<QuickWorkLog>("/quick-work/logs", { method: "POST", body: JSON.stringify(body) }),
    save: (id: string, body: unknown) =>
        call<QuickWorkLog>(`/quick-work/logs/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (id: string) => call<{ deleted: boolean }>(`/quick-work/logs/${encodeURIComponent(id)}`, { method: "DELETE" }),
    submit: (id: string) => call<QuickWorkLog>(`/quick-work/logs/${encodeURIComponent(id)}/submit`, { method: "POST" }),
    join: (id: string, accept: boolean) =>
        call<QuickWorkLog>(`/quick-work/logs/${encodeURIComponent(id)}/join`, { method: "POST", body: JSON.stringify({ accept }) }),
    facultyQueue: () => call<FacultyQuickWorkQueue>("/faculty/quick-work"),
    review: (id: string, body: QuickWorkReviewBody) =>
        call<QuickWorkLog>(`/faculty/quick-work/${encodeURIComponent(id)}/review`, { method: "POST", body: JSON.stringify(body) }),
    adminList: (f: AdminQuickWorkFilters) => call<AdminQuickWorkList>(`/admin/quick-work${filterQuery(f)}`),
    adminExport: (f: AdminQuickWorkFilters) =>
        call<{ rows: AdminQuickWorkExportRow[]; truncated: boolean }>(`/admin/quick-work/export${filterQuery({ ...f, page: undefined, limit: undefined })}`),
    adminGet: (id: string) => call<AdminQuickWorkDetail>(`/admin/quick-work/${encodeURIComponent(id)}`),
    adminReassign: (id: string, body: { facultyName: string; facultyEmail: string; note?: string }) =>
        call<AdminQuickWorkDetail>(`/admin/quick-work/${encodeURIComponent(id)}/faculty`, { method: "PATCH", body: JSON.stringify(body) }),
    adminReview: (id: string, body: QuickWorkReviewBody) =>
        call<AdminQuickWorkDetail>(`/admin/quick-work/${encodeURIComponent(id)}/review`, { method: "POST", body: JSON.stringify(body) }),
};

/** Browsers cap a keepalive request body at 64 KB; a larger draft relies on autosave and the leave warning. */
const KEEPALIVE_MAX_BYTES = 60_000;

/**
 * Last-chance save while the tab is closing or reloading: `keepalive` lets the request finish after the
 * page unloads. Best effort only (never awaited, errors ignored); returns whether it was sent.
 */
export function saveQuickWorkOnLeave(id: string, body: unknown): boolean {
    const json = JSON.stringify(body);
    if (json.length > KEEPALIVE_MAX_BYTES) return false;
    void authenticatedFetch(
        `/api/v1/quick-work/logs/${encodeURIComponent(id)}`,
        { method: "PATCH", body: json, headers: { "Content-Type": "application/json" }, keepalive: true },
        { redirectToLogin: false },
    ).catch(() => undefined);
    return true;
}

/** Emailed pages are often opened signed out (e.g. inside a mail app): go through login, then back to `path`. */
export function dashboardLink(path: string, signedIn: boolean): string {
    return signedIn ? path : `/login?next=${encodeURIComponent(path)}`;
}

/** Whether this browser holds a CIEL session. Read after mount (false on the server). */
export function hasStoredSession(): boolean {
    try {
        return Boolean(localStorage.getItem("ciel_token"));
    } catch {
        return false;
    }
}

/** Faculty sidebar badge: logs awaiting this faculty member's review, or null when unavailable. */
export async function fetchFacultyQuickWorkPending(): Promise<number | null> {
    try {
        const res = await authenticatedFetch("/api/v1/faculty/quick-work/pending-count", {}, { redirectToLogin: false });
        if (!res || !res.ok) return null;
        const body = (await res.json().catch(() => null)) as { data?: { pending?: unknown } } | null;
        const n = Number(body?.data?.pending);
        return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
    } catch {
        return null;
    }
}

/** What the public certificate check returns: that certificate's own facts only. */
export type QuickWorkCertificateCheck = {
    code: string;
    valid: true;
    holderName: string;
    title: string;
    activityType: string;
    activityDate: string | null;
    minutes: number;
    university: string;
    participation: "team" | "individual";
    teamSize: number;
    sdg: number | null;
    verifiedAt: string | null;
};

/** Signed-out check behind a certificate's QR code / ID. Throws with the API's reason (e.g. no such certificate). */
export async function verifyQuickWorkCertificate(code: string): Promise<QuickWorkCertificateCheck> {
    let res: Response;
    try {
        res = await fetch(`/api/v1/quick-work/certificates/${encodeURIComponent(code.trim())}`);
    } catch {
        throw new QuickWorkApiError(["Could not reach CIEL PK. Check your connection and try again."]);
    }
    const json = (await res.json().catch(() => ({}))) as { data?: QuickWorkCertificateCheck; message?: string | string[] };
    if (!res.ok || !json.data) {
        const raw = ([] as string[]).concat(json.message ?? []).filter((m) => typeof m === "string" && m.trim());
        throw new QuickWorkApiError(raw.length ? raw : ["This certificate could not be verified. Check the ID and try again."]);
    }
    return json.data;
}

export function apiMessages(err: unknown): string[] {
    if (err instanceof QuickWorkApiError) return err.messages;
    if (err instanceof Error && err.message) return [err.message];
    return ["Something went wrong. Try again."];
}
