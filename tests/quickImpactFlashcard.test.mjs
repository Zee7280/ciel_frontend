// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    evidenceFileKey,
    quickImpactFlashcard,
    quickImpactPublishedForViewer,
    quickImpactVerifyPath,
    sdgLabel,
    SDG_COLORS,
    withViewableEvidence,
} from "../src/utils/quickWorkRules.ts";

const person = (over) => ({
    id: `p-${over.name}`,
    userId: `u-${over.name}`,
    isLead: false,
    email: `${over.name.toLowerCase()}@bnu.edu.pk`,
    studentId: "",
    joinStatus: "joined",
    present: true,
    startTime: "10:00",
    endTime: "11:00",
    breakMinutes: 0,
    minutes: 60,
    ...over,
});

const log = (over = {}) => ({
    id: "11111111-2222-4333-8444-555555555555",
    status: "approved",
    title: "Pinktober Awareness Desk",
    activityType: "Pinktober event",
    activityTypeOther: null,
    activityDate: "2026-10-24",
    location: "BNU Main Campus, Lahore",
    host: "BNU Health Society",
    partners: ["Pink Ribbon Pakistan"],
    sdg: 3,
    summary: "Ran an awareness desk.",
    peopleReached: 120,
    visibility: "Faculty, University & CIEL PK only",
    consent: true,
    evidence: [{ url: "x", name: "a.jpg", type: "image/jpeg", size: 1, caption: "desk" }],
    facultyName: "Dr Sana Malik",
    viewerParticipantId: "p-Lead",
    certificate: { code: "CIEL-QCI-2026-7K3M-Q9TD" },
    participants: [
        person({ name: "Lead", isLead: true, minutes: 120 }),
        person({ name: "Ali", minutes: 90 }),
        person({ name: "Absent", present: false, minutes: 0 }),
    ],
    ...over,
});

test("flashcard counts and names only students credited with time", () => {
    const card = quickImpactFlashcard(log());
    assert.equal(card.published, true);
    assert.equal(card.personMinutes, 210);
    assert.equal(card.students, 2);
    assert.deepEqual(card.names, ["Lead", "Ali"]);
    assert.equal(card.peopleReached, 120);
    assert.equal(card.evidenceCount, 1);
    assert.equal(card.sdg, "SDG 3 · Good Health and Well-being");
    assert.equal(card.sdgColor, SDG_COLORS[3]);
    assert.deepEqual(card.partners, ["Pink Ribbon Pakistan"]);
    assert.equal(card.host, "BNU Health Society");
});

test("a log under review is a preview, not a credential", () => {
    const card = quickImpactFlashcard(log({ status: "admin_review" }));
    assert.equal(card.published, false);
});

test("before attendance is recorded the flashcard still names everyone on the log", () => {
    const card = quickImpactFlashcard(log({ status: "draft", participants: [person({ name: "Lead", minutes: 0 })] }));
    assert.deepEqual(card.names, ["Lead"]);
    assert.equal(card.personMinutes, 0);
});

test("SDG label only for goals 1-17", () => {
    assert.equal(sdgLabel(15), "SDG 15 · Life on Land");
    assert.equal(sdgLabel(null), null);
    assert.equal(sdgLabel(0), null);
    assert.equal(sdgLabel(18), null);
    assert.equal(quickImpactFlashcard(log({ sdg: null })).sdg, null);
});

test("the wall shows approved logs where the viewer was credited, never others", () => {
    const approved = log();
    const underReview = log({ id: "b", status: "admin_review" });
    const absentViewer = log({ id: "c", viewerParticipantId: "p-Absent" });
    const notOnLog = log({ id: "d", viewerParticipantId: "someone-else" });
    assert.deepEqual(
        quickImpactPublishedForViewer([approved, underReview, absentViewer, notOnLog]).map((l) => l.id),
        [approved.id],
    );
});

test("verify path encodes the certificate ID", () => {
    assert.equal(quickImpactVerifyPath("CIEL-QCI-2026-7K3M-Q9TD"), "/quick-impact/verify/CIEL-QCI-2026-7K3M-Q9TD");
    assert.equal(quickImpactVerifyPath("a/b"), "/quick-impact/verify/a%2Fb");
});

const file = (url, caption = "c") => ({ url, name: "a.jpg", type: "image/jpeg", size: 1, caption });
const RAW = "https://bucket.s3.eu-north-1.amazonaws.com/quick-work/u1/a.jpg";

test("an evidence file is identified without its signature", () => {
    assert.equal(evidenceFileKey(`${RAW}?X-Amz-Signature=abc&X-Amz-Expires=3600`), RAW);
    assert.equal(evidenceFileKey(RAW), RAW);
    assert.equal(evidenceFileKey(""), "");
});

test("after a save a raw upload URL takes the viewable link; existing links and captions are kept", () => {
    const signed = `${RAW}?X-Amz-Signature=new`;
    const kept = "https://bucket.s3.eu-north-1.amazonaws.com/quick-work/u1/b.jpg?X-Amz-Signature=old";
    const out = withViewableEvidence(
        [file(RAW, "typed while saving"), file(kept)],
        [file(signed, "older caption"), file("https://bucket.s3.eu-north-1.amazonaws.com/quick-work/u1/b.jpg?X-Amz-Signature=newer")],
    );
    assert.equal(out[0].url, signed);
    assert.equal(out[0].caption, "typed while saving");
    assert.equal(out[1].url, kept); // already viewable: no reload on every autosave
});

test("a file the server did not return keeps its URL", () => {
    assert.deepEqual(withViewableEvidence([file(RAW)], []), [file(RAW)]);
});
