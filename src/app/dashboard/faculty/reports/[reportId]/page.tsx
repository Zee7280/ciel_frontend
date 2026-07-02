"use client";

import {
    ExecutiveReportDossierPage,
    type ExecutiveReportDossierConfig,
} from "@/components/verify/ExecutiveReportDossierPage";

const facultyDossierConfig: ExecutiveReportDossierConfig = {
    reportApiPath: (reportId) => `/api/v1/faculty/reports/${reportId}`,
    backHref: "/dashboard/faculty/reports",
    backLabel: "Back to student reports",
    badges: ["Single-Page Dossier Mode", "Faculty · Read-only"],
    readOnlyAudience: "faculty",
    notFoundMessage: "Executive dossier unavailable",
};

export default function FacultyReportDossierPage() {
    return <ExecutiveReportDossierPage config={facultyDossierConfig} />;
}
