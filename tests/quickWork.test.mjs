// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    activityErrors,
    attendanceErrors,
    attendanceMinutes,
    evidenceErrors,
    evidenceKind,
    evidenceTypeOf,
    formatHours,
    formFromLog,
    joinErrors,
    payloadFromForm,
    teamErrors,
} from "../src/utils/quickWorkRules.ts";

// 2026-10-24 12:00 PKT
const NOW = new Date("2026-10-24T07:00:00Z");

const form = (over = {}) => ({
    mode: "solo",
    leadName: "Ayesha",
    leadEmail: "a@x.pk",
    leadStudentId: "S1",
    university: "BNU",
    department: "SMS",
    facultyName: "Dr F",
    facultyEmail: "f@x.pk",
    teammates: [],
    title: "Pinktober",
    activityType: "Pinktober event",
    activityDate: "2026-10-20",
    startTime: "10:00",
    endTime: "11:00",
    location: "Lahore",
    host: "",
    sdg: "3",
    attendance: { "a@x.pk": { present: true, startTime: "10:00", endTime: "11:00", breakMinutes: "0" } },
    summary: "We ran a desk.",
    peopleReached: "",
    visibility: "Faculty, University & CIEL PK only",
    evidence: [{ url: "u", name: "p.jpg", type: "image/jpeg", size: 1, caption: "Desk" }],
    consent: true,
    honest: true,
    ...over,
});

test("a complete one-hour solo log has no step errors", () => {
    const f = form();
    assert.deepEqual([...teamErrors(f), ...activityErrors(f), ...attendanceErrors(f, NOW), ...evidenceErrors(f), ...joinErrors(f)], []);
});

test("hours are minutes minus the break, shown with up to two decimals", () => {
    assert.equal(attendanceMinutes({ present: true, startTime: "10:00", endTime: "11:15", breakMinutes: "15" }), 60);
    assert.equal(attendanceMinutes({ present: false, startTime: "10:00", endTime: "11:00", breakMinutes: 0 }), 0);
    assert.equal(formatHours(90), "1.5");
    assert.equal(formatHours(20), "0.33");
});

test("today counts only after the activity ended; the future never does", () => {
    assert.deepEqual(attendanceErrors(form({ activityDate: "2026-10-24" }), NOW), []);
    assert.ok(
        attendanceErrors(form({ activityDate: "2026-10-24", endTime: "13:00" }), NOW).includes("Submit after the activity has finished (PKT)."),
    );
    assert.ok(attendanceErrors(form({ activityDate: "2026-10-25" }), NOW).includes("Attendance can only be submitted for today or a past activity."));
});

test("team mode needs teammates who confirmed, each with a unique student ID", () => {
    assert.ok(teamErrors(form({ mode: "team" })).includes("Add a teammate or select “Just me”."));
    const f = form({ mode: "team", teammates: [{ email: "ali@x.pk", studentId: "S1", name: "Ali", joinStatus: "invited" }] });
    assert.ok(teamErrors(f).includes("Each participant must have a unique student ID."));
    assert.deepEqual(joinErrors(f), ["Ali has not confirmed joining yet."]);
});

test("attendance must sit inside the event window", () => {
    const f = form({ attendance: { "a@x.pk": { present: true, startTime: "09:30", endTime: "11:00", breakMinutes: "0" } } });
    assert.ok(attendanceErrors(f, NOW).includes("Ayesha’s attendance must be inside the event time window."));
});

test("server view round-trips through the form into a save payload", () => {
    const log = {
        id: "l1",
        status: "draft",
        mode: "team",
        university: "BNU",
        department: "SMS",
        facultyName: "Dr F",
        facultyEmail: "f@x.pk",
        title: "T",
        activityType: "Pinktober event",
        activityDate: "2026-10-20",
        startTime: "10:00",
        endTime: "11:00",
        location: "L",
        host: null,
        sdg: null,
        summary: "",
        peopleReached: null,
        visibility: "Faculty, University & CIEL PK only",
        evidence: [],
        consent: false,
        honest: false,
        participants: [
            { id: "p1", userId: "u1", isLead: true, name: "A", email: "a@x.pk", studentId: "S1", joinStatus: "joined", present: true, startTime: "10:00", endTime: "11:00", breakMinutes: 0, minutes: 60 },
            { id: "p2", userId: "u2", isLead: false, name: "B", email: "b@x.pk", studentId: "S2", joinStatus: "invited", present: false, startTime: null, endTime: null, breakMinutes: 0, minutes: 0 },
        ],
    };
    const body = payloadFromForm(formFromLog(log));
    assert.deepEqual(body.teammates, [{ email: "b@x.pk", studentId: "S2", name: "B", contact: null }]);
    assert.deepEqual(body.attendance[1], { email: "b@x.pk", present: false, startTime: null, endTime: null, breakMinutes: 0 });
    assert.equal(body.sdg, null);
    assert.equal(body.peopleReached, null);
});

test("evidence type comes from the extension when the browser reports none or an alias", () => {
    assert.equal(evidenceTypeOf({ name: "IMG_1.JPEG", type: "" }), "image/jpeg");
    assert.equal(evidenceTypeOf({ name: "photo.jfif", type: "image/pjpeg" }), "image/jpeg");
    assert.equal(evidenceTypeOf({ name: "IMG_2.HEIC", type: "" }), "image/heic");
    assert.equal(evidenceTypeOf({ name: "plan.docx", type: "" }), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    assert.equal(evidenceTypeOf({ name: "clip.mov", type: "video/quicktime" }), "video/quicktime");
    assert.equal(evidenceTypeOf({ name: "page.html", type: "text/html" }), null);
    assert.equal(evidenceTypeOf({ name: "logo.svg", type: "image/svg+xml" }), null);
    assert.equal(evidenceTypeOf({ name: "all.zip", type: "application/zip" }), null);
    assert.equal(evidenceKind("image/png"), "image");
    assert.equal(evidenceKind("image/heic"), "document");
    assert.equal(evidenceKind("video/mp4"), "video");
    assert.equal(evidenceKind("application/pdf"), "pdf");
});

test("partners round-trip with contacts, and older name-only responses still load", () => {
    const base = { id: "l1", status: "draft", mode: "solo", university: "", department: "", facultyName: "", facultyEmail: "", title: "", activityType: "", activityDate: null, startTime: null, endTime: null, location: "", host: null, sdg: null, summary: "", peopleReached: null, visibility: "Faculty, University & CIEL PK only", evidence: [], consent: false, honest: false, participants: [{ id: "p1", userId: "u1", isLead: true, name: "A", email: "a@x.pk", studentId: "S1", joinStatus: "joined", present: true, startTime: null, endTime: null, breakMinutes: 0, minutes: 0 }] };
    const fresh = formFromLog({ ...base, partners: ["Edhi"], partnerDetails: [{ name: "Edhi", email: "info@edhi.org", contact: "+923001234567" }] });
    assert.deepEqual(fresh.partners, [{ name: "Edhi", email: "info@edhi.org", contact: "+923001234567" }]);
    const body = payloadFromForm({ ...fresh, partners: [...fresh.partners, { name: "WWF", email: " ", contact: "" }] });
    assert.deepEqual(body.partners, ["Edhi", "WWF"]);
    assert.deepEqual(body.partnerDetails[1], { name: "WWF", email: null, contact: null });
    const older = formFromLog({ ...base, partners: ["Edhi"] });
    assert.deepEqual(older.partners, [{ name: "Edhi", email: "", contact: "" }]);
});
