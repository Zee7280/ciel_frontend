import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    // Validate authentication token
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({
            success: false,
            message: "Unauthorized - No token provided"
        }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
        return NextResponse.json({
            success: false,
            message: "Unauthorized - Invalid token"
        }, { status: 401 });
    }

    try {
        const body = await request.json();

        // Forward request to external API
        const externalApiUrl = `${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/partners/opportunities/applicants`;

        console.log("Proxying request to external API:", externalApiUrl);

        const response = await fetch(externalApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
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
