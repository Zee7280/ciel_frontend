// Browse Opportunities for Faculty and Partner / NGO / University dashboards: the public
// marketplace list, view only, without the website chrome. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

test("the public /projects page still renders the shared list in its public form", () => {
    const page = read("src/app/projects/page.tsx");
    assert.match(page, /return <ExploreOpportunitiesView \/>;/);
});

test("faculty and partner dashboards render the dashboard variant", () => {
    for (const role of ["faculty", "partner"]) {
        const page = read(`src/app/dashboard/${role}/browse/page.tsx`);
        assert.match(page, /<ExploreOpportunitiesView variant="dashboard" \/>/, role);
    }
});

test("the dashboard variant drops the site navbar, footers and hero, and opens details in a new tab", () => {
    const view = read("src/components/opportunities/ExploreOpportunitiesView.tsx");
    assert.match(view, /\{isDashboard \? null : <Navbar \/>\}/);
    assert.match(view, /\{isDashboard \? null : \(\s*<>\s*<PartnersFooter \/>/);
    assert.match(view, />Browse Opportunities<\/h1>/);
    assert.match(view, /openInNewTab=\{isDashboard\}/);
    const card = read("src/components/opportunities/MarketplaceOpportunityCard.tsx");
    assert.match(card, /\.\.\.\(openInNewTab \? \{ target: "_blank", rel: "noopener noreferrer" \} : \{\}\)/);
});

test("the Opportunities button offers Browse Opportunities to faculty and every partner kind (NGO, university, partner)", async () => {
    const { STAKEHOLDER_NAV } = await import("../src/utils/stakeholderNav.ts");
    for (const role of ["faculty", "university", "ngo", "partner"]) {
        const opportunities = STAKEHOLDER_NAV[role].mainButtons.find((m) => m.key === "opportunities");
        const browse = opportunities.subButtons.find((s) => s.label === "Browse Opportunities");
        assert.equal(browse?.href, role === "faculty" ? "/dashboard/faculty/browse" : "/dashboard/partner/browse", role);
    }
    // The sidebar renders every role from the shared model, so no role-specific list can drop it.
    const sidebar = read("src/components/Sidebar.tsx");
    assert.match(sidebar, /STAKEHOLDER_NAV\[stakeholderRole\]/);
});
