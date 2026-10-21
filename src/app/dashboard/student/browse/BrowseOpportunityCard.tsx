"use client";

import Link from "next/link";
import { CheckCircle2, Share2 } from "lucide-react";
import { findSdgById } from "@/utils/sdgData";
import { BROWSE_PATH_BY_KEY, browseDaysLeftLabel, type BrowsePathKey } from "@/utils/browseOpportunityPath";

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
    facultyName?: string | null;
    categoryLabel?: string | null;
    seatsFilledLabel?: string | null;
    /** Who posted the listing; same classification as the browse "posted by" filter. */
    creatorLabel?: "Student" | "Faculty" | "NGO" | "Partner" | "CIEL PK" | null;
};

const CREATOR_ICON: Record<NonNullable<BrowseOpportunityCardProps["creatorLabel"]>, string> = {
    Student: "🎓",
    Faculty: "🏛",
    NGO: "🤝",
    Partner: "🏢",
    "CIEL PK": "⭐",
};

function SdgLine({ sdgs }: { sdgs: BrowseCardSdg[] }) {
    if (!sdgs.length) return <span className="text-[#8aa0a6]">—</span>;
    return (
        <span className="font-semibold text-[#16313d]">
            {sdgs.slice(0, 2).map((s) => `SDG ${s.number}`).join(", ")}
        </span>
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
    const daysLeft = browseDaysLeftLabel(props.deadline);
    const detailsHref = props.detailsHref || `/dashboard/student/browse/${props.id}`;
    const statusLabel = props.isExpired
        ? "EXPIRED"
        : props.appliedPending
          ? "APPLIED"
          : props.isFull
            ? "FULL"
            : "LIVE";
    const headerBg = props.isExpired
        ? "linear-gradient(135deg, #64748b 0%, #94a3b8 100%)"
        : `linear-gradient(135deg, ${path.coverFrom} 0%, ${path.coverTo} 100%)`;

    return (
        <article
            className={
                props.viewMode === "list"
                    ? "grid overflow-hidden rounded-[18px] border border-[#dce8e6] bg-white shadow-[0_8px_22px_rgba(15,42,48,.06)] md:grid-cols-[minmax(220px,280px)_1fr]"
                    : "flex h-full flex-col overflow-hidden rounded-[18px] border border-[#dce8e6] bg-white shadow-[0_8px_22px_rgba(15,42,48,.06)]"
            }
        >
            <div
                className={props.viewMode === "list" ? "relative min-h-[128px] p-4" : "relative px-4 pb-4 pt-3.5"}
                style={{ background: headerBg }}
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-white/18 px-2 py-0.5 text-[9px] font-black tracking-wide text-white">
                            ● {statusLabel}
                        </span>
                        {props.creatorLabel ? (
                            <span
                                className="rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-black text-[#16313d]"
                                title={`Posted by ${props.creatorLabel}`}
                            >
                                {CREATOR_ICON[props.creatorLabel]} {props.creatorLabel}
                            </span>
                        ) : null}
                    </div>
                    {daysLeft ? (
                        <span className="rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-black text-[#0f5e57]">
                            {daysLeft}
                        </span>
                    ) : null}
                </div>
                <h3 className="mt-3 text-[15px] font-extrabold leading-snug text-white">{props.title || "Untitled opportunity"}</h3>
                <p className="mt-1 truncate text-[11px] text-white/80">
                    {props.city || "Remote"}
                    {props.modeLabel ? ` · ${props.modeLabel}` : ""}
                </p>
            </div>

            <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    <p>
                        <span className="text-[#8aa0a6]">Hours</span>
                        <br />
                        <span className="font-semibold text-[#16313d]">
                            {String(props.hoursLabel).replace(/\s*hrs?$/i, "")} verified hrs
                        </span>
                    </p>
                    <p>
                        <span className="text-[#8aa0a6]">Seats</span>
                        <br />
                        <span className="font-semibold text-[#16313d]">{props.seatsFilledLabel || props.seatsLabel}</span>
                    </p>
                    <p>
                        <span className="text-[#8aa0a6]">SDG</span>
                        <br />
                        <SdgLine sdgs={props.sdgs} />
                    </p>
                    <p>
                        <span className="text-[#8aa0a6]">Faculty</span>
                        <br />
                        <span className="truncate font-semibold text-[#16313d]">{props.facultyName || "—"}</span>
                    </p>
                    <p>
                        <span className="text-[#8aa0a6]">{props.creatorLabel === "NGO" ? "NGO" : "Partner"}</span>
                        <br />
                        <span className="truncate font-semibold text-[#16313d]">{props.organizationName || "—"}</span>
                    </p>
                    <p>
                        <span className="text-[#8aa0a6]">Category</span>
                        <br />
                        <span className="truncate font-semibold text-[#16313d]">{props.categoryLabel || props.pathLabel}</span>
                    </p>
                </div>

                {props.description ? (
                    <p className="mt-2.5 line-clamp-2 text-[12px] leading-relaxed text-[#5d7278]">{props.description}</p>
                ) : null}

                {props.visibilityTag ? (
                    <p className={`mt-2 text-[11px] font-semibold ${props.visibilityWarn ? "text-[#c2410c]" : "text-[#0f6b4a]"}`}>
                        {props.visibilityTag}
                    </p>
                ) : null}

                <div className="mt-2 flex flex-wrap items-center gap-2">
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

                <div className="mt-auto flex gap-2 pt-3">
                    {props.showWithdraw ? (
                        <button
                            type="button"
                            onClick={props.onWithdraw}
                            disabled={props.withdrawing}
                            className="h-9 flex-1 rounded-lg border border-slate-800 bg-white text-[12px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
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
                                    ? "h-9 flex-1 rounded-lg bg-[#0e7d74] text-[12px] font-semibold text-white hover:bg-[#0c6b64]"
                                    : "h-9 flex-1 cursor-not-allowed rounded-lg bg-slate-100 text-[12px] font-semibold text-slate-500"
                            }
                        >
                            {(() => {
                                const label =
                                    props.isExpired || !props.isFull || props.canApplyNow
                                        ? props.joinButtonLabel
                                        : "Full";
                                return label === "Join Opportunity" ? "Apply now" : label;
                            })()}
                        </button>
                    ) : (
                        <span className="h-9 flex-1" />
                    )}
                    <Link
                        href={detailsHref}
                        className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-[#cfe3de] bg-white text-[12px] font-semibold text-[#0f5e57] hover:bg-[#f3fbf9]"
                    >
                        Details
                    </Link>
                </div>
            </div>
        </article>
    );
}
