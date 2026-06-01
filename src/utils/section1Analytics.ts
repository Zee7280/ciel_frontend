import { authenticatedFetch, resolveSameOriginApiPath } from "@/utils/api";

export type Section1AnalyticsFieldMeta = {
    category: "basic" | "premium" | "restricted";
    presentation: string;
};

export type Section1AnalyticsPayload = {
    stakeholder: string;
    scope: "project" | "aggregate";
    project_id?: string;
    student_id?: string;
    organization_id?: string;
    fields: Record<string, unknown>;
    meta: Record<string, Section1AnalyticsFieldMeta>;
};

export type Section1AnalyticsResponse = {
    success: boolean;
    data?: Section1AnalyticsPayload;
    message?: string;
};

export async function fetchSection1Analytics(
    apiPath: string,
    query?: Record<string, string | undefined>,
): Promise<Section1AnalyticsPayload | null> {
    const params = new URLSearchParams();
    if (query) {
        for (const [k, v] of Object.entries(query)) {
            const s = (v ?? "").trim();
            if (s) params.set(k, s);
        }
    }
    const qs = params.toString();
    const path = qs ? `${apiPath}?${qs}` : apiPath;
    const url = resolveSameOriginApiPath(path);

    try {
        const res = await authenticatedFetch(url, {}, { redirectToLogin: false, timeoutMs: 45_000 });
        if (!res || !res.ok) return null;
        const json = (await res.json().catch(() => null)) as Section1AnalyticsResponse | null;
        if (!json?.success || !json.data?.fields) return null;
        return json.data;
    } catch {
        return null;
    }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return !!v && typeof v === "object" && !Array.isArray(v);
}

export function formatSection1FieldValue(value: unknown): string {
    if (value == null) return "—";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) {
        if (value.length === 0) return "—";
        if (isPlainObject(value[0]) && "label" in value[0] && "count" in value[0]) {
            return value
                .slice(0, 3)
                .map((row) => `${String((row as { label?: string }).label ?? "?")}: ${String((row as { count?: number }).count ?? 0)}`)
                .join(" · ");
        }
        return `${value.length} items`;
    }
    if (isPlainObject(value)) {
        if ("percent" in value && typeof value.percent === "number") return `${value.percent}%`;
        if ("score" in value && typeof value.score === "number") return `${value.score}`;
        if ("status" in value && typeof value.status === "string") return value.status;
        if ("verified_hours" in value && "required_hours" in value) {
            return `${value.verified_hours ?? 0} / ${value.required_hours ?? 0} hrs`;
        }
        if ("current_step" in value && "total_steps" in value) {
            return `Step ${value.current_step ?? 0} of ${value.total_steps ?? 0}`;
        }
        if ("count" in value) return String(value.count);
        if ("enabled" in value) return value.enabled ? "Yes" : "No";
        if ("linked" in value) return value.linked ? "Linked" : "Not linked";
        if ("active" in value) return value.active ? "Warning" : "OK";
        try {
            return JSON.stringify(value);
        } catch {
            return "—";
        }
    }
    return String(value);
}

export function section1FieldLabel(key: string): string {
    return key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Preferred display order for common Section 1 compliance fields. */
export const SECTION1_PRIMARY_FIELD_KEYS = [
    "project_title",
    "section_1_status",
    "progress_mode_status",
    "current_report_step",
    "hours_status_in_header",
    "identity_verification_status",
    "section_1_completion_rate",
    "attendance_logging_unlock_status",
    "team_configuration_status",
    "verified_participation_via_audit_ready_logs",
    "academic_linkage_to_official_student_records",
    "section_1_readiness_score",
] as const;

export function orderedSection1FieldEntries(payload: Section1AnalyticsPayload): Array<[string, unknown]> {
    const entries = Object.entries(payload.fields);
    const order = new Map(SECTION1_PRIMARY_FIELD_KEYS.map((k, i) => [k, i]));
    return entries.sort(([a], [b]) => {
        const ai = order.get(a as (typeof SECTION1_PRIMARY_FIELD_KEYS)[number]);
        const bi = order.get(b as (typeof SECTION1_PRIMARY_FIELD_KEYS)[number]);
        if (ai != null && bi != null) return ai - bi;
        if (ai != null) return -1;
        if (bi != null) return 1;
        return a.localeCompare(b);
    });
}
