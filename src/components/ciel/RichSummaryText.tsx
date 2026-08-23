/** Renders an AI-composed summary string that may contain literal `<b>...</b>` markers for
 * emphasis (see composeCourseProjectSummaries) — safely, without dangerouslySetInnerHTML. Only the
 * exact `<b>`/`</b>` tokens toggle bold; every other character (including any `<...>`-shaped text a
 * student typed into a free-text field that flowed into the summary) renders as plain, auto-escaped
 * React text, so this can never execute injected markup. */
function toSegments(text: string): { text: string; bold: boolean }[] {
    const segments: { text: string; bold: boolean }[] = [];
    let bold = false;
    for (const part of text.split(/(<\/?b>)/g)) {
        if (part === "<b>") {
            bold = true;
            continue;
        }
        if (part === "</b>") {
            bold = false;
            continue;
        }
        if (part) segments.push({ text: part, bold });
    }
    return segments;
}

export default function RichSummaryText({ text }: { text: string }) {
    return (
        <>
            {toSegments(text).map((seg, i) => (seg.bold ? <b key={i}>{seg.text}</b> : <span key={i}>{seg.text}</span>))}
        </>
    );
}
