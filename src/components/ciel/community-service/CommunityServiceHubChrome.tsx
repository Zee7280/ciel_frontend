"use client";

import { CourseworkHero, HubBackButton, HubTile } from "@/components/ciel/coursework/CourseworkHubChrome";

export { CourseworkHero as CommunityHero, HubBackButton, HubTile };

export function CommunityCrumb({ role, view }: { role: string; view?: string }) {
    return (
        <p className="text-[13px] text-[#71828e]">
            {role} Dashboard / <b className="font-semibold text-[#183140]">Community Service</b>
            {view ? (
                <>
                    {" / "}
                    <b className="font-semibold text-[#183140]">{view}</b>
                </>
            ) : null}
        </p>
    );
}
