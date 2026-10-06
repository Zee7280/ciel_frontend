"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { tabFromPackageQuery, type ImpactPackageTab } from "@/app/dashboard/student/report/impact-package/impactPackageTabs";
import { HubBackButton } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import FacultyImpactPackagePage from "./FacultyImpactPackagePage";

function FacultyReportView() {
    const params = useParams();
    const searchParams = useSearchParams();
    const reportId = String(params.reportId ?? "");
    const view = (searchParams.get("view") || "").trim().toLowerCase();

    if (view === "cii-v4-5") {
        const packageHref = `/dashboard/faculty/reports/${encodeURIComponent(reportId)}?view=dossier`;
        return (
            <div className="mx-auto max-w-[720px] px-4 py-6">
                <HubBackButton href="/dashboard/faculty/community-service" label="← Back to Community Service" />
                <div className="mt-4 rounded-2xl border border-[#d7e5e8] bg-white px-5 py-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#0e7d74]">CIEL PK Admin only</p>
                    <h1 className="mt-2 text-xl font-extrabold text-[#16313d]">AI Analyser is not part of Faculty review</h1>
                    <p className="mt-2 text-sm leading-relaxed text-[#4d6069]">
                        The submitted Impact Package is locked student source. Packet completeness, CII /85 + evidence /15, badge and publish are handled by CIEL PK Admin. There is no Faculty or Partner verification in this final-report approval chain.
                    </p>
                    <Link
                        href={packageHref}
                        className="mt-4 inline-flex rounded-xl bg-[#0e7d74] px-4 py-2.5 text-sm font-extrabold text-white"
                    >
                        Open Impact Package
                    </Link>
                </div>
            </div>
        );
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
