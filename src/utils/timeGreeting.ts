/** Same greeting as the student dashboard: morning / afternoon / evening by local time. */

export function timeOfDayGreeting(): "Good morning" | "Good afternoon" | "Good evening" {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

/** e.g. `Good evening, Fatima 🌍` — omit name if empty. */
export function namedTimeGreeting(name?: string | null, emoji?: string): string {
    const phrase = timeOfDayGreeting();
    const first = typeof name === "string" ? name.trim().split(/\s+/)[0] : "";
    const base = first ? `${phrase}, ${first}` : phrase;
    return emoji ? `${base} ${emoji}` : base;
}
