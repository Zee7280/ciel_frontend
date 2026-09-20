"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { formatDisplayId } from "@/utils/displayIds";
import {
    mapCommunityPipelineRow,
    mergeCommunityLiveDeck,
    type CommunityAwardCard,
    type CommunityPipelineRow,
} from "@/utils/communityAwardModel";
import { getStoredCurrentUserId, readStoredCurrentUser } from "@/utils/currentUser";
import { isCommunityReportRejected, isFacultyCommunityLiveCard, isFacultyCommunityWaiting, normalizeReviewStatus } from "@/utils/reviewQueue";
import {
    canEditReturnedOpportunity,
    isOpportunityPermanentlyRejected,
    isOpportunityPubliclyLive,
    resolveStudentOpportunityWorkflow,
} from "@/utils/opportunityWorkflow";
import type { FacultyInboxItem } from "@/components/ciel/community-service/FacultyCsInbox";

export const NGO_CS_BASE = "/dashboard/partner/community-service";
export const NGO_CS_CREATE_FORM = "/dashboard/partner/requests/new";
export const NGO_CS_MY_OPPS = "/dashboard/partner/requests";
export const NGO_CS_APPROVALS = "/dashboard/partner/verify";
export const NGO_CS_REPORTS = "/dashboard/partner/reports";
export const NGO_CS_IMPACT = "/dashboard/partner/impact";
export const NGO_CS_HOURS = "/dashboard/partner/attendance-review";
export const NGO_CS_ANALYTICS = "/dashboard/partner/analytics";
export const NGO_CS_HOME = "/dashboard/partner";

export type OppRow = Record<string, unknown> & { id: string; title: string };

export type NgoPipelineRow = CommunityPipelineRow & { student_email?: string };

function pickStr(item: Record<string, unknown>, ...keys: string[]): string | undefined {
    for (const key of keys) {
        const value = item[key];
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return undefined;
}

export function ngoPickStr(item: Record<string, unknown>, ...keys: string[]): string | undefined {
    return pickStr(item, ...keys);
}

export function ngoPickNum(item: Record<string, unknown>, ...keys: string[]): number {
    for (const key of keys) {
        const value = item[key];
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "string" && value.trim()) {
            const n = Number(value);
            if (Number.isFinite(n)) return n;
        }
    }
    return 0;
}

function lower(value: unknown): string {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}

function emailOrUndef(value?: string): string | undefined {
    return value && value.includes("@") ? value : undefined;
}

function isOwnedByCurrentPartner(record: Record<string, unknown>, currentUserId: string) {
    if (lower(record.created_by_role ?? record.creator_role) === "partner") return true;
    const creatorId = record.creatorId ?? record.creator_id ?? record.created_by ?? record.owner_id;
    return Boolean(currentUserId && creatorId != null && String(creatorId).trim() === currentUserId);
}

function hasPartnerSignal(record: Record<string, unknown>) {
    const supervision =
        record.supervision && typeof record.supervision === "object"
            ? (record.supervision as Record<string, unknown>)
            : null;
    return (
        record.requires_partner_approval === true ||
        Boolean(lower(record.partner_approval_status ?? record.partner_status)) ||
        lower(record.workflow_stage ?? record.approval_stage).includes("partner") ||
        Boolean(record.external_partner_collaboration && typeof record.external_partner_collaboration === "object") ||
        Boolean(record.partner_organization && typeof record.partner_organization === "object") ||
        Boolean(pickStr(supervision || {}, "partner_org_name", "external_partner_org_name", "partner_email"))
    );
}

export function ngoMineBucket(row: OppRow): "drafts" | "review" | "action" | "published" | "closed" {
    if (normalizeReviewStatus(row.status) === "draft") return "drafts";
    if (canEditReturnedOpportunity(row)) return "action";
    if (isOpportunityPermanentlyRejected(row) || normalizeReviewStatus(row.status) === "rejected") return "closed";
    if (isOpportunityPubliclyLive(row) || normalizeReviewStatus(row.status) === "live") return "published";
    return "review";
}

function isPartnerRevision(row: OppRow): boolean {
    const partnerStatus = normalizeReviewStatus(
        String(row.partner_approval_status ?? row.partner_status ?? row.workflow_stage ?? ""),
    );
    return (
        partnerStatus === "revision_requested" ||
        partnerStatus === "revisions_requested" ||
        partnerStatus === "returned" ||
        partnerStatus.includes("revision")
    );
}

export function readNgoOrgName(): string {
    const user = readStoredCurrentUser() as {
        name?: string;
        orgName?: string;
        organization_name?: string;
        organization?: { name?: string };
    } | null;
    return (
        (typeof user?.orgName === "string" && user.orgName.trim()) ||
        (typeof user?.organization_name === "string" && user.organization_name.trim()) ||
        (typeof user?.organization?.name === "string" && user.organization.name.trim()) ||
        (typeof user?.name === "string" && user.name.trim()) ||
        "NGO / Nonprofit"
    );
}

export function useNgoCommunityServiceData() {
    const [oppRows, setOppRows] = useState<OppRow[]>([]);
    const [pipeline, setPipeline] = useState<NgoPipelineRow[]>([]);
    const [cards, setCards] = useState<CommunityAwardCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [orgName, setOrgName] = useState("NGO / Nonprofit");

    useEffect(() => {
        setOrgName(readNgoOrgName());
    }, []);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            authenticatedFetch("/api/v1/opportunities?partner_id=me", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch("/api/v1/partner/reports?limit=200", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
            authenticatedFetch("/api/v1/partners/community-service/award-cards", {}, { redirectToLogin: false }).then((r) =>
                r?.ok ? r.json() : null,
            ),
        ])
            .then(([list, reports, award]) => {
                if (cancelled) return;
                const rawList: unknown[] = Array.isArray(list?.data) ? list.data : [];
                setOppRows(
                    rawList
                        .filter((item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
                        .map((raw) => {
                            const id = String(raw.id ?? raw._id ?? raw.opportunity_id ?? "").trim();
                            return {
                                ...raw,
                                id,
                                title: pickStr(raw, "title", "name", "opportunity_title", "project_title") || "Opportunity",
                            } as OppRow;
                        })
                        .filter((row) => row.id),
                );
                const reportRows: unknown[] = Array.isArray(reports?.data) ? reports.data : [];
                const pipelineRows: NgoPipelineRow[] = reportRows
                    .filter((item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
                    .map((item): NgoPipelineRow | null => {
                        const mapped = mapCommunityPipelineRow(item);
                        if (!mapped) return null;
                        const student =
                            item.student && typeof item.student === "object"
                                ? (item.student as Record<string, unknown>)
                                : {};
                        return {
                            ...mapped,
                            student_email: emailOrUndef(
                                pickStr(item, "student_email", "studentEmail") || pickStr(student, "email"),
                            ),
                        };
                    })
                    .filter((row): row is NgoPipelineRow => row != null);
                setPipeline(pipelineRows);
                setCards(Array.isArray(award?.data) ? award.data : []);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setOppRows([]);
                setPipeline([]);
                setCards([]);
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const currentUserId = getStoredCurrentUserId();
    const mine = useMemo(() => oppRows.filter((row) => isOwnedByCurrentPartner(row, currentUserId)), [oppRows, currentUserId]);
    const pendingApprovals = useMemo(
        () =>
            oppRows.filter((row) => {
                if (isOwnedByCurrentPartner(row, currentUserId)) return false;
                if (!hasPartnerSignal(row)) return false;
                if (isPartnerRevision(row)) return false;
                return resolveStudentOpportunityWorkflow(row).stage === "pending_partner";
            }),
        [oppRows, currentUserId],
    );
    const revisionApprovals = useMemo(
        () =>
            oppRows.filter((row) => {
                if (isOwnedByCurrentPartner(row, currentUserId)) return false;
                if (!hasPartnerSignal(row)) return false;
                return isPartnerRevision(row);
            }),
        [oppRows, currentUserId],
    );
    const decidedApprovals = useMemo(
        () =>
            oppRows.filter((row) => {
                if (isOwnedByCurrentPartner(row, currentUserId)) return false;
                if (!hasPartnerSignal(row)) return false;
                if (isPartnerRevision(row)) return false;
                return resolveStudentOpportunityWorkflow(row).stage !== "pending_partner";
            }),
        [oppRows, currentUserId],
    );
    const publishedMine = useMemo(() => mine.filter((row) => ngoMineBucket(row) === "published"), [mine]);
    const createCounts = useMemo(() => {
        const counts = { drafts: 0, review: 0, action: 0, published: 0, closed: 0 };
        for (const row of mine) counts[ngoMineBucket(row)] += 1;
        return counts;
    }, [mine]);
    const applicationsOnMine = useMemo(
        () => publishedMine.reduce((sum, row) => sum + ngoPickNum(row, "applicants_count", "applicantsCount", "pending_applications"), 0),
        [publishedMine],
    );
    const liveRows = useMemo(() => pipeline.filter((r) => isFacultyCommunityLiveCard(r)), [pipeline]);
    const waiting = useMemo(() => pipeline.filter((r) => isFacultyCommunityWaiting(r)), [pipeline]);
    const decidedReports = useMemo(
        () => pipeline.filter((r) => isFacultyCommunityLiveCard(r) || isCommunityReportRejected(r)),
        [pipeline],
    );
    const deckCards = useMemo(
        () => mergeCommunityLiveDeck(cards, liveRows, isFacultyCommunityLiveCard),
        [cards, liveRows],
    );

    const inboxItems: FacultyInboxItem[] = useMemo(
        () =>
            pendingApprovals.map((row) => {
                const facultyCreated = lower(row.created_by_role ?? row.creator_role) === "faculty";
                const creator =
                    pickStr(row, "creator_name", "student_name", "submitted_by_name") || (facultyCreated ? "Faculty" : "Creator");
                return {
                    key: `opp-${row.id}`,
                    kind: "opp" as const,
                    title: row.title,
                    meta: `${formatDisplayId(row.id, "OPP")} · ${creator} · ${resolveStudentOpportunityWorkflow(row).badgeLabel}`,
                    href: `${NGO_CS_APPROVALS}?tab=pending&opportunity=${encodeURIComponent(row.id)}`,
                    cta: facultyCreated ? "View Flashcard & Acknowledge" : "View Flashcard & Approve",
                    studentEmail: emailOrUndef(pickStr(row, "creator_email", "student_email", "submitted_by_email", "email")),
                };
            }),
        [pendingApprovals],
    );

    return {
        loading,
        orgName,
        oppRows,
        mine,
        pendingApprovals,
        revisionApprovals,
        decidedApprovals,
        publishedMine,
        createCounts,
        applicationsOnMine,
        pipeline,
        waiting,
        liveRows,
        decidedReports,
        deckCards,
        inboxItems,
    };
}
