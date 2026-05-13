"use client";

import { useCallback, useEffect, useState } from "react";
import { Film, Loader2, PlayCircle, Trash2, Upload, FileText } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import {
    resolvePreferredApiV1Base,
} from "@/utils/backendApiV1Base";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import { Input } from "@/app/dashboard/student/report/components/ui/input";
import { Label } from "@/app/dashboard/student/report/components/ui/label";
import { Textarea } from "@/app/dashboard/student/report/components/ui/textarea";
import { toast } from "sonner";

type TutorialRow = {
    id: string;
    title: string;
    description: string;
    category: string;
    videoUrl: string;
    posterUrl?: string | null;
    durationLabel?: string | null;
    documentUrl?: string | null;
    documentFilename?: string | null;
    sortOrder?: number;
    createdAt?: string;
};

/**
 * List/delete use the same base as typical API calls (OK for small payloads).
 */
function adminTutorialsReadUrl(pathSuffix: "" | `/${string}`): string {
    const p = resolvePreferredApiV1Base();
    if (p) return `${p}/admin/tutorials${pathSuffix}`;
    return `/api/v1/admin/tutorials${pathSuffix}`;
}

/** Must match backend `PLATFORM_TUTORIAL_MAX_FILE_BYTES`. */
const PLATFORM_TUTORIAL_MAX_BYTES = 500 * 1024 * 1024;

export default function AdminTutorialsPage() {
    const [rows, setRows] = useState<TutorialRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("General");
    const [durationLabel, setDurationLabel] = useState("");
    const [sortOrder, setSortOrder] = useState("0");
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [posterFile, setPosterFile] = useState<File | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authenticatedFetch(adminTutorialsReadUrl(""), {}, { redirectToLogin: true });
            if (!res?.ok) {
                setRows([]);
                return;
            }
            const body = (await res.json()) as { success?: boolean; data?: unknown };
            const data = body.data;
            const list = Array.isArray(data) ? (data as TutorialRow[]) : [];
            list.sort(
                (a, b) =>
                    (Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)) ||
                    String(a.title ?? "").localeCompare(String(b.title ?? ""), undefined, { sensitivity: "base" }),
            );
            setRows(list);
        } catch {
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setCategory("General");
        setDurationLabel("");
        setSortOrder("0");
        setVideoFile(null);
        setDocumentFile(null);
        setPosterFile(null);
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!videoFile) {
            toast.error("Please choose a video file.");
            return;
        }
        const t = title.trim();
        if (t.length < 2) {
            toast.error("Title is required.");
            return;
        }
        if (videoFile.size > PLATFORM_TUTORIAL_MAX_BYTES) {
            toast.error("Video must be 500 MB or smaller.");
            return;
        }
        if (documentFile && documentFile.size > PLATFORM_TUTORIAL_MAX_BYTES) {
            toast.error("Document must be 500 MB or smaller.");
            return;
        }
        if (posterFile && posterFile.size > PLATFORM_TUTORIAL_MAX_BYTES) {
            toast.error("Poster image must be 500 MB or smaller.");
            return;
        }

        const apiBase = resolvePreferredApiV1Base();
        if (!apiBase) {
            toast.error("Backend API base URL not configured. Set NEXT_PUBLIC_BACKEND_BASE_URL (recommended).");
            return;
        }

        setSubmitting(true);
        try {
            // 1) Ask backend for presigned S3 URLs (small JSON request; safe on Vercel).
            const presignRes = await authenticatedFetch(
                `${apiBase}/admin/tutorials/presign`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        video: {
                            filename: videoFile.name,
                            contentType: videoFile.type || "application/octet-stream",
                            sizeBytes: videoFile.size,
                        },
                        document: documentFile
                            ? {
                                  filename: documentFile.name,
                                  contentType: documentFile.type || "application/octet-stream",
                                  sizeBytes: documentFile.size,
                              }
                            : null,
                        poster: posterFile
                            ? {
                                  filename: posterFile.name,
                                  contentType: posterFile.type || "application/octet-stream",
                                  sizeBytes: posterFile.size,
                              }
                            : null,
                    }),
                },
                { redirectToLogin: true, timeoutMs: 60_000 },
            );
            if (!presignRes?.ok) {
                const msg = await presignRes?.text?.().catch(() => "");
                toast.error(msg?.slice(0, 240) || "Could not create upload URL.");
                return;
            }
            const presignBody = (await presignRes.json()) as {
                success?: boolean;
                data?: any;
                message?: string;
            };
            const d = presignBody?.data || {};
            const videoSigned = d.video as { uploadUrl: string; publicUrl: string } | undefined;
            if (!videoSigned?.uploadUrl || !videoSigned?.publicUrl) {
                toast.error("Upload URL missing (video). Check AWS credentials and S3 bucket config.");
                return;
            }

            // 2) Upload bytes directly to S3 (requires S3 CORS to allow PUT from this site).
            const putOne = async (uploadUrl: string, file: File) => {
                const r = await fetch(uploadUrl, {
                    method: "PUT",
                    headers: { "Content-Type": file.type || "application/octet-stream" },
                    body: file,
                });
                if (!r.ok) {
                    const text = await r.text().catch(() => "");
                    throw new Error(text || `S3 upload failed (${r.status})`);
                }
            };
            await putOne(videoSigned.uploadUrl, videoFile);
            const docSigned = d.document as ({ uploadUrl: string; publicUrl: string; filename?: string } | undefined) ?? undefined;
            if (documentFile && docSigned?.uploadUrl) await putOne(docSigned.uploadUrl, documentFile);
            const posterSigned = d.poster as ({ uploadUrl: string; publicUrl: string } | undefined) ?? undefined;
            if (posterFile && posterSigned?.uploadUrl) await putOne(posterSigned.uploadUrl, posterFile);

            // 3) Create the tutorial row using the uploaded public URLs (small JSON; safe on Vercel).
            const directRes = await authenticatedFetch(
                `${apiBase}/admin/tutorials/direct`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        title: t,
                        description: description.trim(),
                        category: category.trim() || "General",
                        durationLabel: durationLabel.trim(),
                        sortOrder: String(parseInt(sortOrder, 10) || 0),
                        videoUrl: videoSigned.publicUrl,
                        documentUrl: documentFile ? (docSigned?.publicUrl ?? null) : null,
                        documentFilename: documentFile ? documentFile.name : null,
                        posterUrl: posterFile ? (posterSigned?.publicUrl ?? null) : null,
                    }),
                },
                { redirectToLogin: true, timeoutMs: 60_000 },
            );
            if (!directRes?.ok) {
                const text = await directRes?.text?.().catch(() => "");
                toast.error(text?.slice(0, 240) || "Upload failed (save step).");
                return;
            }
            toast.success("Tutorial published.");
            resetForm();
            await load();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Upload failed.";
            toast.error(msg.slice(0, 240));
        } finally {
            setSubmitting(false);
        }
    };

    const onDelete = async (id: string) => {
        if (!window.confirm("Remove this tutorial? Video and attached files will be deleted from storage.")) {
            return;
        }
        try {
            const res = await authenticatedFetch(
                adminTutorialsReadUrl(`/${encodeURIComponent(id)}`),
                { method: "DELETE" },
                { redirectToLogin: true },
            );
            if (!res?.ok) {
                toast.error("Could not delete.");
                return;
            }
            toast.success("Tutorial removed.");
            await load();
        } catch {
            toast.error("Delete failed.");
        }
    };

    return (
        <div className="p-6 sm:p-8">
            <div className="mb-8 flex flex-col gap-4 border-b border-slate-200/80 pb-8 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-slate-900 text-white shadow-lg shadow-slate-900/20">
                        <PlayCircle className="h-7 w-7" strokeWidth={2} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            Platform tutorial
                        </h1>
                        <p className="mt-1 max-w-2xl text-sm text-slate-500 sm:text-base">
                            Upload tutorials for users (video + optional document). They appear under{" "}
                            <span className="font-semibold text-slate-700">
                                Dashboard → Platform tutorial and Student → Help → Platform tutorial
                            </span>
                            .
                        </p>
                    </div>
                </div>
                <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Refresh list
                </Button>
            </div>

            <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,26rem)_1fr]">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center gap-2 text-slate-900">
                        <Upload className="h-5 w-5 text-blue-600" />
                        <h2 className="text-lg font-bold">Add tutorial</h2>
                    </div>
                    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
                        <div>
                            <Label htmlFor="t-title">Title</Label>
                            <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Registration walkthrough" className="mt-1.5" />
                        </div>
                        <div>
                            <Label htmlFor="t-category">Category</Label>
                            <Input id="t-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Getting started" className="mt-1.5" />
                        </div>
                        <div>
                            <Label htmlFor="t-desc">Short description</Label>
                            <Textarea
                                spellCheck={true}
                                id="t-desc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Shown under the player on the student page."
                                className="mt-1.5 min-h-[88px]"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="t-dur">Duration label (optional)</Label>
                                <Input id="t-dur" value={durationLabel} onChange={(e) => setDurationLabel(e.target.value)} placeholder=" e.g. 5:30" className="mt-1.5" />
                            </div>
                            <div>
                                <Label htmlFor="t-sort">Display order (sort)</Label>
                                <Input
                                    id="t-sort"
                                    type="number"
                                    min={0}
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                    className="mt-1.5"
                                />
                                <p className="mt-1 text-[11px] text-slate-500">Lower numbers appear first (e.g. 1, then 2, then 3). Same order is used on all Platform tutorial pages.</p>
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="t-video">Video (.mp4, .webm, .mov) — max 500 MB</Label>
                            <Input
                                id="t-video"
                                type="file"
                                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                                className="mt-1.5 cursor-pointer"
                                onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="t-doc">Document (optional: .pdf, .doc, .docx) — max 500 MB</Label>
                            <Input
                                id="t-doc"
                                type="file"
                                accept=".pdf,.doc,.docx,application/pdf"
                                className="mt-1.5 cursor-pointer"
                                onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="t-poster">Poster / thumbnail (optional: .jpg, .png, .webp) — max 500 MB</Label>
                            <Input
                                id="t-poster"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="mt-1.5 cursor-pointer"
                                onChange={(e) => setPosterFile(e.target.files?.[0] ?? null)}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={submitting}>
                            {submitting ? (
                                <span className="inline-flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Uploading…
                                </span>
                            ) : (
                                "Publish tutorial"
                            )}
                        </Button>
                        <p className="text-xs text-slate-500">
                            Videos upload directly to S3 using a presigned URL (avoids Vercel 413 limits). If S3 upload fails,
                            add an S3 CORS rule that allows PUT from this website origin.
                        </p>
                    </form>
                </section>

                <section>
                    <div className="mb-4 flex items-center gap-2 text-slate-900">
                        <Film className="h-5 w-5 text-slate-600" />
                        <h2 className="text-lg font-bold">Published ({rows.length})</h2>
                    </div>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-20 shadow-sm">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                            <p className="text-sm text-slate-500">Loading tutorials…</p>
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                            <PlayCircle className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                            <h3 className="text-lg font-bold text-slate-900">No tutorials yet</h3>
                            <p className="mt-2 text-sm text-slate-500">Use the form to upload your first video.</p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {rows.map((r) => (
                                <li
                                    key={r.id}
                                    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                            Order {Number(r.sortOrder ?? 0)} · {r.category}
                                        </p>
                                        <h3 className="mt-1 font-semibold text-slate-900">{r.title}</h3>
                                        {r.durationLabel ? (
                                            <p className="mt-1 text-xs text-slate-500">{r.durationLabel}</p>
                                        ) : null}
                                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                                            <a href={r.videoUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                                                Video URL
                                            </a>
                                            {r.documentUrl ? (
                                                <a
                                                    href={r.documentUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline"
                                                >
                                                    <FileText className="h-3 w-3" />
                                                    {r.documentFilename || "Document"}
                                                </a>
                                            ) : null}
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="border-rose-200 text-rose-700 hover:bg-rose-50"
                                        onClick={() => void onDelete(r.id)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" /> Remove
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}
