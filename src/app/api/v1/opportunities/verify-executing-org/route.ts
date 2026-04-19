import { NextRequest, NextResponse } from "next/server";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

/** Proxy → backend `POST /opportunities/verify/executing-org` (JWT; official executing-org email must match). */
export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = (await req.json().catch(() => ({}))) as { id?: string };
        const id = typeof body.id === "string" ? body.id.trim() : "";
        if (!id) {
            return NextResponse.json({ success: false, message: "Opportunity id is required" }, { status: 400 });
        }

        const apiBase = resolveBackendApiV1Base();
        if (!apiBase) {
            return NextResponse.json(
                { success: false, message: "Server misconfiguration: backend URL not set" },
                { status: 500 },
            );
        }

        const backendUrl = `${apiBase}/opportunities/verify/executing-org`;
        const response = await fetch(backendUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
            },
            body: JSON.stringify({ id }),
        });

        const data = await response.json().catch(() => ({}));
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error("verify-executing-org proxy error:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
