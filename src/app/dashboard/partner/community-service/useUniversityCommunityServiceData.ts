"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
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
} from "@/utils/opportunityWorkflow";

export const UNI_CS_BASE = "/dashboard/partner/community-service";
export const UNI_CS_CREATE_FORM = "/dashboard/partner/requests/new";
export const UNI_CS_MY_OPPS = "/dashboard/partner/requests";
export const UNI_CS_REPORTS = "/dashboard/partner/reports";
export const UNI_CS_IMPACT = "/dashboard/partner/impact";
export const UNI_CS_COURSEWORK = "/dashboard/partner/university-showcase?mode=course-project";
export const UNI_CS_FYP = "/dashboard/partner/university-showcase?mode=fyp-thesis";
export const UNI_CS_STARTUP = "/dashboard/partner/startup-business";
export const UNI_CS_ANALYTICS = "/dashboard/partner/university-analytics";
export const UNI_CS_HOME = "/dashboard/partner";
export const UNI_CS_REPS = "/api/v1/partners/community-service/faculty-representatives";

export type UniOppRow = Record<string, unknown> & { id: string; title: string };

export type UniPipelineRow = CommunityPipelineRow & {
    student_email?: string;
    department?: string;
    faculty_name?: string;
};

export type UniFacultyRep = {
    id: string;
    faculty_user_id?: string;
    faculty_name?: string;
    faculty_email?: string;
    faculty_department?: string;
    created_at?: string;
    status?: string;
};

function pickStr(item: Record<string, unknown>, ...keys: string[]): string | undefined {
    for (const key of keys) {
        const value = item[key];
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return undefined;
}

export function uniPickStr(item: Record<string, unknown>, ...keys: string[]): string | undefined {
    return pickStr(item, ...keys);
}

function lower(value: unknown): string {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}

function emailOrUndef(value?: string): string | undefined {
    return value && value.includes("@") ? value : undefined;
}

function isOwnedByUniversity(record: Record<string, unknown>, currentUserId: string) {
    const role = lower(record.created_by_role ?? record.creator_role);
    if (role === "university" || role === "partner" || role === "organization_admin") return true;
    const creatorId = record.creatorId ?? record.creator_id ?? record.created_by ?? record.owner_id;
    return Boolean(currentUserId && creatorId != null && String(creatorId).trim() === currentUserId);
}

export function uniMineBucket(row: UniOppRow): "drafts" | "review" | "action" | "published" | "closed" {
    if (normalizeReviewStatus(row.status) === "draft") return "drafts";
    if (canEditReturnedOpportunity(row)) return "action";
    if (isOpportunityPermanentlyRejected(row) || normalizeReviewStatus(row.status) === "rejected") return "closed";
    if (isOpportunityPubliclyLive(row) || normalizeReviewStatus(row.status) === "live") return "published";
    return "review";
}

export function readUniversityOrgName(): string {
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
        "University"
    );
}

export function useUniversityCommunityServiceData() {
    const [oppRows, setOppRows] = useState<UniOppRow[]>([]);
    const [pipeline, setPipeline] = useState<UniPipelineRow[]>([]);
    const [cards, setCards] = useState<CommunityAwardCard[]>([]);
    const [reps, setReps] = useState<UniFacultyRep[]>([]);
    const [loading, setLoading] = useState(true);
    const [orgName, setOrgName] = useState("University");

    const reloadReps = async () => {
        const faculty = await authenticatedFetch(UNI_CS_REPS, {}, { redirectToLogin: false }).then((r) =>
            r?.ok ? r.json() : null,
        );
        setReps(
            (Array.isArray(faculty?.data) ? faculty.data : []).filter(
                (item: unknown): item is UniFacultyRep => Boolean(item && typeof item === "object" && (item as UniFacultyRep).id),
            ),
        );
    };

    useEffect(() => {
        setOrgName(readUniversityOrgName());
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
            authenticatedFetch(UNI_CS_REPS, {}, { redirectToLogin: false }).then((r) => (r?.ok ? r.json() : null)),
        ])
            .then(([list, reports, award, faculty]) => {
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
                            } as UniOppRow;
                        })
                        .filter((row) => row.id),
                );
                const reportRows: unknown[] = Array.isArray(reports?.data) ? reports.data : [];
                setPipeline(
                    reportRows
                        .filter((item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
                        .map((item): UniPipelineRow | null => {
                            const mapped = mapCommunityPipelineRow(item);
                            if (!mapped) return null;
                            const student =
                                item.student && typeof item.student === "object"
                                    ? (item.student as Record<string, unknown>)
                                    : {};
                            return {
                                ...mapped,
                                student_email: emailOrUndef(pickStr(item, "student_email", "studentEmail") || pickStr(student, "email")),
                                department: pickStr(item, "department", "school") || pickStr(student, "department"),
                                faculty_name: pickStr(item, "faculty_name", "facultyName", "supervisor_name"),
                            };
                        })
                        .filter((row): row is UniPipelineRow => row != null),
                );
                setCards(Array.isArray(award?.data) ? award.data : []);
                setReps(
                    (Array.isArray(faculty?.data) ? faculty.data : []).filter(
                        (item: unknown): item is UniFacultyRep =>
                            Boolean(item && typeof item === "object" && (item as UniFacultyRep).id),
                    ),
                );
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setOppRows([]);
                setPipeline([]);
                setCards([]);
                setReps([]);
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const currentUserId = getStoredCurrentUserId();
    const mine = useMemo(
        () => oppRows.filter((row) => isOwnedByUniversity(row, currentUserId)),
        [oppRows, currentUserId],
    );
    const approvalOpps = useMemo(
        () =>
            oppRows.filter(
                (row) => !isOpportunityPubliclyLive(row) && !isOpportunityPermanentlyRejected(row) && normalizeReviewStatus(row.status) !== "draft",
            ),
        [oppRows],
    );
    const createCounts = useMemo(() => {
        const counts = { drafts: 0, review: 0, action: 0, published: 0, closed: 0 };
        for (const row of mine) counts[uniMineBucket(row)] += 1;
        return counts;
    }, [mine]);
    const publishedMine = useMemo(() => mine.filter((row) => uniMineBucket(row) === "published"), [mine]);
    const liveRows = useMemo(() => pipeline.filter((r) => isFacultyCommunityLiveCard(r)), [pipeline]);
    const waiting = useMemo(() => pipeline.filter((r) => isFacultyCommunityWaiting(r)), [pipeline]);
    const closedReports = useMemo(() => pipeline.filter((r) => isCommunityReportRejected(r)), [pipeline]);
    const decidedReports = useMemo(
        () => pipeline.filter((r) => isFacultyCommunityLiveCard(r) || isCommunityReportRejected(r)),
        [pipeline],
    );
    const deckCards = useMemo(
        () => mergeCommunityLiveDeck(cards, liveRows, isFacultyCommunityLiveCard),
        [cards, liveRows],
    );
    const authorizedReps = useMemo(() => {
        if (reps.length) return reps;
        const seen = new Set<string>();
        const fallback: UniFacultyRep[] = [];
        for (const card of deckCards) {
            const name = (card.faculty_name || "").trim();
            if (!name || name === "Faculty" || seen.has(name.toLowerCase())) continue;
            seen.add(name.toLowerCase());
            fallback.push({
                id: `card-${card.id}`,
                faculty_name: name,
                faculty_department: card.department,
                status: "authorized",
            });
        }
        return fallback;
    }, [reps, deckCards]);
    const approvedProjects = useMemo(
        () => oppRows.filter((row) => isOpportunityPubliclyLive(row)).length || waiting.length + liveRows.length,
        [oppRows, waiting.length, liveRows.length],
    );

    return {
        loading,
        orgName,
        oppRows,
        mine,
        approvalOpps,
        createCounts,
        publishedMine,
        pipeline,
        waiting,
        liveRows,
        closedReports,
        decidedReports,
        deckCards,
        reps: authorizedReps,
        reloadReps,
        approvedProjects,
    };
}
