export interface VentureLike {
    ventureName?: string | null;
    description?: string | null;
    stage?: string | null;
    tractionRows?: unknown[] | null;
    team?: unknown[] | null;
    materialUrls?: string[] | null;
}

/**
 * Weighted checklist for the Startup/Business visibility gate. Keep in sync with
 * `ciel_backend/src/paths/venture-completeness.constants.ts` — the server re-checks this
 * before allowing visibility=true, this copy only drives the client-side checklist UI.
 */
export const VENTURE_COMPLETENESS_ITEMS: Array<{ key: string; label: string; weight: number; isComplete: (v: VentureLike) => boolean }> = [
    { key: "ventureName", label: "Add your venture name", weight: 15, isComplete: (v) => !!v.ventureName?.trim() },
    { key: "description", label: "Describe what your venture does", weight: 20, isComplete: (v) => !!v.description?.trim() && v.description.trim().length >= 30 },
    { key: "stage", label: "Set your venture stage", weight: 10, isComplete: (v) => !!v.stage?.trim() },
    { key: "traction", label: "Log at least one traction update", weight: 20, isComplete: (v) => (v.tractionRows?.length ?? 0) > 0 },
    { key: "team", label: "Add at least one team member", weight: 20, isComplete: (v) => (v.team?.length ?? 0) > 0 },
    { key: "materials", label: "Upload at least one supporting material", weight: 15, isComplete: (v) => (v.materialUrls?.length ?? 0) > 0 },
];

export const VENTURE_VISIBILITY_THRESHOLD = 70;

export function ventureCompletenessPercent(v: VentureLike): number {
    return VENTURE_COMPLETENESS_ITEMS.reduce((sum, item) => sum + (item.isComplete(v) ? item.weight : 0), 0);
}

export function ventureMissingItems(v: VentureLike) {
    return VENTURE_COMPLETENESS_ITEMS.filter((item) => !item.isComplete(v));
}
