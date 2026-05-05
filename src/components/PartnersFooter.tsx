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
            className="relative overflow-hidden border-t border-slate-200/90 bg-gradient-to-b from-slate-50 via-white to-white py-14 md:py-16"
            aria-labelledby="home-partners-heading"
        >
            <div
                className="pointer-events-none absolute inset-0 opacity-100"
                style={{
                    background: `radial-gradient(ellipse 85% 55% at 50% -15%, rgba(0, 86, 179, 0.07), transparent 55%)`,
                }}
                aria-hidden
            />

            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <header className="mb-10 text-center md:mb-12">
                    <h2
                        id="home-partners-heading"
                        className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#0056B3]/90 md:text-xs"
                    >
                        Partner organisations
                    </h2>
                    <p className="mx-auto mt-3 max-w-lg text-xs leading-relaxed text-slate-500 md:text-sm">
                        Trusted collaborators advancing education and impact across Pakistan.
                    </p>
                </header>

                <ul
                    role="list"
                    className="mx-auto grid max-w-6xl grid-cols-2 items-stretch gap-6 sm:grid-cols-3 sm:gap-8 lg:grid-cols-5 lg:gap-6 xl:gap-8 [&>li]:flex [&>li]:justify-center"
                    aria-label="Partner organisation logos"
                >
                    {HOME_PARTNER_LOGOS.map(({ src, alt }) => (
                        <li key={src} className="min-w-0">
                            <div className="group flex h-[5.75rem] w-full max-w-[212px] items-center justify-center rounded-2xl border border-slate-200/75 bg-white p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(15,23,42,0.06)] transition duration-300 ease-out hover:border-[#0056B3]/28 hover:shadow-[0_12px_32px_-16px_rgba(0,86,179,0.2)] sm:h-[6rem] lg:max-w-none lg:rounded-xl">
                                <Image
                                    src={src}
                                    alt={alt}
                                    width={220}
                                    height={88}
                                    sizes="(max-width:640px) 42vw, 160px"
                                    className="h-[2.875rem] w-auto max-h-[3rem] max-w-[min(100%,10.5rem)] object-contain object-center grayscale-[18%] contrast-[1.03] transition duration-300 ease-out group-hover:scale-[1.03] group-hover:grayscale-0 group-hover:contrast-100 sm:h-[3.125rem] sm:max-h-[3.25rem]"
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
