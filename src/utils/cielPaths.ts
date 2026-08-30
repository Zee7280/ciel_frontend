import type { CielPathKey } from "./cielImpactSummary";

export interface CielPathMeta {
    key: CielPathKey;
    label: string;
    emoji: string;
    href: string;
}

/** Single source of truth for the 4 paths — Sidebar, Paths bottom sheet, and dashboard grid all read from this. */
export const CIEL_PATHS: CielPathMeta[] = [
    { key: "communityService", label: "Community Service", emoji: "🏕️", href: "/dashboard/student/paths/community-service" },
    { key: "courseProject", label: "Coursework", emoji: "📚", href: "/dashboard/student/paths/course-project" },
    { key: "fypThesis", label: "FYP / Final Year Project", emoji: "🎓", href: "/dashboard/student/paths/fyp-thesis" },
    { key: "startupBusiness", label: "Startup / Venture", emoji: "💼", href: "/dashboard/student/paths/startup-business" },
];

export function pathStateLabel(state: "not_started" | "active" | "complete"): string {
    if (state === "complete") return "Complete";
    if (state === "active") return "Active";
    return "Not started";
}
