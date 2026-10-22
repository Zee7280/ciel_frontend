import { ExternalLink, FileText, Paperclip } from "lucide-react";

export type SignupProofDocumentView = {
    label?: string;
    url?: string;
    fileName?: string;
    uploadedAt?: string;
};

export function readSignupProofDocuments(value: unknown): SignupProofDocumentView[] {
    if (!Array.isArray(value)) return [];
    return value.filter(
        (d): d is SignupProofDocumentView =>
            Boolean(d) && typeof d === "object" && typeof (d as { url?: unknown }).url === "string",
    );
}

/** Files the applicant uploaded on the signup form, for the admin to check before approving. */
export default function SignupProofDocuments({
    documents,
    compact = false,
}: {
    documents: SignupProofDocumentView[];
    compact?: boolean;
}) {
    if (compact) {
        if (!documents.length) return <span className="text-xs text-slate-400">No documents</span>;
        return (
            <span className="flex flex-wrap gap-1.5">
                {documents.map((d, i) => (
                    <a
                        key={`${d.url}-${i}`}
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-[#cbece4] bg-[#e8f7f3] px-2 py-0.5 text-[11px] font-semibold text-[#08756b] hover:border-[#0e7d74]"
                        title={d.fileName || d.label}
                    >
                        <Paperclip className="h-3 w-3" /> {d.label || "Document"}
                    </a>
                ))}
            </span>
        );
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Signup documents</p>
            {documents.length === 0 ? (
                <p className="mt-1 text-sm text-slate-500">No document was uploaded at signup.</p>
            ) : (
                <ul className="mt-2 space-y-2">
                    {documents.map((d, i) => (
                        <li key={`${d.url}-${i}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                            <span className="flex min-w-0 items-center gap-2 text-sm text-slate-800">
                                <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                                <span className="min-w-0">
                                    <b className="block font-semibold">{d.label || "Document"}</b>
                                    <span className="block truncate text-xs text-slate-500">
                                        {[d.fileName, d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : ""].filter(Boolean).join(" · ")}
                                    </span>
                                </span>
                            </span>
                            <a
                                href={d.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-[#cbece4] bg-[#e8f7f3] px-3 py-1.5 text-xs font-bold text-[#08756b] hover:border-[#0e7d74]"
                            >
                                Open document <ExternalLink className="h-3 w-3" />
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
