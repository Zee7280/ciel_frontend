import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import ReportProgressCard from "./ReportProgressCard";

const base = { title: "SOS Classroom", student: "Zain", progressPct: 40, sectionsComplete: 4 };

test("faculty / university card is locked: no link, shows lock note and progress", () => {
    const html = renderToStaticMarkup(<ReportProgressCard {...base} />);
    assert.ok(!html.includes("<a "), "locked card must not be a link");
    assert.ok(html.includes("Opens after the student submits"));
    assert.ok(html.includes("40%"));
    assert.ok(html.includes('aria-valuenow="40"'));
    assert.ok(html.includes("4 of 10 sections complete"));
});

test("admin card links to the report", () => {
    const html = renderToStaticMarkup(<ReportProgressCard {...base} href="/dashboard/admin/reports/verify/r1" />);
    assert.ok(html.includes('href="/dashboard/admin/reports/verify/r1"'));
    assert.ok(html.includes("Open report"));
    assert.ok(!html.includes("Opens after the student submits"));
});

test("progress is clamped to 0-100", () => {
    assert.ok(renderToStaticMarkup(<ReportProgressCard {...base} progressPct={250} />).includes("100%"));
    assert.ok(renderToStaticMarkup(<ReportProgressCard {...base} progressPct={-5} />).includes("0%"));
});
