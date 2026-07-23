import type { Section1AnalyticsFieldMeta } from "@/utils/section1Analytics";

export type AnalyticsCategory = Section1AnalyticsFieldMeta["category"];

export const ANALYTICS_CATEGORY_ORDER: AnalyticsCategory[] = [
    "basic",
    "premium",
    "restricted",
];

export const ANALYTICS_CATEGORY_LABELS: Record<AnalyticsCategory, string> = {
    basic: "Basic",
    premium: "Premium",
    restricted: "Restricted",
};

export const ANALYTICS_CATEGORY_DESCRIPTIONS: Record<AnalyticsCategory, string> = {
    basic: "Core operational metrics visible across standard stakeholder views",
    premium: "Deeper readiness, quality, and compliance scorecards",
    restricted: "Admin / audit-only signals — sensitive or risk-oriented",
};

/** Card chrome + band accents for Basic / Premium / Restricted. */
export function categoryCardClasses(category?: AnalyticsCategory): string {
    switch (category) {
        case "premium":
            return "border-l-[3px] border-l-amber-500 bg-amber-50/30";
        case "restricted":
            return "border-l-[3px] border-l-rose-500 bg-rose-50/40";
        case "basic":
        default:
            return "border-l-[3px] border-l-slate-400 bg-white";
    }
}

export function categoryPillClasses(category?: AnalyticsCategory): string {
    switch (category) {
        case "premium":
            return "bg-amber-100 text-amber-900 ring-1 ring-amber-200/80";
        case "restricted":
            return "bg-rose-100 text-rose-900 ring-1 ring-rose-200/80";
        case "basic":
        default:
            return "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80";
    }
}

export function categoryBandHeaderClasses(category: AnalyticsCategory): string {
    switch (category) {
        case "premium":
            return "border-amber-200 bg-gradient-to-r from-amber-50 to-white";
        case "restricted":
            return "border-rose-200 bg-gradient-to-r from-rose-50 to-white";
        case "basic":
        default:
            return "border-slate-200 bg-gradient-to-r from-slate-50 to-white";
    }
}

export function categoryAccentDot(category: AnalyticsCategory): string {
    switch (category) {
        case "premium":
            return "bg-amber-500";
        case "restricted":
            return "bg-rose-500";
        case "basic":
        default:
            return "bg-slate-500";
    }
}

export function categoryTabActiveClasses(category: AnalyticsCategory | "all"): string {
    if (category === "all") return "border-slate-900 bg-slate-900 text-white";
    switch (category) {
        case "premium":
            return "border-amber-600 bg-amber-600 text-white";
        case "restricted":
            return "border-rose-600 bg-rose-600 text-white";
        case "basic":
        default:
            return "border-slate-700 bg-slate-700 text-white";
    }
}
