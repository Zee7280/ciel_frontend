import { NextResponse } from "next/server";

/** Rich mock for local dev when `NEXT_PUBLIC_BACKEND_BASE_URL` is unset. Shape matches additive student dashboard contract. */
export function buildStudentDashboardMock() {
    return {
        stats: {
            activeCourses: 3,
            impactPoints: 1250,
            projectsCompleted: 6,
            hoursVolunteered: 49,
        },
        activeProjects: [
            {
                id: "1",
                title: "Community Service / In Progress",
                category: "Community",
                assignedAt: "2024-02-08T10:00:00Z",
                status: "In Progress",
                progress: 45,
                report_status: "draft",
            },
            {
                id: "2",
                title: "Health Awareness Program",
                category: "Health",
                assignedAt: "2024-02-08T10:00:00Z",
                status: "Pending Approval",
                progress: 10,
                report_status: "pending_payment",
            },
            {
                id: "3",
                title: "SOS Senior School Cricket Training",
                category: "Sports",
                assignedAt: "2024-02-08T10:00:00Z",
                status: "Under Review",
                progress: 80,
                report_status: "payment_under_review",
            },
        ],
        deadlines: [
            {
                id: "1",
                title: "Health Awareness Program",
                date: "2024-04-30T23:59:00Z",
                type: "urgent",
            },
            {
                id: "2",
                title: "Pending Faculty Verification",
                date: new Date(Date.now() + 86400000).toISOString(),
                type: "warning",
            },
        ],
        overview: {
            activeProjectsCount: 3,
            pendingApprovalsCount: 2,
            pendingApprovalsSample: [{ id: "p1", title: "Health Awareness Program", hint: "Due now" }],
            reportsUnderReviewCount: 1,
            reportsUnderReviewSample: [{ id: "3", title: "SOS Senior School Cricket Training", hint: "26 Apr 2024" }],
            totalVerifiedHours: 49,
            hoursActivityBars: [35, 55, 40, 70, 45, 60, 50],
            completedCount: 6,
            completedSample: { id: "c1", title: "SOS Senior School Kit Distribution" },
            completedActivityBars: [20, 45, 30, 60, 50, 75, 65],
            impactHistoryBadgeCount: 1,
            pendingPaymentsCount: 1,
            paymentsUnderReviewCount: 1,
            pendingPaymentsSample: [{ id: "2", title: "Health Awareness Program", hint: "Reporting fee due" }],
        },
        quickActions: {
            continueReport: {
                projectId: "1",
                title: "Community Service",
                subtitle: "In Progress",
            },
            viewPayment: {
                projectId: "2",
                title: "Health Awareness Program",
                subtitle: "Reporting fee due",
            },
            viewReportResults: {
                projectId: "3",
                title: "SOS Senior School Cricket Training",
                subtitle: "Verified — view dossier",
            },
        },
        notificationsPreview: {
            active: [
                {
                    id: "n1",
                    title: "Community Clean-Up Drive",
                    detail: "Payment required now",
                    tone: "urgent",
                    category: "payment",
                },
            ],
            pending: [
                {
                    id: "n2",
                    title: "Health Awareness Program",
                    detail: "Faculty verification needed",
                    tone: "warning",
                    category: "pipeline",
                },
            ],
            underReview: [
                {
                    id: "n3",
                    title: "SOS Senior School Cricket Training",
                    detail: "Report submitted for review",
                    tone: "neutral",
                    category: "report",
                },
            ],
        },
    };
}

/**
 * Proxies GET to the Nest backend, trying URLs in order. Stops on first non-404 response (returns it).
 * Use a single path for dedicated routes, or multiple for legacy `/student/dashboard`.
 */
export async function proxyStudentDashboardGet(request: Request, backendRelativePaths: string[]): Promise<NextResponse> {
    const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "");
    const authHeader = request.headers.get("Authorization") || "";

    if (!backendBase) {
        return NextResponse.json({ success: true, data: buildStudentDashboardMock() });
    }

    for (const rel of backendRelativePaths) {
        const path = rel.startsWith("/") ? rel : `/${rel}`;
        const url = `${backendBase}${path}`;
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
            },
        });

        if (response.ok) {
            const data = await response.json().catch(() => ({}));
            return NextResponse.json(typeof data === "object" && data !== null ? data : { success: true, data });
        }

        if (response.status === 404) {
            continue;
        }

        const errBody = await response.json().catch(() => ({}));
        return NextResponse.json(
            { success: false, message: (errBody as { message?: string }).message || "Dashboard request failed" },
            { status: response.status },
        );
    }

    return NextResponse.json({ success: false, message: "Dashboard endpoint not found on backend" }, { status: 404 });
}
