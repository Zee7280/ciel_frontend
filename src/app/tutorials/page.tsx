import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PlatformTutorialsPanel from "@/components/platform/PlatformTutorialsPanel";
import { BookOpen, Lightbulb, PlayCircle, ShieldCheck } from "lucide-react";

export const metadata = {
    title: "Platform tutorials & guidelines | CIEL PK",
    description:
        "Video guides and resources published by CIEL — get started with the platform, reports, and community impact.",
};

export default function PublicTutorialsPage() {
    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <Navbar />
            <main className="pt-28 pb-16">
                <div className="mx-auto max-w-6xl px-6">
                    <div className="mb-10 flex flex-col gap-4 border-b border-slate-200/80 pb-10 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0056B3] to-slate-900 text-white shadow-lg shadow-slate-900/15">
                                <PlayCircle className="h-7 w-7" strokeWidth={2} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                                    Tutorials &amp; guidelines
                                </h1>
                                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                                    Step-by-step videos and documents from our team — the same library you see after you sign in.
                                    Browse below, then{" "}
                                    <Link href="/signup" className="font-semibold text-[#0056B3] hover:underline">
                                        create an account
                                    </Link>{" "}
                                    or{" "}
                                    <Link href="/login" className="font-semibold text-[#0056B3] hover:underline">
                                        log in
                                    </Link>{" "}
                                    for the full dashboard.
                                </p>
                            </div>
                        </div>
                    </div>

                    <section className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <ShieldCheck className="mb-3 h-8 w-8 text-emerald-600" />
                            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Best on desktop</h2>
                            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                                Use a recent Chrome, Edge, or Safari browser so video and downloads work reliably.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <BookOpen className="mb-3 h-8 w-8 text-[#0056B3]" />
                            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Attachments</h2>
                            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                                PDFs and guides linked under each tutorial open in a new tab — safe to bookmark for your team.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <Lightbulb className="mb-3 h-8 w-8 text-amber-500" />
                            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Need help?</h2>
                            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                                For account or payment issues after watching,{" "}
                                <Link href="/contact" className="font-semibold text-[#0056B3] hover:underline">
                                    contact us
                                </Link>{" "}
                                — quote your institutional email where possible.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <PlayCircle className="mb-3 h-8 w-8 text-purple-600" />
                            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Inside the dashboard</h2>
                            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                                Logged-in users find this same catalogue under{" "}
                                <span className="font-semibold text-slate-800">Dashboard → Platform tutorial</span>.
                            </p>
                        </div>
                    </section>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
                        <PlatformTutorialsPanel visible publicMode emptyTitle="Tutorials coming soon" />
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
