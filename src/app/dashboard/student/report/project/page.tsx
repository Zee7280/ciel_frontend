"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { isStudentImpactPackageView } from "@/utils/studentImpactPackageHref";

/** Legacy deep-link `/dashboard/student/report/project?id=` → canonical report URL. */
function LegacyProjectReportRedirect() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const id = (
            searchParams.get("id") ||
            searchParams.get("projectId") ||
            searchParams.get("project") ||
            ""
        ).trim();
        if (!id) {
            router.replace("/dashboard/student/paths/community-service?view=workspace");
            return;
        }
        const viewRaw = (searchParams.get("view") || "flash").trim();
        const view = isStudentImpactPackageView(viewRaw)
            ? viewRaw === "v17"
                ? "report"
                : viewRaw
            : "flash";
        const hash =
            typeof window !== "undefined" && window.location.hash
                ? window.location.hash
                : view === "print" || view === "report"
                  ? "#report"
                  : view === "evidence"
                    ? "#evidence"
                    : view === "analysis"
                      ? "#analysis"
                      : "#flash";
        const qs = new URLSearchParams({ projectId: id, view });
        const from = (searchParams.get("from") || "").trim();
        if (from) qs.set("from", from);
        router.replace(`/dashboard/student/report?${qs.toString()}${hash}`);
    }, [router, searchParams]);

    return (
        <div className="flex min-h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0e7d74]" />
        </div>
    );
}

export default function LegacyProjectReportPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#0e7d74]" />
                </div>
            }
        >
            <LegacyProjectReportRedirect />
        </Suspense>
    );
}
