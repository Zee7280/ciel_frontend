import {
    BookOpen,
    Brain,
    ClipboardCheck,
    FileText,
    Globe2,
    Leaf,
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
        description: "Opportunity scope, location, timeline, and partner linkage.",
        icon: Globe2,
        status: "coming_soon",
    },
    {
        id: 3,
        shortLabel: "SDG",
        title: "SDG alignment",
        description: "Primary and secondary SDG mapping with contribution depth.",
        icon: Target,
        status: "coming_soon",
    },
    {
        id: 4,
        shortLabel: "Activities",
        title: "Activities & outputs",
        description: "Deliverables, beneficiary reach, and activity intensity.",
        icon: ClipboardCheck,
        status: "coming_soon",
    },
    {
        id: 5,
        shortLabel: "Outcomes",
        title: "Outcomes & evidence",
        description: "Measured change, evidence quality, and verification depth.",
        icon: FileText,
        status: "coming_soon",
    },
    {
        id: 6,
        shortLabel: "Learning",
        title: "Learning & reflection",
        description: "Student learning outcomes and reflective depth indicators.",
        icon: BookOpen,
        status: "coming_soon",
    },
    {
        id: 7,
        shortLabel: "Partnership",
        title: "Partnership & collaboration",
        description: "Partner engagement, faculty oversight, and co-creation signals.",
        icon: Users,
        status: "coming_soon",
    },
    {
        id: 8,
        shortLabel: "Innovation",
        title: "Innovation & scalability",
        description: "Novel approaches, replication potential, and scale pathways.",
        icon: Brain,
        status: "coming_soon",
    },
    {
        id: 9,
        shortLabel: "Resources",
        title: "Resources & efficiency",
        description: "Hours-to-impact efficiency and resource utilization.",
        icon: Target,
        status: "coming_soon",
    },
    {
        id: 10,
        shortLabel: "Sustainability",
        title: "Sustainability & continuation",
        description: "Continuation plans, institutional embedding, and long-term viability.",
        icon: Leaf,
        status: "coming_soon",
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
