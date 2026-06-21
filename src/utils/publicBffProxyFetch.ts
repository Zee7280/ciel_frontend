/**
 * Server-side fetch for public BFF routes that proxy Nest `api/v1/public/*`.
 * Uses a short timeout so unreachable backends fail fast and fall back cleanly.
 */

const DEFAULT_PROXY_TIMEOUT_MS = 8_000;

/** Frontend dev/prod hosts — never proxy to these (avoids self-fetch loops). */
function isFrontendHost(hostname: string, port: string): boolean {
    const h = hostname.toLowerCase();
    if (h === "localhost" || h === "127.0.0.1") {
        return port === "3000" || port === "";
    }
    const vercelHost = process.env.VERCEL_URL?.trim().toLowerCase();
    if (vercelHost && h === vercelHost.replace(/^https?:\/\//, "").split("/")[0]) {
        return true;
    }
    return false;
}

export function resolveBackendPublicUrl(pathAfterPublic: string): string | null {
    const raw = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.trim();
    if (!raw) return null;

    let parsed: URL;
    try {
        parsed = new URL(raw.startsWith("http") ? raw : `http://${raw}`);
    } catch {
        return null;
    }

    if (isFrontendHost(parsed.hostname, parsed.port)) {
        return null;
    }

    const base = raw.replace(/\/+$/, "");
    const withV1 = base.endsWith("/api/v1") ? base : `${base}/api/v1`;
    const suffix = pathAfterPublic.replace(/^\/+/, "");
    return `${withV1}/public/${suffix}`;
}

export type PublicBffProxyOptions = {
    revalidate?: number;
    timeoutMs?: number;
    logLabel?: string;
};

export async function fetchBackendPublicJson<T>(
    pathAfterPublic: string,
    options: PublicBffProxyOptions = {},
): Promise<{ ok: true; data: T } | { ok: false; reason: "no_backend" | "timeout" | "http" }> {
    const targetUrl = resolveBackendPublicUrl(pathAfterPublic);
    if (!targetUrl) {
        return { ok: false, reason: "no_backend" };
    }

    const timeoutMs = options.timeoutMs ?? DEFAULT_PROXY_TIMEOUT_MS;
    const revalidate = options.revalidate;

    try {
        const response = await fetch(targetUrl, {
            method: "GET",
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(timeoutMs),
            ...(typeof revalidate === "number" ? { next: { revalidate } } : { cache: "no-store" as const }),
        });

        const payload = (await response.json().catch(() => null)) as T | null;
        if (!response.ok || payload == null) {
            logProxyFallback(options.logLabel, "http", targetUrl);
            return { ok: false, reason: "http" };
        }

        return { ok: true, data: payload };
    } catch (error) {
        const isTimeout =
            error instanceof Error &&
            (error.name === "TimeoutError" ||
                error.name === "AbortError" ||
                String((error as { cause?: { code?: string } }).cause?.code || "").includes("TIMEOUT"));

        logProxyFallback(options.logLabel, isTimeout ? "timeout" : "network", targetUrl, error);
        return { ok: false, reason: isTimeout ? "timeout" : "http" };
    }
}

function logProxyFallback(
    label: string | undefined,
    kind: "http" | "timeout" | "network",
    targetUrl: string,
    error?: unknown,
): void {
    if (!label) return;
    if (process.env.NODE_ENV === "production" && process.env.PUBLIC_BFF_PROXY_LOG !== "1") {
        return;
    }
    const detail =
        kind === "timeout"
            ? "backend did not respond in time — using fallback"
            : kind === "network"
              ? "backend unreachable — using fallback"
              : "backend returned invalid response — using fallback";
    console.warn(`[${label}] ${detail} (${targetUrl})`);
    if (error && process.env.NODE_ENV !== "production") {
        console.warn(error);
    }
}
