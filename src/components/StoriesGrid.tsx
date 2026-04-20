"use client";

import { useEffect, useState } from "react";
import { ArrowRight, GraduationCap, Heart, Leaf, Users, Target, Search } from "lucide-react";
import { useRouter } from "next/navigation";

interface Opportunity {
    id: string;
    title: string;
    description: string;
    types: string[];
    sdg_info: {
        sdg_id: string;
    };
    participant_count?: number;
}

/** Icon only — bar, labels, and wells use site-wide #3A72AA / slate (matches Hero, WhoIsItFor, HowWeWork). */
const getSdgIcon = (sdgNumber: number | string) => {
    const num = Number(sdgNumber);
    if (num <= 4) return GraduationCap;
    if (num <= 8) return Target;
    if (num <= 12) return Users;
    if (num <= 15) return Leaf;
    return Heart;
};

export default function StoriesGrid() {
    const router = useRouter();
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOpportunities = async () => {
            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
                const response = await fetch(`${backendUrl}/public/opportunities`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && Array.isArray(result.data)) {
                        setOpportunities(result.data.slice(0, 4));
                    }
                }
            } catch (error) {
                console.error("Failed to fetch opportunities for landing page", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOpportunities();
    }, []);

    const cardShell =
        "flex w-full max-w-[22rem] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition duration-300 hover:-translate-y-1 hover:border-slate-300/90 hover:shadow-[0_16px_36px_rgba(58,114,170,0.12)]";

    return (
        <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/40 to-white px-4 py-16 md:px-6 md:py-20">
            <div
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:48px_48px] opacity-70"
                aria-hidden
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(58,114,170,0.07),transparent)]" aria-hidden />

            <div className="relative z-10 mx-auto max-w-6xl">
                <header className="mb-12 text-center md:mb-14">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#3A72AA]" aria-hidden />
                        Live projects
                    </div>
                    <div className="relative mb-4 inline-block">
                        <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl lg:text-[42px] lg:leading-tight">
                            Verified Community{" "}
                            <span className="text-[#3A72AA]">Impact</span>
                        </h2>
                        <svg
                            className="absolute -bottom-2 left-0 h-2.5 w-full text-[#3A72AA]/30"
                            preserveAspectRatio="none"
                            viewBox="0 0 100 10"
                            fill="none"
                            aria-hidden
                        >
                            <path d="M0 5Q 25 0 50 5 Q 75 10 100 5" stroke="currentColor" strokeWidth="3" />
                        </svg>
                    </div>
                    <p className="mx-auto max-w-2xl text-base font-medium text-slate-600 md:text-lg">
                        Projects that turned learning into{" "}
                        <span className="font-semibold text-[#3A72AA]">measurable community impact.</span>
                    </p>
                </header>

                <div className="flex flex-wrap justify-center gap-6 md:gap-8">
                    {loading ? (
                        [1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className={`${cardShell} h-[380px] animate-pulse border-slate-100`}
                            >
                                <div className="h-11 bg-[#3A72AA]/25" />
                                <div className="flex flex-1 flex-col items-center gap-5 p-8">
                                    <div className="h-14 w-14 rounded-2xl bg-slate-100" />
                                    <div className="h-5 w-4/5 max-w-[200px] rounded bg-slate-100" />
                                    <div className="w-full space-y-2">
                                        <div className="h-3.5 w-full rounded bg-slate-100" />
                                        <div className="h-3.5 w-11/12 rounded bg-slate-100" />
                                        <div className="h-3.5 w-2/3 rounded bg-slate-100" />
                                    </div>
                                    <div className="mt-auto h-10 w-36 rounded-full bg-slate-100" />
                                </div>
                            </div>
                        ))
                    ) : opportunities.length > 0 ? (
                        opportunities.map((opp) => {
                            const Icon = getSdgIcon(opp.sdg_info.sdg_id.match(/\d+/)?.[0] || 1);

                            return (
                                <article key={opp.id} className={cardShell}>
                                    <div className="bg-[#3A72AA] px-5 py-3 text-center">
                                        <span className="text-sm font-semibold tracking-wide text-white">
                                            {opp.participant_count != null
                                                ? `Active (${opp.participant_count})`
                                                : "Verified Project"}
                                        </span>
                                    </div>

                                    <div className="flex flex-1 flex-col items-center px-7 pb-8 pt-7 text-center">
                                        <div className="mb-5 flex flex-col items-center gap-2">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-200/80">
                                                <Icon className="h-7 w-7 text-[#3A72AA]" strokeWidth={1.75} />
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3A72AA]">
                                                {opp.types[0] || "Community Service"}
                                            </span>
                                        </div>

                                        <h3 className="mb-2 line-clamp-2 text-lg font-extrabold leading-snug text-slate-900 md:text-xl">
                                            {opp.title}
                                        </h3>
                                        <p className="mb-8 line-clamp-3 flex-1 text-sm font-medium leading-relaxed text-slate-500">
                                            {opp.description}
                                        </p>

                                        <button
                                            type="button"
                                            onClick={() => router.push(`/opportunities/${opp.id}`)}
                                            className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#4285F4] px-7 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-100/80 transition hover:bg-blue-600 hover:shadow-lg"
                                        >
                                            View Project
                                            <ArrowRight className="h-4 w-4" aria-hidden />
                                        </button>
                                    </div>
                                </article>
                            );
                        })
                    ) : (
                        <div className="w-full max-w-lg rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 py-14 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
                                <Search className="h-8 w-8 text-slate-300" aria-hidden />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">No active projects to display</h3>
                            <p className="mt-1 text-slate-500">Be the first to create one!</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
