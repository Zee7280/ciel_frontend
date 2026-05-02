import { isPartnerRole } from "@/utils/profileCompletion";

export type DashboardNavRole = "student" | "partner" | "faculty" | "admin";

/**
 * Home URL under `/dashboard/*` for a stored API role.
 * Partner org types (ngo, corporate, university, etc.) all use `/dashboard/partner`, not `/dashboard/{role}`.
 */
export function getDashboardHomePathForRole(rawRole: unknown): string {
    const r = String(rawRole ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
    if (!r) return "/dashboard/student";
    if (isPartnerRole(r)) return "/dashboard/partner";
    if (r === "admin" || r === "super_admin") return "/dashboard/admin";
    if (r === "faculty") return "/dashboard/faculty";
    if (r === "student") return "/dashboard/student";
    return "/dashboard/student";
}

/** Role segment implied by the URL (used before client reads `localStorage`). */
export function dashboardNavRoleFromPathname(pathname: string): DashboardNavRole {
    if (pathname.includes("/dashboard/admin")) return "admin";
    if (pathname.includes("/dashboard/partner")) return "partner";
    if (pathname.includes("/dashboard/faculty")) return "faculty";
    return "student";
}

function mapNormalizedStoredRoleToken(role: string): DashboardNavRole | null {
    if (!role) return null;
    if (isPartnerRole(role)) return "partner";
    if (role === "admin" || role === "super_admin") return "admin";
    if (role === "faculty") return "faculty";
    return "student";
}

/**
 * Prefer the signed-in user's role for dashboard chrome (sidebar / header).
 * Fixes admins opening e.g. `/dashboard/student/browse/:id` from admin tools
 * without switching the shell to the student layout.
 *
 * Also reads alternate keys / nested `user.role` so marketing Navbar "Projects"
 * does not fall through to `/dashboard/student/projects` for faculty after profile merges.
 */
export function readDashboardNavRoleFromStorage(): DashboardNavRole | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
        if (!raw) return null;
        const u = JSON.parse(raw) as Record<string, unknown>;

        const nested = u.user;
        const nestedUser =
            nested && typeof nested === "object" && !Array.isArray(nested) ? (nested as Record<string, unknown>) : null;

        const roleCandidates = [u.role, u.user_role, u.userRole, nestedUser?.role];
        for (const token of roleCandidates) {
            const role = String(token ?? "")
                .trim()
                .toLowerCase()
                .replace(/\s+/g, "_");
            if (!role) continue;
            return mapNormalizedStoredRoleToken(role);
        }

        const fid = u.faculty_id ?? u.facultyId;
        if (fid != null && String(fid).trim() !== "") return "faculty";

        const fd = u.faculty_department;
        if (typeof fd === "string" && fd.trim() !== "") return "faculty";

        return null;
    } catch {
        return null;
    }
}
