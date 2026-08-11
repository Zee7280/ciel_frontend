/** The impact score never appears without its band label — one source of truth for the mapping. */
export function impactScoreBand(score: number): string {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Strong";
    if (score >= 50) return "Developing";
    if (score >= 25) return "Getting started";
    return "Not started";
}

export function formatImpactScore(score: number): string {
    return `${Math.round(score)} · ${impactScoreBand(score)}`;
}
