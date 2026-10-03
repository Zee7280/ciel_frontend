"use client";

import { useCallback, useEffect, useState } from "react";
import { Film, Loader2, PlayCircle, Trash2, Upload, FileText, Pencil } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import {
    resolvePreferredApiV1Base,
} from "@/utils/backendApiV1Base";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import { Input } from "@/app/dashboard/student/report/components/ui/input";
import { Label } from "@/app/dashboard/student/report/components/ui/label";
import { Textarea } from "@/app/dashboard/student/report/components/ui/textarea";
import { toast } from "sonner";
import ConfirmModal from "@/app/dashboard/admin/_shared/ConfirmModal";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/app/dashboard/student/report/components/ui/dialog";

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
    /** Present only if the API exposes a published flag. */
    published?: boolean;
    isPublished?: boolean;
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

/** PUT a file to a presigned URL with progress reporting (fetch cannot report upload progress). */
function putWithProgress(url: string, file: File, onProgress: (loaded: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", url);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) onProgress(ev.loaded);
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                onProgress(file.size);
                resolve();
            } else {
                reject(new Error(xhr.responseText?.slice(0, 200) || `S3 upload failed (${xhr.status})`));
            }
        };
        xhr.onerror = () => reject(new Error("Upload failed. Check your connection and the S3 CORS rule."));
        xhr.onabort = () => reject(new Error("Upload cancelled."));
        xhr.send(file);
    });
}

/** Must match backend `PLATFORM_TUTORIAL_MAX_FILE_BYTES`. */
const PLATFORM_TUTORIAL_MAX_BYTES = 500 * 1024 * 1024;

export default function AdminTutorialsPage() {
    const [rows, setRows] = useState<TutorialRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [progress, setProgress] = useState<{ pct: number; label: string } | null>(null);

    const [editing, setEditing] = useState<TutorialRow | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editCategory, setEditCategory] = useState("");
    const [editSort, setEditSort] = useState("0");
    const [editPublished, setEditPublished] = useState(true);
    const [editSaving, setEditSaving] = useState(false);

    const [deleting, setDeleting] = useState<TutorialRow | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

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
        setLoadError(null);
        try {
            const res = await authenticatedFetch(adminTutorialsReadUrl(""), {}, { redirectToLogin: true });
            if (!res?.ok) {
                setRows([]);
                setLoadError(`Could not load tutorials${res?.status ? ` (HTTP ${res.status})` : ""}.`);
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
            setLoadError("Failed to load tutorials. Check your connection and retry.");
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
            const docSigned = d.document as ({ uploadUrl: string; publicUrl: string; filename?: string } | undefined) ?? undefined;
            const posterSigned = d.poster as ({ uploadUrl: string; publicUrl: string } | undefined) ?? undefined;
            const jobs: { label: string; url: string; file: File }[] = [{ label: "video", url: videoSigned.uploadUrl, file: videoFile }];
            if (documentFile && docSigned?.uploadUrl) jobs.push({ label: "document", url: docSigned.uploadUrl, file: documentFile });
            if (posterFile && posterSigned?.uploadUrl) jobs.push({ label: "poster", url: posterSigned.uploadUrl, file: posterFile });
            const totalBytes = jobs.reduce((n, j) => n + j.file.size, 0) || 1;
            let doneBytes = 0;
            for (const j of jobs) {
                setProgress({ pct: Math.round((doneBytes / totalBytes) * 100), label: `Uploading ${j.label}…` });
                await putWithProgress(j.url, j.file, (loaded) =>
                    setProgress({ pct: Math.min(100, Math.round(((doneBytes + loaded) / totalBytes) * 100)), label: `Uploading ${j.label}…` }),
                );
                doneBytes += j.file.size;
            }
            setProgress({ pct: 100, label: "Saving…" });

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
            setProgress(null);
        }
    };

    const onDelete = async (row: TutorialRow) => {
        setDeleteBusy(true);
        try {
            const res = await authenticatedFetch(
                adminTutorialsReadUrl(`/${encodeURIComponent(row.id)}`),
                { method: "DELETE" },
                { redirectToLogin: true },
            );
            if (!res?.ok) {
                toast.error("Could not delete.");
                return;
            }
            toast.success("Tutorial removed.");
            setDeleting(null);
            await load();
        } catch {
            toast.error("Delete failed.");
        } finally {
            setDeleteBusy(false);
        }
    };

    const openEdit = (r: TutorialRow) => {
        setEditing(r);
        setEditTitle(r.title ?? "");
        setEditCategory(r.category ?? "");
        setEditSort(String(Number(r.sortOrder ?? 0)));
        setEditPublished(r.published ?? r.isPublished ?? true);
    };

    const onSaveEdit = async () => {
        if (!editing) return;
        const t = editTitle.trim();
        if (t.length < 2) {
            toast.error("Title is required.");
            return;
        }
        setEditSaving(true);
        try {
            const payload: Record<string, unknown> = {
                title: t,
                category: editCategory.trim() || "General",
                sortOrder: Number.parseInt(editSort, 10) || 0,
            };
            // Only send `published` when the API exposes it (whitelist pipes reject unknown fields).
            if (editing.published !== undefined || editing.isPublished !== undefined) payload.published = editPublished;
            const res = await authenticatedFetch(
                adminTutorialsReadUrl(`/${encodeURIComponent(editing.id)}`),
                { method: "PATCH", body: JSON.stringify(payload) },
                { redirectToLogin: true },
            );
            if (!res?.ok) {
                const msg = await res?.text?.().catch(() => "");
                toast.error(msg?.slice(0, 200) || "Could not save changes.");
                return;
            }
            toast.success("Tutorial updated.");
            setEditing(null);
            await load();
        } catch {
            toast.error("Save failed.");
        } finally {
            setEditSaving(false);
        }
    };

    return (
        <div className="p-4 sm:p-8">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        {progress ? (
                            <div role="progressbar" aria-valuenow={progress.pct} aria-valuemin={0} aria-valuemax={100}>
                                <div className="mb-1 flex justify-between text-xs text-slate-600">
                                    <span>{progress.label}</span>
                                    <span className="tabular-nums">{progress.pct}%</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress.pct}%` }} />
                                </div>
                            </div>
                        ) : null}
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
                    ) : loadError ? (
                        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
                            <p className="text-sm font-medium text-red-900">{loadError}</p>
                            <Button type="button" variant="outline" className="mt-4" onClick={() => void load()}>
                                Retry
                            </Button>
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
                                        <h3 className="mt-1 break-words font-semibold text-slate-900">
                                            {r.title}
                                            {(r.published ?? r.isPublished) === false ? (
                                                <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">Draft</span>
                                            ) : null}
                                        </h3>
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
                                                    className="inline-flex items-center gap-1 break-all font-medium text-emerald-700 hover:underline"
                                                >
                                                    <FileText className="h-3 w-3 shrink-0" />
                                                    {r.documentFilename || "Document"}
                                                </a>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 gap-2">
                                        <Button type="button" variant="outline" onClick={() => openEdit(r)}>
                                            <Pencil className="mr-2 h-4 w-4" /> Edit
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="border-rose-200 text-rose-700 hover:bg-rose-50"
                                            disabled={deleteBusy && deleting?.id === r.id}
                                            onClick={() => setDeleting(r)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" /> Remove
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            <Dialog open={editing !== null} onOpenChange={(o) => (!o && !editSaving ? setEditing(null) : undefined)}>
                <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit tutorial</DialogTitle>
                        <DialogDescription>Update the details. Files are not changed here.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="e-title">Title</Label>
                            <Input id="e-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1.5" />
                        </div>
                        <div>
                            <Label htmlFor="e-cat">Category</Label>
                            <Input id="e-cat" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="mt-1.5" />
                        </div>
                        <div>
                            <Label htmlFor="e-sort">Display order</Label>
                            <Input id="e-sort" type="number" min={0} value={editSort} onChange={(e) => setEditSort(e.target.value)} className="mt-1.5" />
                        </div>
                        {editing && (editing.published !== undefined || editing.isPublished !== undefined) ? (
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <input type="checkbox" checked={editPublished} onChange={(e) => setEditPublished(e.target.checked)} className="h-4 w-4" />
                                Published
                            </label>
                        ) : null}
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={editSaving}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={() => void onSaveEdit()} disabled={editSaving}>
                            {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmModal
                open={deleting !== null}
                title="Remove tutorial"
                tone="danger"
                confirmLabel="Remove"
                busy={deleteBusy}
                onConfirm={() => (deleting ? onDelete(deleting) : undefined)}
                onCancel={() => setDeleting(null)}
            >
                Remove &ldquo;{deleting?.title}&rdquo;? Video and attached files will be deleted from storage.
            </ConfirmModal>
        </div>
    );
}
