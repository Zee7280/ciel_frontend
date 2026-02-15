import { NextResponse } from "next/server";

export async function GET(request: Request) {
    // TODO: When backend is ready, replace this mock with a real API call
    // const { searchParams } = new URL(request.url);
    // const studentId = searchParams.get('studentId');

    // Mock Data
    const mockData = {
        stats: {
            activeCourses: 3,
            impactPoints: 1250,
            projectsCompleted: 12,
            hoursVolunteered: 48
        },
        activeProjects: [
            {
                id: "1",
                title: "Flood Relief Campaign 2025",
                category: "Disaster Management",
                assignedAt: "2024-02-08T10:00:00Z",
                status: "In Progress",
                progress: 45
            },
            {
                id: "2",
                title: "Flood Relief Campaign 2026",
                category: "Disaster Management",
                assignedAt: "2024-02-08T10:00:00Z",
                status: "In Progress",
                progress: 10
            },
            {
                id: "3",
                title: "Flood Relief Campaign 2027",
                category: "Disaster Management",
                assignedAt: "2024-02-08T10:00:00Z",
                status: "In Progress",
                progress: 0
            }
        ],
        deadlines: [
            {
                id: "1",
                title: "Field Report Submission",
                date: "2024-02-11T23:59:00Z",
                type: "urgent"
            },
            {
                id: "2",
                title: "Mentor Meeting",
                date: "2024-01-26T15:00:00Z",
                type: "warning"
            }
        ]
    };

    return NextResponse.json({
        success: true,
        data: mockData
    });
}
