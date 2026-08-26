"use client";

import Link from "next/link";

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
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7a919a]">
            {role} Dashboard → <span className="text-[#0e7d74]">{pathLabel}</span>
            {view ? <> → {view}</> : null}
        </p>
    );
}

export function CourseworkHero({
    kicker,
    title,
    subtitle,
    gradient,
    stats,
}: {
    kicker: string;
    title: string;
    subtitle: string;
    gradient: string;
    stats: { value: string; label: string }[];
}) {
    return (
        <div className="relative mt-4 overflow-hidden rounded-[26px] px-7 py-6 text-white" style={{ background: gradient }}>
            <p className="text-[9.5px] font-extrabold tracking-[0.22em] text-white/80">{kicker}</p>
            <h1 className="mt-1.5 text-[23px] font-extrabold leading-tight">{title}</h1>
            <p className="mt-1 max-w-[640px] text-xs leading-relaxed text-white/90">{subtitle}</p>
            {stats.length > 0 && (
                <div className="mt-3.5 flex flex-wrap gap-2.5">
                    {stats.map((s) => (
                        <div key={s.label} className="min-w-[96px] rounded-[14px] border border-white/22 bg-white/10 px-4 py-2.5 text-center">
                            <div className="text-[15px] font-extrabold">{s.value}</div>
                            <div className="mt-0.5 text-[7px] font-extrabold tracking-[0.13em] text-white/85">{s.label}</div>
                        </div>
                    ))}
                </div>
            )}
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
    const shared = `relative flex min-h-[140px] flex-col overflow-hidden rounded-[22px] p-5 text-left text-white shadow-sm transition duration-150 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(13,43,51,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e7d74] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 ${className}`;
    const inner = (
        <>
            <span
                className={`absolute right-3.5 top-3 z-10 rounded-full bg-white px-2.5 py-1 text-[8px] font-extrabold tracking-wide shadow-sm ${badgeClass}`}
            >
                {badge}
            </span>
            <span className="text-[32px] leading-none">{emoji}</span>
            <span className="mt-2 pr-24 text-[15.5px] font-extrabold">{title}</span>
            <span className="mt-1 text-[10.5px] leading-relaxed opacity-85">{subtitle}</span>
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
