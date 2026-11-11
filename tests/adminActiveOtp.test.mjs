// Super Admin User Management: the Passwords view also shows live OTP codes (per account under the
// password, and a list that includes signups without an account yet).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { normalizeActiveOtps, otpPurposeLabel, otpExpiryLabel } = await import(path.join(root, "src/utils/adminActiveOtp.ts"));

test("normalises backend rows and drops rows without a code", () => {
    const rows = normalizeActiveOtps([
        { email: "a@bnu.edu.pk", code: "482913", purpose: "signup", expiresAt: "2026-11-11T10:05:00Z", verified: false, hasAccount: false },
        { email: "b@bnu.edu.pk", code: "771204", purpose: "team_verification", expiresAt: "2026-11-11T10:09:00Z", verified: true, projectTitle: "BinIt Right" },
        { email: "c@bnu.edu.pk", code: "" },
        null,
    ]);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].hasAccount, false);
    assert.equal(rows[1].verified, true);
    assert.equal(otpPurposeLabel(rows[0]), "Signup");
    assert.equal(otpPurposeLabel(rows[1]), "Team verification · BinIt Right");
    assert.deepEqual(normalizeActiveOtps(undefined), []);
});

test("expiry label", () => {
    const now = Date.parse("2026-11-11T10:00:00Z");
    assert.equal(otpExpiryLabel("2026-11-11T10:04:30Z", now), "4 min left");
    assert.equal(otpExpiryLabel("2026-11-11T10:00:20Z", now), "under 1 min left");
    assert.equal(otpExpiryLabel("2026-11-11T09:59:00Z", now), "expired");
    assert.equal(otpExpiryLabel("not a date", now), "");
});

test("users page: OTPs only inside the Super Admin Passwords view", () => {
    const src = readFileSync(path.join(root, "src/app/dashboard/admin/users/page.tsx"), "utf8");
    assert.match(src, /active_otps: normalizeActiveOtps\(u\.active_otps\)/);
    assert.match(src, /name: "Password \/ OTP"/);
    assert.match(src, /\{showPasswordColumn && <ActiveOtpPanel search=\{debouncedSearch\}/);
    // Still requested only with the existing reveal flag.
    assert.match(src, /if \(showPasswordColumn\) params\.set\("reveal_passwords", "1"\);/);
});
