"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";
import FypThesisHub from "./FypThesisHub";
import FypV9Workspace from "./FypV9Workspace";

function FypThesisRouter() {
    const view = useSearchParams().get("view");
    if (view === "workspace") return <FypV9Workspace />;
    return (
        <FypThesisHub
            view={
                view === "guide" || view === "wall" || view === "in-progress" || view === "under-review"
                    ? view
                    : "home"
            }
        />
    );
}

export default function FypThesisPage() {
    return (
        <Suspense fallback={<WorkspaceSkeleton />}>
            <FypThesisRouter />
        </Suspense>
    );
}
