"use client";

export type OpportunityIncompleteStep = {
    key: string;
    label: string;
    errors: string[];
};

export function incompleteWizardSteps(
    wizardSteps: ReadonlyArray<{ key: string; label: string }>,
    errorsByStep: Record<string, Record<string, string | undefined>>,
): OpportunityIncompleteStep[] {
    return wizardSteps.flatMap((step) => {
        const errors = Object.values(errorsByStep[step.key] || {}).filter((value): value is string => Boolean(value));
        return errors.length ? [{ key: step.key, label: step.label, errors }] : [];
    });
}

/** Find the on-screen error line that shows exactly this message (or contains it). */
function findErrorElement(message: string): HTMLElement | null {
    if (typeof document === "undefined") return null;
    const wanted = message.trim();
    if (!wanted) return null;
    const candidates = Array.from(document.querySelectorAll<HTMLElement>("p, span, small, div, li")).filter(
        (el) => el.children.length === 0 && !el.closest("[role='dialog']"),
    );
    return (
        candidates.find((el) => (el.textContent || "").trim() === wanted) ||
        candidates.find((el) => (el.textContent || "").includes(wanted)) ||
        null
    );
}

/**
 * Scroll to the field that shows `message` and focus its input. Call it right after switching to the
 * step that owns the error: the step may not be mounted yet, so it retries briefly. Returns nothing;
 * when the message is never found (e.g. a profile-level error) the step simply stays open.
 */
export function focusFieldError(message: string, attempt = 0): void {
    if (typeof window === "undefined") return;
    const el = findErrorElement(message);
    if (!el) {
        if (attempt < 12) window.setTimeout(() => focusFieldError(message, attempt + 1), 60);
        return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // The input sits in the same field wrapper as its error line; climb a few levels to find it.
    let box: HTMLElement | null = el.parentElement;
    for (let i = 0; i < 4 && box; i += 1, box = box.parentElement) {
        const target =
            box.querySelector<HTMLElement>("[aria-invalid='true']") ||
            box.querySelector<HTMLElement>("input:not([type='hidden']):not([type='checkbox']):not([type='radio']), textarea, select");
        if (target) {
            window.setTimeout(() => target.focus({ preventScroll: true }), 350);
            break;
        }
    }
}

export function OpportunitySubmitBlockedDialog({
    open,
    onClose,
    steps,
    onOpenStep,
    onOpenError,
}: {
    open: boolean;
    onClose: () => void;
    steps: OpportunityIncompleteStep[];
    onOpenStep: (key: string) => void;
    /** When given, each message is a button that opens its step and jumps to that exact field. */
    onOpenError?: (stepKey: string, message: string) => void;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close" onClick={onClose} />
            <div
                role="dialog"
                aria-labelledby="co-submit-blocked-title"
                className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            >
                <h2 id="co-submit-blocked-title" className="text-lg font-semibold text-slate-900">
                    Cannot submit yet
                </h2>
                <p className="mt-1 text-sm text-slate-600">Steps that still need attention:</p>
                <ul className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                    {steps.map((block) => (
                        <li key={block.key} className="text-sm">
                            <button
                                type="button"
                                className="font-bold text-slate-900 hover:text-[#0e7d74]"
                                onClick={() => onOpenStep(block.key)}
                            >
                                {block.label}
                            </button>
                            <ul className="mt-1.5 ml-3 list-disc space-y-1 text-slate-600">
                                {block.errors.map((err, i) => (
                                    <li key={`${block.key}-${i}`}>
                                        {onOpenError ? (
                                            <button
                                                type="button"
                                                className="text-left underline decoration-dotted underline-offset-2 hover:text-[#0e7d74]"
                                                onClick={() => onOpenError(block.key, err)}
                                            >
                                                {err}
                                            </button>
                                        ) : (
                                            err
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </li>
                    ))}
                </ul>
                <button
                    type="button"
                    className="mt-4 w-full rounded-xl bg-[#0e7d74] py-2.5 text-sm font-bold text-white"
                    onClick={onClose}
                >
                    Close
                </button>
            </div>
        </div>
    );
}
