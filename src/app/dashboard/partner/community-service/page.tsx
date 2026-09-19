"use client";

import { Suspense, useEffect, useState } from "react";
import { readStoredCurrentUser } from "@/utils/currentUser";
import UniversityCommunityServiceHub from "./UniversityCommunityServiceHub";
import NgoCommunityServiceHub from "./NgoCommunityServiceHub";

function isUniversityAccount(user: { orgType?: string; organization_type?: string; type?: string } | null) {
    return String(user?.orgType || user?.organization_type || user?.type || "")
        .toLowerCase()
        .includes("university");
}

export default function PartnerCommunityServicePage() {
    return (
        <Suspense fallback={<div className="mx-auto max-w-[1240px] py-16 text-center text-sm text-[#71828e]">Loading community service…</div>}>
            <CommunityServiceRoleSwitch />
        </Suspense>
    );
}

function CommunityServiceRoleSwitch() {
    const [ready, setReady] = useState(false);
    const [isUni, setIsUni] = useState(false);

    useEffect(() => {
        const user = readStoredCurrentUser() as { orgType?: string; organization_type?: string; type?: string } | null;
        setIsUni(isUniversityAccount(user));
        setReady(true);
    }, []);

    if (!ready) {
        return <div className="mx-auto max-w-[1240px] py-16 text-center text-sm text-[#71828e]">Loading community service…</div>;
    }
    return isUni ? <UniversityCommunityServiceHub /> : <NgoCommunityServiceHub />;
}
