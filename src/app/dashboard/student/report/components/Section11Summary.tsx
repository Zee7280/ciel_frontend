import { ShieldCheck } from "lucide-react";

function finalDeclarationItems(requiresFee: boolean): string[] {
    return [
        "I confirm every section of this report is accurate to the best of my knowledge.",
        "I understand that after final submission, no further edits are possible.",
        "I understand my whole report — not each session — is verified once, by CIEL PK, from the flash card.",
        "I consent to this report and its evidence being shared with CIEL PK, and my faculty and institution after approval.",
        requiresFee
            ? "I understand a reporting fee applies before CIEL PK can review my score and certificate."
            : "I understand CIEL PK Admin reviews this report next. Hours and score are confirmed when the Admin approves it.",
    ];
}

/** Mockup 10.5 — the final declaration + electronic sign-off that gates submission, once all sections are complete. */
export function FinalDeclarationCard({
    declaration,
    signatureName,
    requiresFee,
    onToggle,
    onSignatureChange,
}: {
    declaration: boolean[];
    signatureName: string;
    requiresFee: boolean;
    onToggle: (index: number) => void;
    onSignatureChange: (value: string) => void;
}) {
    const allChecked = declaration.slice(0, 5).every(Boolean);
    return (
        <div className="mx-auto flex w-full max-w-lg flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--teal-soft)]">
                <ShieldCheck className="h-8 w-8 text-[var(--teal)]" />
            </div>
            <div className="mt-5 w-full space-y-5 text-left">
                <div className="text-center">
                    <h3 className="mb-1 text-xl font-semibold tracking-tight text-slate-900">
                        Final report declaration &amp; electronic sign-off
                    </h3>
                    <p className="text-sm font-medium leading-relaxed text-slate-400">
                        Before submission is accepted, tick every declaration below and sign with your full
                        name.
                    </p>
                </div>
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
                    {finalDeclarationItems(requiresFee).map((text, i) => (
                        <label key={i} className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-slate-50">
                            <input
                                type="checkbox"
                                checked={!!declaration[i]}
                                onChange={() => onToggle(i)}
                                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)] focus:ring-offset-1"
                            />
                            <span className="text-sm leading-relaxed text-slate-700">{text}</span>
                        </label>
                    ))}
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Electronic signature — type your full name
                    </label>
                    <input
                        type="text"
                        value={signatureName}
                        onChange={(e) => onSignatureChange(e.target.value)}
                        placeholder="Your full name"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-[var(--teal)] focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal-soft)]"
                    />
                </div>
                {!allChecked || !signatureName.trim() ? (
                    <p className="text-xs font-medium text-[var(--gold)]">
                        Tick all five declarations and sign your name to unlock final submission.
                    </p>
                ) : (
                    <p className="text-xs font-medium text-[var(--teal)]">
                        Declaration complete — you can now submit from the button below.
                    </p>
                )}
            </div>
        </div>
    );
}
