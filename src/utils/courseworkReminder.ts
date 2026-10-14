import { authenticatedFetch } from "@/utils/api";

export type CourseworkReminderResult =
    | { ok: true; to: string }
    | { ok: false; message: string };

/** "Email <teacher>" on a submitted coursework card — CIEL PK sends the reminder server-side
 * (POST /paths/course-projects/:id/remind-faculty, once per 24h) so it works without a mail
 * client on the student's device and the student is told whether it actually went out. */
export async function remindCourseworkFaculty(entryId: string): Promise<CourseworkReminderResult> {
    try {
        const res = await authenticatedFetch(
            `/api/v1/paths/course-projects/${encodeURIComponent(entryId)}/remind-faculty`,
            { method: "POST" },
            { redirectToLogin: false },
        );
        if (!res) return { ok: false, message: "Could not reach the server. Check your connection and try again." };
        const body = (await res.json().catch(() => null)) as
            | { success?: boolean; data?: { to?: string }; message?: string | string[] }
            | null;
        if (res.ok && body?.success && body.data?.to) return { ok: true, to: body.data.to };
        const raw = body?.message;
        const message = Array.isArray(raw) ? raw.join(" ") : typeof raw === "string" && raw.trim() ? raw : `Could not send the reminder (HTTP ${res.status}).`;
        return { ok: false, message };
    } catch {
        return { ok: false, message: "Could not send the reminder. Please try again." };
    }
}
