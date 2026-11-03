import { isPathEntryApproved } from "@/utils/reviewQueue";

/** The one status tab a Startup / Venture record belongs to — shared by the hub and the form page. */
export type VentureBucket = "draft" | "revision" | "review" | "approved" | "rejected";

type BucketInput = {
    status?: string | null;
    reviewPipeline?: { supervisorStatus?: string | null } | null;
};

export function ventureBucket(v: BucketInput): VentureBucket {
    if (v.status !== "submitted") return "draft";
    const line = v.reviewPipeline?.supervisorStatus;
    if (line === "revisions_requested") return "revision";
    if (line === "rejected") return "rejected";
    if (isPathEntryApproved(v as Parameters<typeof isPathEntryApproved>[0])) return "approved";
    return "review";
}

/** Drafts that were never submitted (or were withdrawn) may be deleted. */
export const canDeleteVenture = (v: BucketInput) => ventureBucket(v) === "draft";

/** A submission may be pulled back only while faculty has not decided. */
export const canWithdrawVenture = (v: BucketInput) => {
    const line = v.reviewPipeline?.supervisorStatus;
    return v.status === "submitted" && (!line || line === "pending" || line === "not_started");
};

const BASE = "/dashboard/student/paths/startup-business";

/** Hero counters in tab order. */
export const VENTURE_BUCKET_TABS: { bucket: VentureBucket; label: string; href: string }[] = [
    { bucket: "draft", label: "DRAFTS", href: `${BASE}?view=drafts` },
    { bucket: "revision", label: "REVISION", href: `${BASE}?view=revision` },
    { bucket: "review", label: "UNDER REVIEW", href: `${BASE}?view=under-review` },
    { bucket: "approved", label: "APPROVED", href: `${BASE}?view=wall` },
    { bucket: "rejected", label: "REJECTED", href: `${BASE}?view=rejected` },
];

export function ventureBucketStats(list: BucketInput[]) {
    return VENTURE_BUCKET_TABS.map((t) => ({
        value: String(list.filter((v) => ventureBucket(v) === t.bucket).length),
        label: t.label,
        href: t.href,
    }));
}
