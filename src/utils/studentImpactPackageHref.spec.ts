import assert from "node:assert/strict";
import test from "node:test";
import { isStudentImpactPackageView, studentImpactPackageHref } from "./studentImpactPackageHref";
import {
    clampImpactPackageTab,
    IMPACT_PACKAGE_TABS,
    IMPACT_PACKAGE_TABS_WITH_ANALYSIS,
    tabFromPackageQuery,
} from "../app/dashboard/student/report/impact-package/impactPackageTabs";
import { shouldShowImpactPackageDetailedReport } from "../app/dashboard/student/report/impact-package/buildImpactPackageModel";

test("builds same-tab Impact Package hrefs from project id", () => {
    assert.equal(
        studentImpactPackageHref("opp-1", "flash"),
        "/dashboard/student/report?projectId=opp-1&view=flash#flash",
    );
    assert.equal(
        studentImpactPackageHref("opp-1", "v17"),
        "/dashboard/student/report?projectId=opp-1&view=v17#report",
    );
    assert.equal(
        studentImpactPackageHref("opp-1", "print"),
        "/dashboard/student/report?projectId=opp-1&view=print#report",
    );
    assert.equal(
        studentImpactPackageHref("opp-1", "evidence"),
        "/dashboard/student/report?projectId=opp-1&view=evidence#evidence",
    );
    assert.equal(
        studentImpactPackageHref("opp-1", "certificate"),
        "/dashboard/student/report?projectId=opp-1&view=certificate#flash",
    );
    assert.equal(studentImpactPackageHref("  ", "flash"), null);
});

test("report page treats every wall view as an Impact Package deep-link", () => {
    for (const view of ["flash", "v17", "print", "package", "evidence", "certificate", "report", "analysis"]) {
        assert.equal(isStudentImpactPackageView(view), true, view);
    }
    assert.equal(isStudentImpactPackageView("browse"), false);
});

function landingTab(href: string, adminApproved: boolean, analysis = false) {
    const url = new URL(href, "https://cielpk.com");
    const requested = tabFromPackageQuery(url.searchParams.get("view"), url.hash);
    const tabs = (analysis ? IMPACT_PACKAGE_TABS_WITH_ANALYSIS : IMPACT_PACKAGE_TABS).filter(
        (id) => id !== "report" || shouldShowImpactPackageDetailedReport("student", adminApproved),
    );
    return clampImpactPackageTab(requested, tabs);
}

test("verified student wall buttons land on the matching package tab", () => {
    const id = "opp-1";
    assert.equal(landingTab(studentImpactPackageHref(id, "flash")!, true), "flash");
    assert.equal(landingTab(studentImpactPackageHref(id, "package")!, true), "flash");
    assert.equal(landingTab(studentImpactPackageHref(id, "certificate")!, true), "flash");
    assert.equal(landingTab(studentImpactPackageHref(id, "v17")!, true), "report");
    assert.equal(landingTab(studentImpactPackageHref(id, "print")!, true), "report");
    assert.equal(landingTab(studentImpactPackageHref(id, "evidence")!, true), "evidence");
});

test("student detailed-report links stay on flash until Super Admin approval", () => {
    const href = studentImpactPackageHref("opp-1", "v17")!;
    assert.equal(landingTab(href, false), "flash");
    assert.equal(landingTab(href, true), "report");
    assert.equal(landingTab(studentImpactPackageHref("opp-1", "evidence")!, false), "evidence");
});
