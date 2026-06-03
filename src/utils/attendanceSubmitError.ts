import { extractJsonErrorMessage, normalizeNestHttpMessage } from "@/utils/applyOpportunityUx";

const STATUS_HINTS: Record<number, string> = {
    400: "The server could not accept this attendance entry. Check the details below and try again.",
    401: "Your session may have expired. Please sign in again and retry.",
    403: "You are not allowed to log attendance for this student.",
    404: "Participation or project record was not found. Refresh the page and try again.",
    413: "The photo or file is too large to upload. Try a smaller image or save without evidence first.",
    422: "Some fields did not pass validation. Check date, times, location, and description.",
    429: "Too many requests. Please wait a moment and try again.",
    502: "Could not reach the server (proxy or network). Try again, or save without the photo.",
    503: "The service is temporarily unavailable. Please try again shortly.",
    504: "The request timed out. Try again with a smaller photo or without evidence.",
};

/** User-friendly hints when the API message is generic or missing. */
function hintForBackendMessage(en: string, action: "submit" | "delete" = "submit"): string | undefined {
    const m = en.toLowerCase();
    if (m.includes("supervising faculty") || m.includes("faculty email")) {
        return "Add your faculty supervisor email on team registration, or ask your faculty to link their account to this project.";
    }
    if (m.includes("partner contact")) {
        return "This project needs a partner/NGO contact on file. Contact support or your project coordinator.";
    }
    if (m.includes("approved/verified") || m.includes("only allowed for approved")) {
        return "Your participation must be approved before you can log attendance. Check Applications or refresh after approval.";
    }
    if (m.includes("not authorized") || m.includes("only delete your own")) {
        return action === "delete"
            ? "You can only delete attendance entries that you logged for yourself."
            : "You can only log attendance for yourself or, as team lead, for verified team members on this project.";
    }
    if (m.includes("failed to upload file to s3") || m.includes("s3")) {
        return "Evidence upload failed on the server. Try again without a photo, or use a smaller JPG/PNG.";
    }
    if (m.includes("file type not allowed")) {
        return "That file type is not supported. Use JPG, PNG, PDF, or Word.";
    }
    if (m.includes("participation record not found") || m.includes("invalid participation reference")) {
        return "Reload the report page so your participation id syncs, then try again.";
    }
    if (
        m.includes("2000 characters") ||
        m.includes("shorter than or equal to 2000") ||
        m.includes("300 characters") ||
        m.includes("shorter than or equal to 300")
    ) {
        return "Shorten the brief description (see the character counter on the form).";
    }
    if (m.includes("40 words") || m.includes("exceed 40 words")) {
        return "Shorten the brief description to 40 words or fewer.";
    }
    if (m.includes("upstream request failed") || m.includes("backend url is not configured")) {
        return "The app could not forward your request to the API. Try again later or contact support.";
    }
    if (
        m.includes("payload_too_large") ||
        m.includes("entity too large") ||
        m.includes("function_payload")
    ) {
        return "The photo was too large for the app server. Update the app to the latest version, or try a smaller image.";
    }
    return undefined;
}

async function readResponsePayload(res: Response): Promise<{
    json: Record<string, unknown> | null;
    textSnippet: string;
}> {
    const clone = res.clone();
    let textSnippet = "";
    try {
        const text = await clone.text();
        textSnippet = text.trim().slice(0, 500);
    } catch {
        textSnippet = "";
    }

    if (!textSnippet) {
        return { json: null, textSnippet: "" };
    }

    try {
        const parsed = JSON.parse(textSnippet) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return { json: parsed as Record<string, unknown>, textSnippet };
        }
    } catch {
        /* HTML or plain text */
    }

    return { json: null, textSnippet };
}

/**
 * Resolve a student-facing message from an attendance POST response (or null when session missing).
 */
export async function resolveAttendanceSubmitError(
    res: Response | null,
    action: "submit" | "delete" = "submit",
): Promise<string> {
    if (!res) {
        return STATUS_HINTS[401];
    }

    const { json, textSnippet } = await readResponsePayload(res);
    const fromJson =
        extractJsonErrorMessage(json) ||
        (json && typeof json.success === "boolean" && json.success === false
            ? normalizeNestHttpMessage(json.message)
            : "");

    let message = fromJson.trim();
    if (!message && textSnippet && !textSnippet.startsWith("<")) {
        message = textSnippet;
    }
    if (
        message.includes("PAYLOAD_TOO_LARGE") ||
        message.includes("Request Entity Too Large") ||
        message.includes("FUNCTION_PAYLOAD")
    ) {
        message =
            "Photo upload failed: file is too large for the app gateway. Please update the app, use a smaller photo, or save without evidence for now.";
    }
    if (!message) {
        if (res.status === 403 && action === "delete") {
            message = "You can only delete your own attendance entries.";
        } else {
            message =
                STATUS_HINTS[res.status] ||
                (action === "delete"
                    ? `Could not delete attendance (HTTP ${res.status}). Please try again.`
                    : `Could not save attendance (HTTP ${res.status}). Please try again.`);
        }
    }

    const hint = hintForBackendMessage(message, action);
    if (hint && !message.toLowerCase().includes(hint.slice(0, 24).toLowerCase())) {
        return `${message} ${hint}`;
    }
    return message;
}
