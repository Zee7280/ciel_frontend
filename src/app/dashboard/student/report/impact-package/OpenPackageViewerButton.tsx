"use client";

import React, { useMemo, useState } from "react";
import type { ReportData } from "../context/ReportContext";
import type { ImpactPackageAudience, ImpactPackageModel } from "./buildImpactPackageModel";
import { buildCielPackageSnapshot, type CielPackageSnapshot } from "./buildCielPackageSnapshot";
import CielPackageViewer, { viewerTabsForRole } from "./CielPackageViewer";
import { resolveRequiredHoursPerStudent } from "../utils/engagementMetrics";
import { uniqueMergedSdgGoalNumbers } from "../utils/reportSdgMerge";
import { distinctBeneficiaryTotal } from "../utils/activityReach";

type Props = {
    data: ReportData;
    projectData?: unknown;
    audience: ImpactPackageAudience;
    model: ImpactPackageModel;
};

function lockedScore(data: ReportData): { score: number | null; badge: string | null } {
    const lock = data.ciiV45Lock as { locked?: unknown; badgeStatus?: unknown } | null | undefined;
    const locked = lock?.locked === true || lock?.locked === "true";
    const cii = data.ciiV45 as { finalCII?: number | null; finalBadge?: { name?: string } | null } | null | undefined;
    if (!locked || typeof cii?.finalCII !== "number" || !Number.isFinite(cii.finalCII)) return { score: null, badge: null };
    // R3: a locked 90+ CII with L6 pending is approved and kept; the badge is the pending status.
    if (lock?.badgeStatus === "L6_PENDING_QUALIFICATION") return { score: cii.finalCII, badge: "L6 pending qualification" };
    return { score: cii.finalCII, badge: cii.finalBadge?.name || null };
}

/**
 * Role-appropriate viewer snapshot from the in-app package model: PII masked or removed per
 * audience, restricted evidence listed by name only, the official score only after CIEL PK approval.
 */
export function buildViewerSnapshotForModel({ data, projectData, audience, model }: Props): CielPackageSnapshot {
    const { score, badge } = lockedScore(data);
    return buildCielPackageSnapshot({
        report: data as unknown as Record<string, unknown>,
        opportunity: projectData && typeof projectData === "object" ? (projectData as Record<string, unknown>) : null,
        audience,
        visibility: model.effectiveVisibility,
        publicConsent: model.publicConsent,
        files: model.files,
        approved: model.adminApproved,
        score: model.adminApproved ? score : null,
        badge: model.adminApproved ? badge : null,
        requiredHours: resolveRequiredHoursPerStudent(projectData, data.required_hours || 16),
        uniqueBeneficiaries: distinctBeneficiaryTotal(data.section4) || 0,
        sdgNumbers: uniqueMergedSdgGoalNumbers(projectData, data.section3),
    });
}

/**
 * "Open package viewer" for every role: shows the role-appropriate snapshot in the static CIEL
 * package template. Additive — the in-app tabs keep working exactly as before.
 */
export default function OpenPackageViewerButton({ data, projectData, audience, model }: Props) {
    const [open, setOpen] = useState(false);
    const [snapshot, setSnapshot] = useState<CielPackageSnapshot | null>(null);
    const [error, setError] = useState("");

    const tabs = useMemo(
        () => viewerTabsForRole(audience, { adminApproved: model.adminApproved }),
        [audience, model.adminApproved],
    );

    const openViewer = () => {
        setError("");
        try {
            setSnapshot(buildViewerSnapshotForModel({ data, projectData, audience, model }));
            setOpen(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not build the package.");
        }
    };

    return (
        <>
            <button type="button" onClick={openViewer} title="Open the full package viewer (flashcard, detailed report, evidence)" data-testid="open-package-viewer">
                <span className="button-content">Open package viewer</span>
            </button>
            {error ? (
                <span role="alert" className="text-xs font-medium text-rose-700">
                    {error}
                </span>
            ) : null}
            <CielPackageViewer
                open={open}
                onClose={() => setOpen(false)}
                snapshot={snapshot}
                role={audience}
                tabs={tabs}
                title={model.title}
                eyebrow={
                    audience === "admin"
                        ? "CIEL PK Super Admin · review copy"
                        : audience === "faculty" || audience === "university"
                          ? "Institution review copy · read-only"
                          : audience === "partner" || audience === "public"
                            ? "Shared copy · personal details removed"
                            : "Your record"
                }
            />
        </>
    );
}
