/**
 * Helpers for POST …/students/…/opportunities/:id/apply (Nest BadRequestException, etc.).
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

/** Toast / banner copy: English from server. */
export function resolveApplyOpportunityToastMessage(backendMessage: string | undefined): string {
    const en = normalizeNestHttpMessage(backendMessage || "");
    return en || "Something went wrong. Please try again.";
}

/** True when backend rejects duplicate apply — treat as success for closing modal + listing sync. */
export function isAlreadyAppliedApplyErrorMessage(message: string | undefined): boolean {
    const m = normalizeNestHttpMessage(message || "").toLowerCase();
    return m.includes("already applied to this opportunity");
}
