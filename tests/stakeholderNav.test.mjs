// Final Stakeholder Dashboard Structure: one shared model drives the sidebar, the mobile menu and
// every home screen. These tests pin the structure (button counts per role), that every link
// points at a route that exists, and that the screens read from the model instead of their own lists.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");
const { STAKEHOLDER_NAV, activeMainButton, hrefMatchesLocation, stakeholderNavRole } = await import("../src/utils/stakeholderNav.ts");

test("main button counts follow the structure document (5 / 5 / 6 / 5 / 5 / 7)", () => {
    const expected = { student: 5, faculty: 5, university: 6, ngo: 5, partner: 5, admin: 7 };
    for (const [role, n] of Object.entries(expected)) {
        assert.equal(STAKEHOLDER_NAV[role].mainButtons.length, n, role);
        for (const main of STAKEHOLDER_NAV[role].mainButtons) {
            assert.ok(main.subButtons.length >= 2, `${role}.${main.key} has sub-buttons`);
        }
    }
});

test("every main and sub-button links to an app route that exists", () => {
    const missing = [];
    for (const nav of Object.values(STAKEHOLDER_NAV)) {
        const hrefs = nav.mainButtons.flatMap((m) => [m.href, ...m.subButtons.map((s) => s.href)]);
        for (const href of hrefs) {
            const route = href.split("?")[0].split("#")[0];
            const page = path.join(root, "src/app", route, "page.tsx");
            if (!existsSync(page)) missing.push(`${nav.role}: ${href}`);
        }
    }
    assert.deepEqual(missing, []);
});

test("no sub-button is repeated inside a role and no two roles share a cross-wired destination by accident", () => {
    for (const nav of Object.values(STAKEHOLDER_NAV)) {
        const seen = new Map();
        for (const main of nav.mainButtons) {
            for (const sub of main.subButtons) {
                const prev = seen.get(sub.href);
                assert.ok(!prev, `${nav.role}: "${sub.label}" and "${prev}" both open ${sub.href}`);
                seen.set(sub.href, sub.label);
            }
        }
    }
});

test("student sub-buttons map to the document's statuses", () => {
    const student = STAKEHOLDER_NAV.student;
    const labels = Object.fromEntries(student.mainButtons.map((m) => [m.label, m.subButtons.map((s) => s.label)]));
    assert.deepEqual(labels, {
        Opportunities: ["My Opportunities", "Browse Opportunities", "My Applications"],
        "My Reports": ["Ready to Start", "Drafts / In Progress", "Submitted / Under Review", "Action Required / Rejected"],
        "My Impact": ["Approved Flashcards", "Evidence Gallery", "CII / Badges / Certificates", "My Rankings"],
        "Quick Community Impact": ["Log a Quick Activity", "Quick Impact Log"],
        "Help & Guidance": ["How It Works", "Report Guidance", "FAQs"],
    });
    const reports = student.mainButtons.find((m) => m.key === "reports");
    assert.deepEqual(
        reports.subButtons.map((s) => new URL(s.href, "http://x").searchParams.get("filter")),
        ["ready", "reports", "review", "action"],
    );
});

test("role resolution: partner org kind picks university / ngo / partner; investor has no structure", () => {
    assert.equal(stakeholderNavRole("student"), "student");
    assert.equal(stakeholderNavRole("partner", "university"), "university");
    assert.equal(stakeholderNavRole("partner", "ngo"), "ngo");
    assert.equal(stakeholderNavRole("partner", "partner"), "partner");
    assert.equal(stakeholderNavRole("investor"), null);
});

test("active main button: sub-button match wins, then the landing view (ignoring extra params)", () => {
    const params = (q) => new URLSearchParams(q);
    const faculty = STAKEHOLDER_NAV.faculty;
    assert.equal(activeMainButton(faculty, "/dashboard/faculty/community-service", params("view=review&tab=apps"))?.key, "approvals");
    assert.equal(activeMainButton(faculty, "/dashboard/faculty/community-service", params("view=review"))?.key, "approvals");
    assert.equal(activeMainButton(faculty, "/dashboard/faculty/attendance-review", params(""))?.key, "supervision");
    assert.equal(activeMainButton(faculty, "/dashboard/faculty/settings", params("")), null);
    assert.equal(hrefMatchesLocation("/a?view=x&tab=y", "/a", params("view=x&tab=y&page=2")), true);
    assert.equal(hrefMatchesLocation("/a?view=x&tab=y", "/a", params("view=x")), false);
});

test("sidebar, mobile menu and every home page render from the shared model", () => {
    const sidebar = read("src/components/Sidebar.tsx");
    assert.match(sidebar, /STAKEHOLDER_NAV\[stakeholderRole\]/);
    assert.match(sidebar, /<NavGroup[\s\S]*?items=\{items\}/, "main buttons expand into their sub-buttons");
    assert.match(sidebar, /mainGroups\.map\(\(g\) => \(\{ heading: `\$\{g\.main\.emoji\} \$\{g\.main\.label\}`, items: g\.items \}\)\)/, "mobile sheet uses the same groups");
    assert.doesNotMatch(sidebar, /PathsBottomSheet/, "student mobile menu is the shared sheet");
    // The student home and sidebar keep their original layout (impact-area cards, flat menu).
    const studentHome = read("src/app/dashboard/student/page.tsx");
    assert.doesNotMatch(studentHome, /StakeholderHomeCards/);
    assert.match(studentHome, /alertCount=\{card\.key === "communityService" \? csRevisionCount : undefined\}/);
    assert.match(sidebar, /<NavSectionLabel collapsed=\{collapsed\}>My Impact Areas<\/NavSectionLabel>/);
    assert.match(sidebar, /\{ heading: "My Impact Areas", items: studentAreaLinks \}/);
    const homes = {
        "src/app/dashboard/faculty/page.tsx": 'role="faculty"',
        "src/app/dashboard/partner/UniversityDashboardHome.tsx": 'role="university"',
        "src/app/dashboard/partner/NgoDashboardHome.tsx": "role={role}",
        "src/app/dashboard/admin/page.tsx": 'role="admin"',
    };
    for (const [file, roleProp] of Object.entries(homes)) {
        const src = read(file);
        assert.match(src, /<StakeholderHomeCards/, file);
        assert.ok(src.includes(roleProp), `${file} passes ${roleProp}`);
    }
    assert.match(read("src/app/dashboard/partner/page.tsx"), /<NgoDashboardHome role=\{orgKind === "ngo" \? "ngo" : "partner"\} \/>/);
    const cards = read("src/components/ciel/dashboard/StakeholderHomeCards.tsx");
    assert.match(cards, /main\.subButtons\.map\(\(sub\) =>/, "sub-buttons open inside the card");
});

test("deep links used by sub-buttons are honoured by their screens", () => {
    assert.match(read("src/app/dashboard/student/browse/page.tsx"), /get\("tab"\)[\s\S]{0,200}setFeedTab\(next\)/);
    assert.match(read("src/components/support/PortalHelpPage.tsx"), /get\("tab"\)[\s\S]{0,200}setTab\(next\)/);
    assert.match(read("src/app/dashboard/admin/quick-work/page.tsx"), /get\("status"\)[\s\S]{0,200}status: next as QuickWorkStatus/);
    assert.match(read("src/app/dashboard/student/paths/community-service/CommunityImpactWall.tsx"), /get\("filter"\) === "ranked"\) setFilter\("ranked"\)/);
});
