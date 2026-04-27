import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Old code sent users to `/dashboard/ngo` etc.; partner UI lives under `/dashboard/partner`. */
const LEGACY_PARTNER_DASHBOARD_SLUGS = new Set(["ngo", "university", "corporate", "organization_admin"]);

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname.replace(/\/$/, "") || "/";
    const parts = path.split("/").filter(Boolean);
    if (parts[0] === "dashboard" && parts[1] && LEGACY_PARTNER_DASHBOARD_SLUGS.has(parts[1]) && parts.length === 2) {
        return NextResponse.redirect(new URL("/dashboard/partner", request.url));
    }
    return NextResponse.next();
}

export const config = {
    matcher: [
        "/dashboard/ngo",
        "/dashboard/university",
        "/dashboard/corporate",
        "/dashboard/organization_admin",
    ],
};
