"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { readPartnerOrgKind, type PartnerOrgKind } from "@/utils/partnerOrgKind";
import NgoDashboardHome from "./NgoDashboardHome";
import UniversityDashboardHome from "./UniversityDashboardHome";

export default function PartnerDashboard() {
    const [orgKind, setOrgKind] = useState<PartnerOrgKind | null>(null);

    useEffect(() => {
        setOrgKind(readPartnerOrgKind(readStoredCurrentUser()));
    }, []);

    if (!orgKind) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-[#0e7d74]" />
            </div>
        );
    }

    if (orgKind === "university") {
        return <UniversityDashboardHome />;
    }

    // NGO, HEC / Government and corporate partners share one home: they create opportunities,
    // approve work that names them and track verified impact the same way.
    return <NgoDashboardHome />;
}
