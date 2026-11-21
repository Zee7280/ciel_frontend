// Rule: no one sees the Impact Package before CIEL PK Admin approves the report. The backend answers
// 403 for faculty / university / partner reads until then; these tests pin the frontend side —
// one shared release helper, one shared locked panel, every list link and card gated by it — plus
// the in-app notification links and the print layout of the detailed-report tables.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");
const queue = await import("../src/utils/reviewQueue.ts");

test("release rule: admin sign-off (admin_status approved/verified, or status verified) and nothing less", () => {
    assert.equal(queue.isCommunityReportAdminSignedOff({ admin_status: "approved" }), true);
    assert.equal(queue.isCommunityReportAdminSignedOff({ status: "verified" }), true);
    assert.equal(queue.isCommunityReportAdminSignedOff({ admin_status: "pending", status: "submitted" }), false);
    assert.equal(queue.isCommunityReportAdminSignedOff({ faculty_status: "approved", status: "submitted" }), false);
    const helper = read("src/utils/reportPackageRelease.ts");
    assert.match(helper, /isCommunityReportAdminSignedOff\(row as CommunityReviewRow\)/, "frontend helper reuses the queue rule");
    assert.match(helper, /export function isPackageLockedResponse[\s\S]*status === 403/);
});

test("faculty and partner/university package pages show the shared locked panel instead of the package", () => {
    const faculty = read("src/app/dashboard/faculty/reports/[reportId]/FacultyImpactPackagePage.tsx");
    const partner = read("src/app/dashboard/partner/verify/[reportId]/page.tsx");
    for (const [name, src] of [["faculty", faculty], ["partner", partner]]) {
        assert.match(src, /isPackageLockedResponse\(response\?\.status\)/, `${name}: 403 → locked`);
        assert.match(src, /isReportPackageReleased\((rec|prepared) as CommunityReviewRow\)/, `${name}: unreleased payload → locked`);
        assert.match(src, /<ReportPackageLockedPanel/, `${name}: shared panel`);
    }
    const panel = read("src/components/verify/ReportPackageLockedPanel.tsx");
    assert.match(panel, /REPORT_PACKAGE_LOCK_TITLE/);
    assert.match(panel, /data-testid="report-package-locked"/);
});

test("every list link and card to a package is gated by the same helper", () => {
    assert.match(read("src/app/dashboard/faculty/reports/page.tsx"), /isReportPackageReleased\(report\) \? \([\s\S]*?Open Impact Package[\s\S]*?list-package-locked/);
    const partnerList = read("src/app/dashboard/partner/reports/page.tsx");
    assert.equal((partnerList.match(/isReportPackageReleased\(report\)/g) || []).length, 2, "both partner list links");
    const card = read("src/components/ciel/community-service/ProjectMonitorCard.tsx");
    assert.match(card, /const released = live \|\| isReportPackageReleased\(row\);/);
    assert.match(card, /const reportOpenHref = released \? reportHref : undefined;/);
    assert.match(card, /nextTitle: "Awaiting CIEL PK approval"/);
    assert.match(card, /\{reportOpenHref \? \(\s*<Link href=\{reportOpenHref\}/);
    const queueCard = read("src/components/ciel/community-service/CommunityQueueCard.tsx");
    assert.match(queueCard, /locked\?: boolean;/);
    assert.match(queueCard, /if \(locked \|\| !href\)/);
    const uni = read("src/app/dashboard/partner/community-service/UniversityCommunityServiceHub.tsx");
    assert.match(uni, /locked=\{tab !== "done"\}/, "university pending reports are status rows");
    assert.match(uni, /data-testid="approved-record-flashcard-link"/, "approved project record links the flashcard");
    assert.match(uni, /package=1&doc=flashcard[\s\S]*?Impact flashcard[\s\S]*?doc=report[\s\S]*?Detailed report[\s\S]*?doc=evidence/);
    assert.match(read("src/app/dashboard/faculty/community-service/useFacultyCommunityServiceData.ts"), /isReportPackageReleased\(row\) \? "Open Impact Package" : "Awaiting CIEL PK approval →"/);
});

test("in-app notifications carry a link: student / faculty (shared page), partner, admin and the header dropdown open it", () => {
    for (const rel of [
        "src/app/dashboard/student/notifications/page.tsx",
        "src/app/dashboard/partner/notifications/page.tsx",
    ]) {
        const src = read(rel);
        assert.match(src, /link\?: string \| null;/, rel);
        assert.match(src, /relatedLink\(notification\)/, rel);
        assert.match(src, /data-testid="notification-open-link"/, rel);
    }
    assert.match(read("src/app/dashboard/faculty/notifications/page.tsx"), /student\/notifications\/page/);
    const admin = read("src/app/dashboard/admin/notifications/page.tsx");
    assert.match(admin, /from "@\/utils\/notificationLink"/);
    assert.doesNotMatch(admin, /function relatedLink\(/, "admin uses the shared helper");
    const header = read("src/components/DashboardHeader.tsx");
    assert.match(header, /const openNotification = \(notification: HeaderNotification\)/);
    assert.match(header, /onClick=\{\(\) => openNotification\(notification\)\}/);
    const util = read("src/utils/notificationLink.ts");
    assert.match(util, /v\.startsWith\("\/"\) && !v\.startsWith\("\/\/"\)/, "only same-origin paths are linkable");
});

test("printed detailed report: entry tables fit the page instead of being cut at the scroll edge", () => {
    const css = read("src/app/dashboard/student/report/impact-package/impact-package.css");
    const printBlock = css.slice(css.lastIndexOf("@media print{"));
    assert.match(printBlock, /\.ipkg \.dr-table-wrap\{overflow:visible!important/);
    assert.match(printBlock, /\.ipkg table\.dr-table\{table-layout:fixed;width:100%/);
    assert.match(printBlock, /\.ipkg \.dr-table th\{white-space:normal/);
    assert.match(printBlock, /\.ipkg \.dr-table \.dr-clip\{display:block;-webkit-line-clamp:unset/);
});
