import { authenticatedFetch } from "@/utils/api";

/** Accepts `data[]`, `items[]`, or nested `{ data: { items } }` from the engagement API. */
export function extractPendingAttendanceRows(json: unknown): Record<string, unknown>[] {
    if (Array.isArray(json)) {
        return json.filter((item): item is Record<string, unknown> => item != null && typeof item === "object");
    }
    if (json == null || typeof json !== "object") return [];
    const root = json as Record<string, unknown>;
    const asRows = (v: unknown): Record<string, unknown>[] | null => {
        if (!Array.isArray(v)) return null;
        return v.filter((item): item is Record<string, unknown> => item != null && typeof item === "object");
    };
    for (const key of ["data", "items", "rows", "records", "logs"] as const) {
        const top = asRows(root[key]);
        if (top) return top;
    }
    const dataObj = root.data;
    if (dataObj != null && typeof dataObj === "object" && !Array.isArray(dataObj)) {
        const inner = dataObj as Record<string, unknown>;
        for (const key of ["items", "rows", "records", "logs", "attendance", "list", "pending"] as const) {
            const nested = asRows(inner[key]);
            if (nested) return nested;
        }
    }
    return [];
}

/** Fetches the pending-engagement queue and returns the row count (0 on error). */
export async function fetchPendingAttendanceCountForProject(projectId: string): Promise<number> {
    if (!projectId.trim()) return 0;
    try {
        const res = await authenticatedFetch(
            `/api/v1/engagement/attendance/pending?projectId=${encodeURIComponent(projectId.trim())}`,
        );
        if (!res?.ok) return 0;
        const json = await res.json();
        return extractPendingAttendanceRows(json).length;
    } catch {
        return 0;
    }
}
