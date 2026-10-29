/** Same greeting as the student dashboard: morning / afternoon / evening by local time. */

import { useSyncExternalStore } from "react";

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

function withName(phrase: string, name?: string | null, emoji?: string): string {
    const first = displayFirstName(name);
    const base = first ? `${phrase}, ${first}` : phrase;
    return emoji ? `${base} ${emoji}` : base;
}

/** e.g. `Good evening, Fatima 🌍` — omit name if empty. */
export function namedTimeGreeting(name?: string | null, emoji?: string): string {
    return withName(timeOfDayGreeting(), name, emoji);
}

const subscribeNever = () => () => {};

/**
 * The greeting as page text. The server (and the first client render, while hydrating) cannot know
 * the reader's local time, so both say "Welcome, …"; the time-of-day wording appears right after,
 * instead of a hydration mismatch (React #418) that re-renders the whole page.
 */
export function TimeGreeting({ name, emoji }: { name?: string | null; emoji?: string }): string {
    return useSyncExternalStore(
        subscribeNever,
        () => namedTimeGreeting(name, emoji),
        () => withName("Welcome", name, emoji),
    );
}
