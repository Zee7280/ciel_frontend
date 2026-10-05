import { listingIsExpiredFromPayload } from "@/utils/studentApplyMaintenance";

export type MarketplaceStatus = "live" | "closing" | "upcoming" | "expired";

export type MarketplaceListingDates = {
    start_date?: string | null;
    end_date?: string | null;
    adminExpired?: boolean;
    applicationsOpen?: boolean;
    applyBlockedReason?: string | null;
};

const DAY_MS = 86_400_000;
/** Mockup production rule: Closing Soon when 3–5 days remain. Use 5 so the last week still surfaces. */
export const MARKETPLACE_CLOSING_SOON_DAYS = 5;

export function startOfLocalDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function parseMarketplaceDay(value: string | null | undefined): Date | null {
    if (!value) return null;
    const iso = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return startOfLocalDay(parsed);
}

export function daysBetween(from: Date, to: Date): number {
    return Math.round((startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime()) / DAY_MS);
}

export function classifyMarketplaceStatus(row: MarketplaceListingDates, now = new Date()): MarketplaceStatus {
    if (
        listingIsExpiredFromPayload({
            admin_expired: row.adminExpired === true,
            apply_blocked_reason: row.applyBlockedReason,
            applications_open: row.applicationsOpen,
        })
    ) {
        return "expired";
    }
    const today = startOfLocalDay(now);
    const start = parseMarketplaceDay(row.start_date);
    const end = parseMarketplaceDay(row.end_date);
    if (end && end.getTime() < today.getTime()) return "expired";
    if (start && start.getTime() > today.getTime()) return "upcoming";
    if (end) {
        const left = daysBetween(today, end);
        if (left >= 0 && left <= MARKETPLACE_CLOSING_SOON_DAYS) return "closing";
    }
    return "live";
}

export function marketplaceStatusLabel(status: MarketplaceStatus): string {
    if (status === "closing") return "Closing Soon";
    if (status === "upcoming") return "Upcoming";
    if (status === "expired") return "Expired";
    return "Live Now";
}

export function marketplaceTimingLabel(row: MarketplaceListingDates, now = new Date()): string {
    const status = classifyMarketplaceStatus(row, now);
    const today = startOfLocalDay(now);
    const start = parseMarketplaceDay(row.start_date);
    const end = parseMarketplaceDay(row.end_date);
    if (status === "upcoming" && start) {
        const days = Math.max(1, daysBetween(today, start));
        return `Starts in ${days} Day${days === 1 ? "" : "s"}`;
    }
    if (status === "expired" && end) {
        return `Ended ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
    }
    if (end) {
        const left = Math.max(0, daysBetween(today, end));
        return `${left} Day${left === 1 ? "" : "s"} Left`;
    }
    return status === "expired" ? "Ended" : "Open";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDay(d: Date): string {
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatMarketplaceDateRange(start?: string | null, end?: string | null): string | null {
    const startDay = parseMarketplaceDay(start);
    const endDay = parseMarketplaceDay(end);
    if (!startDay && !endDay) return null;
    if (startDay && endDay) return `${formatDay(startDay)} – ${formatDay(endDay)}`;
    if (startDay) return `From ${formatDay(startDay)}`;
    return `Until ${formatDay(endDay!)}`;
}

export function marketplaceDurationDays(start?: string | null, end?: string | null): number | null {
    const startDay = parseMarketplaceDay(start);
    const endDay = parseMarketplaceDay(end);
    if (!startDay || !endDay) return null;
    return Math.max(1, daysBetween(startDay, endDay) + 1);
}
