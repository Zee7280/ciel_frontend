import assert from "node:assert/strict";
import test from "node:test";
import {
    IMPACT_PACKAGE_CONTENT_SOURCES,
    readImpactPackagePacketIntegrity,
    resolveImpactPackagePacketIntegrity,
    validateImpactPackagePacketClient,
} from "./impactPackagePacket";

test("FINAL-110 packet maps 9 content sections (s4+s5 merged)", () => {
    assert.equal(IMPACT_PACKAGE_CONTENT_SOURCES.length, 9);
    assert.deepEqual([...IMPACT_PACKAGE_CONTENT_SOURCES[3].keys], ["section4", "section5"]);
});

test("empty section objects still count as present", () => {
    const v = validateImpactPackagePacketClient({
        section1: {},
        section2: {},
        section3: {},
        section4: {},
        section5: {},
        section6: {},
        section7: {},
        section8: {},
        section9: {},
        section10: {},
    });
    assert.equal(v.ok, true);
    assert.equal(v.content_sections, 9);
});

test("missing mapped section HOLDs the analyser", () => {
    const v = validateImpactPackagePacketClient({
        section1: {},
        section2: {},
        section4: {},
        section5: {},
        section6: {},
        section7: {},
        section8: {},
        section9: {},
        section10: {},
    });
    assert.equal(v.ok, false);
    assert.ok(v.issues.some((issue) => /section 3/i.test(issue)));
});

test("stored review_package.packet_integrity wins over live sections", () => {
    const stored = readImpactPackagePacketIntegrity({
        section1: {},
        section2: {},
        section3: {},
        section4: {},
        section5: {},
        section6: {},
        section7: {},
        section8: {},
        section9: {},
        section10: {},
        review_package: {
            packet_integrity: { ok: false, issues: ["Missing Detailed Report content section 3 (SDG Contribution)."] },
        },
    });
    assert.equal(stored?.ok, false);
    assert.equal(resolveImpactPackagePacketIntegrity({ section1: {} }).ok, false);
});
