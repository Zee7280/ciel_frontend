import { NextResponse } from "next/server";

// Mock Data Store (In memory, resets on server restart)
const pendingRequests = [
    { id: 1, name: "Al-Khidmat Foundation", email: "pending_partner@ciel.pk", type: "NGO", date: "2024-01-25" },
    { id: 2, name: "Edhi Foundation", email: "edhi@ciel.pk", type: "NGO", date: "2024-01-24" },
    { id: 3, name: "TCF", email: "tcf@ciel.pk", type: "School", date: "2024-01-23" },
];

export async function GET(request: Request) {
    return NextResponse.json({
        success: true,
        data: pendingRequests
    });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, action } = body; // action: 'approve' | 'reject'

        console.log(`Admin Action: ${action} on request ${id}`);

        // In a real app, update DB status here

        return NextResponse.json({
            success: true,
            message: `Request ${action}ed successfully`
        });

    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
