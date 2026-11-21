"use client";

import Link from "next/link";
import { STAKEHOLDER_NAV, type StakeholderNavRole } from "@/utils/stakeholderNav";
import { MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";

export type HomeCardState = {
    /** Items waiting on the person behind this button: red blinking pill + ring. */
    count?: number;
    /** Amber badge without a count (something changed, nothing is blocked). */
    hot?: boolean;
    /** Replaces the default badge text ("3 VERIFIED", "OPEN", …). */
    badge?: string;
    /** Singular noun for the alert pill (default "item"). */
    countLabel?: string;
};

/**
 * The recommended home-screen cards from the Final Stakeholder Dashboard Structure: one card per
 * main button, with its sub-buttons opening inside the card. Every stakeholder home renders this
 * once instead of its own grid, so the same button always leads to the same screen.
 */
export default function StakeholderHomeCards({
    role,
    states,
    title = "Community Service",
    subtitle,
    hideHeading,
}: {
    role: StakeholderNavRole;
    states?: Partial<Record<string, HomeCardState>>;
    title?: string;
    subtitle?: string;
    hideHeading?: boolean;
}) {
    const nav = STAKEHOLDER_NAV[role];
    return (
        <section aria-label={`${nav.title} · main buttons`} data-testid={`stakeholder-home-cards-${role}`}>
            {hideHeading ? null : (
                <MockupSectionHead title={title} subtitle={subtitle ?? nav.purpose} />
            )}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                {nav.mainButtons.map((main) => {
                    const state = states?.[main.key];
                    const count = typeof state?.count === "number" && Number.isFinite(state.count) && state.count > 0 ? Math.floor(state.count) : 0;
                    const noun = (state?.countLabel || "item").trim();
                    const alertText = `${count} ${noun}${count === 1 ? "" : "s"}`.toUpperCase();
                    const badge = state?.badge || (count ? "ACTION" : "OPEN");
                    const hot = Boolean(state?.hot) || count > 0;
                    return (
                        <article
                            key={main.key}
                            style={{ background: main.background }}
                            className={`relative flex min-h-[180px] flex-col overflow-hidden rounded-[24px] px-4 py-4 text-white shadow-[0_7px_15px_rgba(23,49,57,.08)] transition duration-[220ms] hover:-translate-y-[3px] hover:shadow-[0_14px_24px_rgba(23,49,57,.13)] sm:px-[22px] sm:py-5 ${count ? "ring-2 ring-[#ff5a5f]/70 ring-offset-2 ring-offset-white" : ""}`}
                            data-main-button={main.key}
                        >
                            <span className="absolute right-4 top-3.5 flex items-center gap-1.5">
                                {count ? (
                                    <span
                                        role="status"
                                        aria-live="polite"
                                        className="inline-flex animate-pulse items-center gap-1.5 rounded-[18px] bg-[#ff3b30] px-2.5 py-1.5 text-[9.5px] font-[950] tracking-[0.04em] text-white shadow-[0_0_0_3px_rgba(255,59,48,.25)] motion-reduce:animate-none"
                                    >
                                        <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
                                        {alertText}
                                    </span>
                                ) : null}
                                <span
                                    className={`rounded-[18px] px-2.5 py-1.5 text-[9.5px] font-[950] tracking-[0.04em] ${
                                        hot ? "bg-[#ffe7b3] text-[#7a4b00]" : "bg-white text-[#0e756e]"
                                    }`}
                                >
                                    {badge}
                                </span>
                            </span>
                            <span className="mb-3 block text-[29px] leading-none" aria-hidden>
                                {main.emoji}
                            </span>
                            <h3 className="m-0 pr-20 text-[18px] font-[950] leading-tight sm:pr-24 sm:text-[21px]">
                                <Link
                                    href={main.href}
                                    className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 hover:underline"
                                >
                                    {main.label}
                                </Link>
                            </h3>
                            <p className="mt-1.5 text-[12px] leading-[1.45] text-white/90 sm:text-[12.5px]">{main.description}</p>
                            <ul className="relative z-[1] mt-auto flex flex-wrap gap-1.5 pt-4" aria-label={`${main.label} · sub-buttons`}>
                                {main.subButtons.map((sub) => (
                                    <li key={sub.href + sub.label}>
                                        <Link
                                            href={sub.href}
                                            title={sub.hint}
                                            className="inline-flex items-center rounded-full border border-white/35 bg-white/15 px-3 py-1.5 text-[11px] font-extrabold text-white backdrop-blur-[2px] transition hover:bg-white hover:text-[#0e4d4e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                                        >
                                            {sub.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                            <span className="pointer-events-none absolute -bottom-6 -right-2 rotate-[-7deg] text-[92px] opacity-10" aria-hidden>
                                {main.emoji}
                            </span>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
