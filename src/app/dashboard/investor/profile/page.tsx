"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InvestorProfileRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/dashboard/investor?view=profile");
    }, [router]);
    return null;
}
