"use client";

import Link from "next/link";
import clsx from "clsx";

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

export default function ShowcaseSpotlight() {
    return (
        <section className="py-20 px-6 bg-white">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-3">
                        Best projects showcase — season one opens now
                    </p>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                        The first showcased projects set the bar for everyone after
                    </h2>
                    <p className="text-base text-slate-500 font-medium max-w-2xl mx-auto mt-3">
                        Faculty-approved, evidence-backed, selected by review. The pilot&apos;s first project is live — the other spots are waiting to be earned.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {CARDS.map((card) => {
                        const body = (
                            <>
                                <div className={clsx("flex h-28 items-center justify-center bg-gradient-to-br", card.banner)}>
                                    <span className="text-4xl" aria-hidden>{card.emoji}</span>
                                </div>
                                <div className="p-6">
                                    <p className="text-sm font-black text-slate-900 leading-snug">{card.title}</p>
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
                            "flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white transition-all duration-300",
                            card.live ? "hover:shadow-xl hover:-translate-y-1" : "opacity-85",
                        );
                        return card.live ? (
                            <Link key={card.id} href="/projects" className={clsx("group", cardClass)}>
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
