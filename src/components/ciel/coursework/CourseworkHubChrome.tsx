"use client";

import Link from "next/link";

const FACULTY_HERO_GRADIENT = "linear-gradient(120deg,#0a4c50 0%,#0e6e6b 56%,#12aaa0 100%)";

export function CourseworkCrumb({
    role,
    view,
    pathLabel = "Coursework",
}: {
    role: string;
    view?: string;
    pathLabel?: string;
}) {
    return (
        <p className="text-[13px] text-[#71828e]">
            {role} Dashboard / <b className="font-semibold text-[#183140]">{pathLabel}</b>
            {view ? (
                <>
                    {" / "}
                    <b className="font-semibold text-[#183140]">{view}</b>
                </>
            ) : null}
        </p>
    );
}

export function CourseworkHero({
    kicker,
    title,
    subtitle,
    gradient = FACULTY_HERO_GRADIENT,
    stats,
    rightStat,
}: {
    kicker: string;
    title: string;
    subtitle: string;
    gradient?: string;
    stats: { value: string; label: string }[];
    rightStat?: { value: string; label: string };
}) {
    return (
        <div
            className="relative mt-4 flex flex-col items-start justify-between gap-6 overflow-hidden rounded-b-[34px] px-[34px] py-[27px] text-white shadow-[0_16px_36px_rgba(18,48,65,.10)] sm:flex-row sm:items-center"
            style={{ background: gradient }}
        >
            <div className="pointer-events-none absolute -right-20 -top-24 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.12),rgba(255,255,255,0)_67%)]" />
            <div className="relative min-w-0">
                <p className="text-[11px] font-black tracking-[0.13em] text-white/80">{kicker}</p>
                <h1 className="mt-1.5 text-[1.7rem] font-semibold leading-tight tracking-tight sm:text-[31px]">{title}</h1>
                <p className="mt-2 max-w-[640px] text-sm leading-relaxed text-[#d9fbf6]">{subtitle}</p>
                {stats.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-3">
                        {stats.map((s) => (
                            <div key={s.label} className="min-w-[150px] rounded-[17px] border border-white/22 bg-white/8 px-[18px] py-3.5">
                                <div className="text-[19px] font-semibold">{s.value}</div>
                                <div className="mt-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#a8fff0]">{s.label}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {rightStat ? (
                <div className="relative min-w-[180px] shrink-0 text-right">
                    <div className="text-[48px] font-[950] leading-none">{rightStat.value}</div>
                    <small className="mt-1 block text-[13px] text-[#c7e8e4]">{rightStat.label}</small>
                </div>
            ) : null}
        </div>
    );
}

export function PathSectionHead({
    title,
    subtitle,
    pill,
    compact = false,
}: {
    title: string;
    subtitle?: string;
    pill?: string;
    compact?: boolean;
}) {
    return (
        <div className={`${compact ? "mb-3" : "mt-6 mb-3.5"} flex flex-wrap items-end justify-between gap-4`}>
            <div>
                <h3 className={`${compact ? "text-base" : "text-xl"} font-semibold text-[#183140]`}>{title}</h3>
                {subtitle ? <p className="mt-1 text-xs text-[#71828e]">{subtitle}</p> : null}
            </div>
            {pill ? (
                <span className="whitespace-nowrap rounded-full bg-[#e7f7f3] px-3 py-2 text-[11px] font-black text-[#08756b]">
                    {pill}
                </span>
            ) : null}
        </div>
    );
}

export function ActionKpiGrid({ items }: { items: { value: string; label: string }[] }) {
    return (
        <div className="mt-4 rounded-[20px] border border-[#dce6ea] bg-white px-5 py-[18px] shadow-[0_8px_24px_rgba(18,48,65,.05)]">
            <PathSectionHead title="Action Required" subtitle="Items that need attention in this path." compact />
            <div className="mt-1 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {items.map((item) => (
                    <div key={item.label} className="rounded-[15px] border border-[#e7edf0] bg-[#f7fafb] p-[15px]">
                        <strong className="block text-[22px] font-semibold text-[#183140]">{item.value}</strong>
                        <span className="mt-1 block text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#71828e]">
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function WorkflowSteps({
    title,
    subtitle,
    steps,
    activeIndex = 1,
}: {
    title: string;
    subtitle?: string;
    steps: string[];
    activeIndex?: number;
}) {
    return (
        <div className="mt-4 rounded-[20px] border border-[#dce6ea] bg-white px-5 py-[18px] shadow-[0_8px_24px_rgba(18,48,65,.05)]">
            <PathSectionHead title={title} subtitle={subtitle} compact />
            <div className="mt-1 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
                {steps.map((step, i) => {
                    const done = i < activeIndex;
                    const active = i === activeIndex;
                    return (
                        <div
                            key={step}
                            className={
                                "min-h-[74px] rounded-xl border px-3 py-2.5 " +
                                (done
                                    ? "border-[#cceee4] bg-[#ebf8f4]"
                                    : active
                                      ? "border-[#f6d58d] bg-[#fff8e8]"
                                      : "border-[#e6edf0] bg-[#f6f9fa] opacity-70")
                            }
                        >
                            <strong className="block text-[11px] font-semibold text-[#183140]">
                                {i + 1}. {step}
                            </strong>
                            <span className="mt-1 block text-[10px] leading-snug text-[#71828e]">
                                {done || active ? "Current review cycle" : "Next stage after approval"}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function PathFilterBar({
    filters,
    active,
    onChange,
}: {
    filters: string[];
    active: string;
    onChange: (filter: string) => void;
}) {
    return (
        <div className="mb-3.5 flex flex-wrap gap-2">
            {filters.map((filter) => (
                <button
                    key={filter}
                    type="button"
                    onClick={() => onChange(filter)}
                    className={
                        "rounded-[10px] border px-3 py-2 text-[11px] font-extrabold " +
                        (active === filter
                            ? "border-[#cbece4] bg-[#e8f7f3] text-[#08756b]"
                            : "border-[#dce6ea] bg-white text-[#52636e]")
                    }
                >
                    {filter}
                </button>
            ))}
        </div>
    );
}

export function HubBackButton({ href, onClick, label = "← Back" }: { href?: string; onClick?: () => void; label?: string }) {
    const className =
        "mb-3 rounded-full border border-[#dcebee] bg-white px-4 py-2 text-[11px] font-extrabold text-[#0e7d74] hover:border-[#0e7d74]";
    if (href) {
        return (
            <Link href={href} className={`inline-block ${className}`}>
                {label}
            </Link>
        );
    }
    return (
        <button type="button" onClick={onClick} className={className}>
            {label}
        </button>
    );
}

export function HubTile({
    href,
    onClick,
    disabled,
    badge,
    badgeClass = "text-[#0d2b33]",
    emoji,
    title,
    subtitle,
    background,
    className = "",
}: {
    href?: string;
    onClick?: () => void;
    disabled?: boolean;
    badge: string;
    badgeClass?: string;
    emoji: string;
    title: string;
    subtitle: string;
    background: string;
    className?: string;
}) {
    const shared = `relative flex min-h-[175px] flex-col overflow-hidden rounded-[22px] p-6 text-left text-white shadow-[0_16px_36px_rgba(18,48,65,.10)] transition duration-150 hover:-translate-y-[3px] hover:shadow-[0_20px_40px_rgba(18,48,65,.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e7d74] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 ${className}`;
    const inner = (
        <>
            <span
                className={`absolute right-[18px] top-4 z-10 rounded-full bg-white px-3 py-1.5 text-[9px] font-black tracking-wide ${badgeClass}`}
            >
                {badge}
            </span>
            <span className="mb-5 text-[31px] leading-none">{emoji}</span>
            <span className="pr-24 text-xl font-semibold">{title}</span>
            <span className="mt-2 max-w-[86%] text-xs leading-relaxed text-white/92">{subtitle}</span>
            <span className="pointer-events-none absolute -bottom-5 -right-3 text-[80px] opacity-15" aria-hidden>
                {emoji}
            </span>
        </>
    );
    if (href && !disabled) {
        return (
            <Link href={href} style={{ background }} className={shared}>
                {inner}
            </Link>
        );
    }
    return (
        <button type="button" onClick={onClick} disabled={disabled} style={{ background }} className={shared}>
            {inner}
        </button>
    );
}
