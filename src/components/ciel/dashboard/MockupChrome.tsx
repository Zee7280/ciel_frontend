"use client";

import type { ReactNode } from "react";
import Link from "next/link";

export const MOCKUP_GRADIENTS = {
    teal: "linear-gradient(135deg,#15988b,#2ec8bd)",
    blue: "linear-gradient(135deg,#16798c,#38b8e6)",
    orange: "linear-gradient(135deg,#c76000,#f59a00)",
    purple: "linear-gradient(135deg,#6b2bd9,#9f78ef)",
    green: "linear-gradient(135deg,#0e4d4e,#117669)",
    pink: "linear-gradient(135deg,#b74986,#e47fb3)",
    navy: "linear-gradient(135deg,#183b56,#286786)",
    gold: "linear-gradient(135deg,#a67516,#d5aa46)",
    red: "linear-gradient(135deg,#a33d49,#d7626a)",
} as const;

export const COMMAND_HERO = "linear-gradient(120deg,#073b42,#11978f)";
export const FACULTY_HERO = "linear-gradient(120deg,#0a4c50 0%,#0e6e6b 56%,#12aaa0 100%)";

export function MockupHero({
    kicker,
    title,
    subtitle,
    stats,
    rightStat,
    gradient = COMMAND_HERO,
}: {
    kicker?: string;
    title: string;
    subtitle: string;
    stats: { value: string; label: string }[];
    rightStat?: { value: string; label: string };
    gradient?: string;
}) {
    return (
        <section
            className="relative mt-[-8px] flex flex-col items-start justify-between gap-7 overflow-hidden rounded-b-[34px] px-[34px] py-[27px] text-white shadow-[0_12px_30px_rgba(13,61,70,.10)] sm:flex-row sm:items-center"
            style={{
                minHeight: 175,
                background: `radial-gradient(circle at 92% 15%, rgba(255,255,255,.10) 0 17px, transparent 18px), radial-gradient(circle at 84% 8%, rgba(255,255,255,.06) 0 10px, transparent 11px), ${gradient}`,
            }}
        >
            <div className="relative min-w-0">
                {kicker ? (
                    <p className="text-[11px] font-black tracking-[0.13em] text-white/80">{kicker}</p>
                ) : null}
                <h1 className="m-0 text-[31px] font-[950] leading-tight tracking-tight">{title}</h1>
                <p className="mt-1.5 max-w-[850px] text-sm leading-[1.55] text-[#d9f0ef]">{subtitle}</p>
                {stats.length > 0 ? (
                    <div className="mt-5 flex flex-wrap gap-3">
                        {stats.map((s) => (
                            <div
                                key={s.label}
                                className="min-w-[130px] rounded-[17px] border border-white/25 bg-white/8 px-4 py-3.5"
                            >
                                <strong className="block text-[21px] font-semibold">{s.value}</strong>
                                <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.08em] text-[#9df2df]">
                                    {s.label}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
            {rightStat ? (
                <div className="relative min-w-[240px] shrink-0 text-right">
                    <div className="text-[48px] font-[950] leading-none">{rightStat.value}</div>
                    <small className="mt-1 block text-[13px] text-[#c7e8e4]">{rightStat.label}</small>
                </div>
            ) : null}
        </section>
    );
}

export function MockupSectionHead({
    title,
    subtitle,
    action,
}: {
    title: string;
    subtitle?: string;
    action?: ReactNode;
}) {
    return (
        <div className="mb-3.5 mt-[23px] flex flex-wrap items-end justify-between gap-5">
            <div>
                <h2 className="m-0 text-[21px] font-semibold text-[#16313d]">{title}</h2>
                {subtitle ? <p className="mt-1 text-[12.5px] text-[#70808a]">{subtitle}</p> : null}
            </div>
            {action}
        </div>
    );
}

export function MockupActionCard({
    href,
    onClick,
    emoji,
    ghost,
    title,
    subtitle,
    badge,
    background,
    locked,
    full,
}: {
    href?: string;
    onClick?: () => void;
    emoji: string;
    ghost?: string;
    title: string;
    subtitle: string;
    badge: string;
    background: string;
    locked?: boolean;
    full?: boolean;
}) {
    const className = `relative min-h-[170px] overflow-hidden rounded-[28px] px-6 py-[22px] text-left text-white shadow-[0_7px_15px_rgba(23,49,57,.08)] transition duration-[220ms] hover:-translate-y-[3px] hover:shadow-[0_14px_24px_rgba(23,49,57,.13)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15988b] ${full ? "sm:col-span-2" : ""} ${locked ? "after:absolute after:bottom-3.5 after:left-[22px] after:text-[9px] after:font-[950] after:tracking-[0.08em] after:text-white/80 after:content-['SUBSCRIPTION']" : ""}`;
    const inner = (
        <>
            <span className="absolute right-[17px] top-[15px] rounded-[18px] bg-white px-3 py-[7px] text-[9.5px] font-[950] tracking-[0.04em] text-[#0e756e]">
                {badge}
            </span>
            <span className="mb-[18px] block text-[29px] leading-none">{emoji}</span>
            <h3 className="m-0 pr-24 text-[21px] font-[950] leading-tight">{title}</h3>
            <p className="mt-1.5 max-w-[78%] text-[12.5px] leading-[1.45] text-white/90">{subtitle}</p>
            <span
                className="pointer-events-none absolute -bottom-6 -right-2 rotate-[-7deg] text-[92px] opacity-10"
                aria-hidden
            >
                {ghost || emoji}
            </span>
        </>
    );
    if (href) {
        return (
            <Link href={href} style={{ background }} className={className}>
                {inner}
            </Link>
        );
    }
    return (
        <button type="button" onClick={onClick} style={{ background }} className={`w-full ${className}`}>
            {inner}
        </button>
    );
}

export function MockupKpiGrid({
    items,
}: {
    items: { label: string; value: string; hint?: string }[];
}) {
    return (
        <div className="grid grid-cols-2 gap-[11px] xl:grid-cols-4">
            {items.map((item) => (
                <div key={item.label} className="rounded-[15px] border border-[#dde5ea] bg-white p-3.5">
                    <span className="text-[9px] font-black tracking-[0.05em] text-[#70808a]">{item.label}</span>
                    <strong className="mt-1.5 block text-2xl font-semibold text-[#16313d]">{item.value}</strong>
                    {item.hint ? <small className="text-[10px] text-[#18806a]">{item.hint}</small> : null}
                </div>
            ))}
        </div>
    );
}

export function MockupPanel({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle?: string;
    children: ReactNode;
}) {
    return (
        <section className="mt-4 overflow-hidden rounded-[22px] border border-[#dde5ea] bg-white shadow-[0_8px_22px_rgba(24,52,64,.05)]">
            <div className="border-b border-[#dde5ea] px-5 py-4">
                <h3 className="m-0 text-base font-semibold text-[#16313d]">{title}</h3>
                {subtitle ? <p className="mt-1 text-xs text-[#70808a]">{subtitle}</p> : null}
            </div>
            <div className="p-4">{children}</div>
        </section>
    );
}

export function MockupStatBars({
    title,
    rows,
}: {
    title: string;
    rows: { label: string; pct: number }[];
}) {
    return (
        <div className="rounded-[16px] border border-[#dde5ea] bg-[#f7fafb] p-4">
            <h4 className="m-0 text-sm font-semibold text-[#16313d]">{title}</h4>
            <div className="mt-3 space-y-3">
                {rows.map((row) => (
                    <div key={row.label}>
                        <div className="text-[11px] font-bold text-[#435660]">
                            {row.label} — {row.pct}%
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#e6eef1]">
                            <div className="h-full rounded-full bg-[#15988b]" style={{ width: `${Math.max(0, Math.min(100, row.pct))}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
