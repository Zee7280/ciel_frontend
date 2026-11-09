// Section 9.5 "Immediate notice" preview helpers (advance partner nomination email, calendar reminder).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    buildNoticeIcs,
    googleCalendarUrl,
    icsEscape,
    noticeBlockers,
    noticeQuestions,
    noticeSubject,
    noticeText,
    prettyNoticeDate,
} from "../src/app/dashboard/student/report/utils/followupNotice.ts";

const input = {
    projectTitle: "SOS Classroom Upgrade",
    projectId: "CIEL-BNU-2026-0421",
    reportId: "",
    organization: "SOS Children’s Villages of Pakistan",
    location: "Ferozepur Road, Lahore",
    university: "Beaconhouse National University (BNU)",
    periodStart: "2026-10-01",
    periodEnd: "2026-11-30",
    objective: "Improve the classroom learning environment.",
    partnerName: "Ms. Nighat",
    partnerEmail: "nighat@sos.org.pk",
    dueDate: "2027-02-28",
    intervalLabel: "3 months after project end",
    questions: ["Is the classroom still in regular use?", "Is the wall artwork still intact?"],
};

test("subject and body carry the project reference, the tentative questions and the no-answers-today rule", () => {
    assert.equal(noticeSubject(input), "CIEL PK | You have been nominated for an impact follow-up | CIEL-BNU-2026-0421 | SOS Classroom Upgrade");
    const text = noticeText(input);
    assert.match(text, /^Dear Ms\. Nighat,/);
    assert.match(text, /nominated you as the contact for a future sustainability follow-up/);
    assert.match(text, /Project ID: CIEL-BNU-2026-0421/);
    assert.match(text, /Report ID: Pending \/ not yet provided/);
    assert.match(text, /Expected follow-up: 28 Feb 2027 \(3 months after project end\)/);
    assert.match(text, /1\. Is the classroom still in regular use\?\n2\. Is the wall artwork still intact\?/);
    assert.match(text, /NO IMPACT ANSWERS ARE REQUIRED TODAY/);
    assert.match(text, /not a meeting invitation/);
    assert.match(noticeText({ ...input, questions: [] }), /final questions will be determined from the approved project report/);
    assert.equal(noticeSubject({ ...input, projectId: "" }).includes("[PROJECT ID]"), true);
});

test("production blockers name every missing prerequisite and are empty when the nomination is complete", () => {
    assert.deepEqual(noticeBlockers(input), []);
    const bad = noticeBlockers({ ...input, projectId: "", projectTitle: "Test1. Dont Apply (SOS)", organization: "", partnerEmail: "nope", periodEnd: "", dueDate: "", optedOut: true });
    assert.deepEqual(bad, [
        "Official Project ID missing",
        "Replace the sample / test project title",
        "Organization name missing",
        "Confirmed partner email missing",
        "Project end date missing",
        "Expected follow-up date cannot be computed",
        "Partner has opted out",
    ]);
});

test("at most three non-blank, included questions are previewed", () => {
    const qs = noticeQuestions([
        { include: true, questionText: " A " },
        { include: false, questionText: "skipped" },
        { include: true, questionText: "   " },
        { include: true, questionText: "B" },
        { include: true, questionText: "C" },
        { include: true, questionText: "D" },
    ]);
    assert.deepEqual(qs, ["A", "B", "C"]);
});

test("calendar reminder: all-day transparent event, escaped text, stable UID; nothing when the date is unknown", () => {
    const ics = buildNoticeIcs(input, new Date("2026-11-09T12:34:56.789Z"));
    assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
    assert.match(ics, /METHOD:PUBLISH/);
    assert.match(ics, /UID:cielpk-CIEL-BNU-2026-0421-20270228@cielpk\.com/);
    assert.match(ics, /DTSTAMP:20261109T123456Z/);
    assert.match(ics, /DTSTART;VALUE=DATE:20270228\r\nDTEND;VALUE=DATE:20270301/);
    assert.match(ics, /TRANSP:TRANSPARENT/);
    assert.match(ics, /DESCRIPTION:.*not a meeting or confirmed invitation/);
    assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
    assert.equal(buildNoticeIcs({ ...input, dueDate: "" }, new Date()), "");
    assert.equal(icsEscape("a,b;c\nd\\e"), "a\\,b\\;c\\nd\\\\e");
    const url = googleCalendarUrl(input);
    assert.match(url, /^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/);
    assert.match(url, /dates=20270228%2F20270301/);
    assert.equal(googleCalendarUrl({ ...input, dueDate: "garbage" }), "");
    assert.equal(prettyNoticeDate("2027-02-28"), "28 Feb 2027");
    assert.equal(prettyNoticeDate(""), "date pending");
});
