"use client";

import clsx from "clsx";

export const vsField =
    "w-full rounded-[11px] border border-[#e5e7eb] bg-[#fbfcfe] px-3 py-2.5 text-sm text-[#1e293b] outline-none focus:border-[#a63d65] focus:shadow-[0_0_0_3px_rgba(166,61,101,.1)]";
export const vsLabel = "mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.055em] text-[#71788a]";

export function VsField({
    label,
    hint,
    tag,
    optional,
    children,
    className,
    term,
    onTerm,
}: {
    label: string;
    hint?: string;
    tag?: "core" | "required";
    optional?: boolean;
    children: React.ReactNode;
    className?: string;
    term?: string;
    onTerm?: (key: string) => void;
}) {
    return (
        <div className={clsx("mb-3", className)}>
            <label className={vsLabel}>
                {label}
                {term && onTerm ? (
                    <button
                        type="button"
                        className="ml-1 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-[#a63d65] bg-white align-middle text-[11px] font-black text-[#a63d65] hover:bg-[#a63d65] hover:text-white"
                        onClick={() => onTerm(term)}
                        aria-label="Explain this term"
                    >
                        ?
                    </button>
                ) : null}
                {tag === "required" ? (
                    <span className="ml-1.5 rounded-full bg-[#f8e8ef] px-1.5 py-0.5 text-[9px] font-black normal-case tracking-normal text-[#8b3155]">
                        required
                    </span>
                ) : tag === "core" ? (
                    <span className="ml-1.5 rounded-full bg-[#f8e8ef] px-1.5 py-0.5 text-[9px] font-black normal-case tracking-normal text-[#8b3155]">
                        core
                    </span>
                ) : null}
                {optional ? (
                    <span className="ml-1 text-[9px] font-extrabold normal-case tracking-normal text-[#9a8293]">optional</span>
                ) : null}
            </label>
            {children}
            {hint ? <p className="mt-1 text-[11.5px] leading-snug text-[#6b7280]">{hint}</p> : null}
        </div>
    );
}

export function VsNotice({
    children,
    tone = "amber",
}: {
    children: React.ReactNode;
    tone?: "amber" | "green" | "blue" | "rose";
}) {
    const cls =
        tone === "green"
            ? "bg-[#fff2d7] border-[#c8e8d0] text-[#25683a]"
            : tone === "blue"
              ? "bg-[#f4eaf1] border-[#d5e3ff] text-[#2856a3]"
              : tone === "rose"
                ? "bg-[#f8eef4] border-[#e2c7d7] text-[#603449]"
                : "bg-[#fff3dc] border-[#f2dfa6] text-[#805b13]";
    return <div className={clsx("my-2.5 rounded-[13px] border px-3.5 py-3 text-[12px] leading-relaxed", cls)}>{children}</div>;
}

export function VsWhy({ icon, children }: { icon: string; children: React.ReactNode }) {
    return (
        <div className="mb-4 flex gap-2.5 rounded-[14px] border border-[#d8ebf7] bg-[#eef8ff] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#294a62]">
            <span className="text-xl">{icon}</span>
            <div>{children}</div>
        </div>
    );
}

export function VsAiBox({ title, text, empty }: { title: string; text: string; empty: string }) {
    return (
        <div className="mt-4 rounded-[14px] border-[1.5px] border-[#dccdf6] bg-[#f8f4ff] px-3.5 py-3">
            <div className="mb-1.5 text-[10.5px] font-black uppercase tracking-wide text-[#7d3c78]">{title}</div>
            <div className={clsx("text-[12.5px] leading-relaxed", text ? "text-[#3c4354]" : "text-[#9c93ad]")}>{text || empty}</div>
        </div>
    );
}

export function VsChip({
    label,
    selected,
    onClick,
    warn,
}: {
    label: string;
    selected: boolean;
    onClick: () => void;
    warn?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={clsx(
                "rounded-full border px-3 py-2 text-xs font-bold",
                selected
                    ? warn
                        ? "border-[#e7c46f] bg-[#fff3dc] text-[#8a5a00]"
                        : "border-[#a63d65] bg-[#f8e8ef] text-[#087657]"
                    : "border-[#e5e7eb] bg-white text-[#5e6473]",
            )}
        >
            {label}
        </button>
    );
}

export function VsChips({
    options,
    selected,
    onToggle,
    warn,
    otherKey,
    otherValue,
    onOther,
}: {
    options: string[];
    selected: string[];
    onToggle: (v: string) => void;
    warn?: string[];
    otherKey?: string;
    otherValue?: string;
    onOther?: (v: string) => void;
}) {
    const otherOn = otherKey ? selected.includes(otherKey) : false;
    return (
        <div>
            <div className="flex flex-wrap gap-1.5">
                {options.map((opt) => (
                    <VsChip
                        key={opt}
                        label={opt}
                        selected={selected.includes(opt)}
                        warn={warn?.includes(opt)}
                        onClick={() => onToggle(opt)}
                    />
                ))}
            </div>
            {otherOn && onOther ? (
                <input className={clsx(vsField, "mt-2")} value={otherValue ?? ""} onChange={(e) => onOther(e.target.value)} placeholder="Describe other…" />
            ) : null}
        </div>
    );
}

export function VsChoice({
    emoji,
    title,
    blurb,
    selected,
    onClick,
}: {
    emoji: string;
    title: string;
    blurb: string;
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={clsx(
                "min-h-[91px] rounded-[15px] border-2 p-3 text-left transition hover:-translate-y-px",
                selected ? "border-[#a63d65] bg-[#f8e8ef]" : "border-[#e5e7eb] bg-white hover:border-[#bee8d9]",
            )}
        >
            <span className="text-2xl">{emoji}</span>
            <b className="mt-1.5 block text-[13px]">{title}</b>
            <span className="block text-[11px] leading-snug text-[#6b7280]">{blurb}</span>
        </button>
    );
}

export function VsUnit({
    value,
    onChange,
    unit,
    placeholder,
    min,
    max,
    step,
}: {
    value: number | undefined;
    onChange: (n: number | undefined) => void;
    unit: string;
    placeholder?: string;
    min?: number;
    max?: number;
    step?: number;
}) {
    return (
        <div className="flex overflow-hidden rounded-[11px] border border-[#e5e7eb] bg-[#fbfafc] focus-within:border-[#a63d65] focus-within:shadow-[0_0_0_3px_rgba(166,61,101,.1)]">
            <input
                type="number"
                min={min}
                max={max}
                step={step}
                placeholder={placeholder}
                value={value ?? ""}
                onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") return onChange(undefined);
                    const n = e.target.valueAsNumber;
                    onChange(Number.isFinite(n) ? n : undefined);
                }}
                className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm outline-none"
            />
            <span className="flex items-center whitespace-nowrap border-l border-[#e5e7eb] bg-[#f4eef2] px-2.5 text-[10.5px] font-extrabold text-[#6c5268]">
                {unit}
            </span>
        </div>
    );
}

export function VsSelectOther({
    value,
    options,
    onChange,
    placeholder,
}: {
    value: string;
    options: string[];
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    const listed = options.includes(value) && value !== "Other";
    const selectValue = !value ? "" : listed ? value : "Other";
    const other = listed || !value ? "" : value;
    return (
        <div>
            <select className={vsField} value={selectValue} onChange={(e) => onChange(e.target.value === "Other" ? (other || "Other") : e.target.value)}>
                <option value="">{placeholder || "Choose…"}</option>
                {options.map((o) => (
                    <option key={o} value={o}>
                        {o}
                    </option>
                ))}
            </select>
            {selectValue === "Other" ? (
                <input
                    className={clsx(vsField, "mt-2")}
                    value={other === "Other" ? "" : other}
                    onChange={(e) => onChange(e.target.value || "Other")}
                    placeholder="Type other…"
                />
            ) : null}
        </div>
    );
}

export function VsNav({
    onBack,
    onNext,
    nextLabel,
    saving,
    hideBack,
}: {
    onBack?: () => void;
    onNext: () => void;
    nextLabel: string;
    saving?: boolean;
    hideBack?: boolean;
}) {
    return (
        <div className="mt-4 flex items-center justify-between gap-2.5">
            {hideBack ? (
                <span />
            ) : (
                <button
                    type="button"
                    onClick={onBack}
                    className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-[13px] font-extrabold text-[#6b7280]"
                >
                    ← Back
                </button>
            )}
            <button
                type="button"
                disabled={saving}
                onClick={onNext}
                className="rounded-xl bg-[#a63d65] px-4 py-3 text-[13px] font-extrabold text-white disabled:opacity-50"
            >
                {saving ? "Saving…" : nextLabel}
            </button>
        </div>
    );
}

export function toggleChip(list: string[] | undefined, v: string) {
    const cur = list ?? [];
    return cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
}

export function VsExplain({ summary, children }: { summary: string; children: React.ReactNode }) {
    return (
        <details className="my-3 overflow-hidden rounded-[14px] border border-[#ead9e2] bg-[#fdf7fa]">
            <summary className="cursor-pointer list-none px-3.5 py-2.5 text-[12.5px] font-extrabold text-[#7d2b4d] marker:content-none [&::-webkit-details-marker]:hidden">
                {summary}
            </summary>
            <div className="px-3.5 pb-3.5 text-[12.5px] leading-relaxed text-[#4b3a45]">{children}</div>
        </details>
    );
}

export function VsEx({ children }: { children: React.ReactNode }) {
    return <div className="mt-1.5 rounded-lg border-l-[3px] border-[#a63d65] bg-white px-2.5 py-2 text-[#5b3d50]">{children}</div>;
}

export function VsTerm({ term, onTerm, children }: { term: string; onTerm: (k: string) => void; children: React.ReactNode }) {
    return (
        <button type="button" className="cursor-help border-b-[1.5px] border-dotted border-[#a63d65] font-bold text-[#7d2b4d]" onClick={() => onTerm(term)}>
            {children}
        </button>
    );
}

export function VsCalc({ children, tone = "ok" }: { children: React.ReactNode; tone?: "ok" | "warn" | "bad" }) {
    const cls =
        tone === "bad"
            ? "bg-[#fff0f2] border-[#efc3ca] text-[#8a2c3b]"
            : tone === "warn"
              ? "bg-[#fff3dc] border-[#eed9a5] text-[#7b5314]"
              : "bg-[#f3f7f4] border-[#cfe3d6] text-[#2b5b41]";
    return <div className={clsx("my-2 rounded-[11px] border px-3 py-2.5 text-xs leading-relaxed", cls)}>{children}</div>;
}
