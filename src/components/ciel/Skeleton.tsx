"use client";

import clsx from "clsx";

export function SkeletonBlock({ className }: { className?: string }) {
    return <div className={clsx("animate-pulse rounded-ciel-sm bg-ciel-border/70", className)} />;
}

export function WorkspaceSkeleton() {
    return (
        <div className="mx-auto max-w-[1440px] animate-pulse">
            <div className="flex items-center justify-between gap-4">
                <SkeletonBlock className="h-8 w-56" />
                <SkeletonBlock className="h-10 w-40" />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
                {[1, 2, 3].map((i) => (
                    <SkeletonBlock key={i} className="h-20 min-w-[10rem] flex-1" />
                ))}
            </div>
            <SkeletonBlock className="mt-6 h-10 w-full max-w-md" />
            <SkeletonBlock className="mt-6 h-64 w-full" />
        </div>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="mx-auto max-w-[1440px] animate-pulse space-y-6">
            <SkeletonBlock className="h-7 w-64" />
            <SkeletonBlock className="h-40 w-full" />
            <SkeletonBlock className="h-28 w-full" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                    <SkeletonBlock key={i} className="h-32" />
                ))}
            </div>
        </div>
    );
}
