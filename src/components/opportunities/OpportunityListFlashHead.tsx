/** Shared title band so every role's opportunity list matches the student flashcard. */
export default function OpportunityListFlashHead({
    title,
    summary,
    compact,
}: {
    title: string;
    summary?: string;
    compact?: boolean;
}) {
    return (
        <div
            className={
                "bg-[linear-gradient(128deg,#102f3d_0%,#126a67_62%,#a67817_150%)] text-white " +
                (compact ? "px-4 py-2 sm:px-5" : "px-4 py-3 sm:px-5")
            }
        >
            <p
                className={
                    "font-extrabold uppercase tracking-[0.16em] text-[#f1d97d] " +
                    (compact ? "text-[9px]" : "text-[10px]")
                }
            >
                CIEL PK · Community Service Opportunity
            </p>
            <h3
                className={
                    "break-words font-extrabold leading-tight tracking-tight [overflow-wrap:anywhere] " +
                    (compact ? "mt-0.5 text-sm" : "mt-1 text-base")
                }
            >
                {title || "Untitled opportunity"}
            </h3>
            {summary ? <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#d8e9ea]">{summary}</p> : null}
        </div>
    );
}
