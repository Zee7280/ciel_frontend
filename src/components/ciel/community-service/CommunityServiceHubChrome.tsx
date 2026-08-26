"use client";

import { CourseworkHero, HubBackButton, HubTile } from "@/components/ciel/coursework/CourseworkHubChrome";

export { CourseworkHero as CommunityHero, HubBackButton, HubTile };

export function CommunityCrumb({ role, view }: { role: string; view?: string }) {
    return (
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7a919a]">
            {role} Dashboard → <span className="text-[#0e7d74]">Community Service</span>
            {view ? <> → {view}</> : null}
        </p>
    );
}
