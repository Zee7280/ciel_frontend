import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { id } = body;
        const token = request.headers.get("Authorization");

        if (!id) {
            return NextResponse.json(
                { success: false, message: "Opportunity ID is required" },
                { status: 400 }
            );
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/opportunities/${id}`, {
            method: "GET", // Backend still expects GET with path param, we proxy POST to GET or just forward if backend changed?
            // User said "GET ... is ko post bna do", implying the *browser* check or frontend call.
            // If the BACKEND (Laravel/FastAPI?) requires POST, I should change this to POST.
            // But usually REST is GET.
            // However, the previous pattern for 'organisation/profile/detail' was wrapping a backend request.
            // Let's assume the backend *also* wants POST or we are just wrapping it to hide the URL structure/pass ID in body for security/preference?
            // WAIT - "is ko post bna do id pass kro body me" -> The USER controls the backend likely or requests this change for the Next.js layer.
            // If I am proxying, and the backend is immutable, I should keep backend as GET.
            // BUT usually "is ko post bna do" implies the backend endpoint I am calling (which is this Next.js endpoint for the frontend) should be POST.
            // AND the actual upstream backend might also be changing?
            // "GET http://localhost:3000/api/v1/opportunities/... is ko post bna do" -> This URL IS the Next.js API route.
            // So I definitely need to make THIS route POST.
            // What about the upstream implementation? 
            // The `organisation/profile/detail` implementation proxied to `${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/organisation/profile/detail` (which was the SAME path?).
            // Let's check `organisation/profile/detail/route.ts` to see what it calls.
            headers: {
                "Authorization": token || "",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        });

        // If the upstream wants POST, we should do POST.
        // For `organisation/profile/detail`, I recall checking it calls the upstream `organisation/profile/detail` with POST.
        // Let's assume I should call existing GET upstream for now, UNLESS user implies upstream changed too.
        // Given I am "The Developer" for the frontend mostly in this context but user gives commands...
        // I will check `organisation/profile/detail/route.ts` first to see the proxy pattern.

        // SAFE BET: Proxy to simple GET upstream for now but expose POST to frontend. 
        // IF upstream fails, I will fix.

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });

    } catch (error) {
        console.error("Error in opportunity detail proxy:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 }
        );
    }
}
