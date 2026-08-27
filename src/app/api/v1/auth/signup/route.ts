import { NextResponse } from "next/server";
import { authApiErrorMessage } from "@/utils/authApiError";

const PUBLIC_SIGNUP_ROLES = new Set(["student", "faculty", "university", "ngo", "corporate"]);

export async function POST(request: Request) {
    try {
        const body = await request.json();

        console.log("Signup Request Received:", body);

        const requiredFields = ["email", "password", "role"];
        for (const field of requiredFields) {
            if (!body[field]) {
                return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
            }
        }

        if (!PUBLIC_SIGNUP_ROLES.has(String(body.role).trim().toLowerCase())) {
            return NextResponse.json({ error: "Invalid account type" }, { status: 400 });
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: authApiErrorMessage(data, "Signup failed") },
                { status: response.status },
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Signup error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
