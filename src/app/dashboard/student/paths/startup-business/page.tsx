"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { HubBackButton } from "@/components/ciel/coursework/CourseworkHubChrome";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";
import StartupBusinessHub from "./StartupBusinessHub";
import StartupBusinessWorkspace from "./StartupBusinessWorkspace";

function StartupBusinessRouter() {
    const view = useSearchParams().get("view");
    if (view === "workspace" || view === "create") {
        return (
            <div>
                <div className="mx-auto max-w-[1240px] px-[18px]">
                    <HubBackButton href="/dashboard/student/paths/startup-business" label="← Startup / Venture hub" />
                </div>
                <StartupBusinessWorkspace />
            </div>
        );
    }
    return (
        <StartupBusinessHub
            view={
                view === "guide" || view === "wall" || view === "in-progress" || view === "under-review" || view === "record"
                    ? view
                    : "home"
            }
        />
    );
}

export default function StartupBusinessPage() {
    return (
        <Suspense fallback={<WorkspaceSkeleton />}>
            <StartupBusinessRouter />
        </Suspense>
    );
}
