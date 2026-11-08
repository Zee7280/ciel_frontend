// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { whatsappDigits, whatsappHrefForPhone, whatsappHrefFromE164 } from "../src/utils/reminderLinks.ts";
import { facultyQuestion, facultyReminder, revisionReminder, teammateReminder } from "../src/utils/quickWorkReminders.ts";

test("WhatsApp digits accept international and Pakistani local formats", () => {
    assert.equal(whatsappDigits("+923001234567"), "923001234567");
    assert.equal(whatsappDigits("+92 300 1234567"), "923001234567");
    assert.equal(whatsappDigits("00923001234567"), "923001234567");
    assert.equal(whatsappDigits("03001234567"), "923001234567");
    assert.equal(whatsappDigits("0300-1234567"), "923001234567");
    assert.equal(whatsappDigits("3001234567"), "923001234567");
    assert.equal(whatsappDigits("+447700900123"), "447700900123");
    assert.equal(whatsappDigits("+92 0300 1234567"), "923001234567");
});

test("unusable numbers give no WhatsApp link", () => {
    for (const bad of ["", "   ", "12345", "abc", "+1234567890123456", null, undefined, 3001234567]) {
        assert.equal(whatsappDigits(bad), "");
    }
    assert.equal(whatsappHrefForPhone("", "hi"), null);
    assert.equal(whatsappHrefForPhone(null, "hi"), null);
});

test("the WhatsApp link targets the number and carries the message", () => {
    assert.equal(whatsappHrefForPhone("03001234567", "Hi & bye"), "https://wa.me/923001234567?text=Hi%20%26%20bye");
    // The older helper is unchanged for its existing callers.
    assert.equal(whatsappHrefFromE164("+923001234567", "x"), "https://wa.me/923001234567?text=x");
});

test("reminder messages name the activity and link to sign-in with a return path", () => {
    const t = teammateReminder({ teammateName: "Ali Raza", title: "Tree Drive", leadName: "Fatima" });
    assert.match(t.subject, /Tree Drive/);
    assert.match(t.body, /^Hi Ali,/);
    assert.match(t.body, /\/login\?next=%2Fdashboard%2Fstudent%2Fpaths%2Fcommunity-service%2Fquick-work/);

    const fs = facultyReminder({ facultyName: "Dr Sana", title: "Tree Drive", leadName: "Fatima", from: "student" });
    assert.match(fs.body, /\/login\?next=%2Fdashboard%2Ffaculty%2Fquick-work/);
    assert.match(fs.body, /Thank you,\nFatima$/);
    const fa = facultyReminder({ title: "Tree Drive", leadName: "Fatima", submittedOn: "24 Oct 2026", from: "admin" });
    assert.match(fa.body, /^Dear Faculty Member,/);
    assert.match(fa.body, /on 24 Oct 2026/);
    assert.match(fa.body, /CIEL PK Team$/);

    const r = revisionReminder({ leadName: "Fatima Khalid", title: "Tree Drive", note: "Add the sheet.", from: "faculty", senderName: "Dr Sana" });
    assert.match(r.body, /returned for changes on CIEL PK: Add the sheet\./);
    assert.match(r.body, /Dr Sana$/);
    assert.match(facultyQuestion({ leadName: "Fatima", title: "" }).body, /our Quick Community Impact activity/);
});

test("WhatsApp opens the right link for the device: WhatsApp Web on a desktop, the app link on a phone", async () => {
    const { isMobileBrowser, whatsappOpenHref } = await import("../src/utils/reminderLinks.ts");
    const desktop = { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36", maxTouchPoints: 0 };
    const android = { userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36", maxTouchPoints: 5 };
    const iphone = { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148", maxTouchPoints: 5 };
    const ipad = { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15", maxTouchPoints: 5 };
    const mac = { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15", maxTouchPoints: 0 };
    assert.equal(isMobileBrowser(desktop), false);
    assert.equal(isMobileBrowser(mac), false);
    for (const phone of [android, iphone, ipad]) assert.equal(isMobileBrowser(phone), true);
    // Either signal is enough: the Client Hints flag, or a phone in the user agent.
    assert.equal(isMobileBrowser({ ...desktop, userAgentData: { mobile: true } }), true);
    assert.equal(isMobileBrowser({ ...android, userAgentData: { mobile: false } }), true);
    assert.equal(isMobileBrowser({ ...desktop, userAgentData: { mobile: false } }), false);
    assert.equal(isMobileBrowser(null), false);

    const text = "Hi Dr Khan,\nPlease review: https://www.cielpk.com/login?next=%2Fx";
    const enc = encodeURIComponent(text);
    // Nobody to address: pick a contact.
    assert.equal(whatsappOpenHref(text, "", desktop), `https://web.whatsapp.com/send?text=${enc}`);
    assert.equal(whatsappOpenHref(text, "", android), `https://api.whatsapp.com/send?text=${enc}`);
    // A known number: straight into that chat.
    assert.equal(whatsappOpenHref(text, "923001234567", desktop), `https://web.whatsapp.com/send?phone=923001234567&text=${enc}`);
    assert.equal(whatsappOpenHref(text, "923001234567", iphone), `https://wa.me/923001234567?text=${enc}`);
});
