import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        console.log("Login attempt:", { email, password }); // Debug log

        // Mock Authentication Logic
        // In a real app, this would query a database
        if (password !== "demo" && password !== "securePassword123") {
            console.log("Invalid credentials for:", email);
            return NextResponse.json({
                success: false,
                message: "Invalid credentials"
            }, { status: 401 });
        }

        // Mock Account Status Check
        if (email.includes("pending")) {
            return NextResponse.json({
                success: false,
                message: "Your account is awaiting admin approval."
            }, { status: 403 });
        }

        if (email.includes("rejected")) {
            return NextResponse.json({
                success: false,
                message: "Your account registration has been rejected."
            }, { status: 403 });
        }

        let role = "student";
        if (email.includes("partner")) role = "partner";
        if (email.includes("faculty")) role = "faculty";
        if (email.includes("admin")) role = "admin";

        // Generate a mock token relative to the role
        // In reality, this would be a signed JWT
        const token = `mock_token_${role}_${Date.now()}`;

        const responsePayload = {
            success: true,
            message: "Login successful",
            role: role || "student",
            token: token,
            user: {
                id: "user_123",
                name: "Demo User",
                email: email,
                role: role || "student"
            }
        };

        console.log("Sending successful login response:", responsePayload);

        return NextResponse.json(responsePayload);

    } catch (error) {
        return NextResponse.json({
            success: false,
            message: "Internal Server Error"
        }, { status: 500 });
    }
}
