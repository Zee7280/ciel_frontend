/** Shared title band so every role's opportunity list matches the student flashcard. */
export default function OpportunityListFlashHead({
    title,
    summary,
}: {
    title: string;
    summary?: string;
}) {
    return (
        <div className="bg-[linear-gradient(128deg,#102f3d_0%,#126a67_62%,#a67817_150%)] px-4 py-3 text-white sm:px-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#f1d97d]">
                CIEL PK · Community Service Opportunity
            </p>
            <h3 className="mt-1 text-base font-extrabold leading-tight tracking-tight">{title || "Untitled opportunity"}</h3>
            {summary ? <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#d8e9ea]">{summary}</p> : null}
        </div>
    );
}
