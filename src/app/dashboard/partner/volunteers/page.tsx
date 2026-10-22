"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy URL — it only ever showed placeholder people; the real roster lives on Participants. */
export default function PartnerVolunteersPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/dashboard/partner/participants");
    }, [router]);
    return null;
}
