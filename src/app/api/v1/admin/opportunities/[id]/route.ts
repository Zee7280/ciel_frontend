import { NextResponse } from "next/server";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const authHeader = request.headers.get("Authorization");

        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/admin/opportunities/${id}`, {
            method: "DELETE",
            headers: {
                Authorization: authHeader || "",
            },
        });

        if (response.status === 204) {
            return new NextResponse(null, { status: 204 });
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        (typeof data === "object" && data && "message" in data && typeof data.message === "string"
                            ? data.message
                            : null) || "Failed to delete opportunity",
                },
                { status: response.status },
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Delete Opportunity Proxy Error:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
