// Audit of the wizard against "CIEL PK — Community Engagement Report V19 · Streamlined Activities &
// Outputs" (the Final HTML spec). These pin the structural gaps that audit found, so they stay
// closed and stay in sync between the wizard rules, the backend submit gate and the reviewer dossier.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");
const R = "src/app/dashboard/student/report/";
const validation = read(`${R}utils/validation.ts`);
const backend = readFileSync(
    path.resolve(root, "../ciel_backend/src/reports/report-submit-validation.util.ts"),
    "utf8",
);

test("3.2 · a student-added SDG needs Target + Indicator, in the wizard, the backend gate and the card", () => {
    for (const src of [validation, backend]) {
        assert.match(src, /secondary_sdgs\.\$\{index\}\.target_id/);
        assert.match(src, /secondary_sdgs\.\$\{index\}\.indicator_id/);
    }
    const s3 = read(`${R}components/Section3SDGMapping.tsx`);
    assert.match(s3, /getFieldError\(`secondary_sdgs\.\$\{index\}\.target_id`\)/);
    assert.match(s3, /getFieldError\(`secondary_sdgs\.\$\{index\}\.indicator_id`\)/);
});

test("4.3 · \"How do you know?\" is required (or an evidence-method tag), with an inline error", () => {
    assert.match(validation, /field: 'story_because'/);
    assert.match(validation, /!asList\(data\.evidence_basis_tags\)\.length/);
    assert.match(backend, /field: 'story_because'/);
    assert.match(backend, /!listHasItems\(section5\.evidence_basis_tags\)/);
    assert.match(read(`${R}components/Section4Streamlined.tsx`), /getFieldError\("story_because"\)/);
});

test("6.2 · a resource entry needs type, amount, unit, source(s) and verification, shown per field", () => {
    for (const key of ["type", "amount", "unit", "sources", "verification"]) {
        assert.match(validation, new RegExp(`resources\\.\\$\\{index\\}\\.${key}\``), `wizard ${key}`);
        assert.match(backend, new RegExp(`resources\\.\\$\\{index\\}\\.${key}\``), `backend ${key}`);
    }
    const s6 = read(`${R}components/Section6Resources.tsx`);
    for (const key of ["type", "unit", "sources", "verification"]) {
        assert.match(s6, new RegExp(`getFieldError\\(\`resources\\.\\$\\{idx\\}\\.${key}\`\\)`), `error slot ${key}`);
    }
});

test("8.2 · one mandatory authenticity / consent / privacy confirmation; the caption stays optional", () => {
    assert.match(validation, /export function evidenceEthicsConfirmed/);
    assert.match(validation, /field: 'ethical_compliance'/);
    assert.match(backend, /export function evidenceEthicsConfirmed/);
    assert.match(backend, /field: 'ethical_compliance'/);
    assert.match(backend, /if \(stringField\(section8\.description\)\.trim\(\)\) \{\n\s+checkWordRange\(/, "caption only checked when given");
    assert.doesNotMatch(backend, /message: 'What does your evidence show\? is required'/);
    const s8 = read(`${R}components/Section8Evidence.tsx`);
    assert.match(s8, /data-testid="evidence-ethics-confirmation"/);
    assert.match(s8, /I\/we confirm that this evidence is authentic and relates to this project/);
    assert.match(s8, /EVIDENCE_ETHICS_FLAGS\.map\(\(flag\) => \[flag, e\.target\.checked\]\)/);
    assert.match(s8, /getFieldError\("ethical_compliance"\)/);
});

test("public-share permission is its own tick: the ethics confirmation never implies it (both repos)", () => {
    const fe = read(`${R}utils/mediaVisibility.ts`);
    const be = readFileSync(path.resolve(root, "../ciel_backend/src/reports/media-visibility.util.ts"), "utf8");
    for (const src of [fe, be]) {
        assert.doesNotMatch(src, /ethics\.privacy_respected === true \|\|/);
        assert.match(src, /row\.consent_informed === true \|\| row\.consent_authentic === true/);
    }
});

test("reviewer dossier (ReportPrintView) shows the V19 fields the detailed package already had", () => {
    const print = read(`${R}components/ReportPrintView.tsx`);
    for (const q of [
        "How do you know? (evidence basis, 4.3)",
        "Evidence methods (4.3)",
        "Challenge tags (4.3)",
        "Authenticity, consent & privacy confirmation (8.2)",
        "Skills grown (9.2)",
        "The biggest thing I learned (9.2)",
        "A moment that changed how I see things (9.2)",
        "An academic skill I actually applied (9.2)",
        "What keeps it going (10.3)",
        "Final report declaration & electronic sign-off (10.5)",
    ]) {
        assert.ok(print.includes(`q="${q}"`), `dossier row: ${q}`);
    }
    assert.match(print, /p\.designation\?\.trim\(\) \? `Designation: \$\{p\.designation\}`/);
    assert.match(print, /p\.contribution_line\?\.trim\(\)/);
});
