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

export function OpportunitySubmitBlockedDialog({
    open,
    onClose,
    steps,
    onOpenStep,
}: {
    open: boolean;
    onClose: () => void;
    steps: OpportunityIncompleteStep[];
    onOpenStep: (key: string) => void;
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
                                    <li key={`${block.key}-${i}`}>{err}</li>
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
