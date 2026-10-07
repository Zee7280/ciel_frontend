export function flowSteps(raw: string): string[] {
    const lines = raw
        .split(/\n+/)
        .map((s) => s.replace(/^[\s•\-*]+/, "").replace(/^step\s*\d+\s*[:.)-]?\s*/i, "").trim())
        .filter(Boolean);
    if (lines.length === 0) return ["Responsibilities will be confirmed with selected students."];
    const maxSteps = 8;
    if (lines.length <= maxSteps) return lines;
    return [...lines.slice(0, maxSteps - 1), lines.slice(maxSteps - 1).join(" ")];
}
