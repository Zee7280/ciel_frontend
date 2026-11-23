// V19 changelog gaps closed in one pass: item 08 (attendance evidence), items 17/20/21 (registered
// secondary SDG contributions, duplicate-free footprint, full summary), item 15 (student-reported
// consent wording), item 04 (Section 2 identity strip) and items 01/02 (flash card dialog size).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");
// validation.ts and reportSdgMerge.ts use extensionless / aliased imports, so (as in the other
// suites) they are checked as source text here; the runtime behaviour of the same rules is covered
// by the backend mirror (report-submit-validation.util.spec.ts).
const risk = await import(path.join(root, "src/app/dashboard/student/report/utils/riskSafeguarding.ts"));

test("item 08: Section 1 validation blocks counted sessions without evidence, mirroring the backend gate", () => {
    const validation = read("src/app/dashboard/student/report/utils/validation.ts");
    assert.match(validation, /const missing = attendanceSessionsWithoutEvidence\(data\.attendance_logs\);/);
    assert.match(validation, /export function attendanceSessionsWithoutEvidence\(logs: unknown\)/);
    assert.match(validation, /if \(approval === 'rejected'\) return false;/);
    assert.match(validation, /return approval === 'approved' \|\| entry === 'verified';/);
    assert.match(validation, /no supporting evidence/);
});

test("item 08: Section 1 shows the banner and the card offers 'Add evidence' through the new PATCH endpoint", () => {
    const s1 = read("src/app/dashboard/student/report/components/Section1Participation.tsx");
    assert.match(s1, /attendance-missing-evidence-banner/);
    assert.match(s1, /\/attendance\/\$\{entryId\}\/evidence`/);
    assert.match(s1, /onAttachEvidence=\{handleAttachEvidence\}/);
    const table = read("src/app/dashboard/student/engagement/components/AttendanceSummaryTable.tsx");
    assert.match(table, /attendance-no-evidence/);
    assert.match(table, /uploadFileViaPresign\("\/api\/v1\/engagement\/attendance\/evidence\/presign"/);
    const chrome = read("src/app/dashboard/student/report/ReportFormChrome.tsx");
    assert.match(chrome, /evidenceBackedHours/, "summary no longer calls every logged hour evidence-backed");
});

test("item 17: Section 3 validation requires a 10–60 word statement per registered secondary SDG (seeded keys only)", () => {
    const validation = read("src/app/dashboard/student/report/utils/validation.ts");
    assert.match(validation, /const registered = asObj\(data\.registered_secondary_contributions\);/);
    assert.match(validation, /`registered_secondary_contributions\.\$\{goal\}`/);
    assert.match(validation, /`Registered SDG \$\{goal\} contribution`,\s*true,\s*'justification_text',/);
    const ctx = read("src/app/dashboard/student/report/context/ReportContext.tsx");
    assert.match(ctx, /registered_secondary_contributions\?: Record<string, string>;/);
});

test("items 17/20/21: opportunity SDG rows are de-duplicated per goal and carry the registered contribution text into snapshots", () => {
    const merge = read("src/app/dashboard/student/report/utils/reportSdgMerge.ts");
    assert.match(merge, /const byGoal = new Map<number, ReportSdgRow>\(\);/);
    assert.match(merge, /if \(existing\.role !== "primary" && row\.role === "primary"\)/);
    assert.match(merge, /return Array\.from\(byGoal\.values\(\)\);/);
    assert.match(merge, /export function registeredSecondaryContribution\(/);
    assert.match(merge, /applyRegisteredSecondaryContributions\(listOpportunityReportSdgs\(projectData\), section3\)/);
});

test("items 20/21/22: Section 3 greys out registered goals, counts registered secondaries in the footprint and labels the source", () => {
    const s3 = read("src/app/dashboard/student/report/components/Section3SDGMapping.tsx");
    // Registered goals are locked on every picker (padlock); goals taken elsewhere in 3.2 are
    // merely "taken" — the QA sweep found student-added goals being presented as registered.
    assert.match(s3, /<SDGTileGrid\s+selectedId=\{studentPrimaryId\}\s+registeredIds=\{registeredGoalIds\}/, "student primary picker blocks registered goals");
    assert.match(s3, /const takenIds = \[studentPrimaryId, \.\.\.otherSelectedIds\]\.filter\(Boolean\);/, "secondary pickers take the other student picks");
    assert.match(s3, /registeredIds=\{registeredGoalIds\}\s+takenIds=\{takenIds\}/, "secondary pickers block registered goals");
    assert.match(s3, /oppSecondaries\.forEach\(\(row\) => \{\s*push\(\{/, "registered secondaries enter finalizedGoals");
    assert.match(s3, /Registered on opportunity/);
    assert.match(s3, /Added by the team/);
    assert.match(s3, /registered_secondary_contributions\.\$\{num\}/, "one contribution field per registered secondary SDG");
    assert.match(s3, /currentSummary\.startsWith\(SDG_AUTO_SUMMARY_LEAD\)/, "generated summary is regenerated, not frozen at 100 chars");
    assert.match(s3, /Reported contributions — /);
});

test("item 15: consent is labelled student-reported everywhere a reviewer sees it", () => {
    assert.equal(risk.consentReportedLabel("written"), "Written consent obtained (student-reported, not independently verified)");
    assert.equal(risk.consentReportedLabel(""), "");
    for (const rel of [
        "src/app/dashboard/admin/reports/verify/[reportId]/page.tsx",
        "src/app/dashboard/partner/verify/[reportId]/page.tsx",
        "src/app/dashboard/student/report/components/ReportPrintView.tsx",
    ]) {
        assert.match(read(rel), /consentReportedLabel\(/, rel);
        assert.doesNotMatch(read(rel), /[^d]consentLabel\(/, rel + " still uses the bare label");
    }
    assert.match(read("src/app/dashboard/student/report/impact-package/buildImpactPackageModel.ts"), /Photo \/ data consent \(student-reported\)/);
    assert.match(read("src/app/dashboard/student/report/components/Section2ProjectContext.tsx"), /Reviewers see it as student-reported/);
});

test("item 04: Section 2 shows partner, dates and location from the opportunity instead of leaving them unused", () => {
    const s2 = read("src/app/dashboard/student/report/components/Section2ProjectContext.tsx");
    assert.match(s2, /section2-opportunity-identity/);
    assert.match(s2, /\{partner\}/);
    assert.match(s2, /\$\{startDate\} → \$\{endDate\}/);
    assert.match(s2, /\{locationDisplay \|\| "—"\}/);
});

test("items 01/02: the flash card dialog is near full-screen and its card breakpoints follow the dialog width", () => {
    const page = read("src/app/dashboard/student/report/page.tsx");
    assert.match(page, /co-flash-dialog[^"]*sm:max-w-6xl/);
    assert.match(page, /h-\[100dvh\][^"]*w-screen/, "phones get a full-screen sheet");
    assert.doesNotMatch(page, /DialogContent className="max-h-\[90vh\] w-\[calc\(100vw-2rem\)\] max-w-3xl/);
    const css = read("src/components/opportunities/create-opportunity.css");
    assert.match(css, /\.co-flash-dialog \{ container-type: inline-size; \}/);
    assert.match(css, /@container \(max-width: 980px\)/);
    assert.match(css, /@container \(max-width: 480px\)/);
});

test("stakeholder sync: admin, partner, print and the detailed package all show registered secondary SDG contributions; reviewer tables flag sessions without evidence", () => {
    for (const rel of [
        "src/app/dashboard/admin/reports/verify/[reportId]/page.tsx",
        "src/app/dashboard/partner/verify/[reportId]/page.tsx",
        "src/app/dashboard/student/report/components/ReportPrintView.tsx",
    ]) {
        assert.match(read(rel), /registered_secondary_contributions/, rel);
        assert.match(read(rel), /Registered [Ss]econdary SDG [Cc]ontributions \(3\.1\)/, rel);
    }
    assert.match(read("src/app/dashboard/student/report/impact-package/buildImpactPackageDetailedReport.ts"), /"Registered secondary SDG contributions"/);
    assert.match(read("src/components/verify/AttendanceLogsDossierTable.tsx"), /dossier-no-evidence/);
    assert.match(read("src/utils/attendanceLogDisplay.ts"), /label: "No evidence", missing: true/);
});
