/** Per-venture investor figures the backend attaches as `investorActivity` on venture reads. */
export type InvestorActivity = {
    views: number;
    saves: number;
    interests: number;
    intros: number;
    introsOpen: number;
    introsAccepted: number;
};

export const EMPTY_INVESTOR_ACTIVITY: InvestorActivity = { views: 0, saves: 0, interests: 0, intros: 0, introsOpen: 0, introsAccepted: 0 };

/** The three tiles every stakeholder screen shows. */
export function investorTiles(a?: InvestorActivity | null, introLabel = "Introduction requests"): [string, string][] {
    const x = a ?? EMPTY_INVESTOR_ACTIVITY;
    return [
        [String(x.views), "Card views"],
        [String(x.interests), "Interest received"],
        [String(x.intros), introLabel],
    ];
}

/** Founder-side view of an interest / introduction row (`GET /paths/startup-business/investor-signals`). */
export type FounderSignal = {
    id: string;
    kind: "interest" | "intro";
    status: "pending" | "screened" | "accepted" | "declined" | null;
    note: string | null;
    created_at: string;
    investor: { organisation: string; name: string | null; type: string | null };
};

export const INTRO_STATUS_LABEL: Record<string, string> = {
    pending: "With CIEL PK for screening",
    screened: "Waiting for your decision",
    accepted: "Accepted — contact shared",
    declined: "Declined",
};
