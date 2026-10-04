"use client";

import { useEffect } from "react";
import { coerceFlashReportData } from "@/app/dashboard/faculty/reports/[reportId]/facultyAiEvaluation.helpers";
import ImpactPackage from "@/app/dashboard/student/report/impact-package/ImpactPackage";
import type { ImpactPackageTab } from "@/app/dashboard/student/report/impact-package/impactPackageTabs";
import type { ImpactPackageAudience } from "@/app/dashboard/student/report/impact-package/buildImpactPackageModel";
import type { ReportEvidenceGalleryItem } from "@/components/ciel/community-service/ReportEvidenceGallery";

export default function AdminReviewPackageStrip({
    reportId,
    report,
    fallbackFiles,
    highlight = false,
    initialDoc = null,
    variant = "admin",
    audience: audienceProp,
    loading = false,
}: {
    reportId: string;
    report: Record<string, unknown>;
    fallbackFiles: ReportEvidenceGalleryItem[];
    highlight?: boolean;
    initialDoc?: "flashcard" | "report" | "evidence" | "analysis" | null;
    variant?: "admin" | "published";
    audience?: ImpactPackageAudience;
    loading?: boolean;
}) {
    const data = coerceFlashReportData(report);
    const initialTab: ImpactPackageTab =
        initialDoc === "report" ? "report" : initialDoc === "evidence" ? "evidence" : initialDoc === "analysis" ? "analysis" : "flash";
    const audience: ImpactPackageAudience = audienceProp || (variant === "admin" ? "admin" : "partner");
    const analyserHref = variant === "admin" ? `/dashboard/admin/reports/verify/${reportId}?view=cii-v4-5` : undefined;

    useEffect(() => {
        if (!highlight) return;
        document.getElementById("admin-review-package")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [highlight]);

    if (loading) {
        return (
            <section id="admin-review-package" className="scroll-mt-8 rounded-3xl border border-[#b7ddd8] bg-white p-5 shadow-sm sm:p-7">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-medium text-slate-500" role="status">
                    Loading review package...
                </div>
            </section>
        );
    }

    return (
        <section id="admin-review-package" className="scroll-mt-8 overflow-hidden rounded-3xl border border-[#ced6ca] bg-[#f0efe8] shadow-sm">
            <ImpactPackage
                data={data}
                projectData={report.opportunity ?? report}
                audience={audience}
                initialTab={initialTab}
                extraFiles={fallbackFiles}
                analyserHref={analyserHref}
            />
        </section>
    );
}
