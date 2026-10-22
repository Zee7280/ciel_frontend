"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VentureStakeholderHub from "@/components/ciel/venture/VentureStakeholderHub";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { readPartnerOrgKind } from "@/utils/partnerOrgKind";

export default function UniversityStartupBusinessPage() {
    const router = useRouter();
    const [isUniversity, setIsUniversity] = useState<boolean | null>(null);

    useEffect(() => {
        const university = readPartnerOrgKind(readStoredCurrentUser()) === "university";
        setIsUniversity(university);
        // Ventures are a university impact area; NGOs and other partners have no data here.
        if (!university) router.replace("/dashboard/partner");
    }, [router]);

    if (!isUniversity) return null;
    return <VentureStakeholderHub variant="university" />;
}
