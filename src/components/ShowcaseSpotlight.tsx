"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { HomeHeader, homeSectionWhite, homeWrap } from "@/components/home/HomeChrome";

interface SpotlightTag {
    label: string;
    className: string;
}

interface SpotlightCard {
    id: string;
    emoji: string;
    banner: string;
    title: string;
    description: string;
    tags: SpotlightTag[];
    live?: boolean;
    href?: string;
}

const CARDS: SpotlightCard[] = [
    {
        id: "sos-classroom-learning-environment",
        emoji: "🏫",
        banner: "from-blue-50 to-indigo-100",
        title: "SOS Classroom Learning Environment Transformation",
        description: "The founding community-service project — live now at BNU, hours verifying end-to-end.",
        live: true,
        tags: [
            { label: "COMMUNITY · LIVE", className: "bg-blue-50 text-blue-700" },
            { label: "SDG 4", className: "bg-rose-600 text-white" },
            { label: "✓ PILOT PROJECT #1", className: "bg-emerald-50 text-emerald-700" },
        ],
    },
    {
        id: "waiting-first-fyp",
        emoji: "⭐",
        banner: "from-violet-50 to-purple-100",
        title: "This spot is waiting for the first FYP",
        description: "A thesis, a collection, a design, an app — the first supervisor-approved FYP with real evidence gets showcased here, to universities and industry.",
        tags: [
            { label: "FYP / THESIS", className: "bg-violet-50 text-violet-700" },
            { label: "⭐ COULD BE YOURS", className: "bg-amber-50 text-amber-700" },
        ],
    },
    {
        id: "waiting-first-venture",
        emoji: "💼",
        banner: "from-emerald-50 to-green-100",
        title: "This spot is waiting for the first venture",
        description: "The first faculty-verified Venture Card goes here — and onto the investor marketplace on launch day, with priority visibility.",
        tags: [
            { label: "VENTURE", className: "bg-emerald-50 text-emerald-700" },
            { label: "FOUNDING SPOT OPEN", className: "bg-blue-50 text-blue-700" },
        ],
    },
];

type SpotlightVenture = { id: string; venture_name: string; stage: string | null; university: string | null; sdgs: number[]; badge_level: string | null; rank: number | null; featured: boolean };
type SpotlightFyp = { id: string; project_title: string; university: string | null; route: string | null; sdgs: number[]; badge_level: string | null; rank: number | null; of: number | null };

/** Replaces the two "waiting" cards with the first real spotlighted venture / top-ranked FYP once they exist. */
function liveCards(ventures: SpotlightVenture[], fyps: SpotlightFyp[]): SpotlightCard[] {
    const fyp = fyps[0];
    const venture = ventures[0];
    return CARDS.map((card) => {
        if (card.id === "waiting-first-fyp" && fyp) {
            return {
                ...card,
                id: `fyp-${fyp.id}`,
                title: fyp.project_title,
                description: [fyp.university, fyp.route].filter(Boolean).join(" · ") || "Supervisor-approved Final Year Project.",
                live: true,
                href: `/fyp/verify/${fyp.id}`,
                tags: [
                    { label: "FYP / THESIS · VERIFIED", className: "bg-violet-50 text-violet-700" },
                    ...(fyp.rank ? [{ label: `RANK #${fyp.rank}${fyp.of ? ` OF ${fyp.of}` : ""}${fyp.badge_level ? ` · ${fyp.badge_level.toUpperCase()}` : ""}`, className: "bg-amber-50 text-amber-700" }] : []),
                    ...fyp.sdgs.slice(0, 2).map((n) => ({ label: `SDG ${n}`, className: "bg-rose-600 text-white" })),
                ],
            };
        }
        if (card.id === "waiting-first-venture" && venture) {
            return {
                ...card,
                id: `venture-${venture.id}`,
                title: venture.venture_name,
                description: [venture.university, venture.stage].filter(Boolean).join(" · ") || "Faculty-verified student venture.",
                live: true,
                href: `/venture/verify/${venture.id}`,
                tags: [
                    { label: venture.featured ? "VENTURE · CIEL SPOTLIGHT" : "VENTURE · VERIFIED", className: "bg-emerald-50 text-emerald-700" },
                    ...(venture.rank ? [{ label: `RANK #${venture.rank}${venture.badge_level ? ` · ${venture.badge_level.toUpperCase()}` : ""}`, className: "bg-amber-50 text-amber-700" }] : []),
                    ...venture.sdgs.slice(0, 2).map((n) => ({ label: `SDG ${n}`, className: "bg-rose-600 text-white" })),
                ],
            };
        }
        return card;
    });
}

export default function ShowcaseSpotlight() {
    const [cards, setCards] = useState<SpotlightCard[]>(CARDS);
    useEffect(() => {
        let cancelled = false;
        fetch("/api/v1/public/paths/spotlight", { headers: { Accept: "application/json" }, cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((json: { ventures?: SpotlightVenture[]; fyps?: SpotlightFyp[] } | null) => {
                if (cancelled || !json) return;
                const ventures = Array.isArray(json.ventures) ? json.ventures : [];
                const fyps = Array.isArray(json.fyps) ? json.fyps : [];
                if (ventures.length || fyps.length) setCards(liveCards(ventures, fyps));
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, []);
    return (
        <section className={homeSectionWhite}>
            <div className={homeWrap}>
                <HomeHeader
                    align="center"
                    kicker="Best projects showcase — season one opens now"
                    title="The first showcased projects set the bar for everyone after"
                    lead="Faculty-approved, evidence-backed, selected by review. The pilot's first project is live — the other spots are waiting to be earned."
                />

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {cards.map((card) => {
                        const body = (
                            <>
                                <div className={clsx("flex h-28 items-center justify-center bg-gradient-to-br", card.banner)}>
                                    <span className="text-4xl" aria-hidden>{card.emoji}</span>
                                </div>
                                <div className="p-6">
                                    <p className="text-sm font-black leading-snug text-ciel-navy">{card.title}</p>
                                    <p className="mt-2 text-xs text-slate-500 leading-relaxed">{card.description}</p>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {card.tags.map((tag) => (
                                            <span
                                                key={tag.label}
                                                className={clsx(
                                                    "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide",
                                                    tag.className,
                                                )}
                                            >
                                                {tag.label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </>
                        );
                        const cardClass = clsx(
                            "flex flex-col overflow-hidden rounded-[20px] border border-[#D6E6E3] bg-white transition-all duration-300",
                            card.live ? "hover:shadow-xl hover:-translate-y-1" : "opacity-85",
                        );
                        return card.live ? (
                            <Link key={card.id} href={card.href || "/projects"} className={clsx("group", cardClass)}>
                                {body}
                            </Link>
                        ) : (
                            <div key={card.id} className={cardClass}>
                                {body}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
