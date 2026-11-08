"use client";

import React, { useCallback, useState } from "react";
import { Loader2, Lock, Package } from "lucide-react";
import type { ReportData } from "../context/ReportContext";
import type { ImpactPackageModel } from "./buildImpactPackageModel";
import type { CielPackageSnapshot } from "./buildCielPackageSnapshot";
import CielPackageViewer, { viewerTabsForRole } from "./CielPackageViewer";
import { buildViewerSnapshotForModel } from "./OpenPackageViewerButton";

export { CIEL_PACKAGE_VIEWER_PATH } from "./CielPackageViewer";

/**
 * `ready`   — the student can submit from the package now (same gate as the footer "Submit report");
 * `blocked` — the report is still missing hours / sections / the declaration;
 * `none`    — already submitted, awaiting review or approved: preview / save only.
 */
export type GenerateMyPackageSubmitMode = "ready" | "blocked" | "none";

type Props = {
    data: ReportData;
    projectData?: unknown;
    model: ImpactPackageModel;
    submitMode: GenerateMyPackageSubmitMode;
    /** True while the report page is saving / submitting. */
    submitting?: boolean;
    /** Opens the same "Submit Report?" confirmation the footer button uses. */
    onSubmit?: () => void;
};

/** Student's own "Generate my Package" preview before (or after) final submit. */
export default function GenerateMyPackage({ data, projectData, model, submitMode, submitting = false, onSubmit }: Props) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [snapshot, setSnapshot] = useState<CielPackageSnapshot | null>(null);

    const generate = useCallback(() => {
        setBusy(true);
        setError("");
        try {
            setSnapshot(buildViewerSnapshotForModel({ data, projectData, audience: "student", model }));
            setOpen(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not build the package.");
        } finally {
            setBusy(false);
        }
    }, [data, projectData, model]);

    const canSubmit = submitMode === "ready" && typeof onSubmit === "function";

    return (
        <>
            <button
                type="button"
                className="primary"
                onClick={generate}
                disabled={busy}
                title="Build the package CIEL PK will review from your saved report and check every tab before submitting"
                data-testid="generate-my-package"
            >
                <span className="button-content inline-flex items-center gap-1.5">
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
                    Generate my Package
                </span>
            </button>
            {error && !open ? (
                <span role="alert" className="text-xs font-medium text-rose-700">
                    {error}
                </span>
            ) : null}

            <CielPackageViewer
                open={open}
                onClose={() => setOpen(false)}
                snapshot={snapshot}
                role="student"
                // The student's own pre-submit check: every tab is visible so they can review what reviewers will see.
                tabs={viewerTabsForRole("student", { adminApproved: model.adminApproved, previewAll: true })}
                eyebrow="Generated from your saved report"
                title="Your Impact Package"
                footer={({ ready }) => (
                    <>
                        <p className="text-xs font-medium leading-relaxed text-slate-500">
                            {submitMode === "ready"
                                ? "Check every tab. Submitting sends your saved report to CIEL PK; reviewers see the package built from that report, never a file from your device."
                                : submitMode === "blocked"
                                  ? "Finish the remaining sections, meet the logged-hours bar and tick the final declaration on the report page to unlock submission."
                                  : "Use “Save package” inside the package to keep a copy. CNIC and mobile numbers are masked and restricted evidence is not included in a saved copy."}
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                            <button type="button" className="cer-ghost" style={{ marginTop: 0 }} onClick={() => setOpen(false)}>
                                {submitMode === "none" ? "Close" : "Back to report"}
                            </button>
                            {submitMode !== "none" ? (
                                <button
                                    type="button"
                                    className="cer-bigbtn inline-flex items-center justify-center gap-2"
                                    style={{ marginTop: 0, width: "auto", padding: "10px 18px" }}
                                    disabled={!canSubmit || !ready || submitting}
                                    onClick={() => {
                                        if (!canSubmit) return;
                                        setOpen(false);
                                        onSubmit?.();
                                    }}
                                    data-testid="submit-package"
                                >
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Submit package
                                </button>
                            ) : null}
                        </div>
                    </>
                )}
            />
        </>
    );
}
