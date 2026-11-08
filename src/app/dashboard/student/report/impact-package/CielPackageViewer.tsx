"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import type { CielPackageSnapshot, PackageAudience } from "./buildCielPackageSnapshot";

/** Static viewer served from `public/` (built from CIEL_Report_Package.html by scratch make_template). */
export const CIEL_PACKAGE_VIEWER_PATH = "/ciel-impact-package.html";

export type ViewerTab = "flash" | "report" | "evidence";

export type ViewerActions = { analyzer: boolean; save: boolean; print: boolean };

/** The read-only API the template exposes on its window (see `window.CIELPackage` in the template). */
export type CielPackageViewerApi = {
    load: (raw: unknown) => void;
    setAllowedTabs: (tabs: string[]) => void;
    setActions?: (actions: Partial<ViewerActions>) => void;
    getAnalyzerPacket?: () => unknown;
    getAttendance?: () => unknown;
};

/**
 * Which tabs a role may open — same rules as the in-app package
 * (`shouldShowImpactPackageDetailedReport`): the student sees the compiled detailed report only
 * after CIEL PK approval, every reviewer role sees it for review. `previewAll` is the student's
 * own pre-submit "Generate my Package" check, where seeing every tab is the point.
 */
export function viewerTabsForRole(
    role: PackageAudience,
    opts: { adminApproved: boolean; previewAll?: boolean },
): ViewerTab[] {
    if (opts.previewAll) return ["flash", "report", "evidence"];
    if (role === "student" && !opts.adminApproved) return ["flash", "evidence"];
    return ["flash", "report", "evidence"];
}

/** Analyzer packet export is a CIEL PK Admin tool. Partner / public never save a local copy. */
export function viewerActionsForRole(role: PackageAudience): ViewerActions {
    return {
        analyzer: role === "admin",
        save: role !== "partner" && role !== "public",
        print: true,
    };
}

export function readViewerApi(frame: HTMLIFrameElement | null): CielPackageViewerApi | null {
    const win = frame?.contentWindow as (Window & { CIELPackage?: CielPackageViewerApi }) | null | undefined;
    return win?.CIELPackage && typeof win.CIELPackage.load === "function" ? win.CIELPackage : null;
}

type Props = {
    open: boolean;
    onClose: () => void;
    snapshot: CielPackageSnapshot | null;
    role: PackageAudience;
    tabs: ViewerTab[];
    title?: string;
    eyebrow?: string;
    /** Rendered in the bottom bar; receives whether the package finished loading. */
    footer?: (state: { ready: boolean }) => React.ReactNode;
};

export default function CielPackageViewer({ open, onClose, snapshot, role, tabs, title, eyebrow, footer }: Props) {
    const frameRef = useRef<HTMLIFrameElement | null>(null);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState("");

    const loadIntoViewer = useCallback(() => {
        const api = readViewerApi(frameRef.current);
        if (!api || !snapshot) {
            setError("The package viewer did not start. Please close and try again.");
            return;
        }
        try {
            api.load(snapshot);
            api.setAllowedTabs(tabs);
            api.setActions?.(viewerActionsForRole(role));
            setReady(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load the package.");
        }
    }, [snapshot, tabs, role]);

    useEffect(() => {
        if (!open) {
            setReady(false);
            setError("");
            return;
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    if (!open || typeof document === "undefined") return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[120] flex flex-col bg-slate-900/70 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={title || "Impact package"}
        >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
                <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {eyebrow || "Built from the saved report"}
                    </p>
                    <h3 className="truncate text-sm font-semibold text-slate-900">{title || "Impact Package"}</h3>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    aria-label="Close package"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="relative min-h-0 flex-1 bg-white">
                <iframe
                    ref={frameRef}
                    src={CIEL_PACKAGE_VIEWER_PATH}
                    title="CIEL PK impact package"
                    className="h-full w-full border-0"
                    onLoad={loadIntoViewer}
                />
                {!ready && !error ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/90 text-sm font-medium text-slate-500">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building the package…
                    </div>
                ) : null}
                {error ? (
                    <div role="alert" className="absolute inset-x-0 top-0 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700">
                        {error}
                    </div>
                ) : null}
            </div>

            {footer ? (
                <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    {footer({ ready })}
                </div>
            ) : null}
        </div>,
        document.body,
    );
}
