export interface DashboardStats {
    activeCourses: number;
    impactPoints: number;
    projectsCompleted: number;
    hoursVolunteered: number;
}

export interface ActiveProject {
    id: string;
    title: string;
    category: string;
    assignedAt: string;
    status: string;
    progress: number;
}

export interface Deadline {
    id: string;
    title: string;
    date: string;
    type: string;
}

/** Rich overview block; optional so older API payloads still work. */
export interface DashboardOverview {
    activeProjectsCount: number;
    pendingApprovalsCount: number;
    pendingApprovalsSample: { id: string; title: string; hint?: string }[];
    reportsUnderReviewCount: number;
    reportsUnderReviewSample: { id: string; title: string; hint?: string }[];
    totalVerifiedHours: number;
    /** Normalized 0–100 bar heights for a sparkline-style chart */
    hoursActivityBars: number[];
    completedCount: number;
    completedSample?: { id: string; title: string };
    completedActivityBars: number[];
    /** Shown on Impact History in the sidebar when > 0 */
    impactHistoryBadgeCount?: number;
}

export interface DashboardQuickActions {
    continueReport?: {
        projectId: string;
        title: string;
        subtitle: string;
    } | null;
}

export interface DashboardNotificationPreviewItem {
    id: string;
    title: string;
    detail: string;
    tone?: "urgent" | "warning" | "neutral";
}

export interface DashboardNotificationsPreview {
    active: DashboardNotificationPreviewItem[];
    pending: DashboardNotificationPreviewItem[];
    underReview: DashboardNotificationPreviewItem[];
}

export interface DashboardData {
    stats: DashboardStats;
    activeProjects: ActiveProject[];
    deadlines: Deadline[];
    overview?: DashboardOverview;
    quickActions?: DashboardQuickActions;
    notificationsPreview?: DashboardNotificationsPreview;
}
