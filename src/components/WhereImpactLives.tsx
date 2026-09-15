"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isTokenValid } from "@/utils/api";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { usePlatformStats } from "@/utils/usePlatformStats";
import { HomeHeader, homeBtnGreen, homeBtnOnDark, homeBtnPrimary, homeSectionMint, homeWrap } from "@/components/home/HomeChrome";

type SidePathKey = "course-project" | "fyp-thesis" | "startup-business";

const LOOP = [
    { n: "1", title: "Join or create", detail: "an opportunity, connected to faculty from day one" },
    { n: "2", title: "Serve & log", detail: "sessions, hours and locations as you go" },
    { n: "3", title: "Evidence once", detail: "photos, videos, attendance sheets" },
    { n: "4", title: "Report writes itself", detail: "ten sections, AI-drafted from your answers" },
    { n: "5", title: "One approval", detail: "faculty verify the whole report once" },
    { n: "6", title: "Published", detail: "flashcard · certificate · QR · CII score · rankings" },
];

const SIDE_PATHS: {
    key: SidePathKey;
    query: string;
    verb: string;
    color: string;
    title: string;
    subtitle: string;
    intro: string;
    steps: string[];
}[] = [
    {
        key: "course-project",
        query: "course-project",
        verb: "A",
        color: "#1F6F9C",
        title: "Course Projects",
        subtitle: "SDG-linked class work · free · your rubric, one 15-minute form",
        intro:
            "One assignment per course with a sustainable element — encouraged, never mandatory. Students still submit on your LMS; they add a 15-minute form on CIEL; a flashcard is generated; you approve with one click and it drops back into your LMS as the polished record.",
        steps: [
            "Teach as you do — your rubric, your marking",
            "Student maps issue, SDG and evidence (15 min)",
            "You approve — one click",
            "Flashcard stored back in Google Classroom",
        ],
    },
    {
        key: "fyp-thesis",
        query: "fyp-thesis",
        verb: "I",
        color: "#6A4FB3",
        title: "FYP / Thesis",
        subtitle: "Every final-year project registered, SDG-linked or not",
        intro:
            "Every final-year project, thesis and capstone is registered on the ledger whether or not it links to an SDG. Where a sustainability element exists the supervisor makes sure it is named. Year by year this builds a searchable repository with the supervisor's name on every project.",
        steps: [
            "Sustainability & SDG alignment statement at proposal",
            "Abstract, method, output and evidence at completion",
            "Supervisor verifies the SDG connection is real",
            "Strongest projects forwarded to Innovatrium",
        ],
    },
    {
        key: "startup-business",
        query: "startup-business",
        verb: "I",
        color: "#C2661F",
        title: "Startups / Ventures",
        subtitle: "Student ventures with honest indicators → Innovatrium",
        intro:
            "Every business plan or venture developed through an FYP or university incubation is recorded — problem, customers, model, and at least one measurable impact indicator. Commercial traction is kept separate from social outcomes; no promotional claims.",
        steps: [
            "Define the problem and the customers",
            "Name one measurable impact indicator",
            "Mentor or incubation unit verifies the record",
            "Showcased to investors and partners, with consent",
        ],
    },
];

function fmtHours(n: number) {
    return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function fmtInt(n: number) {
    return Math.round(n).toLocaleString("en-US");
}

function fmtCount(n: number | undefined) {
    if (n == null) return "—";
    return fmtInt(n);
}

export default function WhereImpactLives() {
    const { stats } = usePlatformStats();
    const [openKey, setOpenKey] = useState<SidePathKey | null>(null);
    const [isStudent, setIsStudent] = useState(false);

    useEffect(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("ciel_token") : null;
        const user = readStoredCurrentUser();
        const role = String(user?.role ?? "")
            .trim()
            .toLowerCase();
        setIsStudent(isTokenValid(token) && role === "student");
        const requested = new URLSearchParams(window.location.search).get("path");
        const match = SIDE_PATHS.find((p) => p.query === requested);
        if (match) setOpenKey(match.key);
    }, []);

    const hours = stats?.report_verified_hours ?? 0;
    const reports = stats?.verified_records ?? 0;
    const avgCii = stats?.avg_cii_score ?? 0;
    const byPath = stats?.verified_by_path;
    const open = SIDE_PATHS.find((p) => p.key === openKey) ?? null;

    const joinHref = isStudent ? "/dashboard/student/browse" : "/projects";
    const createHref = isStudent ? "/dashboard/student/paths/community-service?view=create" : "/signup";

    return (
        <section id="where-your-impact-lives" className={homeSectionMint}>
            <div className={homeWrap}>
                <HomeHeader
                    kicker="Four impact paths · one record"
                    title="Community Service is the flagship. Three more paths share the same ledger."
                    lead="Sixteen verified hours are already compulsory under HEC's Civics & Community Engagement requirement. CIEL makes them count — then carries the same standard into coursework, final-year projects and student ventures."
                    action={
                        <span className="inline-flex items-center rounded-full bg-[#FBF0D7] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#B7791F]">
                            Live ledger · verified records only
                        </span>
                    }
                />

                <div className="mt-7 grid grid-cols-1 gap-[18px] lg:grid-cols-[1.35fr_1fr]">
                    <div className="relative flex flex-col gap-4 overflow-hidden rounded-[22px] bg-ciel-navy p-4 text-white sm:p-7">
                        <div
                            aria-hidden
                            className="pointer-events-none absolute -right-[60px] -top-[60px] h-[260px] w-[260px] rounded-full border-2 border-[#E8B64A]/50"
                        />
                        <p className="relative text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#E8B64A]">
                            Flagship · Serve
                        </p>
                        <h3 className="relative text-[clamp(24px,2.6vw,34px)] font-black leading-tight text-white">
                            Community Service — sixteen hours that become a permanent, verified record.
                        </h3>
                        <p className="relative m-0 max-w-[56ch] text-[15px] leading-relaxed text-[#CFE3E0]">
                            Log sessions as you work, upload evidence once, submit a report that writes itself. One
                            faculty approval publishes it to your CV, your university and this page.
                        </p>
                        <div className="relative grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {LOOP.map((step) => (
                                <div
                                    key={step.n}
                                    className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-[12.5px] leading-snug text-[#DCEBE8]"
                                >
                                    <span className="mb-1.5 inline-grid h-5 w-5 place-items-center rounded-full bg-ciel-green text-[11px] font-extrabold not-italic text-ciel-navy">
                                        {step.n}
                                    </span>
                                    <b className="block text-[13px] text-white">{step.title}</b>
                                    {step.detail}
                                </div>
                            ))}
                        </div>
                        <div className="relative flex flex-wrap gap-[18px]">
                            <div>
                                <b className="block text-[26px] font-black leading-none text-white">
                                    {fmtHours(hours)}
                                </b>
                                <span className="text-xs font-bold text-[#9CC9C2]">verified hours</span>
                            </div>
                            <div>
                                <b className="block text-[26px] font-black leading-none text-white">
                                    {fmtInt(reports)}
                                </b>
                                <span className="text-xs font-bold text-[#9CC9C2]">verified reports</span>
                            </div>
                            <div>
                                <b className="block text-[26px] font-black leading-none text-white">
                                    {avgCii > 0 ? avgCii.toFixed(1).replace(/\.0$/, "") : "—"}
                                </b>
                                <span className="text-xs font-bold text-[#9CC9C2]">avg CII score</span>
                            </div>
                        </div>
                        <div className="relative mt-auto flex flex-wrap gap-2.5">
                            <Link
                                href={joinHref}
                                className={homeBtnGreen}
                            >
                                Join an opportunity
                            </Link>
                            <Link
                                href={createHref}
                                className={homeBtnOnDark}
                            >
                                Create your own
                            </Link>
                        </div>
                    </div>

                    <div className="grid gap-3">
                        {SIDE_PATHS.map((path) => {
                            const count =
                                path.key === "course-project"
                                    ? byPath?.course_project
                                    : path.key === "fyp-thesis"
                                      ? byPath?.fyp_thesis
                                      : byPath?.startup_business;
                            const isOpen = openKey === path.key;
                            return (
                                <button
                                    key={path.key}
                                    type="button"
                                    aria-expanded={isOpen}
                                    onClick={() => setOpenKey(isOpen ? null : path.key)}
                                    className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border bg-white px-4 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(11,37,48,.10)] sm:gap-3.5 sm:px-5 sm:py-[18px]"
                                    style={{ borderColor: isOpen ? path.color : "#D6E6E3" }}
                                >
                                    <span
                                        className="grid h-11 w-11 place-items-center rounded-xl text-xl font-black text-white"
                                        style={{ background: path.color }}
                                    >
                                        {path.verb}
                                    </span>
                                    <span className="min-w-0">
                                        <b className="block text-[16px] font-black text-ciel-navy sm:text-[17px]">{path.title}</b>
                                        <span className="line-clamp-2 text-[12px] text-[#6F8790] sm:text-[13px]">{path.subtitle}</span>
                                    </span>
                                    <span className="text-right text-[22px] font-black tabular-nums text-ciel-navy">
                                        {fmtCount(count)}
                                        <small className="block font-sans text-[11px] font-bold text-[#6F8790]">
                                            verified
                                        </small>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {open ? (
                    <div className="mt-3.5 grid grid-cols-1 gap-5 rounded-[18px] border border-[#D6E6E3] bg-white p-5 md:grid-cols-2">
                        <div>
                            <p className="text-[12px] font-extrabold uppercase tracking-[0.14em]" style={{ color: open.color }}>
                                {open.verb === "A" ? "Apply" : open.key === "fyp-thesis" ? "Investigate" : "Innovate"} ·{" "}
                                {open.title}
                            </p>
                            <h4 className="mt-1.5 text-xl font-black text-ciel-navy">
                                {fmtCount(
                                    open.key === "course-project"
                                        ? byPath?.course_project
                                        : open.key === "fyp-thesis"
                                          ? byPath?.fyp_thesis
                                          : byPath?.startup_business,
                                )}{" "}
                                verified on the ledger
                            </h4>
                            <p className="mt-2 text-sm leading-relaxed text-[#3C5560]">{open.intro}</p>
                            <ol className="mt-2.5 list-decimal space-y-1 pl-[18px] text-sm text-[#3C5560]">
                                {open.steps.map((step) => (
                                    <li key={step}>{step}</li>
                                ))}
                            </ol>
                        </div>
                        <div>
                            <h4 className="text-base font-black text-ciel-navy">How it lands on the ledger</h4>
                            <p className="mt-2 text-sm leading-relaxed text-[#6F8790]">
                                Only faculty- or supervisor-approved records count here — the same rule as Community
                                Service. Drafts and items still in review never inflate these totals.
                            </p>
                            <Link
                                href={isStudent ? `/dashboard/student/paths/${open.key}` : "/signup"}
                                className={`mt-4 ${homeBtnPrimary}`}
                            >
                                {isStudent ? `Open ${open.title}` : "Register to start a record"}
                            </Link>
                        </div>
                    </div>
                ) : null}
            </div>
        </section>
    );
}
