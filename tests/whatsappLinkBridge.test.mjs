// WhatsApp links must open on every device, and the Email / WhatsApp chips on the student's
// report cards must be real links (they used to be decorative labels).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

const desktop = { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36", maxTouchPoints: 0 };
const phone = { userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari/537.36", maxTouchPoints: 5 };

test("rewriteWhatsAppHrefForDevice: generic share links open WhatsApp Web on a desktop and the app on a phone", async () => {
    const { rewriteWhatsAppHrefForDevice } = await import("../src/utils/reminderLinks.ts");
    const text = "Reminder: please finish the report\n\nhttps://www.cielpk.com/login?next=%2Fx";
    const enc = encodeURIComponent(text);
    assert.equal(rewriteWhatsAppHrefForDevice(`https://wa.me/?text=${enc}`, desktop), `https://web.whatsapp.com/send?text=${enc}`);
    assert.equal(rewriteWhatsAppHrefForDevice(`https://wa.me/?text=${enc}`, phone), `https://api.whatsapp.com/send?text=${enc}`);
    // A targeted link keeps its number.
    assert.equal(
        rewriteWhatsAppHrefForDevice(`https://wa.me/923712243575?text=${enc}`, desktop),
        `https://web.whatsapp.com/send?phone=923712243575&text=${enc}`,
    );
    assert.equal(rewriteWhatsAppHrefForDevice(`https://wa.me/923712243575?text=${enc}`, phone), `https://wa.me/923712243575?text=${enc}`);
    assert.equal(
        rewriteWhatsAppHrefForDevice(`https://api.whatsapp.com/send?phone=923712243575&text=${enc}`, desktop),
        `https://web.whatsapp.com/send?phone=923712243575&text=${enc}`,
    );
});

test("rewriteWhatsAppHrefForDevice leaves non-WhatsApp links alone; a number-only link opens that chat directly", async () => {
    const { rewriteWhatsAppHrefForDevice } = await import("../src/utils/reminderLinks.ts");
    assert.equal(rewriteWhatsAppHrefForDevice("https://www.cielpk.com/dashboard", desktop), null);
    assert.equal(rewriteWhatsAppHrefForDevice("mailto:support@cielpk.com?subject=x", desktop), null);
    assert.equal(rewriteWhatsAppHrefForDevice("/relative/path", desktop), null);
    // The support button's number-only link: straight into the chat on WhatsApp Web, the app on a phone.
    assert.equal(rewriteWhatsAppHrefForDevice("https://wa.me/923712243575", desktop), "https://web.whatsapp.com/send?phone=923712243575&text=");
    assert.equal(rewriteWhatsAppHrefForDevice("https://wa.me/923712243575", phone), "https://wa.me/923712243575?text=");
    // Nothing to prefill and nobody to address: unchanged.
    assert.equal(rewriteWhatsAppHrefForDevice("https://wa.me/", desktop), "https://wa.me/");
});

test("the bridge is mounted once in the root layout and only touches WhatsApp links", () => {
    const layout = read("src/app/layout.tsx");
    assert.match(layout, /import WhatsAppLinkBridge from "@\/components\/WhatsAppLinkBridge";/);
    assert.equal((layout.match(/<WhatsAppLinkBridge \/>/g) || []).length, 1);
    const bridge = read("src/components/WhatsAppLinkBridge.tsx");
    assert.match(bridge, /if \(!\/whatsapp\\\.com\|wa\\\.me\/i\.test\(href\)\) return;/);
    assert.match(bridge, /if \(!rewritten \|\| rewritten === anchor\.href\) return;/);
    // Modified clicks (new tab, etc.) stay with the browser.
    assert.match(bridge, /event\.metaKey \|\| event\.ctrlKey/);
});

test("report-card Email / WhatsApp chips are prefilled links for every notify note", () => {
    const ws = read("src/app/dashboard/student/paths/community-service/CommunityServiceWorkspace.tsx");
    const notifyNotes = ws.match(/kind: "notify",[\s\S]*?channels: reportNoteChannels\("(draft|fee|review)"/g) || [];
    assert.deepEqual(
        notifyNotes.map((m) => m.match(/reportNoteChannels\("(\w+)"/)[1]).sort(),
        ["draft", "fee", "review"],
    );
    // No decorative chip left behind.
    assert.doesNotMatch(ws, /<span[^>]*>\s*Email\s*<\/span>/);
    assert.match(ws, /href=\{card\.note\.channels\.email\}/);
    assert.match(ws, /href=\{card\.note\.channels\.whatsapp\}/);
    // CIEL PK is addressed only when the report is with CIEL PK; a draft is the student's to share.
    assert.match(ws, /mailtoHref\("", subject, body\)/);
    assert.match(ws, /whatsappHrefFromE164\(CIEL_PK_ADMIN_WHATSAPP/);
});
