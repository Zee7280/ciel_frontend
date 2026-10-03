"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Image as ImageIcon, Paperclip, Sparkles } from "lucide-react";
import FacultyLockedV17Modal from "@/app/dashboard/faculty/reports/[reportId]/FacultyLockedV17Modal";
import ReportEvidenceGallery, {
    classifyEvidenceGalleryKind,
    type ReportEvidenceGalleryItem,
} from "@/components/ciel/community-service/ReportEvidenceGallery";

type PackageTab = "flashView" | "reportView" | "evidenceView";

type ReviewPackageFile = {
    url?: string;
    name?: string;
    kind?: string;
    source?: string;
    previewable?: boolean;
};

type ReviewPackageShape = {
    documents?: {
        flashcard?: { title?: string; href?: string };
        detailed_report?: { title?: string; href?: string };
        evidence?: { title?: string; count?: number; files?: ReviewPackageFile[] };
    };
    admin_review_href?: string;
    ai_analyser_href?: string;
};

export default function AdminReviewPackageStrip({
    reportId,
    report,
    fallbackFiles,
    highlight = false,
    initialDoc = null,
    variant = "admin",
}: {
    reportId: string;
    report: Record<string, unknown>;
    fallbackFiles: ReportEvidenceGalleryItem[];
    highlight?: boolean;
    initialDoc?: "flashcard" | "report" | "evidence" | null;
    variant?: "admin" | "published";
}) {
    const pack = (report.review_package || {}) as ReviewPackageShape;
    const files = useMemo<ReportEvidenceGalleryItem[]>(() => {
        const packaged = Array.isArray(pack.documents?.evidence?.files) ? pack.documents.evidence.files : [];
        const fromPackage = packaged
            .filter((file) => file?.url)
            .map((file) => ({
                url: String(file.url),
                name: String(file.name || "Evidence file"),
                kind: file.kind || classifyEvidenceGalleryKind(String(file.url), String(file.name || "")),
                source: file.source,
                previewable: file.previewable,
            }));
        return fromPackage.length ? fromPackage : fallbackFiles;
    }, [fallbackFiles, pack.documents?.evidence?.files]);
    const [openTab, setOpenTab] = useState<PackageTab | null>(() => {
        if (initialDoc === "flashcard") return "flashView";
        if (initialDoc === "report") return "reportView";
        if (initialDoc === "evidence") return "evidenceView";
        return null;
    });
    const analyserHref = `/dashboard/admin/reports/verify/${reportId}?view=cii-v2`;
    const isAdmin = variant === "admin";

    useEffect(() => {
        if (!highlight) return;
        document.getElementById("admin-review-package")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [highlight]);

    return (
        <section
            id="admin-review-package"
            className="scroll-mt-8 rounded-3xl border border-[#b7ddd8] bg-white p-5 shadow-sm sm:p-7"
        >
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0e7d74]">
                        {isAdmin ? "Super Admin review package" : "Published report package"}
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-900">Three documents from this student submission</h2>
                    <p className="mt-1 max-w-3xl text-sm text-slate-600">
                        {isAdmin
                            ? "Open the revised flashcard, the detailed report, and the evidence files (large clickable previews — not a link list). Run the AI analyser checker, then publish. After approval the same package goes to the student, partner/NGO, faculty, university, and admin."
                            : "Open the revised flashcard, the detailed report, and the evidence files. Click a thumbnail to view the file."}
                    </p>
                </div>
                {isAdmin ? (
                <Link
                    href={analyserHref}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                >
                    <Sparkles className="h-4 w-4" />
                    Run AI analyser
                </Link>
                ) : null}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <button
                    type="button"
                    onClick={() => setOpenTab("flashView")}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-[#0e7d74] hover:bg-[#f3fbf9]"
                >
                    <ImageIcon className="h-5 w-5 text-[#0e7d74]" />
                    <p className="mt-3 text-sm font-black text-slate-900">1. Revised flashcard</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Locked V17 flashcard from the student source record.</p>
                </button>
                <button
                    type="button"
                    onClick={() => setOpenTab("reportView")}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-[#0e7d74] hover:bg-[#f3fbf9]"
                >
                    <FileText className="h-5 w-5 text-[#0e7d74]" />
                    <p className="mt-3 text-sm font-black text-slate-900">2. Detailed report</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Full section-by-section dossier, unchanged from submit.</p>
                </button>
                <button
                    type="button"
                    onClick={() => setOpenTab("evidenceView")}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-[#0e7d74] hover:bg-[#f3fbf9]"
                >
                    <Paperclip className="h-5 w-5 text-[#0e7d74]" />
                    <p className="mt-3 text-sm font-black text-slate-900">3. Evidence files</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                        {files.length} file{files.length === 1 ? "" : "s"} — click a thumbnail to view.
                    </p>
                </button>
            </div>
            <div className="mt-6">
                <h3 className="mb-3 text-sm font-black text-slate-800">Evidence gallery</h3>
                <ReportEvidenceGallery files={files} />
            </div>
            {openTab ? (
                <FacultyLockedV17Modal
                    reportId={reportId}
                    report={report}
                    projectData={report.opportunity}
                    initialTab={openTab}
                    analyzerHref={isAdmin ? analyserHref : undefined}
                    onClose={() => setOpenTab(null)}
                />
            ) : null}
        </section>
    );
}
