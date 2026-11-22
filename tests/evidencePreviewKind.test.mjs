// Evidence preview (Sections 6, 7, 8): the kind is read from the file itself, never from the caption.
// FT-07: a PNG linked from attendance ("Field visit — 2026-10-10") must preview as an image.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    evidenceItemFileName,
    evidenceItemKind,
    evidenceItemUrl,
    evidencePreviewKind,
} from "../src/app/dashboard/student/report/utils/evidencePreviewKind.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");
const dir = "src/app/dashboard/student/report";

const signedPng =
    "https://ciel-uploads.s3.ap-south-1.amazonaws.com/attendance-evidence/3aa81a15-fa0b-46bd-9d75-678e2b4b09f3.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=900&X-Amz-Signature=abc";

test("FT-07: a linked PNG shown under a caption is still an image (type read from the URL)", () => {
    assert.equal(evidencePreviewKind("", "Field visit — 2026-10-10", signedPng), "image");
    assert.equal(evidencePreviewKind(null, "Attendance evidence", "https://cdn.example/x/day1.PNG"), "image");
    assert.equal(evidenceItemKind(signedPng), "image");
    assert.equal(evidenceItemKind({ url: signedPng }), "image");
    assert.equal(evidenceItemKind({ url: signedPng, name: "Field visit — 2026-10-10" }), "image");
});

test("a generic MIME type never hides the real type; a real MIME type always wins", () => {
    assert.equal(evidencePreviewKind("application/octet-stream", "Field visit", signedPng), "image");
    assert.equal(evidencePreviewKind("binary/octet-stream", "", "https://cdn/x/clip.mov"), "video");
    assert.equal(evidencePreviewKind("image/png", "Field visit — 2026-10-10", "https://host/download?id=42"), "image");
    assert.equal(evidencePreviewKind("image/png; charset=binary", "blob", "blob:https://cielpk.com/9f1"), "image");
    assert.equal(evidencePreviewKind("application/pdf", "Partner letter", ""), "pdf");
});

test("signed / proxied URLs without an extension are read from their type hints or data: prefix", () => {
    assert.equal(evidencePreviewKind("", "Field visit", "https://host/evidence/9f1?response-content-type=image%2Fpng&sig=1"), "image");
    assert.equal(evidencePreviewKind("", "", "https://host/dl?content-type=video%2Fmp4"), "video");
    assert.equal(evidencePreviewKind("", "", "data:image/jpeg;base64,/9j/4AAQ"), "image");
    // Truly unknown stays "file" — the dialog then sniffs the resource before saying no.
    assert.equal(evidencePreviewKind("", "Field visit — 2026-10-10", "https://host/evidence/9f1"), "file");
    assert.equal(evidencePreviewKind("", "register.xlsx", ""), "file");
    assert.equal(evidencePreviewKind(null, undefined), "file");
});

test("the old name-based cases keep their kinds", () => {
    assert.equal(evidencePreviewKind("video/quicktime", "3aa81a15 (1).mov"), "video");
    assert.equal(evidencePreviewKind("", "clinic-visit.MOV"), "video");
    assert.equal(evidencePreviewKind("", "https://cdn/x/session.mp4?sig=abc"), "video");
    assert.equal(evidencePreviewKind("", "photo.HEIC"), "image");
    assert.equal(evidencePreviewKind("", "voice-note.m4a"), "audio");
    assert.equal(evidencePreviewKind("", "receipt.PDF"), "pdf");
});

test("stored item helpers: URL and real file name come from the record, never from the caption", () => {
    const rec = { url: signedPng, name: "day1.png", type: "image/png" };
    assert.equal(evidenceItemUrl(rec), signedPng);
    assert.equal(evidenceItemFileName(rec), "day1.png");
    assert.equal(evidenceItemFileName(signedPng), "3aa81a15-fa0b-46bd-9d75-678e2b4b09f3.png");
    assert.equal(evidenceItemFileName({ url: signedPng }), "3aa81a15-fa0b-46bd-9d75-678e2b4b09f3.png");
    assert.equal(evidenceItemUrl({ evidence_url: "https://cdn/x/a.jpg" }), "https://cdn/x/a.jpg");
    assert.equal(evidenceItemUrl(true), "");
    assert.equal(evidenceItemKind(true), "file");
});

test("Section 7.1 (Section 8 component) detects from the stored file, passes its real name to the dialog, and reads saved logs' evidence_url", () => {
    const s8 = read(`${dir}/components/Section8Evidence.tsx`);
    assert.match(s8, /evidencePreviewKind\(getFileType\(file\), getStoredFileName\(file\) \|\| fallbackName, getStoredUrl\(file\)\)/);
    assert.match(s8, /const kind = getEvidenceKind\(file, name\);\s*const previewUrl = useEvidencePreviewUrl\(file, kind === "image"\)/);
    assert.match(s8, /<EvidenceMediaPreview url=\{previewUrl\} name=\{name\} mimeType=\{mimeType\} fileName=\{getStoredFileName\(file\) \|\| null\} \/>/);
    assert.doesNotMatch(s8, /evidencePreviewKind\(getFileType\(file\), name\)/);
    assert.match(s8, /typeof log\.evidence_url === "string" && log\.evidence_url\.trim\(\)\s*\? log\.evidence_url/);
});

test("the dialog body sniffs an unknown stored file (HEAD, then <img>, then <video>) and falls back cleanly when a render fails", () => {
    const dlg = read(`${dir}/components/ui/EvidenceMediaPreview.tsx`);
    assert.match(dlg, /evidencePreviewKind\(mimeType, fileName \|\| name, url\)/);
    assert.match(dlg, /export async function sniffEvidenceKind/);
    assert.match(dlg, /fetch\(url, \{ method: "HEAD"/);
    assert.match(dlg, /probeImage\(url\)/);
    assert.match(dlg, /probeVideo\(url\)/);
    assert.match(dlg, /onError=\{\(\) => setRenderFailed\(url\)\}/);
    assert.match(dlg, /kind === "pdf"/);
    assert.match(dlg, /Checking the file type…/);
    assert.match(dlg, /Open the file in a new tab/);
});

test("Sections 6 and 7 thumbnails use the same detector", () => {
    for (const f of ["Section6Resources.tsx", "Section7Partnerships.tsx"]) {
        const src = read(`${dir}/components/${f}`);
        assert.match(src, /const isImage = evidenceItemKind\(file\) === "image";/, f);
        assert.doesNotMatch(src, /file\?\.name\?\.match\(\/\\\.\(jpg\|jpeg\|png/, f);
    }
});

test("a malformed percent sequence in a pasted link never throws during render", () => {
    assert.equal(evidencePreviewKind("", "Field visit", "https://host/evidence/9f1?a%zz=1&response-content-type=image%2Fpng"), "image");
    assert.equal(evidencePreviewKind("", "Field visit", "https://host/evidence/9f1?%E0%A4%A=1"), "file");
    assert.doesNotThrow(() => evidenceItemKind({ url: "https://host/x?%zz" }));
});
