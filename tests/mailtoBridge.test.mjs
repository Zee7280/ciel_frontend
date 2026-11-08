// Email buttons are mailto: links. On a desktop with no mail app registered a click does nothing,
// so the bridge offers the same prefilled message in Gmail / Outlook web, or copies it.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { gmailComposeHref, mailtoHref, outlookComposeHref, parseMailtoHref } from "../src/utils/reminderLinks.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

test("parseMailtoHref round-trips what mailtoHref built (recipient, subject, multi-line body, + signs)", () => {
    const subject = "CIEL PK reminder — Test FYP";
    const body = "Dear Zubair,\n\nA gentle reminder: FYP-2026-F4EF8 is waiting.\nC++ & co.\nThank you.";
    const parts = parseMailtoHref(mailtoHref("zubair@bnu.edu.pk", subject, body));
    assert.deepEqual(parts, { to: "zubair@bnu.edu.pk", cc: "", bcc: "", subject, body });
    // No recipient (draft shared with a teammate) still parses.
    assert.equal(parseMailtoHref(mailtoHref("", "s", "b")).to, "");
    assert.equal(parseMailtoHref("https://wa.me/?text=x"), null);
    assert.equal(parseMailtoHref("/dashboard"), null);
});

test("Gmail / Outlook compose links carry recipient, subject and body", () => {
    const parts = { to: "zubair@bnu.edu.pk", cc: "", bcc: "", subject: "Hello & welcome", body: "Line 1\nLine 2" };
    const gmail = new URL(gmailComposeHref(parts));
    assert.equal(gmail.origin + gmail.pathname, "https://mail.google.com/mail/");
    assert.equal(gmail.searchParams.get("view"), "cm");
    assert.equal(gmail.searchParams.get("to"), parts.to);
    assert.equal(gmail.searchParams.get("su"), parts.subject);
    assert.equal(gmail.searchParams.get("body"), parts.body);
    const outlook = new URL(outlookComposeHref(parts));
    assert.equal(outlook.origin + outlook.pathname, "https://outlook.office.com/mail/deeplink/compose");
    assert.equal(outlook.searchParams.get("to"), parts.to);
    assert.equal(outlook.searchParams.get("subject"), parts.subject);
    assert.equal(outlook.searchParams.get("body"), parts.body);
});

test("the mailto bridge is mounted once and only fires when nothing took the click", () => {
    const layout = read("src/app/layout.tsx");
    assert.equal((layout.match(/<MailtoLinkBridge \/>/g) || []).length, 1);
    const bridge = read("src/components/MailtoLinkBridge.tsx");
    // The browser keeps first go: the click is never prevented.
    assert.doesNotMatch(bridge, /event\.preventDefault\(\)/);
    assert.match(bridge, /if \(document\.hidden \|\| !document\.hasFocus\(\)\) return;/);
    assert.match(bridge, /window\.addEventListener\("blur", cancel\)/);
    assert.match(bridge, /Open in Gmail/);
    assert.match(bridge, /Open in Outlook/);
    assert.match(bridge, /Copy message/);
});
