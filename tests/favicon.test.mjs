// The CIEL PK mark must be the icon everywhere a tab, bookmark, home screen or installed app shows one.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p));

test("app-router icon files exist and are real images of the expected kind", () => {
    const ico = read("src/app/favicon.ico");
    // ICO header: reserved 0, type 1, count >= 2 (16 + 32 at least)
    assert.equal(ico.readUInt16LE(0), 0);
    assert.equal(ico.readUInt16LE(2), 1);
    assert.ok(ico.readUInt16LE(4) >= 2, "favicon.ico should carry several sizes");
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    for (const p of ["src/app/icon.png", "src/app/apple-icon.png", "public/icons/ciel-192.png", "public/icons/ciel-512.png"]) {
        assert.ok(read(p).subarray(0, 4).equals(png), `${p} is a PNG`);
        assert.ok(statSync(path.join(root, p)).size > 1000, `${p} is not empty`);
    }
    // icon.png is 512×512, apple-icon.png 180×180 (PNG IHDR width/height at bytes 16..24)
    const dims = (p) => {
        const b = read(p);
        return [b.readUInt32BE(16), b.readUInt32BE(20)];
    };
    assert.deepEqual(dims("src/app/icon.png"), [512, 512]);
    assert.deepEqual(dims("src/app/apple-icon.png"), [180, 180]);
    assert.deepEqual(dims("public/icons/ciel-192.png"), [192, 192]);
});

test("the web manifest points at the CIEL icons", () => {
    const src = read("src/app/manifest.ts").toString();
    assert.match(src, /short_name: "CIEL PK"/);
    assert.match(src, /\/icons\/ciel-192\.png/);
    assert.match(src, /\/icons\/ciel-512\.png/);
});

test("the static viewers opened in their own tab carry the same icon", () => {
    for (const p of ["public/ciel-impact-package.html", "public/ciel-analyzer.html"]) {
        const html = read(p).toString();
        assert.match(html, /<link rel="icon" href="\/favicon\.ico">/, p);
        assert.match(html, /<link rel="apple-touch-icon" href="\/icons\/ciel-192\.png">/, p);
    }
    // and the build scripts keep it on the next rebuild
    for (const p of ["scripts/build-impact-package-template.py", "scripts/build-impact-analyzer.py"]) {
        assert.match(read(p).toString(), /rel="icon" href="\/favicon\.ico"/, p);
    }
});
