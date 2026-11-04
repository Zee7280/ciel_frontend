// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    activityErrors,
    attendanceErrors,
    attendees,
    attendanceMinutes,
    evidenceErrors,
    evidenceKind,
    evidenceTypeOf,
    formatHours,
    formFromLog,
    formSdgs,
    joinErrors,
    joinNote,
    logSdgs,
    payloadFromForm,
    unconfirmedTeammates,
    quickImpactFlashcard,
    sdgChip,
    sdgShort,
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

test("team mode needs a teammate with a unique student ID; an unanswered invite does not hold the log back, a declined one does", () => {
    assert.ok(teamErrors(form({ mode: "team" })).includes("Add a teammate or select “Just me”."));
    const mate = (joinStatus) => ({ email: "ali@x.pk", studentId: "S1", name: "Ali", joinStatus });
    const f = form({ mode: "team", teammates: [mate("invited")] });
    assert.ok(teamErrors(f).includes("Each participant must have a unique student ID."));
    // Invited, or still to sign up: the lead can submit without waiting.
    assert.deepEqual(joinErrors(f), []);
    assert.deepEqual(joinErrors(form({ mode: "team", teammates: [mate("awaiting_signup")] })), []);
    assert.deepEqual(joinErrors(form({ mode: "team", teammates: [mate("joined")] })), []);
    // Declined: remove them first.
    assert.deepEqual(joinErrors(form({ mode: "team", teammates: [mate("declined")] })), ["Ali declined to join. Remove them before submitting."]);
});

test("who is still unconfirmed, and what a reviewer is told about them", () => {
    const t = (email, joinStatus) => ({ email, studentId: email, name: email, contact: "", joinStatus });
    const f = form({ mode: "team", teammates: [t("a@x.pk", "joined"), t("b@x.pk", "invited"), t("c@x.pk", "awaiting_signup"), t("d@x.pk", "declined")] });
    assert.deepEqual(unconfirmedTeammates(f).map((x) => x.email), ["b@x.pk", "c@x.pk"]);
    assert.deepEqual(unconfirmedTeammates({ ...f, mode: "solo" }), []);
    assert.equal(joinNote({ isLead: true, joinStatus: "joined" }, "submitted"), "");
    assert.equal(joinNote({ isLead: false, joinStatus: "joined" }, "submitted"), "");
    assert.match(joinNote({ isLead: false, joinStatus: "invited" }, "admin_review"), /credited only if they confirm before CIEL PK's final approval/);
    assert.equal(joinNote({ isLead: false, joinStatus: "invited" }, "approved"), "Did not confirm: not credited");
    assert.equal(joinNote({ isLead: false, joinStatus: "declined" }, "approved"), "Declined to take part");
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

test("people target is optional: empty, missing or a whole number of 1+ passes; 0, decimals and text are reported", () => {
    const errs = (over) => evidenceErrors(form(over));
    const msg = "People target must be a whole number of 1 or more, or leave it empty.";
    assert.ok(!errs({ peopleTarget: "" }).includes(msg));
    assert.ok(!errs({ peopleTarget: "40" }).includes(msg));
    // Older drafts / callers do not carry the field at all.
    const { peopleTarget: _omit, ...without } = form({ peopleTarget: "5" });
    assert.ok(!evidenceErrors(without).includes(msg));
    assert.ok(!errs({ peopleTarget: null }).includes(msg));
    for (const bad of ["0", "-3", "2.5", "abc"]) assert.ok(errs({ peopleTarget: bad }).includes(msg), `"${bad}" should be reported`);
});

test("the saved payload carries the people target only when it is a whole number of 1 or more", () => {
    const log = { id: "l1", status: "draft", mode: "solo", university: "", department: "", facultyName: "", facultyEmail: "", title: "", activityType: "", activityDate: null, startTime: null, endTime: null, location: "", host: null, sdg: null, summary: "", peopleReached: null, visibility: "Faculty, University & CIEL PK only", evidence: [], consent: false, honest: false, participants: [{ id: "p1", userId: "u1", isLead: true, name: "A", email: "a@x.pk", studentId: "S1", joinStatus: "joined", present: true, startTime: null, endTime: null, breakMinutes: 0, minutes: 0 }] };
    const saved = (peopleTarget) => payloadFromForm({ ...formFromLog(log), peopleTarget }).peopleTarget;
    assert.equal(saved("40"), 40);
    for (const v of ["", undefined, null, "0", "-1", "2.5", "abc"]) assert.equal(saved(v), null, `${String(v)} must save as null`);
});

test("formFromLog reads the people target, and an older server record without it gives an empty field", () => {
    const base = { id: "l1", status: "draft", mode: "solo", university: "", department: "", facultyName: "", facultyEmail: "", title: "", activityType: "", activityDate: null, startTime: null, endTime: null, location: "", host: null, sdg: null, summary: "", peopleReached: null, visibility: "Faculty, University & CIEL PK only", evidence: [], consent: false, honest: false, participants: [{ id: "p1", userId: "u1", isLead: true, name: "A", email: "a@x.pk", studentId: "S1", joinStatus: "joined", present: true, startTime: null, endTime: null, breakMinutes: 0, minutes: 0 }] };
    assert.equal(formFromLog({ ...base, peopleTarget: 35 }).peopleTarget, "35");
    assert.equal(formFromLog({ ...base, peopleTarget: null }).peopleTarget, "");
    assert.equal(formFromLog(base).peopleTarget, "");
});

const sdgLog = (over = {}) => ({ id: "l1", status: "draft", mode: "solo", university: "BNU", department: "SMS", facultyName: "", facultyEmail: "", title: "T", activityType: "Pinktober event", activityDate: null, startTime: null, endTime: null, location: "L", host: null, sdg: null, summary: "", peopleReached: null, visibility: "Faculty, University & CIEL PK only", evidence: [], partners: [], consent: false, honest: false, participants: [{ id: "p1", userId: "u1", isLead: true, name: "A", email: "a@x.pk", studentId: "S1", joinStatus: "joined", present: true, startTime: "10:00", endTime: "11:00", breakMinutes: 0, minutes: 60 }], ...over });

test("a log's SDGs: main first, no repeats, only goals 1-17, at most five; older records still work", () => {
    assert.deepEqual(logSdgs({ sdg: 3, secondarySdgs: [13, 3, 7] }), [3, 13, 7]);
    assert.deepEqual(logSdgs({ sdg: 3 }), [3]); // older record: no secondarySdgs
    assert.deepEqual(logSdgs({ sdg: null, secondarySdgs: [13] }), [13]);
    assert.deepEqual(logSdgs({ sdg: 0, secondarySdgs: [18, 2.5, 4] }), [4]);
    assert.deepEqual(logSdgs({ sdg: 1, secondarySdgs: [2, 3, 4, 5, 6, 7] }), [1, 2, 3, 4, 5]);
    assert.deepEqual(logSdgs({}), []);
    assert.equal(sdgShort({ sdg: 3, secondarySdgs: [13] }), "SDG 3, 13");
    assert.equal(sdgShort({ sdg: null }), null);
    assert.deepEqual(sdgChip(13), { n: 13, name: "Climate Action", label: "SDG 13 · Climate Action", color: "#3f7e44" });
});

test("the form holds the main goal and the others, and saves them in that order", () => {
    const f = formFromLog(sdgLog({ sdg: 3, secondarySdgs: [13, 7] }));
    assert.equal(f.sdg, "3");
    assert.deepEqual(f.secondarySdgs, ["13", "7"]);
    assert.deepEqual(formSdgs(f), ["3", "13", "7"]);
    const body = payloadFromForm(f);
    assert.equal(body.sdg, 3);
    assert.deepEqual(body.secondarySdgs, [13, 7]);
    // No main goal: the first other becomes the main one, as the server does.
    const promoted = payloadFromForm({ ...f, sdg: "", secondarySdgs: ["13", "7"] });
    assert.equal(promoted.sdg, 13);
    assert.deepEqual(promoted.secondarySdgs, [7]);
    // Repeats and junk are dropped; nothing chosen sends no goal at all.
    const messy = payloadFromForm({ ...f, sdg: "3", secondarySdgs: ["3", "13", "13", "99", "x"] });
    assert.deepEqual([messy.sdg, messy.secondarySdgs], [3, [13]]);
    const none = payloadFromForm({ ...f, sdg: "", secondarySdgs: [] });
    assert.deepEqual([none.sdg, none.secondarySdgs], [null, []]);
    // An older record and an older form state (no secondarySdgs) both still work.
    assert.deepEqual(formFromLog(sdgLog({ sdg: 4 })).secondarySdgs, []);
    const { secondarySdgs: _omit, ...legacy } = f;
    assert.deepEqual(payloadFromForm(legacy).secondarySdgs, []);
    assert.equal(payloadFromForm(legacy).sdg, 3);
});

test("more than five SDGs on a restored draft is reported on the activity step", () => {
    const f = formFromLog(sdgLog({ sdg: 1, secondarySdgs: [2, 3, 4, 5] }));
    assert.ok(!activityErrors({ ...f, activityDate: "2026-10-20", startTime: "10:00", endTime: "11:00" }, NOW).some((m) => /up to 5 SDGs/.test(m)));
    const six = { ...f, activityDate: "2026-10-20", startTime: "10:00", endTime: "11:00", secondarySdgs: ["2", "3", "4", "5", "6"] };
    assert.ok(activityErrors(six, NOW).some((m) => /up to 5 SDGs/.test(m)));
});

test("the flashcard lists every goal, the main one first", () => {
    const card = quickImpactFlashcard(sdgLog({ sdg: 3, secondarySdgs: [13, 7], status: "approved" }));
    assert.deepEqual(card.sdgs.map((g) => g.n), [3, 13, 7]);
    assert.equal(card.sdg, "SDG 3 · Good Health and Well-being"); // the main goal's label is kept for older readers
    assert.deepEqual(quickImpactFlashcard(sdgLog()).sdgs, []);
});

test("head counts and breaks stay within what the server accepts, so an autosave never fails on them", () => {
    const f = formFromLog(sdgLog({ peopleReached: 40 }));
    const withCount = (over) => ({ ...f, activityDate: "2026-10-20", startTime: "10:00", endTime: "11:00", summary: "x", evidence: [{ url: "u", name: "p.jpg", type: "image/jpeg", size: 1, caption: "c" }], consent: true, honest: true, ...over });
    assert.deepEqual(evidenceErrors(withCount({ peopleReached: "10000000", peopleTarget: "10000000" })), []);
    assert.ok(evidenceErrors(withCount({ peopleReached: "10000001" })).some((m) => /People reached cannot be more than 10,000,000/.test(m)));
    assert.ok(evidenceErrors(withCount({ peopleTarget: "10000001" })).some((m) => /People target cannot be more than 10,000,000/.test(m)));
    assert.equal(payloadFromForm(withCount({ peopleReached: "10000001" })).peopleReached, null);
    assert.equal(payloadFromForm(withCount({ peopleReached: "10000000" })).peopleReached, 10000000);
    assert.equal(payloadFromForm(withCount({ peopleReached: "0" })).peopleReached, 0);
    // A break over a day always swallows the whole stay, so the step reports it; it is saved as 0.
    const att = (br) => withCount({ attendance: { "a@x.pk": { present: true, startTime: "10:00", endTime: "11:00", breakMinutes: br } } });
    assert.ok(attendanceErrors(att("1441"), NOW).some((m) => /Check the arrival, departure and break/.test(m)));
    assert.equal(payloadFromForm(att("1441")).attendance[0].breakMinutes, 0);
    assert.equal(payloadFromForm(att("15")).attendance[0].breakMinutes, 15);
});

test("a teammate still to sign up has no attendance to enter, so they never hold the form back", () => {
    const t = (email, joinStatus) => ({ email, studentId: email, name: email, contact: "", joinStatus });
    const f = form({ mode: "team", teammates: [t("b@x.pk", "invited"), t("c@x.pk", "awaiting_signup")] });
    assert.deepEqual(attendees(f).map((p) => p.email), ["a@x.pk", "b@x.pk"]);
    // b is on the log (needs times); c is not (nothing to enter).
    const withTimes = { ...f, attendance: { ...f.attendance, "b@x.pk": { present: true, startTime: "10:00", endTime: "11:00", breakMinutes: "0" } } };
    assert.deepEqual(attendanceErrors(withTimes, NOW), []);
    const noTimes = attendanceErrors(f, NOW).join(" | ");
    assert.match(noTimes, /b@x\.pk/);
    assert.doesNotMatch(noTimes, /c@x\.pk/);
});
