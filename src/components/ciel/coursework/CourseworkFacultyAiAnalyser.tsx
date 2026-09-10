"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";
import CourseworkCard from "@/components/ciel/CourseworkCard";
import type { MeritEntry } from "@/components/ciel/MeritModelPanel";
import {
    AI_STAGES,
    GLOBAL_FRAMEWORKS,
    PERFORMANCE_ANCHORS,
    QUALITY_BANDS,
    bandForScore,
    buildAnalyserModel,
    criterionExplain,
    scoreFromLevels,
    weightedPoints,
} from "@/utils/courseworkFacultyAnalyser";

type TabId = "Intake" | "Score" | "Evidence" | "Global" | "Rubric" | "Moderation" | "Final";

const TABS: { id: TabId; label: string }[] = [
    { id: "Intake", label: "📥 Submission Package" },
    { id: "Score", label: "◉ AI Score" },
    { id: "Evidence", label: "🔎 Evidence" },
    { id: "Global", label: "🌐 Global Benchmark" },
    { id: "Rubric", label: "📚 Rubric" },
    { id: "Moderation", label: "🧑‍🏫 Faculty Moderation" },
    { id: "Final", label: "🔒 Final Record" },
];

const SCAN_STEPS = [
    [14, "Reading Flashcard and structured coursework record…"],
    [30, "Inspecting the primary coursework file and extracting academic claims…"],
    [46, "Matching supporting files to claims and checking contradictions…"],
    [62, "Applying all seven 0–5 rubric anchors and weights…"],
    [76, "Calibrating expected depth to the declared academic stage…"],
    [89, "Running global academic and sustainability benchmark diagnostics…"],
] as const;

async function sha256Hex(payload: unknown): Promise<string> {
    const data = new TextEncoder().encode(JSON.stringify(payload));
    const hash = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function CourseworkFacultyAiAnalyser({
    entry,
    reviewingId,
    onReview,
}: {
    entry: MeritEntry;
    reviewingId: string | null;
    onReview: (
        id: string,
        action: "approve" | "reject" | "revision",
        note?: string,
        moderation?: { levels: Record<string, number>; notes?: Record<string, string>; facultyScore: number; band?: string; lockHash?: string },
    ) => void;
}) {
    const model = useMemo(() => buildAnalyserModel(entry), [entry]);
    const alreadyApproved = entry.facultyApprovalStatus === "approved";
    const savedModeration = entry.facultyModeration;
    const [tab, setTab] = useState<TabId>("Intake");
    const [analysed, setAnalysed] = useState(alreadyApproved);
    const [scanning, setScanning] = useState(false);
    const [scanPct, setScanPct] = useState(alreadyApproved ? 100 : 0);
    const [scanText, setScanText] = useState(
        alreadyApproved ? "Faculty decision already recorded on this submission." : "Ready for automatic analysis.",
    );
    const [facultyLevels, setFacultyLevels] = useState<Record<string, number>>(savedModeration?.levels || model.aiLevels);
    const [notes, setNotes] = useState<Record<string, string>>(savedModeration?.notes || {});
    const [overallNote, setOverallNote] = useState(entry.facultyApprovalNote || "");
    const [returnNote, setReturnNote] = useState("");
    const [locked, setLocked] = useState(alreadyApproved);
    const [lockHash, setLockHash] = useState(savedModeration?.lockHash || "");
    const [lockedAt, setLockedAt] = useState(entry.facultyApprovalAt || "");
    const [openCriterion, setOpenCriterion] = useState<string | null>(null);

    useEffect(() => {
        setTab("Intake");
        setAnalysed(entry.facultyApprovalStatus === "approved");
        setScanning(false);
        setScanPct(entry.facultyApprovalStatus === "approved" ? 100 : 0);
        setScanText(
            entry.facultyApprovalStatus === "approved"
                ? "Faculty decision already recorded on this submission."
                : "Ready for automatic analysis.",
        );
        setFacultyLevels(entry.facultyModeration?.levels || model.aiLevels);
        setNotes(entry.facultyModeration?.notes || {});
        setOverallNote(entry.facultyApprovalNote || "");
        setReturnNote("");
        setLocked(entry.facultyApprovalStatus === "approved");
        setLockHash(entry.facultyModeration?.lockHash || "");
        setLockedAt(entry.facultyApprovalAt || "");
        setOpenCriterion(null);
    }, [entry.id, entry.facultyApprovalAt, entry.facultyApprovalNote, entry.facultyApprovalStatus, entry.facultyModeration, model.aiLevels]);

    const facultyScore = scoreFromLevels(model.scorecard, facultyLevels);
    const facultyBand = bandForScore(facultyScore);
    const delta = facultyScore - model.aiScore;
    const changed = model.scorecard.criteria.filter((c) => (facultyLevels[c.key] ?? 0) !== model.aiLevels[c.key]);
    const missingReason = changed.some((c) => !String(notes[c.key] || "").trim());
    const missingReturnReason = !returnNote.trim() && !overallNote.trim();
    const busy = reviewingId === entry.id || scanning;

    const runAnalysis = () => {
        if (locked || scanning) return;
        setScanning(true);
        setScanPct(8);
        setScanText("Starting coursework analysis…");
        SCAN_STEPS.forEach(([pct, text], i) => {
            window.setTimeout(() => {
                setScanPct(pct);
                setScanText(text);
            }, 220 * (i + 1));
        });
        window.setTimeout(() => {
            setScanPct(100);
            setScanText(
                `Analysis complete · AI ${model.aiScore}/100 · evidence match ${model.evidenceAvg}% · ready for Faculty moderation.`,
            );
            setAnalysed(true);
            setScanning(false);
            setTab("Score");
        }, 220 * (SCAN_STEPS.length + 1) + 200);
    };

    const resetAnalysis = () => {
        if (locked) return;
        setAnalysed(false);
        setScanPct(0);
        setScanText("Ready for automatic analysis.");
        setFacultyLevels(model.aiLevels);
        setNotes({});
        setTab("Intake");
    };

    const approveAndLock = async () => {
        if (!entry.id || locked || busy) return;
        if (!analysed) {
            setTab("Intake");
            return;
        }
        if (missingReason) {
            setTab("Moderation");
            return;
        }
        const record = {
            id: entry.id,
            title: model.title,
            aiScore: model.aiScore,
            facultyScore,
            band: facultyBand.name,
            evidenceAverage: model.evidenceAvg,
            levels: facultyLevels,
            notes,
            overallNote,
            at: new Date().toISOString(),
        };
        const hash = await sha256Hex(record);
        onReview(entry.id, "approve", overallNote.trim() || undefined, {
            levels: facultyLevels,
            notes,
            facultyScore,
            band: facultyBand.name,
            lockHash: hash,
        });
        setLockHash(hash);
        setLocked(true);
        setLockedAt(new Date().toLocaleString());
        setTab("Final");
    };

    return (
        <div className="min-w-0">
            <div className="sticky top-2 z-20 mb-3.5 flex items-center gap-3 rounded-[18px] border border-[#e4e9ef] bg-white/95 px-3.5 py-2.5 shadow-[0_10px_30px_rgba(16,43,59,.07)] backdrop-blur">
                <div>
                    <p className="text-[17px] font-black tracking-tight text-[#10212c]">
                        CIEL <span className="text-[#c88b16]">PK</span>
                    </p>
                </div>
                <div className="text-[9px] leading-snug text-[#6d7987]">
                    FACULTY REVIEW WORKSPACE · COURSEWORK
                    <br />
                    Universal Coursework Quality Rubric · Global Benchmark Layer
                </div>
                <div className="ml-auto">
                    <span
                        className={clsx(
                            "rounded-full px-2.5 py-1.5 text-[8.5px] font-black",
                            locked ? "bg-[#eeeafd] text-[#5943b2]" : "bg-[#e9f8f0] text-[#16865a]",
                        )}
                    >
                        {locked ? "🔒 COURSEWORK SCORE LOCKED" : "🔓 FACULTY REVIEW OPEN"}
                    </span>
                </div>
            </div>

            <section className="mb-3.5 grid gap-5 rounded-[25px] bg-[linear-gradient(125deg,#102b3b_0%,#183e59_54%,#5d47bc_145%)] px-6 py-6 text-white shadow-[0_22px_55px_rgba(16,43,59,.16)] lg:grid-cols-[1.45fr_.75fr]">
                <div>
                    <p className="text-[9px] font-black tracking-[0.17em] text-[#f3d27e]">COURSEWORK · AUTOMATIC POST-SUBMISSION FACULTY ANALYSIS</p>
                    <h1 className="mt-2 text-[27px] font-black leading-tight tracking-tight">AI Coursework Score + Global Benchmark Review</h1>
                    <p className="mt-2 max-w-[840px] text-[12px] leading-relaxed text-[#dce8f1]">
                        The moment a student submits, Faculty receives the <b>Flashcard, completed coursework record, primary coursework file and all supporting evidence together</b>. CIEL PK analyses the work against the locked 7-criterion universal rubric, calibrates expected depth to the declared academic stage, checks evidence-to-claim consistency, and provides a diagnostic comparison against recognised global academic and sustainability reference frameworks. Faculty remains the final academic decision-maker and may raise or lower any AI-proposed criterion level with a recorded reason.
                    </p>
                </div>
                <div className="grid grid-cols-2 content-center gap-2">
                    {[
                        ["100", "OFFICIAL QUALITY POINTS"],
                        ["7", "LOCKED RUBRIC CRITERIA"],
                        ["0–5", "PERFORMANCE ANCHORS"],
                        ["3", "GLOBAL REFERENCE LAYERS"],
                    ].map(([value, label]) => (
                        <div key={label} className="rounded-[14px] border border-white/18 bg-white/8 p-2.5">
                            <b className="block text-[19px]">{value}</b>
                            <span className="text-[7px] font-black tracking-[0.1em] text-[#c9d9e3]">{label}</span>
                        </div>
                    ))}
                </div>
            </section>

            <div className="mb-3.5 flex flex-wrap gap-1.5">
                {TABS.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setTab(item.id)}
                        className={clsx(
                            "rounded-full border px-3.5 py-2 text-[9px] font-black",
                            tab === item.id
                                ? "border-[#102b3b] bg-[#102b3b] text-white"
                                : "border-[#e4e9ef] bg-white text-[#5b6876]",
                        )}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {tab === "Intake" && (
                <div className="space-y-3">
                    <div className="grid gap-3 lg:grid-cols-2">
                        <article className="rounded-[18px] border border-[#e4e9ef] bg-white p-4 shadow-[0_8px_25px_rgba(16,43,59,.035)]">
                            <Header n="A" title="Faculty Submission Package" tag="AUTO-RECEIVED TOGETHER" />
                            <p className="mb-3 text-[12px] leading-relaxed text-[#6d7987]">
                                Faculty does not ask the student for separate documents. The submitted coursework pushes the complete review package into this workspace in one transaction.
                            </p>
                            <Package
                                icon="🃏"
                                title="Student Flashcard + structured form"
                                sub="Course context, academic stage, project format, summaries, SDGs, metrics, declarations and instructor routing."
                                chips={[
                                    { ok: true, label: "✓ Coursework Flashcard" },
                                    { ok: model.summariesFilled >= 7, label: `✓ ${model.summariesFilled} section summaries` },
                                    { ok: !model.sdg.startsWith("No SDG"), label: "✓ SDG mapping" },
                                ]}
                            />
                            <Package
                                icon="📄"
                                title="Primary coursework file"
                                sub="The actual assignment/report/prototype deck/code/output submitted by the student, not only the flashcard summary."
                                chips={[
                                    model.primaryFileName
                                        ? { ok: true, label: `✓ ${model.primaryFileName}`, href: model.primaryFile || undefined }
                                        : { ok: false, label: "No primary file attached (optional)" },
                                ]}
                            />
                            <Package
                                icon="📎"
                                title="Evidence package"
                                sub="All optional supporting files arrive with the same record and are checked individually for relevance and claim support."
                                chips={[
                                    { ok: model.evidenceCount > 0, label: `${model.evidenceCount} evidence file${model.evidenceCount === 1 ? "" : "s"} mapped` },
                                    ...model.evidence
                                        .filter((row) => row.url)
                                        .map((row) => ({ ok: true, label: `↗ ${row.file}`, href: row.url })),
                                    ...(!model.scorecard.consistency.ok
                                        ? [{ ok: false, label: "1 partial-confidence item" }]
                                        : []),
                                ]}
                            />
                            <div className="mt-2.5 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    disabled={locked || scanning}
                                    onClick={runAnalysis}
                                    className="rounded-[11px] bg-[linear-gradient(90deg,#173b54,#6b4cd7)] px-3.5 py-2.5 text-[11px] font-black text-white disabled:opacity-45"
                                >
                                    ✦ Run Full Coursework Analysis
                                </button>
                                <button
                                    type="button"
                                    disabled={locked}
                                    onClick={resetAnalysis}
                                    className="rounded-[11px] border border-[#e4e9ef] bg-white px-3 py-2.5 text-[11px] font-black text-[#405461] disabled:opacity-45"
                                >
                                    Reset analysis
                                </button>
                            </div>
                        </article>

                        <article className="rounded-[18px] border border-[#e4e9ef] bg-white p-4 shadow-[0_8px_25px_rgba(16,43,59,.035)]">
                            <Header n="B" title="What the AI actually does" tag="8-STAGE REVIEW" tagKind="ai" />
                            <p className="mb-3 text-[12px] leading-relaxed text-[#6d7987]">
                                The score is not inferred from a polished summary alone. The engine reads the record, actual coursework and supporting evidence, then calibrates the judgement before Faculty sees a recommendation.
                            </p>
                            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                                {AI_STAGES.map((step) => (
                                    <div
                                        key={step.n}
                                        className={clsx(
                                            "min-h-[76px] rounded-xl border p-2.5",
                                            analysed ? "border-[#bfe3d1] bg-[#e9f8f0]" : "border-[#e0e6ec] bg-white",
                                        )}
                                    >
                                        <div className="grid h-[23px] w-[23px] place-items-center rounded-[7px] bg-[#102b3b] text-[10px] font-black text-white">
                                            {step.n}
                                        </div>
                                        <b className="mt-1.5 block text-[11px] leading-tight">{step.title}</b>
                                        <small className="text-[10px] leading-snug text-[#75818e]">{step.sub}</small>
                                    </div>
                                ))}
                            </div>
                            <Callout>
                                <b>Important:</b> global comparison is a calibration and diagnostic layer, not a separate pool of marks. The official score remains the locked 100-point coursework rubric.
                            </Callout>
                        </article>
                    </div>

                    <article className="rounded-[18px] border border-[#e4e9ef] bg-white p-4 shadow-[0_8px_25px_rgba(16,43,59,.035)]">
                        <Header n="C" title={`${model.title}`} tag={model.stage.tag} tagKind="gold" />
                        <div className="mt-2.5 grid grid-cols-2 gap-2 md:grid-cols-4">
                            {[
                                [model.course, "COURSE"],
                                [model.programme, "PROGRAMME"],
                                [`${model.primaryFile ? 1 : 0} + ${model.evidenceCount}`, "PRIMARY + EVIDENCE FILES"],
                                [model.sdg, "SDG"],
                                ["7/7", "RUBRIC CRITERIA ACTIVE"],
                                [`${model.evidenceAvg}%`, "EVIDENCE MATCH"],
                                [String(model.aiScore), "AI PROPOSED SCORE"],
                                [locked ? "Locked" : "Open", "FACULTY MODERATION"],
                            ].map(([value, label]) => (
                                <div key={label} className="rounded-xl border border-[#e3e8ee] bg-[#fbfcfe] p-2.5">
                                    <b className="block text-[12px] leading-snug text-[#10212c]">{value}</b>
                                    <small className="text-[9px] font-extrabold tracking-wide text-[#7b8792]">{label}</small>
                                </div>
                            ))}
                        </div>
                        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#e7ebf0]">
                            <i className="block h-full bg-[linear-gradient(90deg,#2866d5,#6c4ce3)] transition-[width] duration-500" style={{ width: `${scanPct}%` }} />
                        </div>
                        <p className="mt-1.5 text-[11px] text-[#71808d]">{scanText}</p>
                        <div className="mt-4">
                            {/* The "continue your draft" nudge is only truthful for an unsubmitted draft —
                                this Intake tab lists entries already submitted and under faculty review. */}
                            <CourseworkCard
                                entry={entry}
                                studentName={model.name}
                                defaultOpen={false}
                                remindDraftOwner={entry.status !== "submitted"}
                                studentEmail={entry.student?.email || entry.studentInfo?.studentEmail}
                                hideScore={false}
                            />
                        </div>
                    </article>
                </div>
            )}

            {tab === "Score" && (
                <ScorePane model={model} analysed={analysed} openCriterion={openCriterion} onToggle={setOpenCriterion} />
            )}
            {tab === "Evidence" && <EvidencePane model={model} />}
            {tab === "Global" && <GlobalPane model={model} />}
            {tab === "Rubric" && <RubricPane model={model} facultyLevels={facultyLevels} />}
            {tab === "Moderation" && (
                <ModerationPane
                    model={model}
                    facultyLevels={facultyLevels}
                    notes={notes}
                    overallNote={overallNote}
                    returnNote={returnNote}
                    locked={locked}
                    busy={busy}
                    analysed={analysed}
                    missingReason={missingReason}
                    missingReturnReason={missingReturnReason}
                    facultyScore={facultyScore}
                    facultyBand={facultyBand}
                    delta={delta}
                    changedCount={changed.length}
                    lockHash={lockHash}
                    lockedAt={lockedAt}
                    onLevel={(key, value) => {
                        if (locked) return;
                        setFacultyLevels((prev) => ({ ...prev, [key]: value }));
                    }}
                    onNote={(key, value) => setNotes((prev) => ({ ...prev, [key]: value }))}
                    onOverall={setOverallNote}
                    onReturnNote={setReturnNote}
                    onReset={() => {
                        if (locked) return;
                        setFacultyLevels(model.aiLevels);
                        setNotes({});
                    }}
                    onApprove={approveAndLock}
                    onReturn={() => entry.id && onReview(entry.id, "revision", returnNote.trim() || overallNote.trim() || undefined)}
                    onReject={() => entry.id && onReview(entry.id, "reject", returnNote.trim() || overallNote.trim() || undefined)}
                />
            )}
            {tab === "Final" && (
                <FinalPane
                    model={model}
                    facultyLevels={facultyLevels}
                    facultyScore={facultyScore}
                    facultyBand={facultyBand}
                    delta={delta}
                    locked={locked}
                    lockHash={lockHash}
                    lockedAt={lockedAt}
                />
            )}
        </div>
    );
}

function Header({
    n,
    title,
    tag,
    tagKind = "ok",
}: {
    n: string;
    title: string;
    tag: string;
    tagKind?: "ok" | "ai" | "gold" | "warn";
}) {
    const tagClass =
        tagKind === "ai"
            ? "bg-[#f1edff] text-[#6c4ce3]"
            : tagKind === "gold"
              ? "bg-[#fff6df] text-[#8d6208]"
              : tagKind === "warn"
                ? "bg-[#fff3dc] text-[#8b600a]"
                : "bg-[#e9f8f0] text-[#16865a]";
    return (
        <div className="mb-1 flex items-center gap-2.5">
            <span className="grid h-7 w-8 shrink-0 place-items-center rounded-[9px] bg-[#102b3b] text-[10px] font-black text-white">{n}</span>
            <h2 className="m-0 text-sm font-bold text-[#10212c]">{title}</h2>
            <span className={clsx("ml-auto rounded-full px-2 py-1 text-[9px] font-black", tagClass)}>{tag}</span>
        </div>
    );
}

function Package({
    icon,
    title,
    sub,
    chips,
}: {
    icon: string;
    title: string;
    sub: string;
    chips: { ok: boolean; label: string; href?: string }[];
}) {
    return (
        <div className="mb-2 rounded-[15px] border-[1.5px] border-dashed border-[#cbd6e2] bg-[#fbfcff] p-3">
            <div className="flex items-center gap-2.5">
                <div className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[13px] bg-[#eaf1ff] text-lg">{icon}</div>
                <div>
                    <b className="block text-[12px] text-[#10212c]">{title}</b>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-[#6d7987]">{sub}</p>
                </div>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
                {chips.map((chip) =>
                    chip.href ? (
                        <a
                            key={chip.label}
                            href={chip.href}
                            target="_blank"
                            rel="noreferrer"
                            className={clsx(
                                "rounded-full px-2 py-1 text-[10px] font-extrabold",
                                chip.ok ? "bg-[#e9f8f0] text-[#16865a]" : "bg-[#fff3dc] text-[#8b600a]",
                            )}
                        >
                            {chip.label}
                        </a>
                    ) : (
                        <span
                            key={chip.label}
                            className={clsx(
                                "rounded-full px-2 py-1 text-[10px] font-extrabold",
                                chip.ok ? "bg-[#e9f8f0] text-[#16865a]" : "bg-[#fff3dc] text-[#8b600a]",
                            )}
                        >
                            {chip.label}
                        </span>
                    ),
                )}
            </div>
        </div>
    );
}

function Callout({ children }: { children: ReactNode }) {
    return (
        <div className="mt-2 rounded-r-[11px] border-l-[3px] border-[#6c4ce3] bg-[#f7f5ff] px-3 py-2.5 text-[12px] leading-relaxed text-[#625b78]">
            {children}
        </div>
    );
}

function ScorePane({
    model,
    analysed,
    openCriterion,
    onToggle,
}: {
    model: ReturnType<typeof buildAnalyserModel>;
    analysed: boolean;
    openCriterion: string | null;
    onToggle: (key: string | null) => void;
}) {
    if (!analysed) return <NeedAnalysis />;
    const s = model.aiScore;
    return (
        <div className="space-y-3">
            <article className="rounded-[18px] border border-[#e4e9ef] bg-white p-4">
                <div className="grid items-center gap-5 md:grid-cols-[185px_1fr]">
                    <div
                        className="relative mx-auto grid h-[170px] w-[170px] place-items-center rounded-full"
                        style={{ background: `conic-gradient(#6c4ce3 ${s}%, #e7ebf1 0)` }}
                    >
                        <div className="absolute h-[138px] w-[138px] rounded-full bg-white" />
                        <div className="relative z-[1] text-center">
                            <b className="block text-[37px] tracking-tight text-[#10212c]">{s}</b>
                            <span className="text-[10px] font-black tracking-wide text-[#768390]">AI CI SCORE / 100</span>
                        </div>
                    </div>
                    <div>
                        <span className="inline-block rounded-full bg-[#f1edff] px-2.5 py-1.5 text-[10px] font-black text-[#6c4ce3]">
                            {model.band.short} · AI PROPOSAL
                        </span>
                        <h2 className="mt-2 text-[21px] font-black text-[#10212c]">
                            {s >= 75 ? "Strong coursework with clear sustainability integration" : s >= 55 ? "Competent coursework with room to deepen" : "Developing coursework — faculty judgement required"}
                        </h2>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-[#64727d]">
                            The submission is scored on the locked 7-criterion universal rubric. Strongest signals come from the highest-weighted criteria. Faculty can keep or change any AI-proposed 0–5 level with a recorded reason.
                        </p>
                        <Callout>
                            <b>Academic-stage calibration:</b> judgement is calibrated to <b>{model.stage.label}</b>. The criteria and weights do not change; only the expected sophistication of a 4/5 or 5/5 response changes.
                        </Callout>
                    </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-1.5 md:grid-cols-7">
                    {QUALITY_BANDS.map((band) => (
                        <div
                            key={band.short}
                            className={clsx(
                                "rounded-[11px] border p-2",
                                band.name === model.band.name ? "border-[#6c4ce3] bg-[#f1edff]" : "border-[#e1e6ec] bg-[#fbfcfe]",
                            )}
                        >
                            <b className="block text-[10px]">{band.short}</b>
                            <span className="text-[10px] text-[#74818d]">
                                {band.min}–{Math.floor(band.max)}
                            </span>
                            <strong className="mt-1 block text-[10px]">{band.name}</strong>
                        </div>
                    ))}
                </div>
            </article>
            <article className="rounded-[18px] border border-[#e4e9ef] bg-white p-4">
                <Header n="7" title="Criterion-by-Criterion AI Analysis" tag="CLICK ANY ROW FOR REASONING" tagKind="ai" />
                <p className="mb-3 text-[12px] text-[#6d7987]">
                    Each row shows the AI performance level, weighted points and concise reason. Faculty sees the full reasoning before deciding whether to keep or change the proposed level.
                </p>
                <div className="space-y-2">
                    {model.scorecard.criteria.map((c) => {
                        const level = model.aiLevels[c.key];
                        const explain = criterionExplain(c);
                        const open = openCriterion === c.key;
                        return (
                            <div key={c.key} className="overflow-hidden rounded-[13px] border border-[#e0e6ec] bg-white">
                                <button
                                    type="button"
                                    onClick={() => onToggle(open ? null : c.key)}
                                    className="grid w-full grid-cols-[36px_1fr_74px] items-center gap-2.5 p-2.5 text-left sm:grid-cols-[36px_1fr_130px_74px]"
                                >
                                    <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#eaf1ff] text-[11px] font-black text-[#2866d5]">
                                        {c.label.split(" · ")[0]}
                                    </span>
                                    <span>
                                        <h3 className="m-0 text-[12.5px] font-bold text-[#10212c]">{c.label.replace(/^\d+ · /, "")}</h3>
                                        <p className="mt-0.5 text-[11px] text-[#74818e]">
                                            AI level {level}/5 · {Math.round((c.points / c.max) * 100)}% of criterion
                                        </p>
                                    </span>
                                    <span className="hidden h-[7px] overflow-hidden rounded-full bg-[#e7ebf0] sm:block">
                                        <i className="block h-full bg-[linear-gradient(90deg,#2866d5,#6c4ce3)]" style={{ width: `${(level / 5) * 100}%` }} />
                                    </span>
                                    <span className="text-right text-[12px] font-black">
                                        {weightedPoints(c, level).toFixed(1)}
                                        <small className="block text-[10px] font-bold text-[#81909b]"> / {c.max}</small>
                                    </span>
                                </button>
                                {open ? (
                                    <div className="border-t border-[#edf0f3] p-3">
                                        <div className="mb-2 grid gap-2 sm:grid-cols-2">
                                            <div className="rounded-[11px] border border-[#cce8da] bg-[#e9f8f0] p-2.5 text-[12px] leading-relaxed text-[#2d6654]">
                                                <b className="mb-1 block text-[11px]">✓ WHY IT SCORES WELL</b>
                                                {explain.good}
                                            </div>
                                            <div className="rounded-[11px] border border-[#eddcb9] bg-[#fff7e9] p-2.5 text-[12px] leading-relaxed text-[#765e32]">
                                                <b className="mb-1 block text-[11px]">↗ WHAT STOPS THE NEXT LEVEL</b>
                                                {explain.gap}
                                            </div>
                                        </div>
                                        <div className="rounded-[11px] bg-[#f8fafc] p-2.5 text-[12px] leading-relaxed text-[#5d6d79]">
                                            <b>AI analysis:</b> {explain.analysis}
                                            <br />
                                            <b>Anchor applied:</b> {PERFORMANCE_ANCHORS[level]?.title} — {PERFORMANCE_ANCHORS[level]?.text}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </article>
        </div>
    );
}

function EvidencePane({ model }: { model: ReturnType<typeof buildAnalyserModel> }) {
    const partial = model.evidence.filter((row) => row.verdict === "PARTIAL").length;
    return (
        <article className="rounded-[18px] border border-[#e4e9ef] bg-white p-4">
            <div className="grid items-center gap-3 md:grid-cols-[1fr_240px]">
                <div>
                    <Header n="AI" title="Evidence-to-Claim Verification" tag="MULTIMODAL CHECK" />
                    <p className="text-[12px] leading-relaxed text-[#6d7987]">
                        The engine separates “the work says this” from “the uploaded material supports this.” Evidence does not add marks automatically; it changes confidence in factual or process claims and can trigger Faculty review.
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {["1 · Extract claim", "2 · Inspect file", "3 · Match entity/value/date", "4 · Check relevance", "5 · Detect contradiction", "6 · Feed score confidence"].map(
                            (step) => (
                                <span key={step} className="rounded-full bg-[#edf4fb] px-2 py-1 text-[10px] font-black text-[#416785]">
                                    {step}
                                </span>
                            ),
                        )}
                    </div>
                </div>
                <div className="rounded-2xl border border-[#d9e6f0] bg-[linear-gradient(135deg,#edf7ff,#fff)] p-3.5">
                    <b className="block text-[28px] text-[#2c5e87]">{model.evidenceAvg}%</b>
                    <span className="text-[10px] font-black text-[#6c7f8e]">AVERAGE CLAIM ↔ EVIDENCE MATCH</span>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-[#607582]">
                        {model.evidence.length} files mapped · {partial} partial-confidence item{partial === 1 ? "" : "s"}
                    </p>
                </div>
            </div>
            <div className="mt-3 overflow-auto">
                <table className="w-full min-w-[680px] text-left">
                    <thead>
                        <tr className="text-[10px] tracking-wide text-[#6e7b88]">
                            <th className="pb-2">FILE</th>
                            <th className="pb-2">CLAIM CHECKED</th>
                            <th className="pb-2">AI INSPECTION</th>
                            <th className="pb-2">RESULT</th>
                            <th className="pb-2">WHY</th>
                        </tr>
                    </thead>
                    <tbody>
                        {model.evidence.map((row) => (
                            <tr key={row.id} className="border-t border-[#edf1f4] align-top text-[12px] leading-relaxed">
                                <td className="py-2 pr-2">
                                    <b>{row.id}</b>
                                    <br />
                                    {row.url ? (
                                        <a href={row.url} target="_blank" rel="noreferrer" className="text-[#536dc5]">
                                            {row.file}
                                        </a>
                                    ) : (
                                        row.file
                                    )}
                                </td>
                                <td className="py-2 pr-2">{row.claim}</td>
                                <td className="py-2 pr-2">{row.type}</td>
                                <td className="py-2 pr-2">
                                    <span
                                        className={clsx(
                                            "inline-block rounded-full px-2 py-0.5 text-[10px] font-black",
                                            row.verdict === "MATCH" ? "bg-[#e9f8f0] text-[#16865a]" : "bg-[#fff3dc] text-[#8b600a]",
                                        )}
                                    >
                                        {row.verdict}
                                    </span>
                                    <br />
                                    <b>{row.match}%</b>
                                </td>
                                <td className="py-2">{row.why}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-2.5 rounded-r-[11px] border-l-[3px] border-[#c88b16] bg-[#fff9ea] px-3 py-2.5 text-[12px] leading-relaxed text-[#725d31]">
                <b>Safeguard:</b> no upload is not an automatic penalty. A weak or contradictory file can reduce confidence only where the claim genuinely requires verification. Reflective judgement is not forced into an inappropriate documentary-evidence test.
            </div>
        </article>
    );
}

function GlobalPane({ model }: { model: ReturnType<typeof buildAnalyserModel> }) {
    const overall = model.aiScore >= 75 ? "Strong" : model.aiScore >= 55 ? "Developing" : "Uneven";
    const belowTop = model.scorecard.criteria.filter((c) => model.aiLevels[c.key] < 5 && c.max >= 15).length;
    return (
        <div className="space-y-3">
            <article className="rounded-[18px] border border-[#e4e9ef] bg-white p-4">
                <Header n="🌐" title="Global Benchmark Intelligence" tag="DIAGNOSTIC · NOT EXTRA MARKS" tagKind="ai" />
                <p className="text-[12px] leading-relaxed text-[#6d7987]">
                    This layer answers a different question from the rubric: <b>“How does the academic depth of this work compare with recognised international reference points and comparable higher-education work?”</b> It helps Faculty calibrate judgement; it does not silently rewrite the CIEL PK score.
                </p>
                <div className="mt-2.5 grid grid-cols-2 gap-2 md:grid-cols-4">
                    {[
                        ["3", "REFERENCE FRAMEWORKS CHECKED"],
                        [model.stage.tag.split(" ")[0], "ACADEMIC STAGE CALIBRATION"],
                        [overall, "OVERALL GLOBAL-READ POSITION"],
                        [String(belowTop), "AREAS BELOW TOP GLOBAL BAR"],
                    ].map(([value, label]) => (
                        <div key={label} className="rounded-xl border border-[#e2e7ed] bg-[#fafbfe] p-2.5">
                            <b className="block text-[15px]">{value}</b>
                            <span className="text-[10px] font-extrabold text-[#76838f]">{label}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-2.5 grid gap-2.5 md:grid-cols-3">
                    {GLOBAL_FRAMEWORKS.map((fw, i) => {
                        const partial = i === 2 && model.aiLevels.sustainability < 4;
                        return (
                            <div key={fw.name} className="rounded-[15px] border border-[#e1e6ec] bg-white p-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-[#f1edff] text-lg">{fw.icon}</div>
                                    <div>
                                        <b className="text-[12px]">{fw.name}</b>
                                        <br />
                                        <span className={clsx("inline-block rounded-full px-2 py-0.5 text-[10px] font-black", partial ? "bg-[#fff3dc] text-[#8b600a]" : "bg-[#e9f8f0] text-[#16865a]")}>
                                            {partial ? "GOOD / PARTIAL" : "STRONG ALIGNMENT"}
                                        </span>
                                    </div>
                                </div>
                                <p className="mt-2 text-[12px] leading-relaxed text-[#687683]">
                                    <b>{fw.check}.</b> {fw.strong}
                                </p>
                                <p className="mt-1.5 text-[10px] text-[#8a95a0]">
                                    Reference:{" "}
                                    <a href={fw.url} target="_blank" rel="noreferrer" className="text-[#536dc5]">
                                        {fw.source} ↗
                                    </a>
                                </p>
                            </div>
                        );
                    })}
                </div>
            </article>
            <div className="grid gap-3 lg:grid-cols-2">
                <article className="rounded-[18px] border border-[#e4e9ef] bg-white p-4">
                    <Header n="↗" title="Where global comparison raises the bar" tag="TOP-BAND CALIBRATION" tagKind="warn" />
                    <BenchTable
                        headers={["AREA", "THIS WORK", "STRONGER GLOBAL-LEVEL SIGNAL"]}
                        rows={[
                            ["Knowledge / context", "Relevant and integrated source base.", "More authoritative synthesis across competing evidence, with clearer evaluation of source quality."],
                            ["Analysis / application", "Findings support recommendations.", "More explicit uncertainty, alternative explanations, transfer conditions and tested trade-offs."],
                            ["ESD depth", "Systems and strategic thinking visible.", "Stronger anticipatory reasoning: future scenarios, unintended effects and long-horizon consequences."],
                        ]}
                    />
                </article>
                <article className="rounded-[18px] border border-[#e4e9ef] bg-white p-4">
                    <Header n="✓" title="Where the work is globally competitive" tag="STRONG SIGNALS" />
                    <BenchTable
                        headers={["AREA", "GLOBAL-READ JUDGEMENT"]}
                        rows={[
                            ["Purpose & alignment", "The task, deliverable and sustainability purpose reinforce one another."],
                            ["Method / process", "Traceable, appropriate and justified process where the format requires it."],
                            ["Sustainability integration", model.sdg],
                            ["Reflection", "Specific limitations and future changes are acknowledged without overclaiming."],
                        ]}
                    />
                </article>
            </div>
            <article className="rounded-[18px] border border-[#e4e9ef] bg-white p-4">
                <Header n="🔭" title="Comparable Global Work Search · Production Logic" tag="LIVE RETRIEVAL IN DEPLOYED VERSION" tagKind="gold" />
                <p className="text-[12px] leading-relaxed text-[#6d7987]">
                    This panel cites comparable open-access works using the submission’s discipline, academic stage, task format, primary SDG and method — then summarises what those exemplars demonstrate at a similar or stronger level. No prestige bonus is applied.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
                    {["Match Level", "Match Discipline", "Match Format", "Match SDG", "Retrieve Sources", "Compare, Cite"].map((step, i) => (
                        <div key={step} className="min-h-[76px] rounded-xl border border-[#bfe3d1] bg-[#e9f8f0] p-2.5">
                            <div className="grid h-[23px] w-[23px] place-items-center rounded-[7px] bg-[#102b3b] text-[10px] font-black text-white">{i + 1}</div>
                            <b className="mt-1.5 block text-[11px]">{step}</b>
                        </div>
                    ))}
                </div>
                <Callout>
                    <b>Fairness rule:</b> the comparator judges depth, rigor, reasoning and integration — never university name, country, project budget, technology sophistication or visual polish by themselves.
                </Callout>
            </article>
        </div>
    );
}

function RubricPane({
    model,
    facultyLevels,
}: {
    model: ReturnType<typeof buildAnalyserModel>;
    facultyLevels: Record<string, number>;
}) {
    return (
        <article className="rounded-[18px] border border-[#e4e9ef] bg-white p-4">
            <Header n="R" title="CIEL PK Universal Coursework Quality Rubric" tag="LOCKED 100-POINT ARCHITECTURE" tagKind="ai" />
            <p className="text-[12px] leading-relaxed text-[#6d7987]">
                <b>Quality score = Σ (criterion weight × performance level ÷ 5).</b> Same criteria and weights across disciplines; expected depth is calibrated to academic level. Evidence and integrity are verification safeguards, not bonus-point categories.
            </p>
            <div className="mt-2.5 grid gap-2 md:grid-cols-2">
                {model.scorecard.criteria.map((c) => {
                    const level = facultyLevels[c.key] ?? model.aiLevels[c.key];
                    return (
                        <div key={c.key} className="rounded-xl border border-[#e2e7ed] p-2.5">
                            <b className="text-[12px]">{c.label}</b>
                            <span className="float-right text-[12px] font-black text-[#6c4ce3]">{c.max} pts</span>
                            <p className="mt-1.5 text-[12px] leading-relaxed text-[#6b7885]">
                                AI proposes level {model.aiLevels[c.key]}/5 → {weightedPoints(c, model.aiLevels[c.key]).toFixed(1)}/{c.max}. Faculty currently holds {level}/5.
                            </p>
                        </div>
                    );
                })}
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-1.5 md:grid-cols-6">
                {Object.entries(PERFORMANCE_ANCHORS).map(([n, item]) => (
                    <div key={n} className="rounded-[10px] border border-[#e1e6ec] bg-[#fbfcfe] p-2">
                        <b className="block text-[11px]">
                            {n} · {item.title}
                        </b>
                        <p className="mt-1 text-[11px] leading-snug text-[#6d7a86]">{item.text}</p>
                    </div>
                ))}
            </div>
            <div className="mt-2.5 rounded-r-[11px] border-l-[3px] border-[#c88b16] bg-[#fff9ea] px-3 py-2.5 text-[12px] leading-relaxed text-[#725d31]">
                <b>Band calibration:</b> 0–39 Insufficient · 40–54 Basic · 55–64 Developing · 65–74 Good · 75–84 Very Good · 85–94 Excellent · 95–100 Outstanding. Scores of 90+ should not be routine; the strongest criteria must themselves demonstrate Excellent/Outstanding performance.
            </div>
        </article>
    );
}

function ModerationPane({
    model,
    facultyLevels,
    notes,
    overallNote,
    returnNote,
    locked,
    busy,
    analysed,
    missingReason,
    missingReturnReason,
    facultyScore,
    facultyBand,
    delta,
    changedCount,
    lockHash,
    lockedAt,
    onLevel,
    onNote,
    onOverall,
    onReturnNote,
    onReset,
    onApprove,
    onReturn,
    onReject,
}: {
    model: ReturnType<typeof buildAnalyserModel>;
    facultyLevels: Record<string, number>;
    notes: Record<string, string>;
    overallNote: string;
    returnNote: string;
    locked: boolean;
    busy: boolean;
    analysed: boolean;
    missingReason: boolean;
    missingReturnReason: boolean;
    facultyScore: number;
    facultyBand: ReturnType<typeof bandForScore>;
    delta: number;
    changedCount: number;
    lockHash: string;
    lockedAt: string;
    onLevel: (key: string, value: number) => void;
    onNote: (key: string, value: string) => void;
    onOverall: (value: string) => void;
    onReturnNote: (value: string) => void;
    onReset: () => void;
    onApprove: () => void;
    onReturn: () => void;
    onReject: () => void;
}) {
    if (!analysed) return <NeedAnalysis />;
    return (
        <div className="space-y-3">
            <article className="rounded-[18px] border border-[#e4e9ef] bg-white p-4">
                <div className="grid items-center gap-4 md:grid-cols-[1fr_210px]">
                    <div>
                        <Header
                            n="F"
                            title="Faculty Moderation · Human Academic Judgement"
                            tag={locked ? "LOCKED" : changedCount ? `${changedCount} CRITERIA CHANGED` : "AI LEVELS UNCHANGED"}
                            tagKind={changedCount && !locked ? "gold" : "ok"}
                        />
                        <p className="text-[12px] leading-relaxed text-[#6d7987]">
                            Faculty can raise or lower the AI recommendation only by applying the <b>same 0–5 rubric anchor</b>. The original AI judgement is never erased. Every change is stored as AI level → Faculty level → weighted point difference → faculty reason.
                        </p>
                        <Callout>
                            <b>Global benchmark use:</b> Faculty may use the benchmark panel as calibration evidence, but should not award or deduct points simply because another university’s project appears more prestigious.
                        </Callout>
                    </div>
                    <div className="rounded-[17px] border border-[#eedcae] bg-[linear-gradient(135deg,#fff6df,#fff)] p-3.5 text-center">
                        <span className="text-[10px] font-black text-[#7a6a44]">FACULTY-MODERATED SCORE</span>
                        <b className="block text-[30px]">{facultyScore.toFixed(1)}</b>
                        <span className="text-[10px] font-black text-[#7a6a44]">{facultyBand.name.toUpperCase()}</span>
                        <div className={clsx("mt-1 text-[11px] font-black", delta > 0 ? "text-[#16865a]" : delta < 0 ? "text-[#c33e51]" : "text-[#7a6a44]")}>
                            AI {model.aiScore.toFixed(1)} · {delta > 0 ? "+" : ""}
                            {delta.toFixed(1)} point moderation
                        </div>
                    </div>
                </div>
                <div className="mt-3 overflow-auto">
                    <table className="w-full min-w-[860px] text-left">
                        <thead>
                            <tr className="text-[10px] tracking-wide text-[#6e7b88]">
                                {["CRITERION", "AI LEVEL", "FACULTY LEVEL", "AI PTS", "FINAL PTS", "Δ", "REASON IF CHANGED"].map((h) => (
                                    <th key={h} className="pb-2">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {model.scorecard.criteria.map((c) => {
                                const ai = model.aiLevels[c.key];
                                const fl = facultyLevels[c.key] ?? ai;
                                const ch = fl !== ai;
                                const d = weightedPoints(c, fl) - weightedPoints(c, ai);
                                return (
                                    <tr key={c.key} className={clsx("border-t border-[#edf1f4] align-top text-[12px]", ch && "bg-[#fffaf0]")}>
                                        <td className="py-2 pr-2">
                                            <b>{c.label}</b>
                                            <br />
                                            <span className="text-[#788590]">{c.max} pts max</span>
                                        </td>
                                        <td className="py-2 pr-2">
                                            <b>
                                                {ai}/5
                                            </b>
                                            <br />
                                            <span className="text-[#788590]">{PERFORMANCE_ANCHORS[ai]?.title}</span>
                                        </td>
                                        <td className="py-2 pr-2">
                                            <select
                                                value={fl}
                                                disabled={locked}
                                                onChange={(e) => onLevel(c.key, Number(e.target.value))}
                                                className="w-full rounded-lg border border-[#dce3ea] bg-white px-2 py-1.5 text-[11px]"
                                            >
                                                {[0, 1, 2, 3, 4, 5].map((n) => (
                                                    <option key={n} value={n}>
                                                        {n} · {PERFORMANCE_ANCHORS[n].title}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="py-2 pr-2">{weightedPoints(c, ai).toFixed(1)}</td>
                                        <td className="py-2 pr-2">
                                            <b>{weightedPoints(c, fl).toFixed(1)}</b>
                                        </td>
                                        <td className={clsx("py-2 pr-2 font-black", d > 0 ? "text-[#16865a]" : d < 0 ? "text-[#c33e51]" : "")}>
                                            {d > 0 ? "+" : ""}
                                            {d.toFixed(1)}
                                        </td>
                                        <td className="py-2">
                                            <textarea
                                                disabled={locked}
                                                value={notes[c.key] || ""}
                                                onChange={(e) => onNote(c.key, e.target.value)}
                                                placeholder={ch ? "Required: explain why Faculty changed the AI level…" : "No reason required if unchanged."}
                                                className="min-h-[52px] w-full rounded-lg border border-[#dce3ea] p-1.5 text-[11px]"
                                            />
                                            {ch && !String(notes[c.key] || "").trim() ? (
                                                <p className="mt-1 text-[10px] font-extrabold text-[#c33e51]">Required because this criterion was changed.</p>
                                            ) : null}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <button
                    type="button"
                    disabled={locked}
                    onClick={onReset}
                    className="mt-3 rounded-[11px] border border-[#e4e9ef] bg-white px-3 py-2 text-[11px] font-black text-[#405461] disabled:opacity-45"
                >
                    ↺ Reset all to AI proposal
                </button>
            </article>

            <article className="rounded-[18px] border border-[#e4e9ef] bg-white p-4">
                <Header n="✓" title="Faculty Decision" tag="FINAL AUTHORITY" />
                <div className="grid gap-2.5 md:grid-cols-2">
                    <div className="rounded-[14px] border border-[#e0e6ec] p-3">
                        <b className="text-[13px]">✅ Approve / Lock Final CI Score</b>
                        <p className="mt-1 text-[12px] leading-relaxed text-[#6f7c87]">
                            Locks the faculty-moderated criterion levels, reasons, final score and band into the record. The student still never sees the numeric score — approval publishes the flashcard.
                        </p>
                        <textarea
                            disabled={locked}
                            value={overallNote}
                            onChange={(e) => onOverall(e.target.value)}
                            placeholder="Optional overall faculty note…"
                            className="mt-2 min-h-[72px] w-full rounded-[10px] border border-[#dce3ea] p-2 text-[12px]"
                        />
                        <button
                            type="button"
                            disabled={locked || busy || missingReason}
                            onClick={onApprove}
                            className="mt-2 rounded-[11px] bg-[linear-gradient(90deg,#173b54,#6b4cd7)] px-3.5 py-2.5 text-[11px] font-black text-white disabled:opacity-45"
                        >
                            Approve · Lock Final Score
                        </button>
                        <p className="mt-1.5 text-[11px] text-[#7a6674]">
                            {missingReason
                                ? "A reason is required for every changed criterion before the final score can be locked."
                                : "All changed criteria have an audit reason. Faculty may approve and lock the moderated score."}
                        </p>
                    </div>
                    <div className="rounded-[14px] border border-[#e0e6ec] p-3">
                        <b className="text-[13px]">↩ Return / ❌ Reject</b>
                        <p className="mt-1 text-[12px] leading-relaxed text-[#6f7c87]">
                            Use when the submission needs clarification, evidence is contradictory, or Faculty cannot responsibly determine a final level.
                        </p>
                        <textarea
                            disabled={locked}
                            value={returnNote}
                            onChange={(e) => onReturnNote(e.target.value)}
                            placeholder="Required — state exactly what needs clarification or review…"
                            className="mt-2 min-h-[72px] w-full rounded-[10px] border border-[#dce3ea] p-2 text-[12px]"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                            <button
                                type="button"
                                disabled={locked || busy || missingReturnReason}
                                onClick={onReturn}
                                className="rounded-[11px] border border-[#e4e9ef] bg-white px-3 py-2 text-[11px] font-black text-[#405461] disabled:opacity-45"
                            >
                                ↩ Return to Student
                            </button>
                            <button
                                type="button"
                                disabled={locked || busy || missingReturnReason}
                                onClick={onReject}
                                className="rounded-[11px] border border-[#efcbd1] bg-[#fff7f8] px-3 py-2 text-[11px] font-black text-[#a34254] disabled:opacity-45"
                            >
                                ❌ Reject record
                            </button>
                        </div>
                        <p className="mt-1.5 text-[11px] text-[#7a6674]">
                            {missingReturnReason
                                ? "A reason is required before returning or rejecting a submission — the student is entitled to know why."
                                : "This reason will be sent to the student."}
                        </p>
                    </div>
                </div>
                <div className="mt-2.5 rounded-2xl border border-[#ddd7f0] bg-[linear-gradient(135deg,#faf9ff,#fff)] p-3.5">
                    <h3 className="text-[13px] font-bold">{locked ? "🔒 Moderated coursework record locked" : "🔓 Final lock not yet applied"}</h3>
                    <p className="mt-1 text-[12px] leading-relaxed text-[#706982]">
                        {locked
                            ? `AI proposal, Faculty overrides, reasons and final score are frozen${lockedAt ? ` · ${lockedAt}` : ""}. Any later correction should create a new version rather than silently rewriting academic judgement.`
                            : "Approval creates a decision hash and an audit trail preserving both the machine recommendation and human moderation — saved with the record, so it's still here on reload."}
                    </p>
                    {lockHash ? <p className="mt-2 break-all rounded-lg bg-[#f0eef9] p-2 font-mono text-[10px] text-[#605975]">{lockHash}</p> : null}
                </div>
            </article>
        </div>
    );
}

function FinalPane({
    model,
    facultyLevels,
    facultyScore,
    facultyBand,
    delta,
    locked,
    lockHash,
    lockedAt,
}: {
    model: ReturnType<typeof buildAnalyserModel>;
    facultyLevels: Record<string, number>;
    facultyScore: number;
    facultyBand: ReturnType<typeof bandForScore>;
    delta: number;
    locked: boolean;
    lockHash: string;
    lockedAt: string;
}) {
    const download = () => {
        const blob = new Blob(
            [
                JSON.stringify(
                    {
                        student: model.name,
                        title: model.title,
                        aiScore: model.aiScore,
                        facultyScore,
                        band: facultyBand.name,
                        evidenceAverage: model.evidenceAvg,
                        levels: facultyLevels,
                        hash: lockHash,
                        lockedAt,
                    },
                    null,
                    2,
                ),
            ],
            { type: "application/json" },
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "CIEL_PK_Coursework_Faculty_Moderated_Record.json";
        a.click();
        URL.revokeObjectURL(url);
    };
    return (
        <div>
            {!locked ? (
                <article className="mb-3 rounded-[18px] border border-[#e4e9ef] bg-white p-4">
                    <h2 className="text-sm font-bold">Final record preview</h2>
                    <p className="mt-1 text-[12px] text-[#6d7987]">
                        Run analysis, review evidence/global benchmarks, complete any Faculty moderation, then approve and lock the final score.
                    </p>
                </article>
            ) : null}
            <div className="mx-auto max-w-[820px] overflow-hidden rounded-[24px] border border-[#dfe5eb] bg-white shadow-[0_16px_44px_rgba(16,43,59,.08)]">
                <div className="grid items-center gap-4 bg-[linear-gradient(125deg,#102b3b,#2b4f68_62%,#6a4ad6_150%)] p-5 text-white md:grid-cols-[1fr_140px]">
                    <div>
                        <p className="text-[10px] font-black tracking-[0.15em] text-[#f3d27e]">
                            {locked ? "FACULTY VERIFIED · MODERATED SCORE LOCKED" : "FACULTY PREVIEW · NOT YET FINAL"}
                        </p>
                        <h1 className="mt-1 text-[20px] font-black">{model.title}</h1>
                        <p className="mt-1 text-[12px] leading-relaxed text-[#d7e4ec]">
                            {model.name} · {model.course} · {model.programme}
                            <br />
                            {model.stage.label} · {model.sdg}
                        </p>
                    </div>
                    <div className="mx-auto grid h-[132px] w-[132px] place-items-center rounded-full bg-[radial-gradient(circle,#fff_0_57%,#e8d49c_58%_62%,#24495c_63%_74%,#fff_75%)] p-4 text-center text-[#183e52]">
                        <div>
                            <b className="font-serif text-base">{facultyBand.name}</b>
                            <span className="mt-1 block text-[11px] font-black text-[#9b701a]">CI SCORE {facultyScore.toFixed(0)}/100</span>
                        </div>
                    </div>
                </div>
                <div className="p-5">
                    <div className="grid items-center gap-3 md:grid-cols-[130px_1fr]">
                        <div className="rounded-2xl bg-[#f1edff] p-3 text-center">
                            <b className="block text-[28px]">{facultyScore.toFixed(1)}</b>
                            <span className="text-[10px] font-black text-[#6d6684]">FINAL CI SCORE / 100</span>
                        </div>
                        <div>
                            <h2 className="text-base font-bold">{facultyBand.name} coursework performance</h2>
                            <p className="mt-1 text-[12px] leading-relaxed text-[#667681]">
                                <b>AI proposal:</b> {model.aiScore.toFixed(1)} · <b>Faculty moderation:</b> {delta > 0 ? "+" : ""}
                                {delta.toFixed(1)} · <b>Evidence match:</b> {model.evidenceAvg}% · <b>Global benchmark read:</b> diagnostic only.
                                <br />
                                <b>Status:</b> {locked ? "Faculty approved and locked" : "Preview only — Faculty decision pending"}.
                            </p>
                        </div>
                    </div>
                    <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                        {model.scorecard.criteria.map((c) => {
                            const level = facultyLevels[c.key] ?? model.aiLevels[c.key];
                            return (
                                <div key={c.key} className="flex justify-between gap-2 rounded-[9px] border border-[#e2e7ed] px-2 py-1.5 text-[11.5px]">
                                    <b className="text-[#264456]">{c.label}</b>
                                    <span className="shrink-0 font-black text-[#6c4ce3]">
                                        {weightedPoints(c, level).toFixed(1)}/{c.max} · L{level}/5
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-3 border-t border-dashed border-[#dce4ea] pt-2.5 text-[12px] leading-relaxed text-[#6b7a85]">
                        {locked ? (
                            <>
                                🔒 <b>CIEL PK COURSEWORK FACULTY LOCK</b>
                                {lockedAt ? ` · ${lockedAt}` : ""}
                                {lockHash ? (
                                    <>
                                        <br />
                                        Decision hash: {lockHash}
                                    </>
                                ) : null}
                                <br />
                                Audit trail preserves AI proposal, Faculty changes and reasons.
                            </>
                        ) : (
                            "🔓 This is not yet an official final record. Faculty moderation remains editable until approval."
                        )}
                    </div>
                    {locked ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button type="button" onClick={download} className="rounded-[11px] bg-[linear-gradient(90deg,#173b54,#6b4cd7)] px-3.5 py-2.5 text-[11px] font-black text-white">
                                💾 Download Audit Record
                            </button>
                            <button type="button" onClick={() => window.print()} className="rounded-[11px] border border-[#e4e9ef] bg-white px-3 py-2.5 text-[11px] font-black text-[#405461]">
                                🖨 Print / Save Record
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function BenchTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
    return (
        <div className="overflow-auto">
            <table className="mt-2 w-full min-w-[420px] text-left">
                <thead>
                    <tr className="text-[10px] tracking-wide text-[#6e7b88]">
                        {headers.map((h) => (
                            <th key={h} className="pb-2">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row[0]} className="border-t border-[#edf1f4] align-top text-[12px] leading-relaxed">
                            {row.map((cell, i) => (
                                <td key={i} className="py-2 pr-2">
                                    {i === 0 ? <b>{cell}</b> : cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function NeedAnalysis() {
    return (
        <article className="rounded-[18px] border border-[#e4e9ef] bg-white p-6 text-center">
            <h2 className="text-sm font-bold text-[#10212c]">Run the coursework analysis first</h2>
            <p className="mt-1 text-[12px] text-[#6d7987]">Open Submission Package and press ✦ Run Full Coursework Analysis. The AI score, evidence map and global benchmark then unlock here.</p>
        </article>
    );
}
