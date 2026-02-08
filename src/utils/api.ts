export async function authenticatedFetch(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem("ciel_token");

    const isFormData = options.body instanceof FormData;

    const headers: HeadersInit = {
        ...options.headers,
        "Authorization": `Bearer ${token}`
    };

    if (!isFormData) {
        (headers as any)["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    console.log("Fetcher: ", url, response.status); // Debug log

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
