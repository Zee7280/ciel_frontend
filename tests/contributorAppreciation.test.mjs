// Section 5 resource contributors: after CIEL PK publishes a report, each external contributor gets an
// appreciation email with a public certificate, and accounts with that email see the contribution on
// their impact wall. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

test("public certificate page reads the token route and shows contributor, project, lead and certificate id — never email/phone", () => {
    const page = read("src/app/verify/contribution/[token]/page.tsx");
    assert.match(page, /ContributionCertificateClient token=\{decodeURIComponent\(token \|\| ""\)\}/);
    const client = read("src/components/ContributionCertificateClient.tsx");
    assert.match(client, /CONTRIBUTION_CERTIFICATE_API = "\/api\/v1\/public\/contributions"/);
    assert.match(client, /Certificate of Contribution/);
    assert.match(client, /cert\.contributor_name/);
    assert.match(client, /cert\.lead_name/);
    assert.match(client, /cert\.certificate_code/);
    assert.match(client, /window\.print\(\)/);
    assert.doesNotMatch(client, /contributor_email|contributor_phone/);
});

test("the account card calls /contributions/me, hides itself when empty, and is mounted on every impact wall", () => {
    const card = read("src/components/ciel/MyResourceContributions.tsx");
    assert.match(card, /MY_CONTRIBUTIONS_API = "\/api\/v1\/contributions\/me"/);
    assert.match(card, /redirectToLogin: false/);
    assert.match(card, /if \(!items\.length\) return null;/);
    assert.match(card, /item\.certificate_url/);
    for (const page of [
        "src/app/dashboard/student/impact/page.tsx",
        "src/app/dashboard/faculty/impact/page.tsx",
        "src/app/dashboard/partner/community-service/PartnerCommunityServiceHub.tsx",
        "src/app/dashboard/partner/community-service/NgoCommunityServiceHub.tsx",
        "src/app/dashboard/partner/community-service/UniversityCommunityServiceHub.tsx",
    ]) {
        const src = read(page);
        assert.match(src, /import MyResourceContributions from "@\/components\/ciel\/MyResourceContributions";/, page);
        assert.match(src, /<MyResourceContributions className="m[bt]-\d" \/>/, page);
    }
});
