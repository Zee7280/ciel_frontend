"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type ChromeMethods = {
    register: () => void;
    unregister: () => void;
};

const MethodsContext = createContext<ChromeMethods | null>(null);
const FlagContext = createContext(false);

/** Lets hub pages keep their mockup crumb/hero while the sticky header drops the duplicate path. */
export function DashboardChromeProvider({ children }: { children: ReactNode }) {
    const [count, setCount] = useState(0);
    const methods = useMemo<ChromeMethods>(
        () => ({
            register: () => setCount((n) => n + 1),
            unregister: () => setCount((n) => Math.max(0, n - 1)),
        }),
        [],
    );
    return (
        <MethodsContext.Provider value={methods}>
            <FlagContext.Provider value={count > 0}>{children}</FlagContext.Provider>
        </MethodsContext.Provider>
    );
}

export function useHasDashboardPageChrome() {
    return useContext(FlagContext);
}

export function useRegisterDashboardPageChrome() {
    const methods = useContext(MethodsContext);
    const register = methods?.register;
    const unregister = methods?.unregister;
    useEffect(() => {
        if (!register || !unregister) return;
        register();
        return unregister;
    }, [register, unregister]);
}

export function DashboardPageChrome() {
    useRegisterDashboardPageChrome();
    return null;
}
