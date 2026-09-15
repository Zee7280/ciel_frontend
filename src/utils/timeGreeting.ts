/** Same greeting as the student dashboard: morning / afternoon / evening by local time. */

export function timeOfDayGreeting(): "Good morning" | "Good afternoon" | "Good evening" {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

function displayFirstName(name?: string | null): string {
    const first = typeof name === "string" ? name.trim().split(/\s+/)[0] : "";
    if (!first) return "";
    if (first === first.toUpperCase() && /[A-Za-z]/.test(first)) {
        return first.charAt(0) + first.slice(1).toLowerCase();
    }
    return first;
}

/** e.g. `Good evening, Fatima 🌍` — omit name if empty. */
export function namedTimeGreeting(name?: string | null, emoji?: string): string {
    const phrase = timeOfDayGreeting();
    const first = displayFirstName(name);
    const base = first ? `${phrase}, ${first}` : phrase;
    return emoji ? `${base} ${emoji}` : base;
}
