
import { NextResponse } from 'next/server';

const MOCK_APPLICANTS = [
    {
        id: "app-1",
        studentName: "Ali Hassan",
        university: "University of Management and Technology",
        email: "ali.hassan@umt.edu.pk",
        status: "pending",
        appliedAt: "2024-01-15T10:30:00Z",
        avatar: "/avatars/ali.png",
        type: "individual"
    },
    {
        id: "app-2",
        studentName: "Sara Khan",
        university: "COMSATS University Islamabad",
        email: "sara.khan@comsats.edu.pk",
        status: "shortlisted",
        appliedAt: "2024-01-16T14:20:00Z",
        avatar: "/avatars/sara.png",
        type: "team",
        teamName: "Code Warriors",
        teamMembers: [
            { name: "Sara Khan", role: "Leader", cnic: "35202-1234567-1" },
            { name: "Ahmed Raza", role: "Member", cnic: "35202-1234567-2" },
            { name: "Zara Ali", role: "Member", cnic: "35202-1234567-3" }
        ]
    },
    {
        id: "app-3",
        studentName: "Bilal Ahmed",
        university: "Forman Christian College",
        email: "bilal.ahmed@fccollege.edu.pk",
        status: "accepted",
        appliedAt: "2024-01-14T09:15:00Z",
        avatar: "/avatars/bilal.png",
        type: "individual"
    },
    {
        id: "app-4",
        studentName: "Zainab Malik",
        university: "Lahore University of Management Sciences",
        email: "zainab.malik@lums.edu.pk",
        status: "rejected",
        appliedAt: "2024-01-18T16:45:00Z",
        avatar: "/avatars/zainab.png",
        type: "team",
        teamName: "Design Pros",
        teamMembers: [
            { name: "Zainab Malik", role: "Leader", cnic: "35202-9876543-1" },
            { name: "Omar Farooq", role: "Designer", cnic: "35202-9876543-2" }
        ]
    },
    {
        id: "app-5",
        studentName: "Usman Tariq",
        university: "University of Central Punjab",
        email: "usman.tariq@ucp.edu.pk",
        status: "pending",
        appliedAt: "2024-01-19T11:00:00Z",
        avatar: "/avatars/usman.png",
        type: "individual"
    }
];

export async function POST(request: Request, { params }: { params: { id: string } }) {
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
        const body = await request.json();
        const { id, applicantId, status } = body;

        // If applicantId and status are provided, this is a status update request
        if (applicantId && status) {
            console.log(`Updating applicant ${applicantId} status to ${status} for opportunity ${id || params.id}`);

            return NextResponse.json({
                success: true,
                message: "Applicant status updated successfully"
            });
        }

        // Otherwise, this is a fetch request
        console.log("Fetching applicants for opportunity ID:", id || params.id);

        return NextResponse.json({
            success: true,
            data: MOCK_APPLICANTS
        });

    } catch (e) {
        return NextResponse.json({
            success: false,
            message: "Invalid request"
        }, { status: 400 });
    }
}
