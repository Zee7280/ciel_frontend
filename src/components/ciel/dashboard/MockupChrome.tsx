"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRegisterDashboardPageChrome } from "@/components/ciel/dashboard/DashboardChromeContext";

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
    slate: "linear-gradient(135deg,#5c6f80,#34495e)",
} as const;

export const COMMAND_HERO = "linear-gradient(120deg,#073b42,#11978f)";
export const FACULTY_HERO = "linear-gradient(120deg,#0a4c50 0%,#0e6e6b 56%,#12aaa0 100%)";

export function MockupHero({
    kicker,
    title,
    subtitle,
    stats,
    rightStat,
    badge,
    gradient = COMMAND_HERO,
}: {
    kicker?: string;
    title: string;
    subtitle: string;
    stats: { value: string; label: string; href?: string }[];
    rightStat?: { value: string; label: string };
    badge?: string;
    gradient?: string;
}) {
    useRegisterDashboardPageChrome();
    return (
        <section
            className="relative mt-2 flex min-h-0 flex-col items-start justify-between gap-5 overflow-hidden rounded-[22px] px-4 py-5 text-white shadow-[0_12px_30px_rgba(13,61,70,.10)] sm:min-h-[175px] sm:flex-row sm:items-center sm:gap-7 sm:px-[34px] sm:py-[27px]"
            style={{
                background: `radial-gradient(circle at 92% 15%, rgba(255,255,255,.10) 0 17px, transparent 18px), radial-gradient(circle at 84% 8%, rgba(255,255,255,.06) 0 10px, transparent 11px), ${gradient}`,
            }}
        >
            {badge ? (
                <span className="absolute right-4 top-4 rounded-full border border-white/20 bg-white/14 px-3 py-1.5 text-[11px] font-bold tracking-wide sm:right-[34px] sm:top-[26px] sm:px-3.5 sm:py-2 sm:text-[12.5px]">
                    {badge}
                </span>
            ) : null}
            <div className="relative min-w-0 max-w-full">
                {kicker ? (
                    <p className="text-[10px] font-black tracking-[0.13em] text-white/80 sm:text-[11px]">{kicker}</p>
                ) : null}
                <h1 className="m-0 text-[22px] font-[950] leading-tight tracking-tight sm:text-[31px]">{title}</h1>
                <p className="mt-1.5 max-w-[850px] text-[13px] leading-[1.55] text-[#d9f0ef] sm:text-sm">{subtitle}</p>
                {stats.length > 0 ? (
                    <div className="mt-4 flex w-full min-w-0 flex-wrap gap-2.5 sm:mt-5 sm:gap-3">
                        {stats.map((s) => {
                            const inner = (
                                <>
                                    <strong className="block text-[18px] font-semibold sm:text-[21px]">{s.value}</strong>
                                    <span className="mt-1 block text-[8.5px] font-black uppercase tracking-[0.08em] text-[#9df2df] sm:text-[9px]">
                                        {s.label}
                                    </span>
                                </>
                            );
                            const className = "min-w-[108px] flex-1 rounded-[17px] border border-white/25 bg-white/8 px-3 py-3 text-left text-white sm:min-w-[130px] sm:flex-none sm:px-4 sm:py-3.5";
                            return s.href ? (
                                <Link key={s.label} href={s.href} className={`${className} transition hover:bg-white/14`}>
                                    {inner}
                                </Link>
                            ) : (
                                <div key={s.label} className={className}>
                                    {inner}
                                </div>
                            );
                        })}
                    </div>
                ) : null}
            </div>
            {rightStat ? (
                <div className="relative w-full min-w-0 shrink-0 text-left sm:w-auto sm:min-w-[180px] sm:text-right">
                    <div className="text-[36px] font-[950] leading-none sm:text-[48px]">{rightStat.value}</div>
                    <small className="mt-1 block text-[12px] text-[#c7e8e4] sm:text-[13px]">{rightStat.label}</small>
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
        <div className="mb-3.5 mt-4 flex min-w-0 flex-wrap items-end justify-between gap-3 sm:mt-[23px] sm:gap-5">
            <div className="min-w-0">
                <h2 className="m-0 text-[18px] font-semibold text-[#16313d] sm:text-[21px]">{title}</h2>
                {subtitle ? <p className="mt-1 text-[12px] text-[#70808a] sm:text-[12.5px]">{subtitle}</p> : null}
            </div>
            {action ? <div className="min-w-0">{action}</div> : null}
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
    hot,
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
    hot?: boolean;
}) {
    const className = `relative min-h-[140px] overflow-hidden rounded-[24px] px-4 py-4 text-left text-white shadow-[0_7px_15px_rgba(23,49,57,.08)] transition duration-[220ms] hover:-translate-y-[3px] hover:shadow-[0_14px_24px_rgba(23,49,57,.13)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15988b] sm:min-h-[158px] sm:px-[22px] sm:py-5 ${full ? "sm:col-span-2" : ""} ${locked ? "after:absolute after:bottom-3.5 after:left-4 after:text-[9px] after:font-[950] after:tracking-[0.08em] after:text-white/80 after:content-['SUBSCRIPTION'] sm:after:left-[22px]" : ""}`;
    const inner = (
        <>
            <span
                className={`absolute right-4 top-3.5 rounded-[18px] px-2.5 py-1.5 text-[9.5px] font-[950] tracking-[0.04em] ${
                    hot ? "bg-[#ffe7b3] text-[#7a4b00]" : "bg-white text-[#0e756e]"
                }`}
            >
                {badge}
            </span>
            <span className="mb-[18px] block text-[29px] leading-none">{emoji}</span>
            <h3 className="m-0 pr-20 text-[18px] font-[950] leading-tight sm:pr-24 sm:text-[21px]">{title}</h3>
            <p className="mt-1.5 max-w-none text-[12px] leading-[1.45] text-white/90 sm:max-w-[78%] sm:text-[12.5px]">{subtitle}</p>
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
        <div className="grid grid-cols-1 gap-[11px] min-[380px]:grid-cols-2 xl:grid-cols-4">
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
        <section className="mt-4 min-w-0 overflow-hidden rounded-[22px] border border-[#dde5ea] bg-white shadow-[0_8px_22px_rgba(24,52,64,.05)]">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3.5 border-b border-[#dde5ea] px-4 py-4 sm:px-5 sm:py-[18px]">
                <div className="min-w-0">
                    <h3 className="m-0 text-[16px] font-semibold text-[#16313d] sm:text-[18px]">{title}</h3>
                    {subtitle ? <p className="mt-1 text-xs text-[#70808a]">{subtitle}</p> : null}
                </div>
            </div>
            <div className="min-w-0 p-3 sm:p-4">{children}</div>
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
