import { authenticatedFetch } from "@/utils/api";
import type { FypEntry } from "@/utils/fypTypes";

function asEntry(data: unknown): FypEntry | null {
    if (!data || typeof data !== "object") return null;
    const id = (data as FypEntry).id;
    return typeof id === "string" && id ? (data as FypEntry) : null;
}

async function idFromResponse(res: Response | null): Promise<string | null> {
    if (!res?.ok) return null;
    const json = await res.json().catch(() => null);
    const id = json?.data?.id;
    return typeof id === "string" && id ? id : null;
}

/** Student FYP deck — prefers the multi-record list, falls back to the legacy singleton GET. */
export async function listStudentFyps(): Promise<FypEntry[]> {
    const res = await authenticatedFetch("/api/v1/paths/fyp-theses", {}, { redirectToLogin: true });
    const json = res?.ok ? await res.json().catch(() => null) : null;
    if (Array.isArray(json?.data)) return json.data.map(asEntry).filter(Boolean) as FypEntry[];
    const nested = asEntry(json?.data);
    if (nested) return [nested];
    const legacy = await authenticatedFetch("/api/v1/paths/fyp-thesis", {}, { redirectToLogin: true });
    const one = asEntry(legacy?.ok ? (await legacy.json().catch(() => null))?.data : null);
    return one ? [one] : [];
}

/** Creates a new FYP row, or opens an existing draft / legacy singleton if POST is blocked. */
export async function createStudentFyp(): Promise<string | null> {
    const post = await authenticatedFetch(
        "/api/v1/paths/fyp-theses",
        { method: "POST", body: JSON.stringify({}) },
        { redirectToLogin: true },
    );
    const fromPost = await idFromResponse(post);
    if (fromPost) return fromPost;

    const listed = await listStudentFyps();
    const ownDraft = listed.find((e) => e.id && e.status !== "submitted" && e.isOwner !== false);
    if (ownDraft?.id) return ownDraft.id;

    const patch = await authenticatedFetch(
        "/api/v1/paths/fyp-thesis",
        { method: "PATCH", body: JSON.stringify({}) },
        { redirectToLogin: true },
    );
    const fromPatch = await idFromResponse(patch);
    if (fromPatch) return fromPatch;

    const ownAny = listed.find((e) => e.id && e.isOwner !== false);
    if (ownAny?.id) return ownAny.id;
    const shared = listed.find((e) => e.id);
    return shared?.id ?? null;
}

export async function loadStudentFyp(id: string): Promise<FypEntry | null> {
    const res = await authenticatedFetch(`/api/v1/paths/fyp-theses/${id}`, {}, { redirectToLogin: true });
    if (res?.ok) {
        const entry = asEntry((await res.json().catch(() => null))?.data);
        if (entry) return entry;
    }
    const legacy = await authenticatedFetch("/api/v1/paths/fyp-thesis", {}, { redirectToLogin: true });
    return asEntry(legacy?.ok ? (await legacy.json().catch(() => null))?.data : null);
}
