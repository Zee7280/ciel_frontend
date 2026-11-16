"use client";

import { useEffect, useState } from "react";
import {
    openWhatsApp,
    parseWhatsAppHref,
    rewriteWhatsAppHrefForDevice,
    WHATSAPP_FALLBACK_EVENT,
    type WhatsAppFallbackDetail,
} from "@/utils/reminderLinks";

/**
 * Makes every WhatsApp link in the app open reliably on the current device.
 *
 * The pages render plain `https://wa.me/…` links (they work without JavaScript and keep the server and
 * client markup identical). A bare `wa.me/?text=` link is unreliable on a desktop browser, so this
 * one listener takes over at click time: the WhatsApp desktop app on a computer, the app link on a
 * phone (see `openWhatsApp`). When the desktop app does not answer, the chooser below offers the app
 * again or WhatsApp Web — both as real links, so nothing is popup-blocked and the page stays put.
 */
export default function WhatsAppLinkBridge() {
    const [fallback, setFallback] = useState<WhatsAppFallbackDetail | null>(null);

    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            const target = event.target as Element | null;
            const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
            if (!anchor || anchor.hasAttribute("data-ciel-whatsapp-direct")) return;
            const href = anchor.getAttribute("href") || "";
            if (!/whatsapp\.com|wa\.me/i.test(href)) return;
            const rewritten = rewriteWhatsAppHrefForDevice(anchor.href);
            if (!rewritten || rewritten === anchor.href) return;
            const parts = parseWhatsAppHref(anchor.href);
            if (!parts) return;
            event.preventDefault();
            openWhatsApp(parts.text, parts.digits);
        };
        const onFallback = (event: Event) => {
            const detail = (event as CustomEvent<WhatsAppFallbackDetail>).detail;
            if (!detail) return;
            event.preventDefault();
            setFallback(detail);
        };
        document.addEventListener("click", onClick, true);
        window.addEventListener(WHATSAPP_FALLBACK_EVENT, onFallback);
        return () => {
            document.removeEventListener("click", onClick, true);
            window.removeEventListener(WHATSAPP_FALLBACK_EVENT, onFallback);
        };
    }, []);

    useEffect(() => {
        if (!fallback) return;
        const timer = window.setTimeout(() => setFallback(null), 30_000);
        return () => window.clearTimeout(timer);
    }, [fallback]);

    if (!fallback) return null;
    return (
        <div
            role="dialog"
            aria-label="Open WhatsApp"
            data-testid="whatsapp-fallback"
            className="fixed inset-x-3 bottom-4 z-[120] mx-auto max-w-md rounded-2xl border border-[#cfe3dc] bg-white p-4 shadow-[0_18px_50px_rgba(15,43,54,.18)] sm:inset-x-auto sm:right-5"
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[13px] font-extrabold text-[#16313d]">WhatsApp did not open</p>
                    <p className="mt-0.5 text-[12px] text-[#5d727a]">
                        If the WhatsApp app is installed, choose <b>Open app</b> and allow it when the browser asks. Otherwise use WhatsApp Web.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setFallback(null)}
                    aria-label="Close"
                    className="shrink-0 rounded-full border border-[#dde5ea] px-2 py-0.5 text-xs font-bold text-[#5d727a] hover:bg-[#f7fafb]"
                >
                    ✕
                </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                <a
                    href={fallback.appHref}
                    data-ciel-whatsapp-direct="1"
                    onClick={() => setFallback(null)}
                    className="rounded-[10px] bg-[#1f7a46] px-3 py-2 text-[12px] font-black text-white hover:bg-[#186238]"
                >
                    Open app
                </a>
                <a
                    href={fallback.webHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-ciel-whatsapp-direct="1"
                    onClick={() => setFallback(null)}
                    className="rounded-[10px] bg-[#e8f8ee] px-3 py-2 text-[12px] font-black text-[#1f7a46] hover:bg-[#d6f1e0]"
                >
                    Use WhatsApp Web
                </a>
            </div>
        </div>
    );
}
