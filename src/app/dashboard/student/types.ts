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
    /** Present only when a report row exists; includes pending_payment, payment_under_review, draft, submitted, … */
    report_status?: string;
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
    /** Unique projects with reporting fee due (DB partner_verified / payment_pending → public pending_payment). */
    pendingPaymentsCount?: number;
    paymentsUnderReviewCount?: number;
    pendingPaymentsSample?: { id: string; title: string; hint?: string }[];
}

export interface DashboardQuickActions {
    continueReport?: {
        projectId: string;
        title: string;
        subtitle: string;
    } | null;
    /** First payment-due report (student_reports.updatedAt DESC), or null. */
    viewPayment?: {
        projectId: string;
        title: string;
        subtitle?: string;
    } | null;
    /** First verified / paid report for “view results”, or null. */
    viewReportResults?: {
        projectId: string;
        title: string;
        subtitle?: string;
    } | null;
}

/** Optional grouping for snapshot UI (deadlines, approvals pipeline, report queue, payment stages). */
export type DashboardNotificationCategory = "deadline" | "pipeline" | "approval" | "report" | "payment";

export interface DashboardNotificationPreviewItem {
    id: string;
    title: string;
    detail: string;
    tone?: "urgent" | "warning" | "neutral";
    category?: DashboardNotificationCategory;
}

export interface DashboardNotificationsPreview {
    active: DashboardNotificationPreviewItem[];
    pending: DashboardNotificationPreviewItem[];
    underReview: DashboardNotificationPreviewItem[];
}

export interface DashboardPendingSummaryItem {
    key: string;
    title: string;
    count: number;
    href: string;
    tone?: "urgent" | "warning" | "neutral" | "success";
    description?: string;
}

export interface DashboardPendingSummary {
    total: number;
    items: DashboardPendingSummaryItem[];
}

export interface DashboardData {
    stats: DashboardStats;
    activeProjects: ActiveProject[];
    deadlines: Deadline[];
    overview?: DashboardOverview;
    quickActions?: DashboardQuickActions;
    notificationsPreview?: DashboardNotificationsPreview;
    pendingSummary?: DashboardPendingSummary;
}
