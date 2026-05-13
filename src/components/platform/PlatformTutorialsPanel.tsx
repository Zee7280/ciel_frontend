"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import { PlayCircle, Clock, FileText, Loader2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import VideoPlayer from "@/components/VideoPlayer";

export type PlatformTutorialItem = {
    id: string;
    title: string;
    description: string;
    category: string;
    videoUrl: string;
    poster?: string;
    duration?: string;
    documentUrl?: string;
    documentFilename?: string;
    /** DB `sort_order` / API `sortOrder` — list sorted ascending (1, 2, 6…). */
    sortOrder: number;
};

function parseTutorialSortOrder(row: Record<string, unknown>): number {
    const raw =
        row.sortOrder ??
        row.sort_order ??
        row.displayOrder ??
        row.display_order ??
        row.order;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    const n = parseInt(String(raw ?? "").trim(), 10);
    return Number.isFinite(n) ? n : 0;
}

function mapTutorialPayload(row: Record<string, unknown>): PlatformTutorialItem | null {
    const id = String(row.id ?? "");
    const videoUrl = String(row.videoUrl ?? "");
    if (!id || !videoUrl) return null;
    return {
        id,
        title: String(row.title ?? ""),
        description: String(row.description ?? ""),
        category: String(row.category ?? "General"),
        videoUrl,
        poster: typeof row.poster === "string" ? row.poster : undefined,
        duration: typeof row.duration === "string" ? row.duration : undefined,
        documentUrl:
            typeof row.documentUrl === "string" ? row.documentUrl : undefined,
        documentFilename:
            typeof row.documentFilename === "string" ? row.documentFilename : undefined,
        sortOrder: parseTutorialSortOrder(row),
    };
}

function sortTutorialsByDisplayOrder(items: PlatformTutorialItem[]): PlatformTutorialItem[] {
    return [...items].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    });
}

const TUTORIALS_API = "/api/v1/tutorials";
const TUTORIALS_PUBLIC_API = "/api/v1/public/tutorials";

type PlatformTutorialsPanelProps = {
    /** When false, skips network fetch (e.g. Help page hidden tab). */
    visible?: boolean;
    /**
     * Homepage / public page: read via anonymous Next proxy. Dashboards keep default (JWT via BFF).
     */
    publicMode?: boolean;
    emptyTitle?: string;
    emptyDescription?: ReactNode;
};

export default function PlatformTutorialsPanel({
    visible = true,
    publicMode = false,
    emptyTitle = "No tutorials yet",
    emptyDescription = 'Platform guides will appear here when your administrator publishes them under "Platform tutorial".',
}: PlatformTutorialsPanelProps) {
    const [tutorials, setTutorials] = useState<PlatformTutorialItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<PlatformTutorialItem | null>(null);

    const loadTutorials = useCallback(async () => {
        setLoading(true);
        try {
            const res = publicMode
                ? await fetch(TUTORIALS_PUBLIC_API, { credentials: "same-origin" })
                : await authenticatedFetch(TUTORIALS_API, {}, { redirectToLogin: false });
            if (!res?.ok) {
                setTutorials([]);
                return;
            }
            const body = (await res.json()) as { success?: boolean; data?: unknown };
            const raw = Array.isArray(body.data) ? body.data : [];
            const mapped = sortTutorialsByDisplayOrder(
                raw
                    .map((r) => mapTutorialPayload(r as Record<string, unknown>))
                    .filter(Boolean) as PlatformTutorialItem[],
            );
            setTutorials(mapped);
        } catch {
            setTutorials([]);
        } finally {
            setLoading(false);
        }
    }, [publicMode]);

    useEffect(() => {
        if (!visible) return;
        void loadTutorials();
    }, [visible, loadTutorials]);

    useEffect(() => {
        if (!selected && tutorials.length > 0) {
            setSelected(tutorials[0]);
            return;
        }
        if (selected && !tutorials.some((t) => t.id === selected.id)) {
            setSelected(tutorials[0] ?? null);
        }
    }, [tutorials, selected]);

    if (!visible) return null;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-24 shadow-sm">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <p className="text-sm font-medium text-slate-500">Loading tutorials…</p>
            </div>
        );
    }

    if (tutorials.length === 0) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                <PlayCircle className="mx-auto mb-4 h-14 w-14 text-slate-300" />
                <h3 className="text-lg font-bold text-slate-900">{emptyTitle}</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{emptyDescription}</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-4">
                <h2 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Platform tutorial</h2>
                {tutorials.map((tutorial) => (
                    <button
                        key={tutorial.id}
                        type="button"
                        onClick={() => setSelected(tutorial)}
                        className={clsx(
                            "w-full rounded-xl border p-4 text-left transition-all duration-200",
                            selected?.id === tutorial.id
                                ? "border-[#0056B3] bg-blue-50 shadow-md"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
                        )}
                    >
                        <div className="flex items-start gap-3">
                            <div
                                className={clsx(
                                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm",
                                    selected?.id === tutorial.id ? "bg-[#0056B3] text-white" : "bg-slate-100 text-slate-600",
                                )}
                            >
                                <PlayCircle className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                    <span className="tabular-nums text-slate-500">Order {tutorial.sortOrder}</span>
                                    <span>{tutorial.category}</span>
                                </p>
                                <h3
                                    className={clsx(
                                        "mb-1 text-sm font-bold leading-snug",
                                        selected?.id === tutorial.id ? "text-[#0056B3]" : "text-slate-900",
                                    )}
                                >
                                    {tutorial.title}
                                </h3>
                                {tutorial.duration ? (
                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                        <Clock className="h-3 w-3" />
                                        {tutorial.duration}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            <div className="space-y-6 lg:col-span-8">
                {selected ? (
                    <>
                        <div className="overflow-hidden rounded-xl shadow-2xl">
                            <VideoPlayer
                                src={selected.videoUrl}
                                poster={selected.poster}
                                title={selected.title}
                            />
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                        <span className="tabular-nums text-slate-500">Order {selected.sortOrder}</span>
                                        <span>{selected.category}</span>
                                    </p>
                                    <h2 className="mb-2 text-xl font-bold text-slate-900">{selected.title}</h2>
                                    <p className="text-[13px] leading-relaxed text-slate-600">{selected.description}</p>
                                </div>
                                {selected.duration ? (
                                    <div className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5">
                                        <Clock className="h-4 w-4 text-slate-600" />
                                        <span className="text-sm font-semibold text-slate-700">{selected.duration}</span>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {selected.documentUrl ? (
                            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="mb-4 flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-[#0056B3]" />
                                    <h3 className="text-lg font-bold text-slate-900">Supporting document</h3>
                                </div>
                                <a
                                    href={selected.documentUrl}
                                    download={selected.documentFilename}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-[#0056B3] transition hover:border-slate-300 hover:bg-slate-100"
                                >
                                    <FileText className="h-4 w-4 shrink-0" />
                                    {selected.documentFilename || "Download attachment"}
                                </a>
                                <p className="mt-3 text-[13px] leading-relaxed text-slate-500">
                                    Opens or downloads the file attached with this tutorial.
                                </p>
                            </div>
                        ) : null}
                    </>
                ) : (
                    <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                        <PlayCircle className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                        <h3 className="mb-2 text-lg font-bold text-slate-900">Select a tutorial</h3>
                        <p className="text-sm text-slate-500">Choose one from the list to start watching.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
