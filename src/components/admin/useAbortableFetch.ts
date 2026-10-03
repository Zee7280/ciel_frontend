"use client";

import { useCallback, useEffect, useRef } from "react";

export interface AbortableRun {
    signal: AbortSignal;
    /** True while this run is still the newest one (not superseded, not unmounted). */
    isCurrent: () => boolean;
}

/**
 * Sequence guard for fetches: `begin()` aborts the previous run and returns a handle whose
 * `isCurrent()` tells you whether it is safe to commit state. Aborts on unmount.
 */
export function useAbortableFetch() {
    const ctl = useRef<AbortController | null>(null);
    const seq = useRef(0);

    useEffect(
        () => () => {
            seq.current += 1;
            ctl.current?.abort();
        },
        [],
    );

    const begin = useCallback((): AbortableRun => {
        ctl.current?.abort();
        const c = new AbortController();
        ctl.current = c;
        const mine = ++seq.current;
        return { signal: c.signal, isCurrent: () => seq.current === mine && !c.signal.aborted };
    }, []);

    return { begin };
}

export function isAbortError(e: unknown): boolean {
    return !!e && typeof e === "object" && (e as { name?: string }).name === "AbortError";
}

/** Pull a human message out of a failed Response (Nest `{message}` string or array). */
export async function readErrorMessage(res: Response | null | undefined, fallback = "Request failed"): Promise<string> {
    if (!res) return fallback;
    try {
        const text = await res.text();
        if (!text) return `${fallback} (${res.status})`;
        try {
            const j = JSON.parse(text);
            const m = j?.message ?? j?.error;
            if (Array.isArray(m)) return m.join(", ");
            if (typeof m === "string" && m.trim()) return m;
        } catch {
            /* not JSON */
        }
        return text.length < 200 ? text : `${fallback} (${res.status})`;
    } catch {
        return `${fallback} (${res.status})`;
    }
}
