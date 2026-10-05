"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { readPartnerOrgKind } from "@/utils/partnerOrgKind";

/** Legacy metrics URL — My Impact Wall is the published Community Service flash deck. */
export default function PartnerImpactPage() {
    const router = useRouter();
    useEffect(() => {
        const kind = readPartnerOrgKind(readStoredCurrentUser());
        router.replace(
            kind === "university"
                ? "/dashboard/partner/community-service?view=wall"
                : "/dashboard/partner/community-service?view=impact",
        );
    }, [router]);
    return null;
}
