"use client";

import { toast } from "sonner";
import {
    flashcardExportFilename,
    isShareAbort,
    resolveFlashcardShareUrl,
} from "./flashcardExportCore";

export { flashcardExportFilename, isShareAbort, resolveFlashcardShareUrl } from "./flashcardExportCore";

export const FLASH_PRINT_ROOT_ID = "cer-flash-print-root";
export const FLASH_PRINT_BODY_CLASS = "cer-print-flash";

type ExportMode = "print" | "download";

function findFlashcard(): HTMLElement | null {
    if (typeof document === "undefined") return null;
    const packageCard = document.querySelector("#flashcard-capture");
    if (packageCard instanceof HTMLElement) return packageCard;
    const host = document.querySelector(".cer-c22-flash, #cer-impact-flash, #cer-v17-flash");
    if (!(host instanceof HTMLElement)) return null;
    const card = host.querySelector(".c22-card");
    return card instanceof HTMLElement ? card : host;
}

function isImpactPackageFlash(source: HTMLElement): boolean {
    return source.id === "flashcard-capture" || source.classList.contains("flash");
}

function stripExportChrome(root: HTMLElement) {
    root.querySelectorAll(".c22-actions, .c22-file-actions, .c22-missing, .c22-vault, .c22-btn").forEach((node) => {
        node.remove();
    });
}

function waitForCloneAssets(root: HTMLElement): Promise<void> {
    const images = Array.from(root.querySelectorAll("img"));
    return Promise.all(
        images.map(
            (img) =>
                new Promise<void>((resolve) => {
                    if (img.complete) {
                        resolve();
                        return;
                    }
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                    window.setTimeout(() => resolve(), 2500);
                }),
        ),
    ).then(() => undefined);
}

function cleanupPrintRoot() {
    document.body.classList.remove(FLASH_PRINT_BODY_CLASS);
    document.getElementById(FLASH_PRINT_ROOT_ID)?.remove();
}

function mountFlashClone(source: HTMLElement): HTMLElement {
    cleanupPrintRoot();
    const wrap = document.createElement("div");
    wrap.id = FLASH_PRINT_ROOT_ID;
    if (isImpactPackageFlash(source)) {
        wrap.className = "ipkg";
        wrap.style.width = "1100px";
        wrap.style.background = "#f0efe8";
        wrap.style.padding = "0";
    } else {
        wrap.className = "cer cer-scope";
    }
    const clone = source.cloneNode(true) as HTMLElement;
    clone.removeAttribute("hidden");
    clone.style.display = "block";
    clone.style.maxWidth = "1100px";
    stripExportChrome(clone);
    wrap.appendChild(clone);
    document.body.appendChild(wrap);
    return wrap;
}

async function rasterizeFlashPng(node: HTMLElement): Promise<string> {
    const { toPng } = await import("html-to-image");
    const width = Math.max(1, Math.ceil(node.scrollWidth || node.offsetWidth || 1100));
    const height = Math.max(1, Math.ceil(node.scrollHeight || node.offsetHeight || 1));
    return toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#fffef9",
        width,
        height,
        style: {
            transform: "none",
            margin: "0",
        },
    });
}

function triggerPngDownload(dataUrl: string, title: string) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${flashcardExportFilename(title)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

async function exportIsolatedFlashcard(mode: ExportMode, title: string): Promise<void> {
    const source = findFlashcard();
    if (!source) {
        toast.error("Flash card is not ready to export yet.");
        return;
    }

    const wrap = mountFlashClone(source);
    const card = (wrap.querySelector("#flashcard-capture, .flash, .c22-card") as HTMLElement | null) || wrap;

    const previousTitle = document.title;
    document.title = flashcardExportFilename(title);

    const finish = () => {
        cleanupPrintRoot();
        document.title = previousTitle;
        window.removeEventListener("afterprint", finish);
    };

    await waitForCloneAssets(wrap);

    if (mode === "download") {
        try {
            const dataUrl = await rasterizeFlashPng(card);
            triggerPngDownload(dataUrl, title);
            toast.success("Flashcard PNG saved.");
        } catch {
            toast.error("Could not save flashcard PNG. Try Print / Save PDF instead.");
        } finally {
            finish();
        }
        return;
    }

    document.body.classList.add(FLASH_PRINT_BODY_CLASS);
    window.addEventListener("afterprint", finish);
    window.setTimeout(finish, 60000);
    window.print();
}

export function printExhibitionFlashcard(title = "Community engagement"): Promise<void> {
    return exportIsolatedFlashcard("print", title);
}

export function downloadExhibitionFlashcard(title = "Community engagement"): Promise<void> {
    return exportIsolatedFlashcard("download", title);
}

export async function shareExhibitionFlashcard(opts: {
    title: string;
    verifyUrl?: string | null;
}): Promise<void> {
    const title = String(opts.title || "CIEL PK Exhibition Flash Card").trim() || "CIEL PK Exhibition Flash Card";
    const pageUrl = typeof window !== "undefined" ? window.location.href : "";
    const url = resolveFlashcardShareUrl(opts.verifyUrl, pageUrl);
    if (!url) {
        toast.error("Nothing to share yet.");
        return;
    }
    const text = `${title} — CIEL PK Exhibition Flash Card`;
    try {
        if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
            await navigator.share({ title, text, url });
            return;
        }
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast.success("Flash card link copied.");
    } catch (error) {
        if (isShareAbort(error)) return;
        try {
            await navigator.clipboard.writeText(url);
            toast.success("Flash card link copied.");
        } catch {
            toast.error("Could not share this flash card.");
        }
    }
}
