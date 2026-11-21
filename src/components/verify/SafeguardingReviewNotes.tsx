import { AlertTriangle, Info } from "lucide-react";
import clsx from "clsx";
import { safeguardingReviewNotes, type RiskBlockShape } from "@/app/dashboard/student/report/utils/riskSafeguarding";

/**
 * V19 item 13 — "Reviewer attention" panel for Section 2.3. Shared by the faculty / partner /
 * admin review pages and the print dossier so every stakeholder sees the same flags.
 * Renders nothing when there is nothing to flag.
 */
export function SafeguardingReviewNotes({
    block,
    className,
    compact = false,
}: {
    block: RiskBlockShape | null | undefined;
    className?: string;
    compact?: boolean;
}) {
    const notes = safeguardingReviewNotes(block);
    if (!notes.length) return null;
    const attention = notes.filter((n) => n.level === "attention");
    return (
        <div
            className={clsx(
                "break-inside-avoid rounded-xl border px-4 py-3",
                attention.length ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50",
                className,
            )}
            data-testid="safeguarding-review-notes"
        >
            <p
                className={clsx(
                    "text-[10px] font-black uppercase tracking-[0.14em]",
                    attention.length ? "text-amber-800" : "text-slate-500",
                )}
            >
                Reviewer attention · safeguarding (2.3)
                {attention.length ? ` · ${attention.length} flag${attention.length === 1 ? "" : "s"}` : ""}
            </p>
            <ul className={clsx("mt-2 space-y-1.5", compact ? "text-[11px]" : "text-xs sm:text-[13px]")}>
                {notes.map((note) => (
                    <li key={note.code} className="flex items-start gap-2 leading-snug">
                        {note.level === "attention" ? (
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                        ) : (
                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        )}
                        <span className={note.level === "attention" ? "text-amber-900" : "text-slate-600"}>{note.message}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
