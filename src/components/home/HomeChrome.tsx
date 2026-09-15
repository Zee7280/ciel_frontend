import type { ReactNode } from "react";

/** Shared homepage look: one width, one type scale, teal/navy palette. */
export const homeWrap = "mx-auto max-w-[1200px]";
export const homeSectionMint = "scroll-mt-24 bg-[#F5FAF9] px-6 py-[60px]";
export const homeSectionWhite = "scroll-mt-24 bg-white px-6 py-[60px]";
export const homeEyebrow = "text-[12px] font-extrabold uppercase tracking-[0.14em] text-ciel-teal";
export const homeEyebrowDark = "text-[12px] font-extrabold uppercase tracking-[0.14em] text-ciel-green";
export const homeH2 = "mt-2 text-[clamp(28px,3.2vw,40px)] font-black leading-[1.12] tracking-tight text-ciel-navy";
export const homeH2Dark = "mt-2 text-[clamp(28px,3.2vw,40px)] font-black leading-[1.12] tracking-tight text-white";
export const homeLead = "mt-3 max-w-[62ch] text-base leading-relaxed text-[#3C5560] md:text-[17px]";
export const homeLeadDark = "mt-3 max-w-[62ch] text-base leading-relaxed text-white/65 md:text-[17px]";
export const homeBtnPrimary =
    "inline-flex items-center justify-center rounded-full bg-ciel-teal px-5 py-2.5 text-sm font-extrabold text-white transition hover:-translate-y-px hover:bg-[#0a635c]";
export const homeBtnGreen =
    "inline-flex items-center justify-center gap-2 rounded-full bg-ciel-green px-5 py-2.5 text-sm font-extrabold text-ciel-navy transition hover:-translate-y-px hover:bg-ciel-green-deep hover:text-white";
export const homeBtnGhost =
    "inline-flex items-center justify-center rounded-full border-[1.5px] border-[#D6E6E3] bg-white px-5 py-2.5 text-sm font-extrabold text-ciel-navy transition hover:-translate-y-px";
export const homeBtnOnDark =
    "inline-flex items-center justify-center rounded-full border-[1.5px] border-white/35 px-5 py-2.5 text-sm font-extrabold text-white transition hover:-translate-y-px hover:bg-white/10";
export const homeCard = "rounded-[20px] border border-[#D6E6E3] bg-white";

export function HomeHeader({
    kicker,
    title,
    lead,
    action,
    align = "left",
    dark = false,
}: {
    kicker: string;
    title: ReactNode;
    lead?: ReactNode;
    action?: ReactNode;
    align?: "left" | "center";
    dark?: boolean;
}) {
    const centered = align === "center";
    return (
        <div
            className={
                centered
                    ? "mb-12 text-center"
                    : "mb-8 flex flex-wrap items-end justify-between gap-6"
            }
        >
            <div className={centered ? "mx-auto max-w-[62ch]" : "max-w-[62ch]"}>
                <p className={dark ? homeEyebrowDark : homeEyebrow}>{kicker}</p>
                <h2 className={dark ? homeH2Dark : homeH2}>{title}</h2>
                {lead ? <div className={dark ? homeLeadDark : homeLead}>{lead}</div> : null}
            </div>
            {action ? <div className={centered ? "mt-5" : ""}>{action}</div> : null}
        </div>
    );
}
