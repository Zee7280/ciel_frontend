/**
 * Removes the emoji / symbol prefix from a chip label ("⏰ Not enough time" → "Not enough time").
 *
 * Only a first token with no letters or digits is dropped, so a label without an emoji keeps its
 * first word: "No significant challenges" stays as it is (the old `replace(/^[^\s]+\s/, "")` turned
 * it into "significant challenges").
 */
export function stripLeadingEmoji(label: string | null | undefined): string {
    const text = String(label ?? "").trim();
    const match = text.match(/^(\S+)\s+/);
    if (!match) return text;
    return /[\p{L}\p{N}]/u.test(match[1]) ? text : text.slice(match[0].length).trim();
}
