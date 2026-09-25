type ActivityReachBlock = {
    unique_beneficiaries?: unknown;
    beneficiaries_reached?: unknown;
};

type Section4Reach = {
    project_summary?: { distinct_total_beneficiaries?: unknown } | null;
    distinct_total_beneficiaries?: unknown;
    activity_blocks?: ActivityReachBlock[] | null;
} | null | undefined;

function positiveCount(value: unknown): number {
    const count = Number(String(value ?? "").replace(/,/g, ""));
    return Number.isFinite(count) && count > 0 ? count : 0;
}

/** Saved project total, or the sum of each activity's unique reach. */
export function distinctBeneficiaryTotal(section4: Section4Reach): number {
    const stored = positiveCount(
        section4?.project_summary?.distinct_total_beneficiaries ?? section4?.distinct_total_beneficiaries,
    );
    if (stored) return stored;
    const blocks = Array.isArray(section4?.activity_blocks) ? section4.activity_blocks : [];
    return blocks.reduce((sum, block) => {
        return sum + positiveCount(block?.unique_beneficiaries || block?.beneficiaries_reached);
    }, 0);
}
