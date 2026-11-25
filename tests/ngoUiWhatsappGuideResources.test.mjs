// NGO / Partner project footer removed; WhatsApp app-first with a chooser; section guide pops up
// on first visit; Section 5 resources carry contributor and evidence trail. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

test("NGO and Partner project views no longer show the monitoring footer line", () => {
    for (const f of [
        "src/app/dashboard/partner/community-service/NgoCommunityServiceHub.tsx",
        "src/app/dashboard/partner/community-service/PartnerCommunityServiceHub.tsx",
    ]) {
        assert.doesNotMatch(read(f), /Monitoring does not expose raw private student phone numbers/, f);
    }
});

test("WhatsApp on a computer clicks a real whatsapp:// link and falls back to a chooser, never a surprise navigation", () => {
    const lib = read("src/utils/reminderLinks.ts");
    assert.match(lib, /clickHref\(appHref\);/);
    assert.match(lib, /new CustomEvent\(WHATSAPP_FALLBACK_EVENT, \{ detail, cancelable: true \}\)/);
    assert.match(lib, /if \(unhandled && !openInNewTab\(webHref\)\) window\.location\.href = webHref;/);
    const bridge = read("src/components/WhatsAppLinkBridge.tsx");
    assert.match(bridge, /window\.addEventListener\(WHATSAPP_FALLBACK_EVENT, onFallback\)/);
    assert.match(bridge, /event\.preventDefault\(\);\s*setFallback\(detail\);/);
    assert.match(bridge, /data-testid="whatsapp-fallback"/);
    // The chooser's own links are real anchors the bridge must not re-intercept.
    assert.match(bridge, /anchor\.hasAttribute\("data-ciel-whatsapp-direct"\)/);
    assert.match(bridge, /href=\{fallback\.appHref\}/);
    assert.match(bridge, /href=\{fallback\.webHref\}[\s\S]*target="_blank"/);
});

test("the section guide opens by itself the first time a section is reached, and can be switched off", () => {
    const guide = read("src/components/report/ReportSectionGuideFloat.tsx");
    assert.match(guide, /autoOpenKey\?: string \| null;/);
    assert.match(guide, /ciel_report_guide_seen:\$\{autoOpenKey\}/);
    assert.match(guide, /if \(!readAutoPref\(\) \|\| readSeen\(storageKey\)\.includes\(sectionStep\)\) return;/);
    assert.match(guide, /Show this guide automatically when I reach a new section/);
    assert.match(read("src/app/dashboard/student/report/page.tsx"), /autoOpenKey=\{projectId \|\| null\}/);
});

test("Section 5 resources: contributor and evidence trail on every entry (no duplicate PKR value field), mirrored in validation and the detailed report", () => {
    const form = read("src/app/dashboard/student/report/components/Section6Resources.tsx");
    for (const field of ["contributor_name", "contributor_email", "contributor_phone_code", "contributor_phone", "evidence_trail"]) {
        // V21 writes a field either on its own (onUpdate("x", …)) or together with others (onUpdateFields({ x: … })).
        assert.match(form, new RegExp(`onUpdate\\("${field}"|\\b${field}: `), field);
    }
    assert.match(form, /50 notebooks \(or PKR 5,000 cash\)/);
    assert.doesNotMatch(form, /pkr_value|PKR value of this contribution/);
    assert.match(form, /Evidence for each contribution/);
    const validation = read("src/app/dashboard/student/report/utils/validation.ts");
    assert.match(validation, /isExternalResourceSource\(sources\)/);
    assert.match(validation, /Mobile number needs a country code/);
    const detailed = read("src/app/dashboard/student/report/impact-package/buildImpactPackageDetailedReport.ts");
    assert.match(detailed, /Total cash PKR/);
    assert.doesNotMatch(detailed, /pkr_value/);
    assert.doesNotMatch(validation, /pkr_value/);
    assert.match(detailed, /evidence_trail: text\(rec\(item\)\.evidence_trail\)/);
});
