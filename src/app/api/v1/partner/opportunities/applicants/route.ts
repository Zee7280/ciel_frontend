import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.substring(7) || ''; // Remove 'Bearer ' prefix if exists

    // TODO: Uncomment below for production authentication
    // if (!authHeader || !authHeader.startsWith('Bearer ')) {
    //     return NextResponse.json({
    //         success: false,
    //         message: "Unauthorized - No token provided"
    //     }, { status: 401 });
    // }

    // if (!token) {
    //     return NextResponse.json({
    //         success: false,
    //         message: "Unauthorized - Invalid token"
    //     }, { status: 401 });
    // }

    try {
        const body = await request.json();
        const { id, applicantId, status } = body;

        // Determine the external API endpoint based on request type
        let externalApiUrl: string;
        let requestBody: any;

        if (applicantId && status) {
            // Status update request
            externalApiUrl = `${process.env.BACKEND_API_URL}/partners/opportunities/applicants/update`;
            requestBody = { id, applicantId, status };
            console.log(`Proxying status update for applicant ${applicantId} to ${status}`);
        } else {
            // Fetch applicants request
            externalApiUrl = `${process.env.BACKEND_API_URL}/partners/opportunities/applicants`;
            requestBody = { id };
            console.log(`Proxying fetch applicants request for opportunity ${id}`);
        }

        console.log("Proxying request to external API:", externalApiUrl);

        const response = await fetch(externalApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("External API error:", response.status, data);
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);

    } catch (e) {
        console.error("Error proxying to external API:", e);
        return NextResponse.json({
            success: false,
            message: "Failed to connect to external API"
        }, { status: 500 });
    }
}
