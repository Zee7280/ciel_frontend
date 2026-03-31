const BASE_URL = process.env.NEXT_PUBLIC_APP_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:3000";

/**
 * Decode a JWT token and check if it has expired.
 * Returns true if token is valid and NOT expired, false otherwise.
 */
function isTokenValid(token: string | null): boolean {
    if (!token) return false;
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return false;
        // JWT payload is base64 encoded (the middle part)
        const payload = JSON.parse(atob(parts[1]));
        if (!payload.exp) return true; // No expiry set → assume valid
        // exp is in seconds, Date.now() is in ms
        return payload.exp * 1000 > Date.now();
    } catch {
        return false;
    }
}

export async function authenticatedFetch(url: string, options: RequestInit = {}, config: { redirectToLogin?: boolean } = { redirectToLogin: true }) {
    const token = localStorage.getItem("ciel_token");

    // If token is already expired locally, redirect immediately without making the API call
    if (!isTokenValid(token) && config.redirectToLogin) {
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

    const response = await fetch(fullUrl, {
        ...options,
        headers
    });

    if (response.status === 401) {
        if (config.redirectToLogin) {
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
