// Super Admin can download every evidence original (Restricted / Private included) as one ZIP from
// the Impact Package; every other role keeps the old rule (public + consent only).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");
const dir = "src/app/dashboard/student/report/impact-package";

test("download permission: Super Admin always, others public + consent only", () => {
    const src = read(`${dir}/buildImpactPackageModel.ts`);
    assert.match(src, /if \(audience === "admin"\) return true;\n    return visibility === "public" && publicConsent/);
    assert.match(src, /Only Super Admin can download originals\./);
    assert.doesNotMatch(src, /Downloads are blocked for everyone/);
});

test("Download all evidence posts the package's file list to the admin ZIP route", () => {
    const src = read(`${dir}/ImpactPackage.tsx`);
    assert.match(src, /\/api\/v1\/admin\/reports\/\$\{encodeURIComponent\(downloadReportId\)\}\/evidence\/download/);
    assert.match(src, /body: JSON\.stringify\(\{ urls: model\.files\.map\(\(file\) => file\.url\) \}\)/);
    assert.match(src, /if \(audience !== "admin" \|\| !downloadReportId\)/, "non-admin viewers keep the old behaviour");
    assert.match(src, /onClick=\{\(\) => void downloadAllEvidence\(\)\}/);
    assert.match(read("src/app/dashboard/admin/reports/verify/AdminReviewPackageStrip.tsx"), /reportId=\{reportId\}/);
});

test("the Next proxy forwards POST, auth and the ZIP headers", () => {
    const src = read("src/app/api/v1/admin/reports/[reportId]/evidence/download/route.ts");
    assert.match(src, /export async function POST/);
    assert.match(src, /\/admin\/reports\/\$\{encodeURIComponent\(id\)\}\/evidence\/download/);
    assert.match(src, /X-Evidence-Not-In-Record/);
});
