"use client";

import { useEffect } from "react";
import { openWhatsApp, parseWhatsAppHref, rewriteWhatsAppHrefForDevice } from "@/utils/reminderLinks";

/**
 * Makes every WhatsApp link in the app open reliably on the current device.
 *
 * The pages render plain `https://wa.me/…` links (they work without JavaScript and keep the server and
 * client markup identical). A bare `wa.me/?text=` link is unreliable on a desktop browser, so this
 * one listener takes over at click time: the WhatsApp desktop app on a computer (WhatsApp Web in one
 * new tab when no app answers), the app link on a phone (see `openWhatsApp`). Links that need no change are left to the browser.
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
            const parts = parseWhatsAppHref(anchor.href);
            if (!parts) return;
            event.preventDefault();
            // Desktop: the WhatsApp app first, WhatsApp Web in one new tab if no app answers. Phone: the app.
            openWhatsApp(parts.text, parts.digits);
        };
        document.addEventListener("click", onClick, true);
        return () => document.removeEventListener("click", onClick, true);
    }, []);
    return null;
}
