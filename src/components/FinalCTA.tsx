"use client";

import Link from "next/link";
import { homeWrap } from "@/components/home/HomeChrome";

export default function FinalCTA() {
    return (
        <section className="bg-[#F5FAF9] px-6 py-16">
            <div className={homeWrap}>
                <div className="flex flex-col items-center justify-center gap-8 rounded-[26px] bg-ciel-navy px-6 py-14 text-center sm:px-10 sm:py-16 md:py-20">
                    <div>
                        <h2 className="max-w-4xl text-[clamp(28px,3.2vw,44px)] font-black tracking-tight text-white">
                            Start your impact record today
                        </h2>
                        <p className="mt-3 text-base font-medium text-white/70 md:text-lg">
                            Free for students. Ten minutes to your first verified record.
                        </p>
                    </div>

                    <div className="flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center sm:gap-4">
                        <Link
                            href="/signup"
                            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-ciel-green px-8 py-3.5 text-center text-base font-extrabold text-ciel-navy transition hover:bg-ciel-green-deep hover:text-white"
                        >
                            Register as Student
                        </Link>
                        <Link
                            href="/signup?role=ngo"
                            className="inline-flex min-h-[48px] items-center justify-center rounded-full border-[1.5px] border-white/35 px-8 py-3.5 text-center text-base font-extrabold text-white transition hover:bg-white/10"
                        >
                            Partner With Us
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
