import { isFrontendVerificationPath } from "@/config/verification";

/** Same-origin paths only — blocks open redirects. */
export function isSafeInternalReturnPath(path: string): boolean {
    const p = path.trim();
    if (!p.startsWith("/")) return false;
    if (p.startsWith("//")) return false;
    if (p.includes("://")) return false;
    if (p.includes("@")) return false;
    return true;
}

const STORAGE_KEY = "ciel_verification_return";
const TTL_MS = 24 * 60 * 60 * 1000;

type Stored = { url: string; t: number };

export function persistVerificationReturnFromWindow(): void {
    if (typeof window === "undefined") return;
    const url = `${window.location.pathname}${window.location.search}`;
    if (!isFrontendVerificationPath(window.location.pathname)) return;
    if (!window.location.search.includes("token=")) return;
    const payload: Stored = { url, t: Date.now() };
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
        /* quota / private mode */
    }
}

export function clearPersistedVerificationReturn(): void {
    if (typeof window === "undefined") return;
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        /* ignore */
    }
}

function readStored(): Stored | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const o = JSON.parse(raw) as Stored;
        if (typeof o?.url !== "string" || typeof o?.t !== "number") return null;
        if (Date.now() - o.t > TTL_MS) {
            sessionStorage.removeItem(STORAGE_KEY);
            return null;
        }
        if (!isSafeInternalReturnPath(o.url)) {
            sessionStorage.removeItem(STORAGE_KEY);
            return null;
        }
        const pathOnly = o.url.split("?")[0] || o.url;
        if (!isFrontendVerificationPath(pathOnly)) {
            return null;
        }
        return o;
    } catch {
        return null;
    }
}

/** Read without removing (e.g. before profile redirect). */
export function peekPersistedVerificationReturn(): string | null {
    return readStored()?.url ?? null;
}

/** Signup with optional `role` preset (e.g. faculty magic link). */
export function buildVerificationSignupHref(
    postAuthReturn: string,
    options?: { presetRole?: "faculty" },
): string {
    if (!isSafeInternalReturnPath(postAuthReturn)) return "/signup";
    const q = new URLSearchParams();
    q.set("next", postAuthReturn);
    if (options?.presetRole === "faculty") {
        q.set("role", "faculty");
    }
    return `/signup?${q.toString()}`;
}

export function consumePersistedVerificationReturn(): string | null {
    const s = readStored();
    if (!s) return null;
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        /* ignore */
    }
    return s.url;
}
