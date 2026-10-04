"use client";

import Link from "next/link";
import { Building2, CheckCircle2, Clock, MapPin, Share2, Users } from "lucide-react";
import { findSdgById } from "@/utils/sdgData";
import { BROWSE_PATH_BY_KEY, formatBrowseDeadline, type BrowsePathKey } from "@/utils/browseOpportunityPath";

export type BrowseCardSdg = { number: number; title: string; color: string };

type BrowseOpportunityCardProps = {
    id: string;
    title?: string;
    description?: string;
    pathKey: BrowsePathKey;
    pathLabel: string;
    organizationName?: string;
    city?: string;
    modeLabel: string;
    hoursLabel: string;
    seatsLabel: string;
    deadline?: string | null;
    coverUrl?: string | null;
    isFull: boolean;
    isExpired?: boolean;
    sdgs: BrowseCardSdg[];
    visibilityTag?: string | null;
    visibilityWarn?: boolean;
    appliedPending: boolean;
    appliedRejected: boolean;
    reportHref?: string | null;
    reportLabel?: string | null;
    showTeam: boolean;
    showWithdraw: boolean;
    withdrawing: boolean;
    canApplyNow: boolean;
    showJoin: boolean;
    joinButtonLabel: string;
    joinTitle?: string;
    detailsHref?: string;
    viewMode: "grid" | "list";
    onOpenTeam?: () => void;
    onShare: () => void;
    onWithdraw?: () => void;
    onJoin?: () => void;
};

function SdgTiles({ sdgs }: { sdgs: BrowseCardSdg[] }) {
    if (!sdgs.length) return null;
    return (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
            {sdgs.slice(0, 4).map((sdg) => (
                <span
                    key={sdg.number}
                    title={`SDG ${sdg.number} · ${sdg.title}`}
                    className="inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-[10px] font-black text-white shadow-sm"
                    style={{ background: sdg.color }}
                >
                    {sdg.number}
                </span>
            ))}
        </div>
    );
}

export function sdgsForBrowseCard(ids: Array<string | number | null | undefined>, fallbackNumber?: number | null, fallbackTitle?: string | null): BrowseCardSdg[] {
    const seen = new Set<number>();
    const out: BrowseCardSdg[] = [];
    for (const id of ids) {
        const sdg = findSdgById(id);
        if (!sdg || seen.has(sdg.number)) continue;
        seen.add(sdg.number);
        out.push({ number: sdg.number, title: sdg.title, color: sdg.color });
    }
    if (!out.length && fallbackNumber) {
        const sdg = findSdgById(fallbackNumber);
        out.push({
            number: fallbackNumber,
            title: fallbackTitle || sdg?.title || "SDG",
            color: sdg?.color || "#0e7d74",
        });
    }
    return out;
}

export default function BrowseOpportunityCard(props: BrowseOpportunityCardProps) {
    const path = BROWSE_PATH_BY_KEY[props.pathKey];
    const deadline = formatBrowseDeadline(props.deadline);
    const detailsHref = props.detailsHref || `/dashboard/student/browse/${props.id}`;
    const coverStyle = {
        backgroundImage: props.coverUrl
            ? `linear-gradient(180deg, rgba(8,20,24,.15), rgba(8,20,24,.55)), url(${JSON.stringify(props.coverUrl)})`
            : `linear-gradient(135deg, ${path.coverFrom} 0%, ${path.coverTo} 100%)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
    };

    return (
        <article
            className={
                props.viewMode === "list"
                    ? "grid overflow-hidden rounded-2xl border border-[#e2ece9] bg-white shadow-[0_10px_28px_rgba(15,42,48,.06)] md:grid-cols-[220px_1fr]"
                    : "flex h-full flex-col overflow-hidden rounded-2xl border border-[#e2ece9] bg-white shadow-[0_10px_28px_rgba(15,42,48,.06)]"
            }
        >
            <div className={props.viewMode === "list" ? "relative min-h-[140px]" : "relative h-[132px]"} style={coverStyle}>
                <span
                    className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-black ${
                        props.isExpired
                            ? "bg-white text-amber-800"
                            : props.isFull
                              ? "bg-white text-[#2563eb]"
                              : "bg-white/92 text-[#0f6b4a]"
                    }`}
                >
                    {props.isExpired ? "Expired" : props.isFull ? "Full" : "Open"}
                </span>
                <span
                    className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black"
                    style={{ background: "rgba(255,255,255,.94)", color: path.accentText }}
                >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: path.accent }} />
                    {props.pathLabel}
                </span>
            </div>

            <div className="flex flex-1 flex-col p-4">
                <h3 className="text-[15px] font-bold leading-snug text-[#16313d]">{props.title || "Untitled opportunity"}</h3>
                {props.description ? (
                    <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-[#5d7278]">{props.description}</p>
                ) : null}

                <SdgTiles sdgs={props.sdgs} />

                <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-[#6b7c86]">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{props.organizationName || "Partner"}</span>
                    <span className="text-[#c5d0d4]">·</span>
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{props.city || "Remote"}</span>
                    <span className="text-[#c5d0d4]">·</span>
                    <span>{props.modeLabel}</span>
                </p>

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-[#6b7c86]">
                    <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {props.hoursLabel}
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {props.seatsLabel}
                    </span>
                    {deadline ? <span>{deadline}</span> : null}
                </div>

                {props.visibilityTag ? (
                    <p className={`mt-2 text-[11px] font-semibold ${props.visibilityWarn ? "text-[#c2410c]" : "text-[#0f6b4a]"}`}>
                        {props.visibilityTag}
                    </p>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {props.appliedPending ? (
                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0e7d74]">
                            <CheckCircle2 className="h-4 w-4" /> Applied
                        </span>
                    ) : props.reportHref && props.reportLabel ? (
                        <Link href={props.reportHref} className="text-[12px] font-semibold text-[#0e7d74] hover:underline">
                            {props.reportLabel}
                        </Link>
                    ) : props.appliedRejected ? (
                        <span className="text-[11px] font-medium text-rose-700">Application not approved</span>
                    ) : null}
                    {props.showTeam && props.onOpenTeam ? (
                        <button type="button" onClick={props.onOpenTeam} className="text-[12px] font-medium text-[#5d7278] hover:text-[#16313d]">
                            Team
                        </button>
                    ) : null}
                    <button
                        type="button"
                        className="ml-auto text-[#8aa0a6] hover:text-[#16313d]"
                        aria-label="Copy share link"
                        title="Copy share link"
                        onClick={props.onShare}
                    >
                        <Share2 className="h-4 w-4" />
                    </button>
                </div>

                <div className="mt-auto flex flex-col gap-2 pt-3">
                    <Link
                        href={detailsHref}
                        className="inline-flex h-10 items-center justify-center rounded-xl border text-[13px] font-bold"
                        style={{ borderColor: path.accentBorder, color: path.accentText, background: path.accentSoft }}
                    >
                        View Details
                    </Link>
                    {props.showWithdraw ? (
                        <button
                            type="button"
                            onClick={props.onWithdraw}
                            disabled={props.withdrawing}
                            className="h-10 rounded-xl border border-slate-800 bg-white text-[13px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                        >
                            {props.withdrawing ? "Withdrawing…" : "Withdraw"}
                        </button>
                    ) : props.showJoin ? (
                        <button
                            type="button"
                            onClick={() => props.canApplyNow && props.onJoin?.()}
                            disabled={!props.canApplyNow}
                            title={props.joinTitle}
                            className={
                                props.canApplyNow
                                    ? "h-10 rounded-xl text-[13px] font-semibold text-white"
                                    : "h-10 cursor-not-allowed rounded-xl bg-slate-100 text-[13px] font-semibold text-slate-500"
                            }
                            style={props.canApplyNow ? { background: path.accent } : undefined}
                        >
                            {props.isExpired || !props.isFull || props.canApplyNow
                                ? props.joinButtonLabel
                                : "Full"}
                        </button>
                    ) : null}
                </div>
            </div>
        </article>
    );
}
