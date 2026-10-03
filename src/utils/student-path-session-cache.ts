import { useSyncExternalStore } from "react";

const memory = new Map<string, unknown>();
const fetchedAt = new Map<string, number>();
const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((listener) => listener());
}

function subscribe(onStoreChange: () => void) {
    listeners.add(onStoreChange);
    return () => listeners.delete(onStoreChange);
}

export function setPathSessionCache<T>(key: string, value: T): void {
    memory.set(key, value);
    fetchedAt.set(key, Date.now());
    emit();
}

export function getPathSessionCache<T>(key: string): T | null {
    if (!memory.has(key)) return null;
    return memory.get(key) as T;
}

export function pathSessionCacheAgeMs(key: string): number {
    const at = fetchedAt.get(key);
    return at ? Date.now() - at : Number.POSITIVE_INFINITY;
}

export function clearPathSessionCache(key?: string): void {
    if (key) {
        memory.delete(key);
        fetchedAt.delete(key);
    } else {
        memory.clear();
        fetchedAt.clear();
    }
    emit();
}

/** Hydration-safe session memory for path hubs (coursework / FYP / venture). */
export function usePathSessionCache<T>(key: string): T | null {
    return useSyncExternalStore(
        subscribe,
        () => getPathSessionCache<T>(key),
        () => null,
    );
}
