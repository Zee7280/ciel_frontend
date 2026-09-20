"use client";

import { Suspense, useEffect, useState } from "react";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { readPartnerOrgKind, type PartnerOrgKind } from "@/utils/partnerOrgKind";
import UniversityCommunityServiceHub from "./UniversityCommunityServiceHub";
import NgoCommunityServiceHub from "./NgoCommunityServiceHub";
import PartnerCommunityServiceHub from "./PartnerCommunityServiceHub";

export default function PartnerCommunityServicePage() {
    return (
        <Suspense fallback={<div className="mx-auto max-w-[1240px] py-16 text-center text-sm text-[#71828e]">Loading community service…</div>}>
            <CommunityServiceRoleSwitch />
        </Suspense>
    );
}

function CommunityServiceRoleSwitch() {
    const [ready, setReady] = useState(false);
    const [kind, setKind] = useState<PartnerOrgKind>("partner");

    useEffect(() => {
        const user = readStoredCurrentUser() as {
            orgType?: string;
            organization_type?: string;
            type?: string;
            role?: string;
        } | null;
        setKind(readPartnerOrgKind(user));
        setReady(true);
    }, []);

    if (!ready) {
        return <div className="mx-auto max-w-[1240px] py-16 text-center text-sm text-[#71828e]">Loading community service…</div>;
    }
    if (kind === "university") return <UniversityCommunityServiceHub />;
    if (kind === "ngo") return <NgoCommunityServiceHub />;
    return <PartnerCommunityServiceHub />;
}
