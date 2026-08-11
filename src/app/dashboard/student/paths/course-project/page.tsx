"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, UploadCloud, X } from "lucide-react";
import clsx from "clsx";
import { authenticatedFetch } from "@/utils/api";
import { sdgData } from "@/utils/sdgData";
import PathWorkspaceShell from "@/components/ciel/PathWorkspaceShell";
import { WorkspaceSkeleton } from "@/components/ciel/Skeleton";

interface CourseProjectEntry {
    id?: string;
    course: string | null;
    projectTitle: string | null;
    projectDescription: string | null;
    sdgs: number[] | null;
    evidenceUrls: string[] | null;
    stepCompleted: number;
    status: "draft" | "submitted";
}

const STEPS = [
    { key: "course", label: "Course" },
    { key: "project", label: "Project" },
    { key: "impact", label: "Impact" },
    { key: "evidence", label: "Evidence" },
];

const EMPTY: CourseProjectEntry = { course: "", projectTitle: "", projectDescription: "", sdgs: [], evidenceUrls: [], stepCompleted: 0, status: "draft" };

export default function CourseProjectPage() {
    const [loading, setLoading] = useState(true);
    const [entry, setEntry] = useState<CourseProjectEntry>(EMPTY);
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        authenticatedFetch("/api/v1/paths/course-project", {}, { redirectToLogin: false })
            .then((res) => (res?.ok ? res.json() : null))
            .then((result) => {
                if (result?.data) {
                    const data = result.data as CourseProjectEntry;
                    setEntry({ ...EMPTY, ...data, sdgs: data.sdgs ?? [], evidenceUrls: data.evidenceUrls ?? [] });
                    setStep(Math.min(3, data.stepCompleted ?? 0));
                }
            })
            .finally(() => setLoading(false));
    }, []);

    const save = async (patch: Partial<CourseProjectEntry>, advanceTo?: number) => {
        setSaving(true);
        setError(null);
        const nextStepCompleted = advanceTo !== undefined ? Math.max(entry.stepCompleted, advanceTo) : entry.stepCompleted;
        try {
            const res = await authenticatedFetch(
                "/api/v1/paths/course-project",
                { method: "PATCH", body: JSON.stringify({ ...patch, stepCompleted: nextStepCompleted }) },
                { redirectToLogin: false },
            );
            const result = res?.ok ? await res.json() : null;
            if (!result?.data) throw new Error("Could not save your progress");
            setEntry({ ...EMPTY, ...result.data, sdgs: result.data.sdgs ?? [], evidenceUrls: result.data.evidenceUrls ?? [] });
            if (advanceTo !== undefined) setStep(Math.min(3, advanceTo));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save your progress");
        } finally {
            setSaving(false);
        }
    };

    const toggleSdg = (num: number) => {
        const current = entry.sdgs ?? [];
        const next = current.includes(num) ? current.filter((n) => n !== num) : [...current, num];
        setEntry((e) => ({ ...e, sdgs: next }));
    };

    const handleEvidenceFile = async (file: File) => {
        setUploading(true);
        setError(null);
        try {
            const presignRes = await authenticatedFetch(
                "/api/v1/paths/evidence/presign",
                { method: "POST", body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }) },
                { redirectToLogin: false },
            );
            const presign = presignRes?.ok ? await presignRes.json() : null;
            const { uploadUrl, publicUrl } = presign?.data ?? {};
            if (!uploadUrl || !publicUrl) throw new Error("Could not prepare the upload");
            await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
            const nextUrls = [...(entry.evidenceUrls ?? []), publicUrl];
            setEntry((e) => ({ ...e, evidenceUrls: nextUrls }));
            await save({ evidenceUrls: nextUrls });
        } catch {
            setError("Evidence upload failed. Try again.");
        } finally {
            setUploading(false);
        }
    };

    const removeEvidence = (url: string) => {
        const nextUrls = (entry.evidenceUrls ?? []).filter((u) => u !== url);
        setEntry((e) => ({ ...e, evidenceUrls: nextUrls }));
        save({ evidenceUrls: nextUrls });
    };

    if (loading) return <WorkspaceSkeleton />;

    const fieldClass = "w-full rounded-ciel-sm border-2 border-ciel-border bg-ciel-page/50 px-4 py-3 text-sm font-semibold text-ciel-text outline-none focus:border-ciel-green focus:bg-white focus-visible:ring-2 focus-visible:ring-ciel-green";

    return (
        <PathWorkspaceShell
            title="Course Project"
            stats={[
                { label: "Status", value: entry.status === "submitted" ? "Submitted" : "Draft" },
                { label: "Steps complete", value: `${entry.stepCompleted}/4`, hint: "Contributes to sections 2, 3 of your impact score" },
            ]}
            tabs={[{ key: "build", label: "Build project" }]}
            activeTab="build"
            onTabChange={() => {}}
        >
            <div className="rounded-ciel-lg border border-ciel-border bg-white p-5 sm:p-6">
                <div className="flex items-center gap-2">
                    {STEPS.map((s, i) => (
                        <div key={s.key} className="flex flex-1 items-center gap-2">
                            <button
                                type="button"
                                onClick={() => i <= entry.stepCompleted && setStep(i)}
                                disabled={i > entry.stepCompleted}
                                className={clsx(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ciel-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green",
                                    i === step ? "bg-ciel-green text-white" : i < entry.stepCompleted ? "bg-ciel-green-soft text-ciel-green-deep" : "bg-ciel-page text-ciel-text-soft",
                                )}
                            >
                                {i < entry.stepCompleted ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                            </button>
                            <span className={clsx("hidden text-xs font-bold sm:block", i === step ? "text-ciel-text" : "text-ciel-text-soft")}>{s.label}</span>
                            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-ciel-border" />}
                        </div>
                    ))}
                </div>

                <div className="mt-6 space-y-4">
                    {step === 0 && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Which course is this for?</label>
                            <input type="text" value={entry.course ?? ""} onChange={(e) => setEntry((s) => ({ ...s, course: e.target.value }))} className={fieldClass} placeholder="e.g. CS-402 Software Engineering" />
                        </div>
                    )}
                    {step === 1 && (
                        <>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Project title</label>
                                <input type="text" value={entry.projectTitle ?? ""} onChange={(e) => setEntry((s) => ({ ...s, projectTitle: e.target.value }))} className={fieldClass} placeholder="Give your project a name" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Description</label>
                                <textarea rows={4} value={entry.projectDescription ?? ""} onChange={(e) => setEntry((s) => ({ ...s, projectDescription: e.target.value }))} className={fieldClass} placeholder="What does this project do, and who is it for?" />
                            </div>
                        </>
                    )}
                    {step === 2 && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Which SDGs does this project advance?</label>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {sdgData.map((sdg) => {
                                    const selected = (entry.sdgs ?? []).includes(sdg.number);
                                    return (
                                        <button
                                            key={sdg.number}
                                            type="button"
                                            onClick={() => toggleSdg(sdg.number)}
                                            className={clsx(
                                                "ciel-transition rounded-ciel-sm border-2 px-3 py-2.5 text-left text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green",
                                                selected ? "border-ciel-green bg-ciel-green-soft text-ciel-green-deep" : "border-ciel-border text-ciel-text-mid hover:border-ciel-green/40",
                                            )}
                                        >
                                            SDG {sdg.number} · {sdg.title}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {step === 3 && (
                        <div className="space-y-3">
                            <label className={clsx("ciel-transition flex cursor-pointer items-center gap-3 rounded-ciel-sm border-2 border-dashed border-ciel-border px-4 py-3 text-sm font-semibold text-ciel-text-mid hover:border-ciel-green/40", uploading && "opacity-60")}>
                                <UploadCloud className="h-4 w-4" />
                                {uploading ? "Uploading..." : "Upload evidence (screenshots, deliverables, photos)"}
                                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleEvidenceFile(e.target.files[0])} />
                            </label>
                            {!!entry.evidenceUrls?.length && (
                                <ul className="space-y-1.5">
                                    {entry.evidenceUrls.map((url) => (
                                        <li key={url} className="flex items-center justify-between gap-2 rounded-ciel-xs bg-ciel-page px-3 py-2 text-xs font-semibold text-ciel-text-mid">
                                            <a href={url} target="_blank" rel="noreferrer" className="truncate hover:underline">{url.split("/").pop()}</a>
                                            <button type="button" onClick={() => removeEvidence(url)} aria-label="Remove" className="text-ciel-text-soft hover:text-red-600">
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                {error && <p className="mt-4 text-xs font-semibold text-red-600">{error}</p>}

                <div className="mt-6 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        disabled={step === 0}
                        onClick={() => setStep((s) => Math.max(0, s - 1))}
                        className="ciel-transition rounded-ciel-sm border border-ciel-border px-4 py-2.5 text-sm font-bold text-ciel-text-mid hover:border-ciel-green/40 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green"
                    >
                        Back
                    </button>
                    {step < 3 ? (
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() => save({ course: entry.course, projectTitle: entry.projectTitle, projectDescription: entry.projectDescription, sdgs: entry.sdgs }, step + 1)}
                            className="ciel-transition rounded-ciel-sm bg-ciel-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-ciel-navy/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green focus-visible:ring-offset-2"
                        >
                            {saving ? "Saving..." : "Save & continue"}
                        </button>
                    ) : (
                        <button
                            type="button"
                            disabled={saving || entry.status === "submitted"}
                            onClick={() => save({ status: "submitted", stepCompleted: 4 })}
                            className="ciel-transition rounded-ciel-sm bg-ciel-green-deep px-5 py-2.5 text-sm font-bold text-white hover:bg-ciel-green-deep/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green focus-visible:ring-offset-2"
                        >
                            {entry.status === "submitted" ? "Submitted" : saving ? "Submitting..." : "Submit project"}
                        </button>
                    )}
                </div>
            </div>
        </PathWorkspaceShell>
    );
}
