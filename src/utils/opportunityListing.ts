import { findSdgById } from "@/utils/sdgData";

export type CreatorBucket = "student" | "faculty" | "partner" | "unspecified";
export type VisibilityBucket = "open" | "restricted" | "unspecified";
export type ModeBucket = "remote" | "hybrid" | "on-site" | "unspecified";

function str(v: unknown): string {
    return typeof v === "string" ? v.trim() : "";
}

function nestedStr(obj: unknown, keys: string[]): string {
    if (!obj || typeof obj !== "object") return "";
    const o = obj as Record<string, unknown>;
    for (const k of keys) {
        const s = str(o[k]);
        if (s) return s;
    }
    return "";
}

/** Normalize engagement mode for filter matching. */
export function normalizeModeBucket(raw: unknown): ModeBucket {
    const t = str(raw).toLowerCase().replace(/_/g, " ");
    if (!t) return "unspecified";
    if (t.includes("remote")) return "remote";
    if (t.includes("hybrid")) return "hybrid";
    if (t.includes("on site") || t.includes("onsite") || t.includes("on-site")) return "on-site";
    return "unspecified";
}

export function pickCreatorBucket(raw: Record<string, unknown>): CreatorBucket {
    const r = str(raw.created_by_role || raw.creator_role || raw.creator_type).toLowerCase();
    if (r.includes("student")) return "student";
    if (r.includes("faculty")) return "faculty";
    if (r.includes("partner")) return "partner";
    return "unspecified";
}

/** Host / home university for multi-university browsing (best-effort across API shapes). */
export function pickUniversityLabel(raw: Record<string, unknown>): string {
    const direct = [
        raw.host_university_name,
        raw.host_university,
        raw.university_name,
        raw.creator_university_name,
        raw.creator_university,
        raw.student_university,
        raw.institution_name,
    ].find((v) => str(v));
    if (direct) return str(direct);

    const fromCreator = nestedStr(raw.creator, ["university", "institution", "university_name"]);
    if (fromCreator) return fromCreator;

    const linkage = raw.visibility_and_academic_linkage;
    if (linkage && typeof linkage === "object") {
        const names = (linkage as Record<string, unknown>).restricted_university_names;
        if (Array.isArray(names)) {
            const first = names.map((x) => str(x)).filter(Boolean);
            if (first.length) return first.join(", ");
        }
    }
    return "Unspecified";
}

export function pickVisibilityBucket(raw: Record<string, unknown>): VisibilityBucket {
    const vis = str(raw.visibility).toLowerCase();
    const nested = raw.visibility_and_academic_linkage;
    let vt = "";
    if (nested && typeof nested === "object") {
        vt = str((nested as Record<string, unknown>).visibility_type).toLowerCase();
    }
    if (vis === "restricted" || vt.includes("restricted")) return "restricted";
    if (vis === "public" || vt.includes("open_all") || vt.includes("all_univers")) return "open";
    return "unspecified";
}

export function visibilityMenuLabel(bucket: VisibilityBucket): string {
    if (bucket === "restricted") return "Restricted (selected universities)";
    if (bucket === "open") return "Open (all universities)";
    return "Unspecified";
}

export function creatorMenuLabel(bucket: CreatorBucket): string {
    if (bucket === "student") return "Student-created";
    if (bucket === "faculty") return "Faculty-created";
    if (bucket === "partner") return "Partner-created";
    return "Unspecified";
}

export function modeMenuLabel(bucket: ModeBucket): string {
    if (bucket === "remote") return "Remote";
    if (bucket === "hybrid") return "Hybrid";
    if (bucket === "on-site") return "On-site";
    return "Unspecified";
}

/** Flat list of opportunity type strings from API. */
export function pickOpportunityTypes(raw: Record<string, unknown>): string[] {
    const t = raw.types;
    if (!Array.isArray(t)) return [];
    return t.map((x) => str(x)).filter(Boolean);
}

export function buildSdgFilterLabel(raw: Record<string, unknown>): string {
    const info = raw.sdg_info;
    let id: string | number | undefined;
    if (info && typeof info === "object") {
        const o = info as Record<string, unknown>;
        id = (o.sdg_id ?? o.id) as string | number | undefined;
    }
    if (id == null || str(id) === "") {
        id = raw.sdg as string | number | undefined;
    }
    const sdg = findSdgById(id);
    if (sdg) return `${sdg.number}. ${sdg.title}`;
    const desc = info && typeof info === "object" ? str((info as Record<string, unknown>).description) : "";
    if (desc) return desc;
    return "Unspecified SDG";
}

/**
 * Remaining seats when the API provides enough data; otherwise null (unknown).
 */
export function computeSeatsRemaining(raw: Record<string, unknown>): number | null {
    const rs = raw.remaining_seats;
    if (typeof rs === "number" && Number.isFinite(rs)) return rs;

    const timeline =
        raw.timeline && typeof raw.timeline === "object" ? (raw.timeline as Record<string, unknown>) : null;
    const needed = Number(
        raw.volunteers_needed ?? raw.volunteersNeeded ?? timeline?.volunteers_required ?? raw.volunteers_count,
    );
    const participants = Number(raw.participant_count ?? raw.participants ?? 0);
    if (Number.isFinite(needed) && needed > 0) {
        return Math.max(0, needed - (Number.isFinite(participants) ? participants : 0));
    }
    return null;
}

export function passesSeatsFilter(seats: number | null, filter: "all" | "1" | "5" | "10"): boolean {
    if (filter === "all") return true;
    const min = Number(filter);
    if (seats == null || !Number.isFinite(seats)) return false;
    return seats >= min;
}
