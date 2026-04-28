const BASE_URL = process.env.NEXT_PUBLIC_APP_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:3000";

/** Decode JWT payload segment (base64url per RFC 7519). Plain `atob` fails on `-` / `_` and unpadded segments. */
function decodeJwtPayloadJson(token: string): { exp?: number } | null {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad === 2) b64 += "==";
    else if (pad === 3) b64 += "=";
    else if (pad === 1) return null;
    try {
        const json = atob(b64);
        return JSON.parse(json) as { exp?: number };
    } catch {
        return null;
    }
}

/**
 * Decode a JWT token and check if it has expired.
 * Returns true if token is valid and NOT expired, false otherwise.
 */
export function isTokenValid(token: string | null): boolean {
    if (!token) return false;
    const payload = decodeJwtPayloadJson(token);
    if (!payload) return false;
    if (payload.exp == null) return true; // No expiry set → assume valid
    // exp is in seconds, Date.now() is in ms
    return payload.exp * 1000 > Date.now();
}

export async function authenticatedFetch(
    url: string,
    options: RequestInit = {},
    config: { redirectToLogin?: boolean; timeoutMs?: number } = { redirectToLogin: true }
) {
    const token = localStorage.getItem("ciel_token");
    const redirectToLogin = config.redirectToLogin ?? true;

    // If token is already expired locally, redirect immediately without making the API call
    if (!isTokenValid(token) && redirectToLogin) {
        console.log("Fetcher: Token expired or missing. Redirecting to login...");
        if (typeof window !== "undefined") {
            localStorage.removeItem("ciel_token");
            window.location.replace("/login");
        }
        return null;
    }

    let fullUrl = url;
    if (url.startsWith("/")) {
        const cleanBase = BASE_URL.replace(/\/$/, "");
        const cleanPath = url.startsWith("/") ? url : `/${url}`;

        if (cleanBase.endsWith("/api/v1") && cleanPath.startsWith("/api/v1")) {
            fullUrl = `${cleanBase}${cleanPath.substring(7)}`;
        } else {
            fullUrl = `${cleanBase}${cleanPath}`;
        }
    }

    const isFormData = options.body instanceof FormData;

    // We cast to Record<string, string> so we can manipulate specific headers easily
    const incomingHeaders: Record<string, string> = (options.headers as Record<string, string>) || {};
    const headers: Record<string, string> = {
        ...incomingHeaders,
        "Authorization": `Bearer ${token}`
    };

    if (isFormData) {
        // MUST NOT have Content-Type for FormData, browser sets it with the correct boundary
        delete headers["Content-Type"];
        delete headers["content-type"];
    } else {
        headers["Content-Type"] = "application/json";
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let signal = options.signal;

    if (config.timeoutMs && config.timeoutMs > 0) {
        const controller = new AbortController();
        signal = controller.signal;
        timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);
        options.signal?.addEventListener("abort", () => controller.abort(), { once: true });
    }

    const response = await fetch(fullUrl, {
        ...options,
        headers,
        signal
    }).finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
    });

    if (response.status === 401) {
        if (redirectToLogin) {
            // Double check: only redirect if our local token is also expired
            // This prevents redirect on server-side permission errors (403-like 401s)
            if (!isTokenValid(token)) {
                console.log("Fetcher: 401 + token expired. Redirecting to login...");
                if (typeof window !== "undefined") {
                    localStorage.removeItem("ciel_token");
                    window.location.replace("/login");
                }
            } else {
                console.warn("Fetcher: 401 received but local token still valid. Skipping redirect.");
            }
        } else {
            console.log("Fetcher: 401 detected in background. Skipping redirect.");
        }
        return null;
    }

    return response;
}
