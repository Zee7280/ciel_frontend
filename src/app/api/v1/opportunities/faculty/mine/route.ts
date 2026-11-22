import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        const { searchParams } = new URL(request.url);
        const backendUrl = new URL(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/opportunities/faculty/mine`);
        const facultyEmail = searchParams.get("faculty_email") || searchParams.get("email") || "";
        if (facultyEmail.trim()) {
            backendUrl.searchParams.set("faculty_email", facultyEmail.trim().toLowerCase());
        }
        // `scope=authored` keeps the faculty's own Create Opportunity tabs to listings they created;
        // without it the backend returns every listing that merely names them as supervisor.
        const scope = searchParams.get("scope");
        if (scope) backendUrl.searchParams.set("scope", scope);

        const response = await fetch(
            backendUrl.toString(),
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: authHeader || "",
                },
            },
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return NextResponse.json(
                { error: data.message || "Failed to fetch opportunities" },
                { status: response.status },
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error in opportunities/faculty/mine proxy:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
