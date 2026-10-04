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

/** `v17` is a legacy inbound alias for the detailed report. New hrefs always emit `report`. */
function canonicalPackageView(view: StudentImpactPackageView): Exclude<StudentImpactPackageView, "v17"> {
    return view === "v17" ? "report" : view;
}

export function isStudentImpactPackageView(value: unknown): value is StudentImpactPackageView {
    return typeof value === "string" && Object.prototype.hasOwnProperty.call(HASH_FOR_VIEW, value);
}

export function studentImpactPackageHref(
    projectId: string | null | undefined,
    view: StudentImpactPackageView,
    extras?: { from?: string },
): string | null {
    const id = String(projectId || "").trim();
    if (!id) return null;
    const qs = new URLSearchParams({ projectId: id, view: canonicalPackageView(view) });
    if (extras?.from) qs.set("from", extras.from);
    return `/dashboard/student/report?${qs.toString()}#${HASH_FOR_VIEW[view]}`;
}
