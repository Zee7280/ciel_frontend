"use client";

import { MERIT_RUBRIC } from "@/utils/courseworkMeritModel";

/** Same 7-band calibration as merit-model.constants.ts GRADE_BANDS (backend) — mirrored, not
 * reinvented, so this copy never drifts from the rubric the AI analyser and faculty actually use.
 * (Also mirrored inline in [id]/page.tsx's step-8 rubric card — keep all three in sync.) */
const GRADE_BANDS: { range: string; label: string }[] = [
    { range: "0–39", label: "Insufficient" },
    { range: "40–54", label: "Basic" },
    { range: "55–64", label: "Developing" },
    { range: "65–74", label: "Good" },
    { range: "75–84", label: "Very Good" },
    { range: "85–94", label: "Excellent" },
    { range: "95–100", label: "Outstanding" },
];

function GuideCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-[18px] border border-[#dcebee] bg-white p-4">
            <h4 className="m-0 text-[13px] font-extrabold text-[#0d2b33]">{title}</h4>
            <div className="mt-2.5 space-y-2 text-[11.5px] leading-relaxed text-[#4b6169]">{children}</div>
        </div>
    );
}

/** Static "Guidance" overview — the loop, what to complete, how scoring really works and what
 * happens after submission. Adapted from the mockup's guideHero/guideGrid shape, but "How you are
 * scored" describes the REAL 7-criterion / 100-point rubric (courseworkMeritModel.ts, mirrored from
 * ciel_backend's merit-model.constants.ts) instead of the mockup's invented equal-weight criteria. */
export default function CourseworkGuidanceOverview() {
    return (
        <div className="space-y-3">
            <div
                className="rounded-[18px] border border-[#ead8b8] p-5"
                style={{ background: "linear-gradient(120deg,#fff8ec,#fdf1d6)" }}
            >
                <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#7f6026]">The loop in one line</span>
                <h3 className="m-0 mt-1.5 text-[18px] font-black text-[#16313d]">
                    Draft → Submit to faculty → Faculty reviews &amp; scores → Approved onto every Impact Wall
                </h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-[#70808a]">
                    Your record is autosaved as you write and is visible — with a live progress bar, never your unfinished
                    text — to your faculty, your university and CIEL PK. Your faculty is the only one who can change your
                    score or your text.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <GuideCard title="1 · What to complete">
                    <ul className="list-disc space-y-1.5 pl-4">
                        <li>Six short chapters: Course &amp; Faculty · Brief &amp; Problem · Aim &amp; Method · Results · SDG Mapping · Reflection &amp; Evidence.</li>
                        <li>Each chapter writes its own AI summary in your voice as you type — accept, edit or reset it in the last chapter before you submit.</li>
                        <li>Add your instructor&apos;s name and email in Course &amp; Faculty so they can find and review your submission.</li>
                    </ul>
                </GuideCard>
                <GuideCard title="2 · How you are scored">
                    <p>
                        The CIEL PK Universal Coursework Quality Rubric — <b>7 criteria, weighted to 100 points</b>, same
                        weights across every discipline:
                    </p>
                    <ul className="space-y-1">
                        {MERIT_RUBRIC.map((c) => (
                            <li key={c.key} className="flex items-center justify-between gap-2">
                                <span>{c.label}</span>
                                <b className="shrink-0 text-[#7f6026]">{c.max} pts</b>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-2 flex flex-wrap gap-1">
                        {GRADE_BANDS.map((b) => (
                            <span key={b.label} className="rounded-full border border-[#dcebee] bg-[#f8fafb] px-2 py-1 text-[9.5px] font-bold text-[#4b6169]">
                                <b className="text-[#0e7d74]">{b.range}</b> {b.label}
                            </span>
                        ))}
                    </div>
                    <p className="text-[10.5px] text-[#8a97a0]">
                        Your faculty may keep or edit the AI-proposed levels (with a reason) — only your faculty&apos;s final,
                        approved score ever reaches your card.
                    </p>
                </GuideCard>
                <GuideCard title="3 · After submission">
                    <ul className="list-disc space-y-1.5 pl-4">
                        <li><b>Approved</b> → your work appears on your Impact Wall (and your faculty&apos;s, university&apos;s and CIEL PK&apos;s) with the final score and your faculty&apos;s comment.</li>
                        <li><b>Revision requested</b> → it returns to My Workspace with a note; fix and resubmit — nothing is penalised.</li>
                        <li><b>Rejected</b> → closed with a reason, but you can still revise and resubmit for another review.</li>
                        <li>Ranking badges (faculty / university / CIEL PK) are separate — they only appear once that level publishes a ranking run.</li>
                    </ul>
                </GuideCard>
            </div>
        </div>
    );
}
