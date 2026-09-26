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
    const host = document.querySelector(".cer-c22-flash, #cer-v17-flash");
    if (!(host instanceof HTMLElement)) return null;
    const card = host.querySelector(".c22-card");
    return card instanceof HTMLElement ? card : host;
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

async function exportIsolatedFlashcard(mode: ExportMode, title: string): Promise<void> {
    const source = findFlashcard();
    if (!source) {
        toast.error("Flash card is not ready to export yet.");
        return;
    }

    cleanupPrintRoot();
    const wrap = document.createElement("div");
    wrap.id = FLASH_PRINT_ROOT_ID;
    wrap.className = "cer cer-scope";
    const clone = source.cloneNode(true) as HTMLElement;
    stripExportChrome(clone);
    wrap.appendChild(clone);
    document.body.appendChild(wrap);

    const previousTitle = document.title;
    document.title = flashcardExportFilename(title);
    document.body.classList.add(FLASH_PRINT_BODY_CLASS);

    const finish = () => {
        cleanupPrintRoot();
        document.title = previousTitle;
        window.removeEventListener("afterprint", finish);
    };
    window.addEventListener("afterprint", finish);

    await waitForCloneAssets(wrap);
    if (mode === "download") {
        toast.message("In the print dialog, choose Save as PDF to download the flash card.");
    }

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
