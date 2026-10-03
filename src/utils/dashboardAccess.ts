import type { DashboardNavRole } from "@/utils/dashboardNavRole";

const ROLE_SLUGS = new Set<DashboardNavRole>(["admin", "partner", "faculty", "investor", "student"]);

/** `/dashboard/<slug>/…` → slug, only when it is one of the role dashboards (else null). */
export function dashboardRoleSlug(pathname: string): DashboardNavRole | null {
    const m = /^\/dashboard\/([^/]+)/.exec(pathname || "");
    const slug = (m?.[1] ?? "") as DashboardNavRole;
    return ROLE_SLUGS.has(slug) ? slug : null;
}

export type DashboardAccessDecision =
    | { action: "allow" }
    | { action: "login" }
    | { action: "redirect"; to: string };

/**
 * UX-level role gate for every dashboard page (the backend stays the authority).
 *  - signed out / expired token  → login
 *  - a role dashboard that isn't the user's own → the user's own dashboard
 */
export function decideDashboardAccess(input: {
    pathname: string;
    tokenValid: boolean;
    role: DashboardNavRole | null;
}): DashboardAccessDecision {
    const slug = dashboardRoleSlug(input.pathname);
    if (!slug) return { action: "allow" };
    if (!input.tokenValid) return { action: "login" };
    if (!input.role) return { action: "login" };
    if (input.role !== slug) return { action: "redirect", to: `/dashboard/${input.role}` };
    return { action: "allow" };
}
