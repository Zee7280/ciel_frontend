"use client";

import { useEffect, useRef } from "react";

/**
 * Keeps a dashboard list in sync without a manual reload: calls `refresh` every `intervalMs`
 * while the tab is visible, and again the moment the tab becomes visible or the window regains
 * focus (so a reviewer who switches back sees the student's latest hours / progress).
 */
export function useLiveRefresh(
    refresh: () => void | Promise<unknown>,
    { intervalMs = 60_000, enabled = true }: { intervalMs?: number; enabled?: boolean } = {},
): void {
    const refreshRef = useRef(refresh);
    useEffect(() => {
        refreshRef.current = refresh;
    });
    useEffect(() => {
        if (!enabled || typeof window === "undefined") return;
        let last = Date.now();
        const run = () => {
            last = Date.now();
            void refreshRef.current();
        };
        const tick = () => {
            if (document.visibilityState === "visible") run();
        };
        const onVisible = () => {
            // Coming back after being away: refresh at once (but not twice within a few seconds).
            if (document.visibilityState === "visible" && Date.now() - last > 5_000) run();
        };
        const timer = window.setInterval(tick, Math.max(15_000, intervalMs));
        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("focus", onVisible);
        return () => {
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisible);
            window.removeEventListener("focus", onVisible);
        };
    }, [enabled, intervalMs]);
}
