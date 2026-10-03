/** Ordered id list of the filtered report-verification queue, shared between list and detail pages. */
const KEY = "admin-report-review-queue:v1";

export type ReviewQueueSnapshot = { ids: string[]; savedAt: number };

export function saveReviewQueue(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const snapshot: ReviewQueueSnapshot = { ids, savedAt: Date.now() };
    window.sessionStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    /* storage unavailable or full */
  }
}

export function loadReviewQueue(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<ReviewQueueSnapshot> | null;
    return Array.isArray(parsed?.ids) ? parsed!.ids!.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function neighbourInQueue(
  ids: string[],
  currentId: string,
): { prev: string | null; next: string | null; index: number; total: number } {
  const index = ids.indexOf(currentId);
  if (index < 0) return { prev: null, next: null, index: -1, total: ids.length };
  return {
    prev: index > 0 ? ids[index - 1] : null,
    next: index < ids.length - 1 ? ids[index + 1] : null,
    index,
    total: ids.length,
  };
}
