import {
    BookOpen,
    Brain,
    ClipboardCheck,
    FileText,
    Globe2,
    Leaf,
    Package,
    ShieldCheck,
    Target,
    Users,
    type LucideIcon,
} from "lucide-react";

export type ReportAnalyticsSectionId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type ReportAnalyticsSection = {
    id: ReportAnalyticsSectionId;
    shortLabel: string;
    title: string;
    description: string;
    icon: LucideIcon;
    status: "live" | "coming_soon";
};

export const REPORT_ANALYTICS_SECTIONS: ReportAnalyticsSection[] = [
    {
        id: 1,
        shortLabel: "Identity",
        title: "Participation & attendance",
        description: "Identity, team setup, attendance integrity, and verification readiness.",
        icon: ShieldCheck,
        status: "live",
    },
    {
        id: 2,
        shortLabel: "Context",
        title: "Project context",
        description: "Problem statement, discipline, baseline evidence, and beneficiaries.",
        icon: Globe2,
        status: "live",
    },
    {
        id: 3,
        shortLabel: "SDG",
        title: "SDG alignment",
        description: "Primary and secondary SDG mapping with contribution depth.",
        icon: Target,
        status: "live",
    },
    {
        id: 4,
        shortLabel: "Activities",
        title: "Activities & outputs",
        description: "Deliverables, beneficiary reach, and activity intensity.",
        icon: ClipboardCheck,
        status: "live",
    },
    {
        id: 5,
        shortLabel: "Outcomes",
        title: "Outcomes & change",
        description: "Measured change, confidence, baseline/endline, and challenges.",
        icon: FileText,
        status: "live",
    },
    {
        id: 6,
        shortLabel: "Resources",
        title: "Resources & mobilization",
        description: "Resource ledger, sources, verification, and mobilization efficiency.",
        icon: Package,
        status: "live",
    },
    {
        id: 7,
        shortLabel: "Partners",
        title: "Partnerships & collaboration",
        description: "Partner types, formalization, SDG 17 classification, and verification.",
        icon: Users,
        status: "live",
    },
    {
        id: 8,
        shortLabel: "Evidence",
        title: "Evidence & credibility",
        description: "Evidence types, ethics, media visibility, and credibility score.",
        icon: ShieldCheck,
        status: "live",
    },
    {
        id: 9,
        shortLabel: "Reflection",
        title: "Reflection & competencies",
        description: "Competency ratings, academic integration, and reflection quality.",
        icon: BookOpen,
        status: "live",
    },
    {
        id: 10,
        shortLabel: "Sustain",
        title: "Sustainability & continuation",
        description: "Continuation plans, mechanisms, scaling potential, and policy influence.",
        icon: Leaf,
        status: "live",
    },
    {
        id: 11,
        shortLabel: "Intelligence",
        title: "Impact intelligence",
        description: "CII score, cross-section audit, and institutional verification summary.",
        icon: Brain,
        status: "coming_soon",
    },
];

export function getAnalyticsSection(id: ReportAnalyticsSectionId): ReportAnalyticsSection | undefined {
    return REPORT_ANALYTICS_SECTIONS.find((s) => s.id === id);
}

/**
 * Resolve BFF API path for a given section from a Section-1-style path.
 * Keeps existing section1 routes intact; maps 2–10 onto the new Nest endpoints.
 */
export function resolveSectionAnalyticsApiPath(section1ApiPath: string, section: number): string {
    if (section === 1) return section1ApiPath;

    // Student: .../section1-analytics → .../sections/{n}/analytics
    if (section1ApiPath.includes("section1-analytics")) {
        return section1ApiPath.replace("section1-analytics", `sections/${section}/analytics`);
    }

    // Admin UN/Gov slice: .../section1/stakeholders → .../section/{n}/stakeholders
    if (section1ApiPath.includes("section1/stakeholders")) {
        return section1ApiPath.replace("section1/stakeholders", `section/${section}/stakeholders`);
    }

    // Generic: .../section1 → .../section/{n}
    if (section1ApiPath.endsWith("/section1") || section1ApiPath.includes("/section1?")) {
        return section1ApiPath.replace("/section1", `/section/${section}`);
    }

    return section1ApiPath;
}

export function resolveSummaryApiPath(section1ApiPath: string): string | null {
    if (section1ApiPath.includes("section1/stakeholders")) return null;
    if (section1ApiPath.includes("section1-analytics")) {
        return section1ApiPath.replace(/\/section1-analytics$/, "/analytics/summary");
    }
    if (section1ApiPath.includes("/analytics/section1")) {
        return section1ApiPath.replace(/\/analytics\/section1$/, "/analytics/summary");
    }
    return null;
}
