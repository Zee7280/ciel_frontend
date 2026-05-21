"use client";

import Image from "next/image";

const HOME_PARTNER_LOGOS = [
    { src: "/partners/partner-aabroo.png", alt: "Aabroo" },
    { src: "/partners/partner-lahore-ka-ravi.png", alt: "Lahore ka Ravi" },
    { src: "/partners/partner-alkhidmat.png", alt: "Alkhidmat Foundation" },
    { src: "/partners/partner-sos-childrens-villages-pakistan.png", alt: "SOS Children's Villages Pakistan" },
    { src: "/partners/partner-door-of-awareness.png", alt: "Door of Awareness Educational Welfare Organization" },
    { src: "/partners/partner-ciel.png", alt: "CIEL" },
    { src: "/partners/partner-rukh-foundation.png", alt: "Rukh Foundation" },
    { src: "/partners/partner-noor-al-amal.png", alt: "Noor-al-Amal Light of Hope" },
    { src: "/partners/partner-arooba-naeem-welfare.png", alt: "Arooba Naeem Welfare" },
    { src: "/partners/partner-nawab-cats.png", alt: "Nawab Cats" },
] as const;

const STATS = [
    { value: "10+", label: "Partner Organisations" },
    { value: "5+", label: "Cities Across Pakistan" },
    { value: "100%", label: "Education & Social Impact" },
];

export default function PartnersFooter() {
    const marqueeLogos = [...HOME_PARTNER_LOGOS, ...HOME_PARTNER_LOGOS];

    return (
        <section
            className="relative overflow-hidden bg-[#04112a] py-20 md:py-28"
            aria-labelledby="home-partners-heading"
        >
            <style>{`
                @keyframes marquee-scroll {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .marquee-track {
                    animation: marquee-scroll 32s linear infinite;
                    will-change: transform;
                }
                .marquee-track:hover {
                    animation-play-state: paused;
                }
            `}</style>

            {/* Ambient background glows */}
            <div
                className="pointer-events-none absolute inset-0"
                aria-hidden
                style={{
                    background: [
                        "radial-gradient(ellipse 70% 55% at 15% 50%, rgba(0,86,179,0.14) 0%, transparent 65%)",
                        "radial-gradient(ellipse 55% 45% at 85% 50%, rgba(0,160,110,0.07) 0%, transparent 60%)",
                        "radial-gradient(ellipse 100% 40% at 50% 100%, rgba(0,86,179,0.08) 0%, transparent 60%)",
                    ].join(", "),
                }}
            />

            {/* Top accent line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

            {/* ── Heading ── */}
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <header className="mb-14 text-center">
                    <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-blue-400/25 bg-blue-400/10 px-4 py-1.5">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-blue-300">
                            Partner Organisations
                        </span>
                    </div>

                    <h2
                        id="home-partners-heading"
                        className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-tight"
                    >
                        Trusted by leading organisations
                    </h2>

                    <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-slate-400">
                        Collaborating with Pakistan&apos;s most impactful institutions to advance
                        education and social change.
                    </p>
                </header>
            </div>

            {/* ── Infinite Marquee ── */}
            <div className="relative overflow-hidden">
                {/* Edge fades */}
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-[#04112a] to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-[#04112a] to-transparent" />

                <div className="marquee-track flex w-max items-center gap-5 px-5">
                    {marqueeLogos.map(({ src, alt }, i) => (
                        <div
                            key={`${src}-${i}`}
                            className="group relative h-[6.5rem] w-[11rem] flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.25)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_12px_40px_rgba(0,86,179,0.25)]"
                        >
                            {/* Hover inner glow */}
                            <div
                                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                                style={{ background: "radial-gradient(ellipse 90% 70% at 50% 120%, rgba(0,86,179,0.06), transparent 65%)" }}
                                aria-hidden
                            />
                            <Image
                                src={src}
                                alt={alt}
                                fill
                                sizes="176px"
                                className="object-contain p-2 grayscale opacity-70 transition-all duration-300 ease-out group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Stats strip ── */}
            <div className="relative mx-auto mt-16 max-w-3xl px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm divide-x divide-white/10">
                    {STATS.map(({ value, label }) => (
                        <div key={label} className="flex flex-col items-center gap-1 py-6 px-4">
                            <span className="text-2xl font-extrabold text-white sm:text-3xl">{value}</span>
                            <span className="text-center text-xs font-medium text-slate-400">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom accent line */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
        </section>
    );
}
