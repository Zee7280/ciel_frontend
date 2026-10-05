import assert from "node:assert/strict";
import test from "node:test";
import { buildMarketplaceCoverSvg, marketplaceCoverPaletteIndex, resolveMarketplaceCoverUrl } from "./marketplaceCover";

test("auto cover is a unique SVG per seed and never prints the placeholder caption", () => {
    const a = buildMarketplaceCoverSvg("opp-1");
    const b = buildMarketplaceCoverSvg("opp-2");
    assert.notEqual(a, b);
    assert.match(a, /<svg /);
    assert.equal(a.includes("AI-generated"), false);
    assert.equal(marketplaceCoverPaletteIndex("opp-1"), marketplaceCoverPaletteIndex("opp-1"));
});

test("uploaded cover wins; otherwise auto data URI is used", () => {
    assert.equal(resolveMarketplaceCoverUrl("opp-1", "https://cdn.example/cover.jpg"), "https://cdn.example/cover.jpg");
    assert.equal(resolveMarketplaceCoverUrl("opp-1", "  "), resolveMarketplaceCoverUrl("opp-1", null));
    assert.match(resolveMarketplaceCoverUrl("opp-9"), /^data:image\/svg\+xml/);
});
