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
        <section className="py-12 bg-white border-t border-slate-100" aria-labelledby="home-partners-heading">
            <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-8">
                <h2 id="home-partners-heading" className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Partner organisations
                </h2>
            </div>

            {/* Full-bleed row + left→right marquee (duplicate strip for seamless loop) */}
            <div
                className="relative w-full overflow-hidden"
                role="region"
                aria-label="Partner organisation logos"
            >
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent md:w-24" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent md:w-24" />

                <div className="partner-marquee-ltr-track gap-16 py-2 md:gap-24 hover:[animation-play-state:paused]">
                    {HOME_PARTNER_LOGOS.map(({ src, alt }) => (
                        <div
                            key={src}
                            className="flex h-[72px] min-w-[160px] max-w-[280px] shrink-0 items-center justify-center px-4 opacity-95"
                        >
                            <Image
                                src={src}
                                alt={alt}
                                width={280}
                                height={90}
                                className="max-h-[72px] w-auto max-w-[260px] object-contain"
                            />
                        </div>
                    ))}
                    {HOME_PARTNER_LOGOS.map(({ src, alt }) => (
                        <div
                            key={`${src}-dup`}
                            className="flex h-[72px] min-w-[160px] max-w-[280px] shrink-0 items-center justify-center px-4 opacity-95"
                            aria-hidden="true"
                        >
                            <Image
                                src={src}
                                alt=""
                                width={280}
                                height={90}
                                className="max-h-[72px] w-auto max-w-[260px] object-contain"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
