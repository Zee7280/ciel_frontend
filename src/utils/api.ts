const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? "http://localhost:3000";

export async function authenticatedFetch(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem("ciel_token");

    // If url is relative (starts with /), prepend backend base URL directly
    // This ensures all client-side calls correctly hit http://localhost:3000
    const fullUrl = url.startsWith("/") ? `${BASE_URL}${url}` : url;

    const isFormData = options.body instanceof FormData;

    const headers: HeadersInit = {
        ...options.headers,
        "Authorization": `Bearer ${token}`
    };

    if (!isFormData) {
        (headers as any)["Content-Type"] = "application/json";
    }

    const response = await fetch(fullUrl, {
        ...options,
        headers
    });

    console.log("Fetcher: ", fullUrl, response.status);

    if (response.status === 401) {
        console.log("Fetcher: 401 detected. Redirecting...");
        if (typeof window !== "undefined") {
            localStorage.removeItem("ciel_token");
            window.location.replace("/login");
        }
        return null;
    }

    return response;
}
