"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import {
    CommunityCrumb,
    EmptyPanel,
    HubTabs,
    UserGuideBanner,
} from "@/components/ciel/community-service/CommunityServiceHubChrome";
import { formatDisplayId } from "@/utils/displayIds";
import {
    isCommunityReportOnLiveDeck,
    isCommunityReportRejected,
    isReviewDraftStatus,
} from "@/utils/reviewQueue";

const HUB = "/dashboard/student/paths/community-service";
const FILES_TABS = [
    { id: "faculty", label: "Faculty Analysis files" },
    { id: "ai", label: "AI Analyzer reports" },
] as const;
type FilesTab = (typeof FILES_TABS)[number]["id"];

type FileRow = {
    id: string;
    project_id?: string | null;
    opportunity_id?: string | null;
    project_title?: string;
    faculty_status?: string;
    status?: string;
    faculty_name?: string | null;
    cii_score?: number | null;
    level?: string | null;
};

function isFilesTab(value: string | null): value is FilesTab {
    return value === "faculty" || value === "ai";
}

function reportHref(row: FileRow): string {
    const id = row.project_id || row.opportunity_id || row.id;
    return `/dashboard/student/report?projectId=${encodeURIComponent(String(id))}`;
}

export default function CommunityServiceFiles() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const filterParam = searchParams.get("filter");
    const tab: FilesTab = isFilesTab(filterParam) ? filterParam : "faculty";
    const [rows, setRows] = useState<FileRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        authenticatedFetch("/api/v1/student/reports?limit=100", {}, { redirectToLogin: false })
            .then((res) => (res?.ok ? res.json() : null))
            .then((json) => {
                if (cancelled) return;
                setRows(Array.isArray(json?.data) ? json.data : []);
                setLoading(false);
            })
            .catch(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const decided = rows.filter(
        (row) =>
            !isReviewDraftStatus(row.status) &&
            (isCommunityReportOnLiveDeck(row) || isCommunityReportRejected(row)),
    );
    const ai = rows.filter((row) => row.cii_score != null);

    const setTab = (next: string) => {
        const qs = new URLSearchParams(searchParams.toString());
        qs.set("view", "files");
        qs.set("filter", next);
        router.replace(`${HUB}?${qs.toString()}`, { scroll: false });
    };

    return (
        <div className="mx-auto max-w-[1500px] pb-16">
            <CommunityCrumb role="Student" view="Shared Analysis Files" />
            <MockupSectionHead
                title="Shared Analysis Files"
                subtitle="Faculty Analysis files and AI Analyzer reports are shared automatically with every stakeholder linked to a record — the same file, the same version, on every dashboard."
                action={
                    <Link href={HUB} className="border-0 bg-transparent text-xs font-black text-[#087c75] hover:underline">
                        ← Back to module buttons
                    </Link>
                }
            />
            <UserGuideBanner
                desc="One place for every analysis file shared across stakeholders."
                items={[
                    ["Faculty Analysis", "The faculty decision file for each submitted report: decision, CII accepted or moderated, reason, comments."],
                    ["AI Analyzer reports", "The latest dated AI Analyzer badge and run history for each project."],
                    ["Open / Download", "View inside the dashboard, print, or download the file."],
                ]}
                rule="Files are shared automatically — nobody has to send them."
            />
            <HubTabs
                tabs={FILES_TABS.map((item) => ({
                    id: item.id,
                    label: item.label,
                    count: item.id === "faculty" ? decided.length : ai.length,
                }))}
                active={tab}
                onChange={setTab}
            />
            {loading ? (
                <p className="text-sm text-slate-500">Loading files…</p>
            ) : tab === "ai" ? (
                ai.length === 0 ? (
                    <EmptyPanel
                        title="No AI Analyzer runs yet"
                        text="Once a verified CII exists on a report, the dated badge appears here for every stakeholder on the record."
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {ai.map((row) => (
                            <Link
                                key={row.id}
                                href={reportHref(row)}
                                className="rounded-2xl border border-[#dde5ea] bg-white px-4 py-3.5 transition hover:border-[#bcd4d8]"
                            >
                                <div className="text-[22px]">🧠</div>
                                <b className="mt-1 block text-[14px] text-[#16313d]">{row.project_title || "Community Service report"}</b>
                                <small className="mt-1 block text-[11.5px] text-[#6b7c86]">
                                    {row.level || "CII"} · {row.cii_score}/100
                                    {row.faculty_name ? ` · ${row.faculty_name}` : ""}
                                </small>
                            </Link>
                        ))}
                    </div>
                )
            ) : decided.length === 0 ? (
                <EmptyPanel title="No Faculty Analysis yet" text="A file is created the moment faculty decides on a submitted report." />
            ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {decided.map((row) => (
                        <Link
                            key={row.id}
                            href={reportHref(row)}
                            className="rounded-2xl border border-[#dde5ea] bg-white px-4 py-3.5 transition hover:border-[#bcd4d8]"
                        >
                            <div className="text-[22px]">📄</div>
                            <b className="mt-1 block text-[14px] text-[#16313d]">{row.project_title || "Community Service report"}</b>
                            <small className="mt-1 block text-[11.5px] text-[#6b7c86]">
                                {formatDisplayId(row.id, "RPT")} · {row.faculty_status || row.status}
                                {row.faculty_name ? ` · ${row.faculty_name}` : ""}
                            </small>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
