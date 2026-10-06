"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import { prepareReportForVerifyDossier } from "@/utils/reportTeamScope";
import { HubBackButton } from "@/components/ciel/community-service/CommunityServiceHubChrome";
import ImpactPackage from "@/app/dashboard/student/report/impact-package/ImpactPackage";
import type { ImpactPackageTab } from "@/app/dashboard/student/report/impact-package/impactPackageTabs";
import { coerceFlashReportData, unwrapFacultyReportPayload } from "./facultyAiEvaluation.helpers";

export default function FacultyImpactPackagePage({
    reportId,
    initialTab,
}: {
    reportId: string;
    initialTab?: ImpactPackageTab;
}) {
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [raw, setRaw] = useState<Record<string, unknown> | null>(null);

    useEffect(() => {
        if (!reportId) {
            setLoadError(true);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setLoadError(false);
        authenticatedFetch(`/api/v1/faculty/reports/${reportId}`)
            .then(async (response) => {
                if (!response?.ok) {
                    toast.error("Impact Package is not available for this report.");
                    return null;
                }
                return response.json();
            })
            .then((payload) => {
                if (cancelled) return;
                if (!payload) {
                    setLoadError(true);
                    return;
                }
                const rec = unwrapFacultyReportPayload(payload as Record<string, unknown>);
                if (!rec || typeof rec !== "object") {
                    setLoadError(true);
                    return;
                }
                setRaw(prepareReportForVerifyDossier(rec) as Record<string, unknown>);
            })
            .catch(() => {
                if (!cancelled) {
                    setLoadError(true);
                    toast.error("Failed to open the Impact Package.");
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [reportId]);

    const data = useMemo(() => (raw ? coerceFlashReportData(raw) : null), [raw]);

    return (
        <div className="mx-auto max-w-[1180px] px-4 py-4">
            <HubBackButton href="/dashboard/faculty/community-service" label="← Back to Community Service" />
            {loading ? (
                <div className="flex min-h-[50vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
                </div>
            ) : loadError || !data ? (
                <div className="mt-4 rounded-2xl border border-dashed border-[#d7e5e8] bg-white px-4 py-10 text-center">
                    <p className="text-sm font-extrabold text-[#16313d]">Impact Package could not be opened</p>
                    <p className="mt-1 text-[12.5px] text-[#6b7c86]">
                        The student record is unchanged. Close and try again from Reports for Review.
                    </p>
                </div>
            ) : (
                <div className="mt-4 overflow-hidden rounded-3xl border border-[#ced6ca] bg-[#f0efe8] shadow-sm">
                    <ImpactPackage
                        data={data}
                        projectData={raw?.opportunity ?? raw}
                        audience="faculty"
                        initialTab={initialTab}
                    />
                </div>
            )}
        </div>
    );
}
