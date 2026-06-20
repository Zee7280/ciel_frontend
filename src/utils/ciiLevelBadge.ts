export type CiiLevelBadge = {
    level: number;
    rangeLabel: string;
    title: string;
    src: string;
    alt: string;
    tagline: string;
    accentClass: string;
};

export type CiiLevelRecognition = {
    level: number;
    rangeLabel: string;
    title: string;
    tagline: string;
    badge: CiiLevelBadge;
};

const LEVEL_TAGLINES: Record<number, string> = {
    1: "Acknowledged for engagement with the CIEL PK community service journey; further completion encouraged to reach certification standard.",
    2: "Recognized for beginning the journey of community contribution with foundational effort and verified participation.",
    3: "Recognized for taking active steps toward community engagement and meaningful social contribution.",
    4: "Recognized for meaningful participation and a developing contribution toward verified community impact.",
    5: "Recognized for delivering strong, evidence-backed contribution with clear community value.",
    6: "Recognized for demonstrating exceptional depth, evidence, and commitment to meaningful impact.",
    7: "Recognized for creating measurable, sustained, and transformative community impact.",
};

function clampCiiScore(score: number): number {
    return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Full level recognition for certificate UI (Levels 1–7). All levels include a badge image.
 */
export function resolveCiiLevelRecognition(score: number): CiiLevelRecognition {
    const badge = resolveCiiLevelBadge(score);
    return {
        level: badge.level,
        rangeLabel: badge.rangeLabel,
        title: badge.title,
        tagline: badge.tagline,
        badge,
    };
}

/**
 * CII level badges (Levels 1–7) per B.1 Seven Levels at a Glance.
 */
export function resolveCiiLevelBadge(score: number): CiiLevelBadge {
    const s = clampCiiScore(score);

    if (s >= 92) {
        return {
            level: 7,
            rangeLabel: "92–100",
            title: "Transformative Impact Contributor",
            src: "/certificate-badges/level-7-transformative-impact-contributor.png",
            alt: "Level 7 — Transformative Impact Contributor badge",
            tagline: LEVEL_TAGLINES[7],
            accentClass: "text-emerald-900",
        };
    }
    if (s >= 84) {
        return {
            level: 6,
            rangeLabel: "84–91",
            title: "Distinguished Impact Contributor",
            src: "/certificate-badges/level-6-distinguished-impact-contributor.png",
            alt: "Level 6 — Distinguished Impact Contributor badge",
            tagline: LEVEL_TAGLINES[6],
            accentClass: "text-violet-900",
        };
    }
    if (s >= 75) {
        return {
            level: 5,
            rangeLabel: "75–83",
            title: "Strong Impact Contributor",
            src: "/certificate-badges/level-5-strong-impact-contributor.png",
            alt: "Level 5 — Strong Impact Contributor badge",
            tagline: LEVEL_TAGLINES[5],
            accentClass: "text-indigo-900",
        };
    }
    if (s >= 67) {
        return {
            level: 4,
            rangeLabel: "67–74",
            title: "Developing Impact Contributor",
            src: "/certificate-badges/level-4-developing-impact-contributor.png",
            alt: "Level 4 — Developing Impact Contributor badge",
            tagline: LEVEL_TAGLINES[4],
            accentClass: "text-teal-800",
        };
    }
    if (s >= 58) {
        return {
            level: 3,
            rangeLabel: "58–66",
            title: "Emerging Community Contributor",
            src: "/certificate-badges/level-3-emerging-community-contributor.png",
            alt: "Level 3 — Emerging Community Contributor badge",
            tagline: LEVEL_TAGLINES[3],
            accentClass: "text-amber-900",
        };
    }
    if (s >= 48) {
        return {
            level: 2,
            rangeLabel: "48–57",
            title: "Foundation Stage Contributor",
            src: "/certificate-badges/level-2-foundation-stage-contributor.png",
            alt: "Level 2 — Foundation Stage Contributor badge",
            tagline: LEVEL_TAGLINES[2],
            accentClass: "text-[#9a4b25]",
        };
    }

    return {
        level: 1,
        rangeLabel: "0–47",
        title: "Participation Acknowledgement",
        src: "/certificate-badges/level-1-participation-acknowledgement.png",
        alt: "Level 1 — Participation Acknowledgement badge",
        tagline: LEVEL_TAGLINES[1],
        accentClass: "text-rose-900",
    };
}

export function resolveCiiLevelTitle(score: number): string {
    return resolveCiiLevelRecognition(score).title;
}
