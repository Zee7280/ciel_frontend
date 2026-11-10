// Admin "Back" from a report's verify page / package / analyser returns to the list it was opened
// from (Reports for review board or the Student reports table), never to an outside URL.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mod = await import(path.join(root, "src/utils/adminReviewReturn.ts"));

function withStorage(fn) {
    const store = new Map();
    globalThis.window = {
        sessionStorage: {
            getItem: (k) => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => store.set(k, String(v)),
        },
    };
    try {
        fn(store);
    } finally {
        delete globalThis.window;
    }
}

test("Back returns to the board the report was opened from", () => {
    withStorage(() => {
        assert.equal(mod.readAdminReviewReturn(), mod.ADMIN_REPORTS_TABLE_HREF, "default is the table");
        mod.rememberAdminReviewReturn("/dashboard/admin/community-service?view=reports");
        assert.equal(mod.readAdminReviewReturn(), "/dashboard/admin/community-service?view=reports");
        assert.equal(mod.adminReviewReturnLabel(mod.readAdminReviewReturn()), "Reports for review");
        mod.rememberAdminReviewReturn(mod.ADMIN_REPORTS_TABLE_HREF);
        assert.equal(mod.readAdminReviewReturn(), mod.ADMIN_REPORTS_TABLE_HREF, "opening the table again resets it");
        assert.equal(mod.adminReviewReturnLabel(mod.ADMIN_REPORTS_TABLE_HREF), "Student reports");
    });
});

test("only in-app Admin list pages are accepted", () => {
    withStorage((store) => {
        for (const bad of ["https://evil.example", "//evil.example", "/dashboard/student", "/dashboard/admin/reports/verify/abc?package=1"]) {
            mod.rememberAdminReviewReturn(bad);
            assert.equal(mod.readAdminReviewReturn(), mod.ADMIN_REPORTS_TABLE_HREF, bad);
        }
        store.set(mod.ADMIN_REVIEW_RETURN_KEY, "https://evil.example");
        assert.equal(mod.readAdminReviewReturn(), mod.ADMIN_REPORTS_TABLE_HREF, "a tampered value is ignored");
    });
});

test("blocked storage falls back to the table", () => {
    globalThis.window = {
        sessionStorage: {
            getItem() {
                throw new Error("blocked");
            },
            setItem() {
                throw new Error("blocked");
            },
        },
    };
    try {
        mod.rememberAdminReviewReturn("/dashboard/admin/community-service?view=reports");
        assert.equal(mod.readAdminReviewReturn(), mod.ADMIN_REPORTS_TABLE_HREF);
    } finally {
        delete globalThis.window;
    }
});

test("both lists record themselves; verify page and analyser read it", () => {
    const read = (p) => readFileSync(path.join(root, p), "utf8");
    assert.match(read("src/app/dashboard/admin/community-service/page.tsx"), /rememberAdminReviewReturn\(`\/dashboard\/admin\/community-service/);
    assert.match(read("src/app/dashboard/admin/reports/verify/page.tsx"), /rememberAdminReviewReturn\(ADMIN_REPORTS_TABLE_HREF\)/);
    const verify = read("src/app/dashboard/admin/reports/verify/[reportId]/page.tsx");
    assert.match(verify, /readAdminReviewReturn\(\)/);
    assert.doesNotMatch(verify, /onClick=\{\(\) => router\.push\("\/dashboard\/admin\/reports\/verify"\)\}/);
    assert.match(read("src/components/ciel/community-service/CommunityCiiAnalyser.tsx"), /isCielPk \? cielReturnHref/);
});
