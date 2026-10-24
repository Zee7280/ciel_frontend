import { authenticatedFetch } from "@/utils/api";
import type { QuickWorkLog } from "@/utils/quickWorkRules";

export const QUICK_WORK_HREF = "/dashboard/student/paths/community-service/quick-work";
export const QUICK_WORK_PRESIGN_PATH = "/api/v1/quick-work/evidence/presign";

export type QuickWorkMine = {
    logs: QuickWorkLog[];
    totals: { approvedMinutes: number; pendingMinutes: number; approvedActivities: number };
};

export type FacultyQuickWorkQueue = { pending: QuickWorkLog[]; reviewed: QuickWorkLog[] };

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
    review: (id: string, body: { action: "approve" | "changes" | "reject"; note?: string; verified?: boolean }) =>
        call<QuickWorkLog>(`/faculty/quick-work/${encodeURIComponent(id)}/review`, { method: "POST", body: JSON.stringify(body) }),
};

export function apiMessages(err: unknown): string[] {
    if (err instanceof QuickWorkApiError) return err.messages;
    if (err instanceof Error && err.message) return [err.message];
    return ["Something went wrong. Try again."];
}
