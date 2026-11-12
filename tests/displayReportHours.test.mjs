// One rule for report hours on every screen: the larger of the stored (approved-only) count and
// the non-rejected logged hours. Scoring inputs keep their own count. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

test("the shared helper takes the larger of the stored count and the non-rejected logged hours", () => {
    const src = read("src/app/dashboard/student/report/utils/engagementMetrics.ts");
    assert.match(src, /export function displayReportHours\(storedHours: unknown, logs: AttendanceLog\[\] \| null \| undefined\): number \{/);
    assert.match(src, /return Math\.max\(Number\.isFinite\(stored\) && stored > 0 \? stored : 0, sumNonRejectedLoggedHours\(/);
});

test("every screen that shows a report's hours uses it", () => {
    const sites = [
        "src/app/dashboard/student/report/impact-package/buildImpactPackageModel.ts",
        "src/app/dashboard/student/report/ReportFormChrome.tsx",
        "src/app/dashboard/student/report/components/CertificateView.tsx",
        "src/app/dashboard/student/report/impact-package/ImpactPackageCertificate.tsx",
        "src/app/dashboard/student/report/components/Section11Summary.tsx",
        "src/app/dashboard/student/report/components/ReportPrintView.tsx",
        "src/app/dashboard/student/report/components/Section6Resources.tsx",
        "src/utils/reportSection1ParticipationDisplay.ts",
        "src/app/dashboard/partner/verify/[reportId]/page.tsx",
        "src/app/dashboard/admin/reports/verify/[reportId]/page.tsx",
        "src/app/dashboard/partner/reports/page.tsx",
    ];
    for (const file of sites) assert.match(read(file), /displayReportHours\(/, file);
    // The session count beside the hours comes from the same sessions.
    for (const file of ["src/utils/reportSection1ParticipationDisplay.ts", "src/app/dashboard/student/report/components/ReportPrintView.tsx"]) {
        assert.match(read(file), /displayReportSessionCount\(/, file);
    }
    // List views never let a stored metric lower the server's shown hours.
    assert.match(read("src/app/dashboard/student/impact/StudentImpactPortfolioTable.tsx"), /Math\.max\(Number\(r\.section1\?\.metrics\?\.total_verified_hours\) \|\| 0, Number\(r\.hours\) \|\| 0\)/);
    assert.match(read("src/app/dashboard/faculty/impact/page.tsx"), /hours: Math\.max\(/);
    assert.match(read("src/utils/communityAwardModel.ts"), /const hours = Math\.max\(Number\(item\.hours\) \|\| 0,/);
    // CII input on the certificates stays the stored / approved count.
    for (const file of ["src/app/dashboard/student/report/components/CertificateView.tsx", "src/app/dashboard/student/report/impact-package/ImpactPackageCertificate.tsx"]) {
        assert.match(read(file), /total_verified_hours: ciiVerifiedHours/, file);
    }
});
