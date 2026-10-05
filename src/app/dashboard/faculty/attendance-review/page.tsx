"use client";

import { useEffect, useRef, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { getStoredCurrentUserEmail } from "@/utils/currentUser";
import { toast } from "sonner";
import AttendanceReviewDashboard from "@/components/engagement/AttendanceReviewDashboard";
import { extractFacultyMineOpportunityRows } from "@/utils/facultyMineOpportunities";

function pickOpportunityListId(o: Record<string, unknown>): string {
    const nested =
        o.opportunity && typeof o.opportunity === "object"
            ? (o.opportunity as Record<string, unknown>)
            : null;
    for (const v of [
        o.id,
        o._id,
        o.opportunity_id,
        o.opportunityId,
        nested?.id,
        nested?._id,
    ]) {
        if (v == null) continue;
        const s = String(v).trim();
        if (s) return s;
    }
    return "";
}

function pickOpportunityListTitle(o: Record<string, unknown>): string {
    const nested =
        o.opportunity && typeof o.opportunity === "object"
            ? (o.opportunity as Record<string, unknown>)
            : null;
    const t = o.title ?? o.name ?? o.opportunity_title ?? nested?.title ?? nested?.name;
    const s = String(t ?? "").trim();
    return s || "Untitled";
}

function pickOpportunitySubtitle(o: Record<string, unknown>): string | undefined {
    const nested =
        o.opportunity && typeof o.opportunity === "object"
            ? (o.opportunity as Record<string, unknown>)
            : null;
    for (const raw of [
        o.university_name,
        o.universityName,
        o.university,
        o.organization_name,
        nested?.university_name,
        nested?.universityName,
    ]) {
        if (typeof raw === "string" && raw.trim()) return raw.trim();
    }
    return undefined;
}

export default function FacultyAttendanceReviewPage() {
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<{ id: string; title: string; subtitle?: string }[]>([]);
    const [projectId, setProjectId] = useState("");
    const requestedProjectId = useRef("");
    const [pendingById] = useState<Record<string, number>>({});
    const didInitProjectChoice = useRef(false);

    useEffect(() => {
        requestedProjectId.current =
            new URLSearchParams(window.location.search).get("projectId")?.trim() || "";
    }, []);

    useEffect(() => {
        if (didInitProjectChoice.current) return;
        if (loading) return;
        const requested = requestedProjectId.current;
        if (requested) {
            const match = projects.find((p) => p.id.toLowerCase() === requested.toLowerCase());
            didInitProjectChoice.current = true;
            if (match) {
                setProjectId(match.id);
                return;
            }
            setProjects((prev) =>
                prev.some((p) => p.id.toLowerCase() === requested.toLowerCase())
                    ? prev
                    : [{ id: requested, title: "Linked project" }, ...prev],
            );
            setProjectId(requested);
            return;
        }
        if (projects.length === 0) return;
        if (projectId) return;
        didInitProjectChoice.current = true;
        setProjectId(projects[0].id);
    }, [loading, projects, projectId]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const params = new URLSearchParams();
                const facultyEmail = getStoredCurrentUserEmail();
                if (facultyEmail) params.set("faculty_email", facultyEmail);
                const res = await authenticatedFetch(`/api/v1/opportunities/faculty/mine?${params.toString()}`);
                if (!res?.ok) {
                    if (!cancelled) toast.error("Could not load your faculty opportunities.");
                    return;
                }
                const data = await res.json();
                const rows = extractFacultyMineOpportunityRows(data);
                const mapped = rows
                    .map((o) => ({
                        id: pickOpportunityListId(o),
                        title: pickOpportunityListTitle(o),
                        subtitle: pickOpportunitySubtitle(o),
                    }))
                    .filter((p: { id: string }) => p.id);
                if (!cancelled) setProjects(mapped);
            } catch {
                if (!cancelled) toast.error("Could not load your faculty opportunities.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <AttendanceReviewDashboard
            backHref="/dashboard/faculty/community-service?view=projects"
            backLabel="← Back to Community Service"
            eyebrow=""
            title="Member hours"
            description="Live hours logged by assigned students. Attendance is confirmed when the flash-card score is locked."
            projects={projects}
            projectId={projectId}
            setProjectId={setProjectId}
            didInitProjectChoiceRef={didInitProjectChoice}
            pendingById={pendingById}
            loading={loading}
            countsLoading={false}
            queueTitle="Logged hours"
            queueDescription=""
            wideQueueLayout
            liveHoursMonitor
        />
    );
}
