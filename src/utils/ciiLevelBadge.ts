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
    badge: CiiLevelBadge | null;
};

const LEVEL_TAGLINES: Record<number, string> = {
    1: "Further completion is encouraged to meet the verified engagement standard for certification.",
    2: "Recognized for beginning the journey of community contribution with foundational effort.",
    3: "Recognized for taking active steps toward community engagement and social contribution.",
    4: "Recognized for meaningful participation and a developing contribution toward verified impact.",
    5: "Recognized for delivering strong, evidence-backed contribution with clear community value.",
    6: "Recognized for demonstrating exceptional depth, evidence, and commitment to meaningful impact.",
    7: "Recognized for creating measurable, sustained, and transformative community impact.",
};

function clampCiiScore(score: number): number {
    return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Full level recognition for certificate UI (Levels 1–7). Level 1 has no badge image.
 */
export function resolveCiiLevelRecognition(score: number): CiiLevelRecognition {
    const s = clampCiiScore(score);

    if (s < 40) {
        return {
            level: 1,
            rangeLabel: "0–39",
            title: "Participation Not Completed",
            tagline: LEVEL_TAGLINES[1],
            badge: null,
        };
    }

    const badge = resolveCiiLevelBadge(s);
    if (!badge) {
        return {
            level: 1,
            rangeLabel: "0–39",
            title: "Participation Not Completed",
            tagline: LEVEL_TAGLINES[1],
            badge: null,
        };
    }

    return {
        level: badge.level,
        rangeLabel: badge.rangeLabel,
        title: badge.title,
        tagline: LEVEL_TAGLINES[badge.level] ?? badge.tagline,
        badge: { ...badge, tagline: LEVEL_TAGLINES[badge.level] ?? badge.tagline },
    };
}

/**
 * CII level badges (Levels 2–7). Level 1 (0–39) is omitted from report print badge UI.
 */
export function resolveCiiLevelBadge(score: number): CiiLevelBadge | null {
    const s = clampCiiScore(score);

    if (s < 40) return null;

    if (s >= 90) {
        return {
            level: 7,
            rangeLabel: "90–100",
            title: "Transformative Impact Contributor",
            src: "/certificate-badges/level-7-transformative-impact-contributor.png",
            alt: "Level 7 — Transformative Impact Contributor badge",
            tagline: LEVEL_TAGLINES[7],
            accentClass: "text-indigo-900",
        };
    }
    if (s >= 80) {
        return {
            level: 6,
            rangeLabel: "80–89",
            title: "Distinguished Impact Contributor",
            src: "/certificate-badges/level-6-distinguished-impact-contributor.png",
            alt: "Level 6 — Distinguished Impact Contributor badge",
            tagline: LEVEL_TAGLINES[6],
            accentClass: "text-violet-900",
        };
    }
    if (s >= 70) {
        return {
            level: 5,
            rangeLabel: "70–79",
            title: "Strong Impact Contributor",
            src: "/certificate-badges/level-5-strong-impact-contributor.png",
            alt: "Level 5 — Strong Impact Contributor badge",
            tagline: LEVEL_TAGLINES[5],
            accentClass: "text-emerald-900",
        };
    }
    if (s >= 60) {
        return {
            level: 4,
            rangeLabel: "60–69",
            title: "Developing Impact Contributor",
            src: "/certificate-badges/level-4-developing-impact-contributor.png",
            alt: "Level 4 — Developing Impact Contributor badge",
            tagline: LEVEL_TAGLINES[4],
            accentClass: "text-teal-800",
        };
    }
    if (s >= 50) {
        return {
            level: 3,
            rangeLabel: "50–59",
            title: "Emerging Community Contributor",
            src: "/certificate-badges/level-3-emerging-community-contributor.png",
            alt: "Level 3 — Emerging Community Contributor badge",
            tagline: LEVEL_TAGLINES[3],
            accentClass: "text-amber-900",
        };
    }

    return {
        level: 2,
        rangeLabel: "40–49",
        title: "Foundation Stage Contributor",
        src: "/certificate-badges/level-2-foundation-stage-contributor.png",
        alt: "Level 2 — Foundation Stage Contributor badge",
        tagline: LEVEL_TAGLINES[2],
        accentClass: "text-[#9a4b25]",
    };
}

export function resolveCiiLevelTitle(score: number): string {
    return resolveCiiLevelRecognition(score).title;
}
