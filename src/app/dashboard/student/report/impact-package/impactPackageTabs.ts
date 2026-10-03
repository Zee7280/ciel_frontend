export type ImpactPackageTab = "flash" | "report" | "evidence" | "analysis";

export const IMPACT_PACKAGE_TAB_EVENT = "ciel-impact-package-tab";

export const IMPACT_PACKAGE_TABS: ImpactPackageTab[] = ["flash", "report", "evidence"];

export const IMPACT_PACKAGE_TABS_WITH_ANALYSIS: ImpactPackageTab[] = ["flash", "report", "evidence", "analysis"];

export function isImpactPackageTab(value: unknown): value is ImpactPackageTab {
    return value === "flash" || value === "report" || value === "evidence" || value === "analysis";
}

export function tabFromPackageQuery(view: string | null | undefined, hash?: string): ImpactPackageTab {
    const fromHash = String(hash || "").replace(/^#/, "").trim().toLowerCase();
    if (isImpactPackageTab(fromHash)) return fromHash;
    const v = String(view || "").trim().toLowerCase();
    if (v === "print" || v === "report") return "report";
    if (v === "evidence" || v === "gallery") return "evidence";
    if (v === "cii-v2" || v === "analysis" || v === "analyser") return "analysis";
    return "flash";
}

export function openImpactPackageTab(tab: ImpactPackageTab = "flash") {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(IMPACT_PACKAGE_TAB_EVENT, { detail: tab }));
    document.getElementById("ciel-impact-package")?.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
        history.replaceState(null, "", `#${tab}`);
    } catch {
        /* ignore */
    }
}
