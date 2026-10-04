/** Keep aligned with BE `student-browse-listing.util.ts`. */

export type BrowsePathKey = "community_service" | "coursework" | "fyp" | "startup";

export const BROWSE_PATHS: Array<{
    key: BrowsePathKey;
    label: string;
    shortLabel: string;
    tagline: string;
    accent: string;
    accentSoft: string;
    accentBorder: string;
    accentText: string;
    coverFrom: string;
    coverTo: string;
}> = [
    {
        key: "community_service",
        label: "Community Service",
        shortLabel: "Community Service",
        tagline: "Serve. Make a difference.",
        accent: "#159a6c",
        accentSoft: "#e8f8f1",
        accentBorder: "#b7e6d0",
        accentText: "#0f6b4a",
        coverFrom: "#0f766e",
        coverTo: "#34d399",
    },
    {
        key: "coursework",
        label: "Sustainability-Linked Coursework",
        shortLabel: "Coursework",
        tagline: "Apply. Integrate SDGs.",
        accent: "#3b82f6",
        accentSoft: "#eef5ff",
        accentBorder: "#c7dcff",
        accentText: "#1d4ed8",
        coverFrom: "#1d4ed8",
        coverTo: "#7dd3fc",
    },
    {
        key: "fyp",
        label: "FYP / Research",
        shortLabel: "FYP / Research",
        tagline: "Investigate. Create knowledge.",
        accent: "#7c3aed",
        accentSoft: "#f4edff",
        accentBorder: "#ddc9ff",
        accentText: "#5b21b6",
        coverFrom: "#6d28d9",
        coverTo: "#c4b5fd",
    },
    {
        key: "startup",
        label: "Startups",
        shortLabel: "Startups",
        tagline: "Innovate. Build solutions.",
        accent: "#f97316",
        accentSoft: "#fff4eb",
        accentBorder: "#fed7aa",
        accentText: "#c2410c",
        coverFrom: "#ea580c",
        coverTo: "#fdba74",
    },
];

export const BROWSE_PATH_BY_KEY = Object.fromEntries(BROWSE_PATHS.map((p) => [p.key, p])) as Record<
    BrowsePathKey,
    (typeof BROWSE_PATHS)[number]
>;

function typesBlob(types: unknown): string {
    if (!Array.isArray(types)) return "";
    return types.map((entry) => String(entry || "").toLowerCase()).join(" ");
}

export function classifyBrowsePath(types: unknown, fallback?: unknown): BrowsePathKey {
    if (fallback === "community_service" || fallback === "coursework" || fallback === "fyp" || fallback === "startup") {
        return fallback;
    }
    const blob = typesBlob(types);
    if (/(course.?work|course.?project|sustainability-linked)/.test(blob)) return "coursework";
    if (/\b(fyp|thesis|research)\b/.test(blob)) return "fyp";
    if (/(startup|venture|enterprise)/.test(blob)) return "startup";
    return "community_service";
}

export function formatBrowseDeadline(value: string | null | undefined): string | null {
    if (!value) return null;
    const iso = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    const d = iso
        ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
        : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return `Ends ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

export function classifyBrowseCreator(opportunity: {
    isStudentCreated?: unknown;
    facultyId?: unknown;
    organizationId?: unknown;
    created_by_role?: unknown;
    creator_role?: unknown;
    creator_type?: unknown;
}): "student" | "faculty" | "partner" | "admin" | null {
    const raw = String(
        opportunity.created_by_role || opportunity.creator_role || opportunity.creator_type || "",
    )
        .trim()
        .toLowerCase();
    if (raw.includes("student")) return "student";
    if (raw.includes("faculty")) return "faculty";
    if (raw.includes("admin") || raw.includes("ciel")) return "admin";
    if (raw.includes("ngo") || raw.includes("partner")) return "partner";
    if (opportunity.isStudentCreated === true) return "student";
    if (opportunity.facultyId && !opportunity.organizationId) return "faculty";
    if (opportunity.organizationId) return "partner";
    return null;
}

export function isUrgentBrowseDeadline(value: string | null | undefined, now = new Date()): boolean {
    if (!value) return false;
    const iso = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    const end = iso
        ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
        : new Date(value);
    if (Number.isNaN(end.getTime())) return false;
    const inTwoWeeks = new Date(now);
    inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
    return end.getTime() >= now.getTime() && end.getTime() <= inTwoWeeks.getTime();
}
