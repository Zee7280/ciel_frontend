"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
    ExecutiveReportDossierPage,
    type ExecutiveReportDossierConfig,
} from "@/components/verify/ExecutiveReportDossierPage";
import FacultyAiEvaluationConsole from "./FacultyAiEvaluationConsole";

function FacultyReportView() {
    const params = useParams();
    const searchParams = useSearchParams();
    const reportId = String(params.reportId ?? "");
    const view = (searchParams.get("view") || "").trim().toLowerCase();

    if (view === "dossier") {
        const facultyDossierConfig: ExecutiveReportDossierConfig = {
            reportApiPath: (id) => `/api/v1/faculty/reports/${id}`,
            backHref: `/dashboard/faculty/reports/${reportId}`,
            backLabel: "Back to AI evaluation",
            badges: ["Single-Page Dossier Mode", "Faculty · Full dossier"],
            readOnlyAudience: "faculty",
            notFoundMessage: "Executive dossier unavailable",
        };
        return <ExecutiveReportDossierPage config={facultyDossierConfig} />;
    }

    return <FacultyAiEvaluationConsole />;
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
