
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { studentId } = body;

        // Mock data for student projects
        const mockProjects = [
            {
                id: "proj-1",
                title: "Digital Literacy Program",
                category: "Education",
                status: "active",
                submitted_at: "2024-02-01",
                description: "Teaching basic computer skills to underprivileged children.",
                teamMembers: []
            },
            {
                id: "proj-2",
                title: "Clean Water Initiative",
                category: "Environment",
                status: "completed",
                submitted_at: "2023-11-15",
                description: "Installing water filters in rural areas.",
                teamMembers: [
                    { name: "Ali Khan", role: "Leader", cnic: "35202-1111111-1" },
                    { name: "Sara Ahmed", role: "Member", cnic: "35202-2222222-2" }
                ]
            }
        ];

        return NextResponse.json({
            success: true,
            data: mockProjects
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            message: "Failed to fetch projects"
        }, { status: 500 });
    }
}
