/**
 * Helpers for POST …/students/…/opportunities/:id/apply (Nest BadRequestException, etc.).
 * Prefer showing backend English; optional Roman Urdu when NEXT_PUBLIC_APPLY_ERRORS_URDU=true.
 */

/** Collapse Nest `message` field (string or validation array). */
export function normalizeNestHttpMessage(raw: unknown): string {
    if (Array.isArray(raw)) {
        return raw.map((x) => String(x).trim()).filter(Boolean).join(", ");
    }
    if (typeof raw === "string") return raw.trim();
    return "";
}

export function extractJsonErrorMessage(body: Record<string, unknown> | null | undefined): string {
    if (!body) return "";
    const fromMessage = normalizeNestHttpMessage(body.message);
    if (fromMessage) return fromMessage;
    return normalizeNestHttpMessage(body.error);
}

/** Normalized body returned by our Next apply proxies when the backend errors. */
export function messageFromApplyProxyError(payload: unknown): string {
    if (!payload || typeof payload !== "object") return "";
    return extractJsonErrorMessage(payload as Record<string, unknown>);
}

const EXACT_UrduRoman: Record<string, string> = {
    "You are already listed on another application for this opportunity (as lead or team member). Withdraw that application first if you want to change teams.":
        "Lead kisi aur open application ka hissa hai (lead ya member). Pehle woh withdraw karein, phir dubara apply.",
    "team_id is required for team applications (use a unique value per team).":
        "Team apply ke liye unique team_id bhejna zaroori hai (frontend har nayi team ke liye naya slug generate kare).",
    "This team_id is already used on this opportunity. Use a different team identifier.":
        "Yeh team identifier is project par pehle use ho chuka — naya team_id chunein.",
    "Already applied to this opportunity":
        "Aap ki apni open application / seat conflict — pehle se apply ho chuka.",
    "Each team member email must appear only once.":
        "Har team member ki email sirf ek dafa honi chahiye — form par duplicate hataein.",
    "Primary faculty email is required when attendance approval is routed to faculty":
        "Faculty flow mein primary faculty email zaroori hai.",
    "This opportunity is not open for applications yet":
        "Opportunity abhi applications ke liye open nahi.",
};

function dynamicUrduRoman(en: string): string | undefined {
    const emailListed =
        /^(.+?) is already listed on another application for this opportunity\.?$/i.exec(en);
    if (emailListed?.[1]) {
        const email = emailListed[1].trim();
        return `${email} is opportunity par pehle se kisi aur team / application ka hissa hai.`;
    }

    const enrolled = /^Team member (.+?) is already enrolled on this opportunity\.?$/i.exec(en);
    if (enrolled?.[1]) {
        return `Member (${enrolled[1].trim()}) already seat par hai.`;
    }

    const pending = /^Team member (.+?) already has a pending seat on this opportunity\.?$/i.exec(en);
    if (pending?.[1]) {
        return `Member (${pending[1].trim()}) ki approval / onboarding pending hai — dobara add na karein.`;
    }

    const associated = /^Team member (.+?) is already associated with this opportunity\.?$/i.exec(en);
    if (associated?.[1]) {
        return `Member (${associated[1].trim()}) pehle se is opportunity se juda hua hai.`;
    }

    return undefined;
}

export function applyOpportunityErrorToUrduRoman(enMessage: string): string | undefined {
    const trimmed = enMessage.trim();
    if (!trimmed) return undefined;
    if (EXACT_UrduRoman[trimmed]) return EXACT_UrduRoman[trimmed];
    return dynamicUrduRoman(trimmed);
}

function applyUrduPreferenceEnabled(): boolean {
    try {
        return process.env.NEXT_PUBLIC_APPLY_ERRORS_URDU === "true";
    } catch {
        return false;
    }
}

/** Toast / banner copy: English from server, optionally Roman Urdu. */
export function resolveApplyOpportunityToastMessage(backendMessage: string | undefined): string {
    const en = normalizeNestHttpMessage(backendMessage || "");
    const base = en || "Something went wrong. Please try again.";
    if (applyUrduPreferenceEnabled()) {
        return applyOpportunityErrorToUrduRoman(base) ?? base;
    }
    return base;
}
