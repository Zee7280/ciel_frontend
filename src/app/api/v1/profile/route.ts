import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({
                success: false,
                message: "Unauthorized: Missing Authorization header"
            }, { status: 401 });
        }

        const token = authHeader.split(" ")[1];

        // Mock Token Validation
        // Check if token contains valid roles as simulated in login
        if (!token.includes("mock_token_")) {
            return NextResponse.json({
                success: false,
                message: "Unauthorized: Invalid token"
            }, { status: 401 });
        }

        // Extract role from mock token (format: mock_token_ROLE_TIMESTAMP)
        const rolePart = token.split("_")[2]; // student, partner, faculty, admin

        // Access Control Logic
        // Only 'student' and 'admin' are allowed to view profile
        const allowedRoles = ["student", "admin"];

        if (!allowedRoles.includes(rolePart)) {
            return NextResponse.json({
                success: false,
                message: "Forbidden: You do not have permission to view this resource"
            }, { status: 403 });
        }

        // Return Mock Profile Data
        return NextResponse.json({
            success: true,
            data: {
                id: "user_123",
                name: "Demo User",
                email: "user@ciel.pk",
                role: rolePart,
                institution: "NUST",
                program: "Computer Science",
                joinedAt: "2024-01-01"
            }
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            message: "Internal Server Error"
        }, { status: 500 });
    }
}
