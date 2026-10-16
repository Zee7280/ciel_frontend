"use client";

export type DuplicateNoticeState =
    | { kind: "loading" }
    | { kind: "ok"; title: string }
    | { kind: "error"; message: string }
    | null;

/** Banner shown on a create form opened with ?duplicate=<id>, so the user always knows whether the
 * previous opportunity's details were copied, or exactly why they were not. */
export default function DuplicateNotice({ state, onRetry }: { state: DuplicateNoticeState; onRetry?: () => void }) {
    if (!state) return null;
    if (state.kind === "loading") {
        return (
            <div role="status" className="mb-4 rounded-xl border border-[#d9e3e7] bg-[#f7fafb] px-4 py-3 text-sm text-[#52636e]">
                Copying details from the previous opportunity…
            </div>
        );
    }
    if (state.kind === "ok") {
        return (
            <div role="status" className="mb-4 rounded-xl border border-[#c9e5da] bg-[#f0faf6] px-4 py-3 text-sm text-[#0e6b5f]">
                Copied from “{state.title}”. Review every step, set new dates, re-confirm the declarations and submit — this creates a new opportunity.
            </div>
        );
    }
    return (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <span>Could not copy the previous opportunity: {state.message}</span>
            {onRetry ? (
                <button type="button" onClick={onRetry} className="rounded-lg border border-rose-300 bg-white px-3 py-1 text-xs font-bold text-rose-800 hover:bg-rose-100">
                    Try again
                </button>
            ) : null}
        </div>
    );
}
