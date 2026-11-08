"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { gmailComposeHref, outlookComposeHref, parseMailtoHref } from "@/utils/reminderLinks";

/** How long we give a desktop mail app to take over before offering the web alternatives. */
const MAIL_APP_GRACE_MS = 1500;

async function copyText(text: string): Promise<boolean> {
    try {
        await Promise.race([
            navigator.clipboard.writeText(text),
            new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("clipboard timeout")), 1000)),
        ]);
        return true;
    } catch {
        try {
            const field = document.createElement("textarea");
            field.value = text;
            field.style.position = "fixed";
            field.style.opacity = "0";
            document.body.appendChild(field);
            field.select();
            const ok = document.execCommand("copy");
            field.remove();
            return ok;
        } catch {
            return false;
        }
    }
}

/**
 * Makes every `mailto:` link in the app usable. The browser still gets first go (a desktop mail
 * app opens as before). When nothing takes over within a moment — no mail app is registered, which
 * is the normal state of a desktop Chrome — a toast offers the same prefilled message in Gmail or
 * Outlook on the web, or copies it. Nothing is sent by CIEL PK; the message leaves from the
 * person's own mailbox either way.
 */
export default function MailtoLinkBridge() {
    useEffect(() => {
        let pending: number | null = null;
        const cancel = () => {
            if (pending !== null) {
                window.clearTimeout(pending);
                pending = null;
            }
        };
        // A mail app taking over blurs the page (or hides it) — then there is nothing to offer.
        window.addEventListener("blur", cancel);
        document.addEventListener("visibilitychange", cancel);

        const onClick = (event: MouseEvent) => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            const target = event.target as Element | null;
            const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
            if (!anchor) return;
            const href = anchor.getAttribute("href") || "";
            const parts = parseMailtoHref(href);
            if (!parts) return;
            cancel();
            pending = window.setTimeout(() => {
                pending = null;
                if (document.hidden || !document.hasFocus()) return;
                const text = `${parts.to ? `To: ${parts.to}\n` : ""}${parts.subject ? `Subject: ${parts.subject}\n\n` : ""}${parts.body}`;
                toast.message("No email app opened on this device", {
                    id: "mailto-fallback",
                    duration: 12000,
                    description: (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <a
                                href={gmailComposeHref(parts)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md bg-[#174b43] px-2.5 py-1 text-[11px] font-bold text-white"
                                onClick={() => toast.dismiss("mailto-fallback")}
                            >
                                Open in Gmail
                            </a>
                            <a
                                href={outlookComposeHref(parts)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md bg-[#edf4fb] px-2.5 py-1 text-[11px] font-bold text-[#376d9f]"
                                onClick={() => toast.dismiss("mailto-fallback")}
                            >
                                Open in Outlook
                            </a>
                            <button
                                type="button"
                                className="rounded-md bg-[#f1f4f6] px-2.5 py-1 text-[11px] font-bold text-[#516772]"
                                onClick={() => {
                                    void copyText(text).then((ok) => {
                                        toast.dismiss("mailto-fallback");
                                        if (ok) toast.success(parts.to ? `Message copied — paste it in an email to ${parts.to}.` : "Message copied.");
                                        else toast.error("Could not copy. Select the text in your mail app instead.");
                                    });
                                }}
                            >
                                Copy message
                            </button>
                        </div>
                    ),
                });
            }, MAIL_APP_GRACE_MS);
        };
        document.addEventListener("click", onClick, true);
        return () => {
            cancel();
            document.removeEventListener("click", onClick, true);
            window.removeEventListener("blur", cancel);
            document.removeEventListener("visibilitychange", cancel);
        };
    }, []);
    return null;
}
