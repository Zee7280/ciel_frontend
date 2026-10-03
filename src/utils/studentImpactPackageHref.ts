/** Same-app deep links into the student Impact Package. Keep views aligned with BE student-report-view-url.util.ts */

export type StudentImpactPackageView =
    | "flash"
    | "report"
    | "evidence"
    | "analysis"
    | "print"
    | "certificate"
    | "v17"
    | "package";

const HASH_FOR_VIEW: Record<StudentImpactPackageView, string> = {
    flash: "flash",
    package: "flash",
    certificate: "flash",
    report: "report",
    print: "report",
    v17: "report",
    evidence: "evidence",
    analysis: "analysis",
};

export function isStudentImpactPackageView(value: unknown): value is StudentImpactPackageView {
    return typeof value === "string" && Object.prototype.hasOwnProperty.call(HASH_FOR_VIEW, value);
}

export function studentImpactPackageHref(
    projectId: string | null | undefined,
    view: StudentImpactPackageView,
): string | null {
    const id = String(projectId || "").trim();
    if (!id) return null;
    const qs = new URLSearchParams({ projectId: id, view });
    return `/dashboard/student/report?${qs.toString()}#${HASH_FOR_VIEW[view]}`;
}
