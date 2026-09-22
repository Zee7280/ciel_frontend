"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { enforceStudentSession } from "@/utils/api";

/** Sends an expired student session to login, including pages that never call the API. */
export default function StudentSessionGuard() {
    const pathname = usePathname();

    useEffect(() => {
        if (!pathname.startsWith("/dashboard/student")) return;

        enforceStudentSession();

        const check = () => {
            if (document.visibilityState === "hidden") return;
            enforceStudentSession();
        };

        window.addEventListener("focus", check);
        document.addEventListener("visibilitychange", check);
        const timer = window.setInterval(check, 30_000);

        return () => {
            window.removeEventListener("focus", check);
            document.removeEventListener("visibilitychange", check);
            window.clearInterval(timer);
        };
    }, [pathname]);

    return null;
}
