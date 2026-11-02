import { authenticatedFetch, resolveSameOriginApiPath } from "@/utils/api";

/** Downloads a CSV from an authenticated admin route (export endpoints). */
export async function downloadAdminCsv(path: string, filename: string): Promise<string | null> {
    try {
        const res = await authenticatedFetch(resolveSameOriginApiPath(path), {}, { redirectToLogin: false });
        if (!res?.ok) return `Export failed (HTTP ${res?.status ?? "network"}).`;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        return null;
    } catch {
        return "Export failed.";
    }
}

/** DELETE with a JSON body; returns the count or an error message. */
export async function deleteAdminLogs(path: string, body: Record<string, unknown>): Promise<{ deleted?: number; error?: string }> {
    try {
        const res = await authenticatedFetch(
            resolveSameOriginApiPath(path),
            { method: "DELETE", body: JSON.stringify(body) },
            { redirectToLogin: false },
        );
        const json = (await res?.json().catch(() => null)) as { deleted?: number; message?: string } | null;
        if (!res?.ok) return { error: json?.message || `Delete failed (HTTP ${res?.status ?? "network"}).` };
        return { deleted: json?.deleted ?? 0 };
    } catch {
        return { error: "Delete failed." };
    }
}

export const num = (n: number | undefined | null) => (n ?? 0).toLocaleString();
