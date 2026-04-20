"use client";

import Link from "next/link";

export default function FinalCTA() {
    return (
        <section className="bg-white px-4 py-10 md:px-6 md:py-14">
            <div className="mx-auto max-w-6xl">
                <div className="flex flex-col items-center justify-center gap-8 rounded-2xl bg-gradient-to-r from-[#034C5F] to-[#12A07B] px-6 py-14 text-center shadow-lg sm:px-10 sm:py-16 md:py-20">
                    <h2 className="max-w-4xl text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">
                        Start Your Impact Journey Today
                    </h2>

                    <div className="flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center sm:gap-4">
                        <Link
                            href="/signup"
                            className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-white px-8 py-3.5 text-center text-base font-bold text-[#034C5F] shadow-sm transition hover:bg-slate-50"
                        >
                            Register as Student
                        </Link>
                        <Link
                            href="/signup?role=partner"
                            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white bg-transparent px-8 py-3.5 text-center text-base font-bold text-white transition hover:bg-white/10"
                        >
                            Partner With Us
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
