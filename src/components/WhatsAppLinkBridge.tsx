"use client";

import { useEffect } from "react";
import { rewriteWhatsAppHrefForDevice } from "@/utils/reminderLinks";

/**
 * Makes every WhatsApp link in the app open reliably on the current device.
 *
 * The pages render plain `https://wa.me/…` links (they work without JavaScript and keep the server and
 * client markup identical). A bare `wa.me/?text=` link is unreliable on a desktop browser, so this
 * one listener rewrites the link at click time: WhatsApp Web on a desktop, the app link on a phone
 * (see `whatsappOpenHref`). Links that need no change are left to the browser.
 */
export default function WhatsAppLinkBridge() {
    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            const target = event.target as Element | null;
            const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
            if (!anchor) return;
            const href = anchor.getAttribute("href") || "";
            if (!/whatsapp\.com|wa\.me/i.test(href)) return;
            const rewritten = rewriteWhatsAppHrefForDevice(anchor.href);
            if (!rewritten || rewritten === anchor.href) return;
            event.preventDefault();
            const opened = window.open(rewritten, "_blank", "noopener,noreferrer");
            if (!opened) window.location.href = rewritten; // popup blocked: navigate instead
        };
        document.addEventListener("click", onClick, true);
        return () => document.removeEventListener("click", onClick, true);
    }, []);
    return null;
}
