"use client";

import { useMemo, useState } from "react";
import { usePlatformStats } from "@/utils/usePlatformStats";
import { homeSectionWhite, homeWrap } from "@/components/home/HomeChrome";

const PRESETS = [
    { value: 800, label: "Small private (800)" },
    { value: 3000, label: "Mid-size (3,000)" },
    { value: 12000, label: "Large public (12,000)" },
];

function fmtInt(n: number) {
    return Math.round(n).toLocaleString("en-US");
}

export default function ImpactCalculator() {
    const { stats } = usePlatformStats();
    const [students, setStudents] = useState(1200);
    const [hoursEach, setHoursEach] = useState(16);
    const [completePct, setCompletePct] = useState(85);

    const rate = stats?.dividend_hourly_rate_pkr ?? 192;
    const verifiedHours = stats?.report_verified_hours ?? 0;
    const peopleReached = stats?.people_reached ?? 0;
    const peopleServing = stats?.people_serving ?? 0;
    const verifiedReports = stats?.verified_records ?? 0;

    const teamSize = verifiedReports > 0 && peopleServing > 0 ? peopleServing / verifiedReports : 2.5;
    const benPerHour = verifiedHours > 0 ? peopleReached / verifiedHours : 1;

    const result = useMemo(() => {
        const completing = students * (completePct / 100);
        const hours = completing * hoursEach;
        const teams = Math.round(completing / Math.max(teamSize, 0.5));
        return {
            hours,
            dividend: hours * rate,
            people: hours * benPerHour,
            teams,
        };
    }, [students, hoursEach, completePct, teamSize, benPerHour, rate]);

    return (
        <section id="impact-calculator" className={homeSectionWhite}>
            <div className={`${homeWrap} overflow-hidden rounded-[22px] border border-[#D6E6E3] bg-white p-4 sm:p-6 lg:p-[22px]`}>
                <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-ciel-teal">
                    Impact calculator
                </p>
                <h2 className="mt-1.5 text-[clamp(20px,3.4vw,26px)] font-black tracking-tight text-ciel-navy">
                    What would one semester look like at your university?
                </h2>
                <p className="mt-1 max-w-[70ch] text-sm text-[#3C5560]">
                    Ratios come from the verified ledger; the dividend uses CIEL&apos;s PKR {rate} per hour
                    benchmark.
                </p>

                <div className="mt-6 grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
                    <div className="min-w-0">
                        <label className="mt-0 flex items-end justify-between gap-3 text-[13px] font-bold text-[#3C5560]">
                            <span>Students enrolled in Community Service</span>
                            <span className="shrink-0 text-lg font-black tabular-nums text-ciel-navy">{fmtInt(students)}</span>
                        </label>
                        <input
                            type="range"
                            min={50}
                            max={10000}
                            step={50}
                            value={students}
                            onChange={(e) => setStudents(Number(e.target.value))}
                            className="mt-1.5 w-full accent-ciel-teal"
                        />

                        <label className="mt-3.5 flex items-end justify-between gap-3 text-[13px] font-bold text-[#3C5560]">
                            <span>Hours per student (16 is the HEC floor)</span>
                            <span className="shrink-0 text-lg font-black tabular-nums text-ciel-navy">{hoursEach}</span>
                        </label>
                        <input
                            type="range"
                            min={8}
                            max={60}
                            step={1}
                            value={hoursEach}
                            onChange={(e) => setHoursEach(Number(e.target.value))}
                            className="mt-1.5 w-full accent-ciel-teal"
                        />

                        <label className="mt-3.5 flex items-end justify-between gap-3 text-[13px] font-bold text-[#3C5560]">
                            <span>Share completing this semester</span>
                            <span className="shrink-0 text-lg font-black tabular-nums text-ciel-navy">{completePct}%</span>
                        </label>
                        <input
                            type="range"
                            min={30}
                            max={100}
                            step={5}
                            value={completePct}
                            onChange={(e) => setCompletePct(Number(e.target.value))}
                            className="mt-1.5 w-full accent-ciel-teal"
                        />

                        <label className="mt-3.5 block text-[13px] font-bold text-[#3C5560]">Preset</label>
                        <select
                            className="mt-1.5 w-full rounded-[10px] border border-[#D6E6E3] bg-white px-3 py-2.5 text-sm text-ciel-navy"
                            defaultValue=""
                            onChange={(e) => {
                                if (e.target.value) setStudents(Number(e.target.value));
                            }}
                        >
                            <option value="">Choose a university size…</option>
                            {PRESETS.map((p) => (
                                <option key={p.value} value={p.value}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-[18px] bg-ciel-navy p-4 text-white sm:p-[22px]">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9CC9C2]">
                            Projected community dividend
                        </p>
                        <p className="break-words font-black text-[clamp(28px,7vw,44px)] leading-none text-white">
                            {fmtInt(result.dividend)}
                            <small className="ml-1.5 text-base font-extrabold text-ciel-gold">PKR</small>
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5">
                                <b className="block break-words text-[clamp(16px,3vw,22px)] font-black text-white">{fmtInt(result.hours)}</b>
                                <span className="text-[11px] font-bold text-[#B9D3CF]">verified hours</span>
                            </div>
                            <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5">
                                <b className="block break-words text-[clamp(16px,3vw,22px)] font-black text-white">{fmtInt(result.people)}</b>
                                <span className="text-[11px] font-bold text-[#B9D3CF]">people reached (at ledger ratio)</span>
                            </div>
                            <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5">
                                <b className="block break-words text-[clamp(16px,3vw,22px)] font-black text-white">{fmtInt(result.teams)}</b>
                                <span className="text-[11px] font-bold text-[#B9D3CF]">projects</span>
                            </div>
                            <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5">
                                <b className="block break-words text-[clamp(16px,3vw,22px)] font-black text-white">{fmtInt(result.teams)}</b>
                                <span className="text-[11px] font-bold text-[#B9D3CF]">student-teams</span>
                            </div>
                        </div>
                        <p className="mt-auto text-xs text-[#9CC9C2]">
                            Ratios from the verified ledger: {teamSize.toFixed(1)} students per team ·{" "}
                            {benPerHour.toFixed(2)} people reached per verified hour. PKR {rate}/h benchmark.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
