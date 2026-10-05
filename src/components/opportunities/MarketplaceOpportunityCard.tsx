"use client";

import Link from "next/link";
import { CalendarDays, Clock, Users } from "lucide-react";
import { resolveMarketplaceCoverUrl } from "@/utils/marketplaceCover";
import {
    classifyMarketplaceStatus,
    formatMarketplaceDateRange,
    marketplaceStatusLabel,
    marketplaceTimingLabel,
    type MarketplaceStatus,
} from "@/utils/marketplaceListingStatus";
import type { BrowseCardSdg } from "@/app/dashboard/student/browse/BrowseOpportunityCard";

const STATUS_PILL: Record<MarketplaceStatus, string> = {
    live: "bg-[#1f9d55] text-white",
    closing: "bg-[#f2a100] text-white",
    upcoming: "bg-[#6b4de6] text-white",
    expired: "bg-[#e11d48] text-white",
};

export default function MarketplaceOpportunityCard({
    id,
    title,
    description,
    pathLabel,
    organizationName,
    city,
    modeLabel,
    skillLabel,
    hours,
    seatsRemaining,
    startDate,
    endDate,
    coverUrl,
    universityLabel,
    visibilityOpen,
    sdgs,
    adminExpired,
    applicationsOpen,
    applyBlockedReason,
}: {
    id: string;
    title: string;
    description?: string;
    pathLabel: string;
    organizationName: string;
    city: string;
    modeLabel: string;
    skillLabel?: string | null;
    hours: number | null;
    seatsRemaining: number | null;
    startDate: string | null;
    endDate: string | null;
    coverUrl?: string | null;
    universityLabel: string;
    visibilityOpen: boolean;
    sdgs: BrowseCardSdg[];
    adminExpired: boolean;
    applicationsOpen: boolean;
    applyBlockedReason: string | null;
}) {
    const listing = {
        start_date: startDate,
        end_date: endDate,
        adminExpired,
        applicationsOpen,
        applyBlockedReason,
    };
    const status = classifyMarketplaceStatus(listing);
    const cover = resolveMarketplaceCoverUrl(id, coverUrl);
    const range = formatMarketplaceDateRange(startDate, endDate);
    const tags = [organizationName, city, modeLabel, skillLabel].filter((tag): tag is string => Boolean(tag && tag.trim()));
    const universityLine = visibilityOpen ? "Open to Multiple Universities" : universityLabel;
    const hoursSeats = [
        hours != null && hours > 0 ? `${hours} hrs` : null,
        seatsRemaining != null ? `${seatsRemaining} seats` : null,
    ]
        .filter(Boolean)
        .join(" – ");

    return (
        <article className="flex h-full flex-col overflow-hidden rounded-[22px] border border-[#e4eeea] bg-white shadow-[0_12px_32px_rgba(16,48,54,.06)]">
            <div
                className="relative h-[148px] bg-cover bg-center"
                style={{ backgroundImage: `url(${JSON.stringify(cover)})` }}
            >
                <span
                    className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.04em] ${STATUS_PILL[status]}`}
                >
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    {marketplaceStatusLabel(status)}
                </span>
                <span className="absolute right-3 top-3 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-bold text-[#35545c]">
                    {marketplaceTimingLabel(listing)}
                </span>
            </div>

            <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
                <p className="text-[11px] font-semibold text-[#6f8890]">{pathLabel}</p>
                <h3 className="mt-1 text-[16px] font-extrabold leading-snug text-[#17323c]">{title || "Untitled opportunity"}</h3>
                {description ? (
                    <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-[#5d7278]">{description}</p>
                ) : null}

                {tags.length ? (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {tags.slice(0, 4).map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full border border-[#e4eeea] bg-[#f6faf8] px-2 py-0.5 text-[10.5px] font-semibold text-[#4d6570]"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                ) : null}

                {sdgs.length ? (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                        {sdgs.slice(0, 4).map((sdg) => (
                            <span
                                key={sdg.number}
                                title={`SDG ${sdg.number} · ${sdg.title}`}
                                className="inline-flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-[10px] font-black text-white"
                                style={{ background: sdg.color }}
                            >
                                {String(sdg.number).padStart(2, "0")}
                            </span>
                        ))}
                    </div>
                ) : null}

                <div className="mt-3 space-y-1.5 text-[12px] text-[#5d7278]">
                    {range ? (
                        <p className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                            {range}
                        </p>
                    ) : null}
                    {hoursSeats ? (
                        <p className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            {hoursSeats}
                            {seatsRemaining != null ? <Users className="ml-1 h-3.5 w-3.5" /> : null}
                        </p>
                    ) : null}
                    {universityLine ? (
                        <p className="truncate text-[11.5px] font-medium text-[#17323c]">{universityLine}</p>
                    ) : null}
                </div>

                <Link
                    href={`/projects/${encodeURIComponent(id)}`}
                    className="mt-auto inline-flex h-11 items-center justify-center rounded-full bg-[#1aa36a] px-4 text-[13px] font-extrabold text-white transition hover:bg-[#158a59]"
                >
                    View Details →
                </Link>
            </div>
        </article>
    );
}
