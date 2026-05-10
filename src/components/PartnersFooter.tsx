import Image from "next/image";

const HOME_PARTNER_LOGOS = [
    {
        src: "/partners/partner-aabroo.png",
        alt: "aabroo",
    },
    {
        src: "/partners/partner-lahore-ka-ravi.png",
        alt: "Lahore ka Ravi",
    },
    {
        src: "/partners/partner-alkhidmat.png",
        alt: "Alkhidmat Foundation",
    },
    {
        src: "/partners/partner-sos-childrens-villages-pakistan.png",
        alt: "SOS Children's Villages Pakistan",
    },
    {
        src: "/partners/partner-door-of-awareness.png",
        alt: "Door of Awareness Educational Welfare Organization",
    },
] as const;

export default function PartnersFooter() {
    return (
        <section
            className="relative overflow-hidden bg-white py-20 md:py-24"
            aria-labelledby="home-partners-heading"
        >
            {/* Subtle top separator */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            {/* Background glow */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background: `radial-gradient(ellipse 70% 60% at 50% 0%, rgba(0,86,179,0.05) 0%, transparent 65%)`,
                }}
                aria-hidden
            />

            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                {/* Section heading */}
                <header className="mb-14 text-center">
                    <div className="mb-3 inline-flex items-center gap-2">
                        <span className="h-px w-8 bg-[#0056B3]/40" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#0056B3]">
                            Partner Organisations
                        </span>
                        <span className="h-px w-8 bg-[#0056B3]/40" />
                    </div>
                    <h2
                        id="home-partners-heading"
                        className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl"
                    >
                        Trusted by leading organisations
                    </h2>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500">
                        Collaborating with Pakistan&apos;s most impactful institutions to advance education and social impact.
                    </p>
                </header>

                {/* Logo grid */}
                <ul
                    role="list"
                    className="mx-auto grid max-w-5xl grid-cols-2 items-center gap-5 sm:grid-cols-3 sm:gap-6 lg:grid-cols-5 lg:gap-5 xl:gap-6 [&>li]:flex [&>li]:justify-center"
                    aria-label="Partner organisation logos"
                >
                    {HOME_PARTNER_LOGOS.map(({ src, alt }) => (
                        <li key={src} className="min-w-0">
                            <div className="group relative flex h-[7.5rem] w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_12px_rgba(15,23,42,0.07)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#0056B3]/20 hover:shadow-[0_16px_40px_-12px_rgba(0,86,179,0.22)] lg:h-[8rem]">
                                {/* Card inner glow on hover */}
                                <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 110%, rgba(0,86,179,0.06), transparent 70%)` }} aria-hidden />
                                <Image
                                    src={src}
                                    alt={alt}
                                    width={240}
                                    height={96}
                                    sizes="(max-width:640px) 44vw, 170px"
                                    className="relative h-14 w-auto max-h-[3.75rem] max-w-[min(100%,11rem)] object-contain object-center grayscale transition-all duration-300 ease-out group-hover:scale-105 group-hover:grayscale-0 sm:h-16 sm:max-h-[4rem]"
                                />
                            </div>
                        </li>
                    ))}
                </ul>

                {/* Bottom stat strip */}
                <div className="mt-14 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-10">
                    <div className="flex items-center gap-2 text-slate-500">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#0056B3]/60" />
                        <span className="text-xs font-medium">5 partner organisations</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#0056B3]/60" />
                        <span className="text-xs font-medium">Across Pakistan</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#0056B3]/60" />
                        <span className="text-xs font-medium">Education &amp; Social Impact</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
