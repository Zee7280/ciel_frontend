import assert from "node:assert/strict";
import test from "node:test";
import { evidencePreviewKind } from "./evidencePreviewKind";
import { REPORT_ATTACHMENT_ACCEPT } from "@/utils/reportAttachmentAccept";

test("video uploads preview as video, by MIME type or by extension (the .mov case)", () => {
    assert.equal(evidencePreviewKind("video/quicktime", "3aa81a15-fa0b-46bd-9d75-678e2b4b09f3 (1).mov"), "video");
    assert.equal(evidencePreviewKind("", "clinic-visit.MOV"), "video");
    assert.equal(evidencePreviewKind("", "https://cdn/x/session.mp4?sig=abc"), "video");
    assert.equal(evidencePreviewKind("video/webm", "blob"), "video");
    assert.equal(evidencePreviewKind("application/octet-stream", "day1.m4v"), "video");
});

test("images, audio, pdf and other files keep their own kinds", () => {
    assert.equal(evidencePreviewKind("image/jpeg", "a.jpg"), "image");
    assert.equal(evidencePreviewKind("", "photo.HEIC"), "image");
    assert.equal(evidencePreviewKind("audio/mpeg", "interview.mp3"), "audio");
    assert.equal(evidencePreviewKind("", "voice-note.m4a"), "audio");
    assert.equal(evidencePreviewKind("application/pdf", "receipt.pdf"), "pdf");
    assert.equal(evidencePreviewKind("", "receipt.PDF"), "pdf");
    assert.equal(evidencePreviewKind("", "register.xlsx"), "file");
    assert.equal(evidencePreviewKind(null, undefined), "file");
});

test("every video / audio extension the upload field accepts is classified", () => {
    const parts = REPORT_ATTACHMENT_ACCEPT.split(",");
    const after = (marker: string, stop: string) => parts.slice(parts.indexOf(marker) + 1, stop ? parts.indexOf(stop) : undefined).filter((p) => p.startsWith("."));
    for (const ext of after("video/*", "audio/*")) {
        // `.ts` is the one accepted video extension left out on purpose: it collides with TypeScript source names.
        if (ext === ".ts") continue;
        assert.equal(evidencePreviewKind("", `clip${ext}`), "video", ext);
    }
    for (const ext of after("audio/*", "")) {
        assert.equal(evidencePreviewKind("", `clip${ext}`), "audio", ext);
    }
});
