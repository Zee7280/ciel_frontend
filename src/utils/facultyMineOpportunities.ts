/** Normalize faculty `/opportunities/faculty/mine` payloads (flat `data[]`, nested wrappers, Mongo-style `_id`). */
export function extractFacultyMineOpportunityRows(payload: unknown): Record<string, unknown>[] {
    if (Array.isArray(payload)) {
        return payload.filter((x): x is Record<string, unknown> => x != null && typeof x === "object");
    }
    if (payload == null || typeof payload !== "object") return [];
    const root = payload as Record<string, unknown>;
    if (root.success === false) return [];

    const asObjectRows = (v: unknown): Record<string, unknown>[] | null => {
        if (!Array.isArray(v)) return null;
        return v.filter((x): x is Record<string, unknown> => x != null && typeof x === "object");
    };

    const top = asObjectRows(root.data);
    if (top) return top;

    if (root.data != null && typeof root.data === "object" && !Array.isArray(root.data)) {
        const inner = root.data as Record<string, unknown>;
        for (const key of ["opportunities", "items", "rows", "records", "list"] as const) {
            const nested = asObjectRows(inner[key]);
            if (nested) return nested;
        }
    }

    for (const key of ["opportunities", "items", "rows"] as const) {
        const direct = asObjectRows(root[key]);
        if (direct) return direct;
    }

    return [];
}
