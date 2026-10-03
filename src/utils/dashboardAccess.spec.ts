import assert from "node:assert/strict";
import test from "node:test";
import { dashboardRoleSlug, decideDashboardAccess } from "./dashboardAccess";

test("only the five role dashboards are guarded", () => {
    assert.equal(dashboardRoleSlug("/dashboard/admin/projects"), "admin");
    assert.equal(dashboardRoleSlug("/dashboard/partner"), "partner");
    assert.equal(dashboardRoleSlug("/dashboard"), null);
    assert.equal(dashboardRoleSlug("/dashboard/unknown/x"), null);
    assert.equal(dashboardRoleSlug("/login"), null);
});

test("signed-out or expired visitors are sent to login", () => {
    assert.deepEqual(decideDashboardAccess({ pathname: "/dashboard/faculty", tokenValid: false, role: "faculty" }), { action: "login" });
    assert.deepEqual(decideDashboardAccess({ pathname: "/dashboard/faculty", tokenValid: true, role: null }), { action: "login" });
});

test("a student opening another role's dashboard lands on their own", () => {
    assert.deepEqual(decideDashboardAccess({ pathname: "/dashboard/faculty/reports", tokenValid: true, role: "student" }), { action: "redirect", to: "/dashboard/student" });
    assert.deepEqual(decideDashboardAccess({ pathname: "/dashboard/admin", tokenValid: true, role: "partner" }), { action: "redirect", to: "/dashboard/partner" });
});

test("own dashboard and non-role pages are allowed", () => {
    assert.deepEqual(decideDashboardAccess({ pathname: "/dashboard/student/projects", tokenValid: true, role: "student" }), { action: "allow" });
    assert.deepEqual(decideDashboardAccess({ pathname: "/dashboard", tokenValid: false, role: null }), { action: "allow" });
});
