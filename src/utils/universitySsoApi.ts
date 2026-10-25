import { authenticatedFetch } from "@/utils/api";

/** Platform switch (Admin → Settings → Platform access). Each university is also activated on its own. */
export const UNIVERSITY_SSO_ENABLED_KEY = "UNIVERSITY_SSO_ENABLED";

export type SsoProvider = "google" | "microsoft" | "oidc";
export type SsoStatus = "draft" | "active" | "disabled";

export const SSO_PROVIDER_OPTIONS: { value: SsoProvider; label: string; hint: string }[] = [
    { value: "google", label: "Google Workspace", hint: "Google Cloud Console → OAuth client (Web application)" },
    { value: "microsoft", label: "Microsoft 365", hint: "Entra ID → App registration (single tenant)" },
    { value: "oidc", label: "Other (OpenID Connect)", hint: "Any provider with a /.well-known/openid-configuration" },
];

export const SSO_STATUS_LABEL: Record<SsoStatus, string> = {
    draft: "Draft",
    active: "Active",
    disabled: "Disabled",
};

export type UniversitySsoView = {
    organizationId: string;
    organizationName: string;
    status: SsoStatus;
    provider: SsoProvider;
    providerLabel: string;
    issuer: string | null;
    tenantId: string | null;
    discoveryUrl: string;
    clientId: string;
    hasClientSecret: boolean;
    allowedDomains: string[];
    redirectUri: string;
    activatedAt: string | null;
    lastTestAt: string | null;
    lastTestOk: boolean | null;
    lastTestNote: string | null;
    lastSignInAt: string | null;
    signInCount: number;
    updatedAt: string;
};

export type UniversitySsoDetail = {
    enabled: boolean;
    organizationId: string;
    organizationName: string;
    isUniversity: boolean;
    redirectUri: string;
    sso: UniversitySsoView | null;
};

export type UniversitySsoList = {
    enabled: boolean;
    redirectUri: string;
    universities: UniversitySsoView[];
};

export type UniversitySsoUpsert = {
    provider: SsoProvider;
    issuer?: string;
    tenantId?: string;
    clientId: string;
    /** Leave out to keep the stored secret. */
    clientSecret?: string;
    allowedDomains: string[];
};

/** Thrown with every readable reason the API gave (Nest sends one string or a list). */
export class UniversitySsoApiError extends Error {
    constructor(
        readonly messages: string[],
        readonly status = 0,
    ) {
        super(messages.join(" "));
    }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await authenticatedFetch(
        `/api/v1/admin/university-sso${path}`,
        { ...init, headers: { "Content-Type": "application/json", ...(init.headers ?? {}) } },
        { redirectToLogin: false },
    );
    if (!res) throw new UniversitySsoApiError(["Could not reach the server. Check your connection and try again."]);
    const json = (await res.json().catch(() => ({}))) as { data?: T; message?: string | string[] };
    if (!res.ok) {
        if (res.status === 403) throw new UniversitySsoApiError(["Only super admins can manage university single sign-on."], 403);
        const raw = ([] as string[]).concat(json.message ?? []).filter((m) => typeof m === "string" && m.trim());
        throw new UniversitySsoApiError(raw.length ? raw : [`Request failed (HTTP ${res.status}). Try again.`], res.status);
    }
    return json.data as T;
}

const org = (id: string) => `/${encodeURIComponent(id)}`;

export const universitySsoApi = {
    list: () => call<UniversitySsoList>(""),
    get: (organizationId: string) => call<UniversitySsoDetail>(org(organizationId)),
    save: (organizationId: string, body: UniversitySsoUpsert) =>
        call<UniversitySsoView>(org(organizationId), { method: "PUT", body: JSON.stringify(body) }),
    testLink: (organizationId: string) => call<{ url: string; expiresAt: string }>(`${org(organizationId)}/test-link`, { method: "POST" }),
    activate: (organizationId: string, skipTest = false) =>
        call<UniversitySsoView>(`${org(organizationId)}/activate`, { method: "POST", body: JSON.stringify(skipTest ? { skipTest: true } : {}) }),
    disable: (organizationId: string) => call<UniversitySsoView>(`${org(organizationId)}/disable`, { method: "POST" }),
    remove: (organizationId: string) => call<{ removed: boolean }>(org(organizationId), { method: "DELETE" }),
};

export function ssoErrorMessage(err: unknown): string {
    if (err instanceof Error && err.message) return err.message;
    return "Something went wrong. Try again.";
}

/** Domains typed as "uni.edu.pk, @dept.uni.edu.pk" or one per line. */
export function parseDomainList(raw: string): string[] {
    return Array.from(
        new Set(
            raw
                .split(/[\s,;]+/)
                .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
                .filter(Boolean),
        ),
    );
}
