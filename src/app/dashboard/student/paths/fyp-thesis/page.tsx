"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { HubBackButton } from "@/components/ciel/coursework/CourseworkHubChrome";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";
import FypThesisHub from "./FypThesisHub";
import FypThesisWorkspace from "./FypThesisWorkspace";

function FypThesisRouter() {
    const view = useSearchParams().get("view");
    if (view === "workspace") {
    return (
            <div>
                <div className="mx-auto max-w-[1040px]">
                    <HubBackButton href="/dashboard/student/paths/fyp-thesis" label="← FYP / Thesis hub" />
                </div>
                <FypThesisWorkspace />
        </div>
    );
}
    return <FypThesisHub view={view === "guide" || view === "wall" ? view : "home"} />;
}

export default function FypThesisPage() {
    return (
        <Suspense fallback={<WorkspaceSkeleton />}>
            <FypThesisRouter />
        </Suspense>
    );
}
