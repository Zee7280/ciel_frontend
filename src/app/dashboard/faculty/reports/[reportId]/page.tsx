"use client";

import { Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import FacultyAiEvaluationConsole from "./FacultyAiEvaluationConsole";
import CommunityCiiAnalyser from "@/components/ciel/community-service/CommunityCiiAnalyser";
import FacultyLockedV17Modal, { facultyLockedPackageTabFromQuery } from "./FacultyLockedV17Modal";

function FacultyReportView() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const reportId = String(params.reportId ?? "");
    const view = (searchParams.get("view") || "").trim().toLowerCase();

    if (view === "cii-v4-5") {
        return <CommunityCiiAnalyser readOnly />;
    }

    if (view === "console") {
        return <FacultyAiEvaluationConsole />;
    }

    return (
        <FacultyLockedV17Modal
            reportId={reportId}
            variant="page"
            initialTab={facultyLockedPackageTabFromQuery(searchParams.get("doc"))}
            onClose={() => router.back()}
        />
    );
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
