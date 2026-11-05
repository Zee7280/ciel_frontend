/** Public record ids look like CIEL-BNU-2026-0421 (CIEL-{university code}-{academic year}-{number}). */
export function recordIdLabel(publicId?: string | null, uuid?: string | null): string {
    const id = (publicId ?? "").trim();
    if (id) return id;
    return uuid ? uuid.slice(0, 8).toUpperCase() : "—";
}

const PUBLIC_ID_RE = /^CIEL-[A-Z0-9]{2,10}-\d{4}-\d{4,}$/;

export function isPublicRecordId(value?: string | null): boolean {
    return PUBLIC_ID_RE.test((value ?? "").trim().toUpperCase());
}

/** True when a search box entry matches a record by its public id (partial, case-insensitive). */
export function matchesRecordId(query: string, publicId?: string | null): boolean {
    const q = query.trim().toUpperCase();
    return !!q && !!publicId && publicId.toUpperCase().includes(q);
}
