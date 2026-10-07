"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { tabFromPackageQuery, type ImpactPackageTab } from "@/app/dashboard/student/report/impact-package/impactPackageTabs";
import CommunityCiiAnalyser from "@/components/ciel/community-service/CommunityCiiAnalyser";
import FacultyImpactPackagePage from "./FacultyImpactPackagePage";

function FacultyReportView() {
    const params = useParams();
    const searchParams = useSearchParams();
    const reportId = String(params.reportId ?? "");
    const view = (searchParams.get("view") || "").trim().toLowerCase();

    if (view === "cii-v4-5") {
        return <CommunityCiiAnalyser publisher="faculty" readOnly />;
    }

    const initialTab: ImpactPackageTab = tabFromPackageQuery(
        searchParams.get("doc") || (view === "dossier" || view === "console" ? "flash" : view),
    );

    return <FacultyImpactPackagePage reportId={reportId} initialTab={initialTab} />;
}

export default function FacultyReportDossierPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[50vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
                </div>
            }
        >
            <FacultyReportView />
        </Suspense>
    );
}
