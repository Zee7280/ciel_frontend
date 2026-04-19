import { NextResponse } from "next/server";

/**
 * GET /api/v1/student/dashboard
 *
 * Today this returns mock data. When the real backend is wired, forward the
 * request with the same JSON shape so the student Overview UI keeps working.
 */
export async function GET(_request: Request) {
    // TODO: forward to backend e.g. GET {BACKEND}/students/me/dashboard with Authorization
    const mockData = {
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
            },
            {
                id: "2",
                title: "Health Awareness Program",
                category: "Health",
                assignedAt: "2024-02-08T10:00:00Z",
                status: "Pending Approval",
                progress: 10,
            },
            {
                id: "3",
                title: "SOS Senior School Cricket Training",
                category: "Sports",
                assignedAt: "2024-02-08T10:00:00Z",
                status: "Under Review",
                progress: 80,
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
            pendingApprovalsSample: [
                { id: "p1", title: "Health Awareness Program", hint: "Due now" },
            ],
            reportsUnderReviewCount: 1,
            reportsUnderReviewSample: [
                { id: "3", title: "SOS Senior School Cricket Training", hint: "26 Apr 2024" },
            ],
            totalVerifiedHours: 49,
            hoursActivityBars: [35, 55, 40, 70, 45, 60, 50],
            completedCount: 6,
            completedSample: { id: "c1", title: "SOS Senior School Kit Distribution" },
            completedActivityBars: [20, 45, 30, 60, 50, 75, 65],
            impactHistoryBadgeCount: 1,
        },
        quickActions: {
            continueReport: {
                projectId: "1",
                title: "Community Service",
                subtitle: "In Progress",
            },
        },
        notificationsPreview: {
            active: [
                {
                    id: "n1",
                    title: "Community Clean-Up Drive",
                    detail: "Payment required now",
                    tone: "urgent" as const,
                },
            ],
            pending: [
                {
                    id: "n2",
                    title: "Health Awareness Program",
                    detail: "Faculty verification needed",
                    tone: "warning" as const,
                },
            ],
            underReview: [
                {
                    id: "n3",
                    title: "SOS Senior School Cricket Training",
                    detail: "Report submitted for review",
                    tone: "neutral" as const,
                },
            ],
        },
    };

    return NextResponse.json({
        success: true,
        data: mockData,
    });
}
