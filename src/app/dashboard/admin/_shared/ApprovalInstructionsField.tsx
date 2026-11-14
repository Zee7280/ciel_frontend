"use client";

export const APPROVAL_INSTRUCTIONS_MAX = 2000;

/** Quick-add lines for the most common "basic instructions" CIEL PK sends on approval. */
export const APPROVAL_INSTRUCTION_TEMPLATES: { label: string; text: string }[] = [
    {
        label: "Report & hours",
        text: "Keep the impact report updated: log hours after every session instead of waiting until the end.",
    },
    {
        label: "Evidence",
        text: "Upload evidence for each session (photos, attendance sheet). Do not share photos of children or vulnerable people without consent.",
    },
    {
        label: "Partner contact",
        text: "Share the session schedule with the partner contact before the first session and keep them updated.",
    },
    {
        label: "Safety",
        text: "Follow the safety and supervision plan you submitted. Report any incident to CIEL PK right away.",
    },
];

/** Appends a template line, skipping it when the text already contains it. */
export function appendInstruction(current: string, line: string): string {
    if (current.includes(line)) return current;
    const base = current.replace(/\s+$/, "");
    const next = base ? `${base}\n${line}` : line;
    return next.slice(0, APPROVAL_INSTRUCTIONS_MAX);
}

type Props = {
    value: string;
    onChange: (next: string) => void;
    disabled?: boolean;
};

/** Optional note sent to the opportunity creator together with the CIEL PK approval. */
export default function ApprovalInstructionsField({ value, onChange, disabled = false }: Props) {
    return (
        <div>
            <label htmlFor="approval-instructions" className="block text-sm font-bold text-slate-700">
                Instructions for the creator <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <p className="mt-0.5 text-xs text-slate-500">
                Sent with the approval email and in-app notification, and saved in the approval history.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
                {APPROVAL_INSTRUCTION_TEMPLATES.map((t) => {
                    const added = value.includes(t.text);
                    return (
                        <button
                            key={t.label}
                            type="button"
                            disabled={disabled || added}
                            onClick={() => onChange(appendInstruction(value, t.text))}
                            title={t.text}
                            className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-100 disabled:cursor-default disabled:opacity-50"
                        >
                            {added ? "✓" : "+"} {t.label}
                        </button>
                    );
                })}
            </div>
            <textarea
                id="approval-instructions"
                spellCheck
                disabled={disabled}
                value={value}
                maxLength={APPROVAL_INSTRUCTIONS_MAX}
                onChange={(e) => onChange(e.target.value)}
                rows={5}
                placeholder="e.g. Start your report this week and share the session schedule with the partner…"
                className="mt-2 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-50"
            />
            <p className="mt-1 text-right text-[11px] text-slate-400">
                {value.length}/{APPROVAL_INSTRUCTIONS_MAX}
            </p>
        </div>
    );
}
