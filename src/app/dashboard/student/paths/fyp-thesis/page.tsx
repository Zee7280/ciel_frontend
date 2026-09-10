"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";
import FypThesisHub from "./FypThesisHub";

function FypThesisRouter() {
    const view = useSearchParams().get("view");
    return (
        <FypThesisHub
            view={
                view === "guide" ||
                view === "wall" ||
                view === "in-progress" ||
                view === "under-review" ||
                view === "create"
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
