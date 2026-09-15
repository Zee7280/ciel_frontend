"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { findSdgById } from "@/utils/sdgData";
import {
    computeSeatsRemaining,
    modeMenuLabel,
    normalizeModeBucket,
} from "@/utils/opportunityListing";
import { HomeHeader, homeBtnGhost, homeBtnPrimary, homeCard, homeSectionWhite, homeWrap } from "@/components/home/HomeChrome";

type OppCard = {
    id: string;
    title: string;
    partner: string;
    city: string;
    hours: number | null;
    mode: string;
    seats: number | null;
    sdgs: number[];
    emoji: string;
};

function pickSdgNumbers(raw: Record<string, unknown>): number[] {
    const out: number[] = [];
    const push = (id: unknown) => {
        const sdg = findSdgById(id as string | number);
        if (sdg && !out.includes(sdg.number)) out.push(sdg.number);
    };
    const info = raw.sdg_info;
    if (info && typeof info === "object") {
        const o = info as Record<string, unknown>;
        push(o.sdg_id ?? o.id);
    }
    push(raw.sdg);
    const secondary = raw.secondary_sdgs;
    if (Array.isArray(secondary)) {
        for (const item of secondary) {
            if (item && typeof item === "object") {
                const o = item as Record<string, unknown>;
                push(o.sdg_id ?? o.id ?? o.number);
            } else {
                push(item);
            }
        }
    }
    return out.slice(0, 4);
}

function pickCity(raw: Record<string, unknown>): string {
    const loc = raw.location;
    if (loc && typeof loc === "object") {
        const city = (loc as Record<string, unknown>).city;
        if (typeof city === "string" && city.trim()) return city.trim();
    }
    if (typeof loc === "string" && loc.trim()) return loc.trim();
    return "Pakistan";
}

function pickHours(raw: Record<string, unknown>): number | null {
    const timeline = raw.timeline && typeof raw.timeline === "object" ? (raw.timeline as Record<string, unknown>) : null;
    const n = Number(
        raw.hours ??
            raw.required_hours ??
            raw.minimum_hours ??
            timeline?.hours_required ??
            timeline?.minimum_hours,
    );
    return Number.isFinite(n) && n > 0 ? n : null;
}

function emojiFor(sdgs: number[]): string {
    if (sdgs.includes(2) || sdgs.includes(3)) return "🌾";
    if (sdgs.includes(4)) return "🏫";
    if (sdgs.includes(6)) return "💧";
    if (sdgs.includes(15)) return "🐾";
    if (sdgs.includes(5)) return "🧕";
    if (sdgs.includes(7)) return "☀️";
    return "🏕️";
}

function mapOpportunity(raw: Record<string, unknown>): OppCard | null {
    const id = raw.id != null ? String(raw.id) : "";
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    if (!id || !title) return null;
    const sdgs = pickSdgNumbers(raw);
    const mode = modeMenuLabel(normalizeModeBucket(raw.mode));
    return {
        id,
        title,
        partner:
            (typeof raw.partner_name === "string" && raw.partner_name.trim()) ||
            (typeof raw.organization_name === "string" && raw.organization_name.trim()) ||
            "Verified partner",
        city: pickCity(raw),
        hours: pickHours(raw),
        mode: mode === "Unspecified" ? "" : mode.toLowerCase(),
        seats: computeSeatsRemaining(raw),
        sdgs,
        emoji: emojiFor(sdgs),
    };
}

export default function LiveProjectsShowcase() {
    const [cards, setCards] = useState<OppCard[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/v1/public/opportunities", { headers: { Accept: "application/json" }, cache: "no-store" })
            .then((res) => res.json())
            .then((payload) => {
                if (cancelled) return;
                const list = Array.isArray(payload?.data) ? payload.data : [];
                setCards(
                    list
                        .map((row: unknown) =>
                            row && typeof row === "object" ? mapOpportunity(row as Record<string, unknown>) : null,
                        )
                        .filter((c: OppCard | null): c is OppCard => Boolean(c))
                        .slice(0, 6),
                );
            })
            .catch(() => {
                if (!cancelled) setCards([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <section id="opps" className={homeSectionWhite}>
            <div className={homeWrap}>
                <HomeHeader
                    kicker="Live opportunities"
                    title="Real needs, posted by partners. Supervised student teams."
                    action={
                        <Link href="/projects" className={homeBtnGhost}>
                            Browse all opportunities →
                        </Link>
                    }
                />

                {loading ? (
                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }, (_, i) => (
                            <div key={i} className={`h-48 animate-pulse ${homeCard}`} />
                        ))}
                    </div>
                ) : cards.length === 0 ? (
                    <p className="mt-8 text-sm text-[#6F8790]">
                        No live public opportunities right now. Browse the full listing for updates.
                    </p>
                ) : (
                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {cards.map((opp) => (
                            <article
                                key={opp.id}
                                className={`flex flex-col gap-2.5 p-[18px] ${homeCard}`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[22px]" aria-hidden>
                                        {opp.emoji}
                                    </span>
                                    {opp.seats != null ? (
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                                                opp.seats <= 3
                                                    ? "bg-[#FBF0D7] text-[#B7791F]"
                                                    : "bg-[#DDF1EE] text-[#0A5F59]"
                                            }`}
                                        >
                                            {opp.seats} seat{opp.seats === 1 ? "" : "s"} left
                                        </span>
                                    ) : null}
                                </div>
                                <h3 className="text-lg font-black leading-snug text-ciel-navy">{opp.title}</h3>
                                <p className="text-[13px] text-[#6F8790]">
                                    {opp.partner} · {opp.city}
                                    {opp.hours != null ? ` · ${opp.hours} hrs` : ""}
                                    {opp.mode ? ` · ${opp.mode}` : ""}
                                </p>
                                {opp.sdgs.length > 0 ? (
                                    <div className="flex gap-[5px]">
                                        {opp.sdgs.map((n) => {
                                            const sdg = findSdgById(n);
                                            return (
                                                <i
                                                    key={n}
                                                    title={sdg ? `SDG ${n} ${sdg.title}` : `SDG ${n}`}
                                                    className="grid h-6 w-6 place-items-center rounded-md text-[11px] font-extrabold not-italic text-white"
                                                    style={{ background: sdg?.color ?? "#0E7D74" }}
                                                >
                                                    {n}
                                                </i>
                                            );
                                        })}
                                    </div>
                                ) : null}
                                <Link
                                    href={`/projects/${encodeURIComponent(opp.id)}`}
                                    className={`mt-auto ${homeBtnPrimary}`}
                                >
                                    Apply
                                </Link>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
