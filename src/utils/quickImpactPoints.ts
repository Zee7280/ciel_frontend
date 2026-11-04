const ABBREVIATIONS = /^(dr|mr|mrs|ms|prof|st|vs|no|e\.g|i\.e)$/i;

/**
 * Splits an activity description into short highlight lines for the Quick Impact review flashcard.
 * Breaks on new lines and sentence ends, keeps "Dr. Khan" / "e.g." together, drops the final full stop,
 * and uses no regex look-behind (older Safari cannot parse it).
 */
export function impactPoints(text: string | null | undefined): string[] {
    const marked = String(text ?? "").replace(/(\S+?)([.!?]+)\s+/g, (m: string, word: string, punct: string) =>
        ABBREVIATIONS.test(word) ? m : `${word}${punct}\n`,
    );
    return marked
        .split(/\n+/)
        .map((v) => v.trim().replace(/[.!?]+$/, ""))
        .filter(Boolean);
}
