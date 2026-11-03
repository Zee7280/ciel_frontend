// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePin, resolveOpportunityMap, safeGoogleMapsUrl } from "../src/utils/opportunityMapLink.ts";

test("only real https Google Maps links are accepted", () => {
    assert.equal(safeGoogleMapsUrl("https://maps.app.goo.gl/abc123"), "https://maps.app.goo.gl/abc123");
    assert.equal(safeGoogleMapsUrl("https://www.google.com/maps/place/Lahore"), "https://www.google.com/maps/place/Lahore");
    assert.equal(safeGoogleMapsUrl("https://maps.google.com/?q=31.5,74.3"), "https://maps.google.com/?q=31.5,74.3");
    assert.equal(safeGoogleMapsUrl("https://goo.gl/maps/xyz"), "https://goo.gl/maps/xyz");
    for (const bad of [
        "",
        "javascript:alert(1)",
        "http://www.google.com/maps/place/x",
        "https://evil.example/maps",
        "https://google.com.evil.example/maps",
        "https://www.google.com/search?q=maps",
        "https://goo.gl/other",
        "not a url",
    ]) {
        assert.equal(safeGoogleMapsUrl(bad), "", bad);
    }
});

test("pins parse from the picker's 'lat,lng' string and reject junk", () => {
    assert.deepEqual(parsePin("31.5204,74.3587"), [31.5204, 74.3587]);
    assert.deepEqual(parsePin(" 24.86 , 67.01 "), [24.86, 67.01]);
    assert.deepEqual(parsePin({ lat: 33.6844, lng: 73.0479 }), [33.6844, 73.0479]);
    assert.equal(parsePin("0,0"), null);
    assert.equal(parsePin("95,10"), null);
    assert.equal(parsePin("10,200"), null);
    assert.equal(parsePin("abc"), null);
    assert.equal(parsePin(""), null);
});

test("map resolves pasted link → pin → venue+city search, and skips remote listings", () => {
    const link = resolveOpportunityMap({ venue: "Hall", city: "Lahore", pin: "31.5,74.3", mapLink: "https://maps.app.goo.gl/q1" }, "On-site");
    assert.equal(link.source, "link");
    assert.equal(link.url, "https://maps.app.goo.gl/q1");
    assert.equal(link.place, "Hall, Lahore");

    const pin = resolveOpportunityMap({ venue: "Hall", city: "Lahore", pin: "31.5204,74.3587", mapLink: "https://evil.example/x" }, "On-site");
    assert.equal(pin.source, "pin");
    assert.equal(pin.url, "https://www.google.com/maps/search/?api=1&query=31.5204,74.3587");

    const search = resolveOpportunityMap({ venue: "Edhi Centre, Mithadar", city: "Karachi" }, "On-site");
    assert.equal(search.source, "search");
    assert.equal(search.url, "https://www.google.com/maps/search/?api=1&query=Edhi%20Centre%2C%20Mithadar%2C%20Karachi");

    assert.equal(resolveOpportunityMap({ venue: "Zoom", city: "Lahore" }, "Remote"), null);
    assert.equal(resolveOpportunityMap({}, "On-site"), null);
    assert.equal(resolveOpportunityMap(null, "On-site"), null);
    // a remote listing that still has an explicit pin keeps its map
    assert.equal(resolveOpportunityMap({ pin: "31.5,74.3" }, "Remote").source, "pin");
    // venue equal to city is not repeated
    assert.equal(resolveOpportunityMap({ venue: "Lahore", city: "Lahore" }, "On-site").place, "Lahore");
});
