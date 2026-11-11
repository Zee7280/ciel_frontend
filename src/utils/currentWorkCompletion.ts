/**
 * "Overall current-work completion" on the student dashboards: the average progress of the paths
 * the student has actually started. Paths never opened do not count, so a student whose only
 * record is an approved Community Service report reads 100%, not 25%. Pure module (no imports).
 */
export type PathProgressLike = { state?: string; progress?: number } | null | undefined;

export function overallCurrentWorkCompletion(
    pathsStatus: Record<string, PathProgressLike> | null | undefined,
    pathKeys: readonly string[],
): number {
    if (!pathsStatus) return 0;
    const started = pathKeys
        .map((key) => pathsStatus[key])
        .filter((path): path is NonNullable<PathProgressLike> => Boolean(path) && path?.state !== "not_started");
    if (!started.length) return 0;
    const total = started.reduce((sum, path) => {
        const value = Number(path.progress);
        return sum + (Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0);
    }, 0);
    return Math.round(total / started.length);
}
