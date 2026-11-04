"use client";

import { QUICK_WORK_MAX_SDGS, SDG_NAMES, sdgChip } from "@/utils/quickWorkRules";

/**
 * Picks the Sustainable Development Goals an activity supports: up to five, shown as removable chips.
 * The first chip is the main goal; any other can be made the main one. `goals` holds goal numbers as
 * strings ("3"), main first, and `onChange` always gets the whole new list.
 */
export default function QuickSdgPicker({
    id,
    goals,
    onChange,
    selectClassName,
}: {
    id: string;
    goals: string[];
    onChange: (goals: string[]) => void;
    selectClassName: string;
}) {
    const full = goals.length >= QUICK_WORK_MAX_SDGS;
    const remaining = SDG_NAMES.map((_, i) => String(i + 1)).filter((n) => !goals.includes(n));
    return (
        <div>
            {goals.length ? (
                <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="Selected SDGs">
                    {goals.map((g, i) => {
                        const c = sdgChip(Number(g));
                        return (
                            <li key={g} className="inline-flex items-center gap-1.5 rounded-full border border-[#dcebee] bg-white py-1 pl-1 pr-2 text-xs">
                                <span
                                    className="grid h-5 w-5 flex-none place-items-center rounded-full text-[10px] font-extrabold text-white"
                                    style={{ background: c.color }}
                                    aria-hidden
                                >
                                    {c.n}
                                </span>
                                <span className="max-w-[190px] truncate" title={c.label}>
                                    {c.name}
                                </span>
                                {i === 0 ? (
                                    <span className="rounded bg-[#e6f6f4] px-1.5 py-0.5 text-[10px] font-bold text-[#0e7d74]">Main</span>
                                ) : (
                                    <button
                                        type="button"
                                        className="text-[10px] font-semibold text-[#0e7d74] underline"
                                        aria-label={`Make SDG ${c.n} the main goal`}
                                        onClick={() => onChange([g, ...goals.filter((x) => x !== g)])}
                                    >
                                        Make main
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="text-sm leading-none text-[#6b7c86] hover:text-[#ac3c3c]"
                                    aria-label={`Remove SDG ${c.n}`}
                                    onClick={() => onChange(goals.filter((x) => x !== g))}
                                >
                                    ×
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ) : null}
            <select
                id={id}
                className={selectClassName}
                value=""
                disabled={full}
                onChange={(e) => {
                    if (e.target.value) onChange([...goals, e.target.value]);
                }}
            >
                <option value="">{full ? `You have chosen ${QUICK_WORK_MAX_SDGS} SDGs` : goals.length ? "Add another SDG" : "Select if relevant"}</option>
                {remaining.map((n) => (
                    <option key={n} value={n}>
                        {n} · {SDG_NAMES[Number(n) - 1]}
                    </option>
                ))}
            </select>
            <p className="mt-1 text-[11px] text-[#6b7c86]">
                Choose up to {QUICK_WORK_MAX_SDGS}. The first is the main goal; use “Make main” to change it.
            </p>
        </div>
    );
}
