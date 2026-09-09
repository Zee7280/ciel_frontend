"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import {
    CII_V2_ANCHORS,
    CII_V2_BONUS_CHANNELS,
    CII_V2_LEVELS,
    CII_V2_SECTIONS,
    anchorTone,
    levelByNumber,
    verdictTone,
    type CiiV2Level,
    type CiiV2Lock,
    type CiiV2Result,
} from "@/utils/communityCiiAnalyser";

const TABS = [
    { id: "intake", label: "📥 Faculty Intake" },
    { id: "score", label: "◉ CII Score" },
    { id: "evidence", label: "🔎 Evidence Match" },
    { id: "rubric", label: "📚 Rubric" },
    { id: "badges", label: "🏅 Badge Library" },
    { id: "decision", label: "✅ Faculty Decision" },
    { id: "return", label: "🪪 Student Return" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const INK = "#0d2b33";
const MUTED = "#6f8288";
const LINE = "#dbe7e9";
const TEAL = "#0e7d74";
const NAVY = "#082c35";

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function countEvidenceFiles(report: Record<string, unknown>): number {
    const keys = ["section1", "section2", "section3", "section4", "section5", "section6", "section7", "section8", "section9", "section10"];
    let n = 0;
    for (const key of keys) {
        const urls = asRecord(report[key]).media_urls;
        if (Array.isArray(urls)) n += urls.length;
    }
    return n;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={`rounded-[18px] border bg-white p-4 shadow-[0_8px_25px_rgba(13,43,51,0.04)] ${className}`}
            style={{ borderColor: LINE }}
        >
            {children}
        </div>
    );
}

function SectionHead({ no, title, tag }: { no: string; title: string; tag?: string }) {
    return (
        <div className="mb-1 flex items-center gap-2">
            <span
                className="grid h-[27px] w-[31px] place-items-center rounded-[9px] text-[9px] font-black text-white"
                style={{ background: NAVY }}
            >
                {no}
            </span>
            <h2 className="text-[14px] font-bold" style={{ color: INK }}>
                {title}
            </h2>
            {tag ? (
                <span
                    className="ml-auto rounded-full px-2 py-1 text-[8px] font-black"
                    style={{ background: "#eaf8f4", color: "#176b61" }}
                >
                    {tag}
                </span>
            ) : null}
        </div>
    );
}

export default function CommunityCiiAnalyser() {
    const params = useParams();
    const reportId = String(params.reportId ?? "");

    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState<Record<string, unknown> | null>(null);
    const [tab, setTab] = useState<TabId>("intake");
    const [analysing, setAnalysing] = useState(false);
    const [approving, setApproving] = useState(false);
    const [deciding, setDeciding] = useState(false);
    const [openSection, setOpenSection] = useState<number | null>(null);
    const [facultyNote, setFacultyNote] = useState("");
    const [returnNote, setReturnNote] = useState("");

    const ciiV2 = (report?.ciiV2 as CiiV2Result | undefined) || null;
    const ciiV2Lock = (report?.ciiV2Lock as CiiV2Lock | undefined) || null;
    const locked = Boolean(ciiV2Lock?.locked);

    const loadReport = async () => {
        if (!reportId) return;
        try {
            setLoading(true);
            const res = await authenticatedFetch(`/api/v1/faculty/reports/${reportId}`);
            if (!res?.ok) {
                toast.error("Report not available");
                setReport(null);
                return;
            }
            const data = await res.json();
            setReport((data.data || data) as Record<string, unknown>);
        } catch {
            toast.error("Failed to load report");
            setReport(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reportId]);

    const runAnalysis = async () => {
        if (!reportId || analysing || locked) return;
        try {
            setAnalysing(true);
            const res = await authenticatedFetch(`/api/v1/faculty/reports/${reportId}/cii-v2/analyse`, {
                method: "POST",
            });
            if (!res?.ok) {
                const payload = res ? await res.json().catch(() => ({})) : {};
                toast.error((payload as { error?: string; message?: string }).error || (payload as { message?: string }).message || "CII analysis failed");
                return;
            }
            toast.success("CII v2 analysis complete");
            await loadReport();
            setTab("score");
        } catch {
            toast.error("CII analysis failed");
        } finally {
            setAnalysing(false);
        }
    };

    const approveAndLock = async () => {
        if (!reportId || approving || locked || !ciiV2) return;
        try {
            setApproving(true);
            const res = await authenticatedFetch(`/api/v1/faculty/reports/${reportId}/cii-v2/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ note: facultyNote }),
            });
            if (!res?.ok) {
                const payload = res ? await res.json().catch(() => ({})) : {};
                toast.error((payload as { message?: string }).message || "Could not approve CII");
                return;
            }
            toast.success("CII v2 approved and locked — badge issued");
            await loadReport();
            setTab("return");
        } catch {
            toast.error("Could not approve CII");
        } finally {
            setApproving(false);
        }
    };

    const returnOrFlag = async (kind: "return" | "flag") => {
        if (!reportId || deciding || locked) return;
        if (!returnNote.trim()) {
            toast.error("State exactly what needs clarification or review.");
            return;
        }
        try {
            setDeciding(true);
            const prefix = kind === "return" ? "[Return for revision]" : "[Admin review requested]";
            const res = await authenticatedFetch(`/api/v1/faculty/reports/${reportId}/action`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "rejected", remarks: `${prefix} ${returnNote.trim()}` }),
            });
            if (!res?.ok) {
                const payload = res ? await res.json().catch(() => ({})) : {};
                toast.error((payload as { message?: string }).message || "Could not save decision");
                return;
            }
            toast.success(kind === "return" ? "Returned to student for clarification" : "Flagged for CIEL PK Admin review");
            await loadReport();
        } catch {
            toast.error("Could not save decision");
        } finally {
            setDeciding(false);
        }
    };

    const studentName = (report?.student as { name?: string } | undefined)?.name || "Student";
    const projectTitle = (report?.opportunity as { title?: string } | undefined)?.title || String(report?.project_id || "Community Service Project");
    const hours = Number(asRecord(report?.section1).metrics ? asRecord(asRecord(report?.section1).metrics).total_verified_hours : 0) || 0;
    const evidenceFileCount = report ? countEvidenceFiles(report) : 0;

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: TEAL }} />
            </div>
        );
    }

    if (!report) {
        return (
            <div className="mx-auto max-w-[1320px] p-5">
                <p className="text-[12px]" style={{ color: MUTED }}>
                    Report unavailable.
                </p>
                <Link href="/dashboard/faculty/reports" className="text-[12px] underline" style={{ color: TEAL }}>
                    Back to student reports
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1320px] p-4 pb-24" style={{ color: INK, fontSize: 14 }}>
            {/* Topbar */}
            <div
                className="sticky top-2 z-40 mb-3 flex flex-wrap items-center gap-3 rounded-[18px] border bg-white/90 p-3 backdrop-blur-md shadow-[0_12px_32px_rgba(8,44,53,0.08)]"
                style={{ borderColor: LINE }}
            >
                <div className="text-[17px] font-black tracking-tight">
                    CIEL <span style={{ color: TEAL }}>PK</span>
                </div>
                <div className="text-[10px] leading-tight" style={{ color: MUTED }}>
                    FACULTY REVIEW WORKSPACE
                    <br />
                    Composite Impact Index v2 · Community Service
                </div>
                <div className="flex-1" />
                <Link href="/dashboard/faculty/reports" className="text-[10px] font-bold underline" style={{ color: TEAL }}>
                    Back to reports
                </Link>
                <Link href={`/dashboard/faculty/reports/${reportId}`} className="text-[10px] font-bold underline" style={{ color: TEAL }}>
                    Standard console
                </Link>
                <div
                    className="rounded-full px-3 py-2 text-[9px] font-black"
                    style={locked ? { background: "#ece9f9", color: "#584b90" } : { background: "#edf7f5", color: "#176b61" }}
                >
                    {locked ? "🔒 CII + BADGE LOCKED" : "🔓 ANALYSIS OPEN"}
                </div>
            </div>

            {/* Hero */}
            <section
                className="mb-4 grid gap-4 rounded-[24px] p-6 text-white shadow-[0_22px_50px_rgba(5,43,51,0.16)] md:grid-cols-[1.25fr_.75fr]"
                style={{ background: "linear-gradient(120deg,#052b33,#0d5e61 68%,#148b83)" }}
            >
                <div>
                    <div className="text-[9px] font-black tracking-[0.18em]" style={{ color: "#9ff3e6" }}>
                        FACULTY-SIDE · AUTOMATIC POST-SUBMISSION ANALYSIS
                    </div>
                    <h1 className="my-1.5 text-[24px] font-black">Composite Impact Index Analyser</h1>
                    <p className="max-w-[770px] text-[12px] leading-relaxed" style={{ color: "#d6f6f1" }}>
                        CIEL PK separates <b>shared project quality</b> from <b>individual contribution</b>, treats the opportunity&apos;s
                        minimum hours as a compliance gate rather than free marks, and adds only tightly capped, verified contribution
                        bonuses. Every score remains evidence-linked and Faculty-reviewed before a badge is locked.
                    </p>
                </div>
                <div className="grid grid-cols-2 content-center gap-2">
                    {[
                        ["94", "BASE CII POINTS"],
                        ["9", "WEIGHTED SECTIONS"],
                        ["0–4", "UNIVERSAL RUBRIC"],
                        ["7", "OFFICIAL BADGE LEVELS"],
                    ].map(([n, label]) => (
                        <div key={label} className="rounded-[14px] border border-white/20 bg-white/10 p-[11px]">
                            <b className="block text-[18px]">{n}</b>
                            <span className="text-[8px] font-black tracking-[0.1em]" style={{ color: "#a9e8df" }}>
                                {label}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Tabs */}
            <div className="mb-3 flex flex-wrap gap-2">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className="rounded-full border px-3 py-2 text-[10px] font-black"
                        style={
                            tab === t.id
                                ? { background: TEAL, borderColor: TEAL, color: "#fff" }
                                : { borderColor: LINE, background: "#fff", color: "#587176" }
                        }
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === "intake" && (
                <div className="grid gap-3 md:grid-cols-2">
                    <Card>
                        <SectionHead no="A" title="Faculty Intake Package" tag="AUTO-RECEIVED" />
                        <p className="mb-3 text-[10px] leading-relaxed" style={{ color: MUTED }}>
                            {studentName} · {projectTitle} · {hours}h logged · {evidenceFileCount} evidence file{evidenceFileCount === 1 ? "" : "s"}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={runAnalysis}
                                disabled={analysing || locked}
                                className="rounded-[11px] px-4 py-2.5 text-[10px] font-black text-white disabled:opacity-50"
                                style={{ background: "linear-gradient(90deg,#0d6766,#21a695)" }}
                            >
                                {analysing ? "Analysing…" : locked ? "🔒 Locked" : ciiV2 ? "✦ Re-run CII Analysis" : "✦ Run Automatic CII Analysis"}
                            </button>
                        </div>
                    </Card>
                    <Card>
                        <SectionHead no="B" title="What the analyser checks" tag="9-SECTION PIPELINE" />
                        <p className="text-[10px] leading-relaxed" style={{ color: MUTED }}>
                            The score is not based on budget, beneficiary count or prestige. It is based on documented rigor,
                            reciprocity, execution, evidence, demonstrated change and responsible continuation — Section 1 scores
                            this student&apos;s own participation individually; Sections 2–9 score shared project quality once.
                        </p>
                    </Card>
                </div>
            )}

            {tab === "score" && (
                <ScorePane ciiV2={ciiV2} openSection={openSection} setOpenSection={setOpenSection} />
            )}

            {tab === "evidence" && <EvidencePane ciiV2={ciiV2} />}

            {tab === "rubric" && <RubricPane />}

            {tab === "badges" && <BadgesPane currentLevel={ciiV2?.level.level} />}

            {tab === "decision" && (
                <DecisionPane
                    ciiV2={ciiV2}
                    locked={locked}
                    ciiV2Lock={ciiV2Lock}
                    facultyNote={facultyNote}
                    setFacultyNote={setFacultyNote}
                    returnNote={returnNote}
                    setReturnNote={setReturnNote}
                    approving={approving}
                    deciding={deciding}
                    onApprove={approveAndLock}
                    onReturn={() => returnOrFlag("return")}
                    onFlag={() => returnOrFlag("flag")}
                />
            )}

            {tab === "return" && (
                <ReturnPane
                    studentName={studentName}
                    projectTitle={projectTitle}
                    ciiV2={ciiV2}
                    ciiV2Lock={ciiV2Lock}
                    locked={locked}
                />
            )}
        </div>
    );
}

function ScorePane({
    ciiV2,
    openSection,
    setOpenSection,
}: {
    ciiV2: CiiV2Result | null;
    openSection: number | null;
    setOpenSection: (id: number | null) => void;
}) {
    if (!ciiV2) {
        return (
            <Card>
                <h2 className="text-[14px] font-bold">Run the analyser first</h2>
                <p className="text-[10px]" style={{ color: MUTED }}>
                    Open Faculty Intake and click &ldquo;Run Automatic CII Analysis&rdquo;.
                </p>
            </Card>
        );
    }

    const final = ciiV2.final;
    const lvl = ciiV2.level;

    return (
        <>
            <Card>
                <div className="grid items-center gap-5 md:grid-cols-[174px_1fr]">
                    <div
                        className="relative mx-auto grid h-[174px] w-[174px] place-items-center rounded-full"
                        style={{ background: `conic-gradient(${TEAL} calc(${final}*1%), #e5eeee 0)` }}
                    >
                        <div className="absolute h-[142px] w-[142px] rounded-full bg-white" />
                        <div className="relative z-[2] text-center">
                            <b className="block text-[38px] tracking-tighter">{final.toFixed(1)}</b>
                            <span className="text-[8px] font-black" style={{ color: MUTED }}>
                                FINAL CII / 100
                            </span>
                        </div>
                    </div>
                    <div>
                        <span className="inline-block rounded-full px-2.5 py-1.5 text-[9px] font-black" style={{ background: "#eaf8f4", color: "#176b61" }}>
                            {lvl.icon} LEVEL {lvl.level} · {lvl.quality}
                        </span>
                        <h2 className="my-1.5 text-[21px] font-bold">{lvl.name}</h2>
                        <div className="flex flex-wrap gap-1.5 text-[8px] font-black">
                            <span className="rounded-full px-2 py-1" style={{ background: "#eef5f5", color: "#45676b" }}>
                                Shared project {ciiV2.projectQuality.toFixed(1)}/86
                            </span>
                            <span className="rounded-full px-2 py-1" style={{ background: "#eef5f5", color: "#45676b" }}>
                                Individual core {ciiV2.individualCore.toFixed(1)}/8
                            </span>
                            <span className="rounded-full px-2 py-1" style={{ background: "#e8f7ef", color: "#1b6e5d" }}>
                                Verified bonus +{ciiV2.bonus.total.toFixed(2)}/6
                            </span>
                            <span className="rounded-full px-2 py-1" style={{ background: "#fff0f2", color: "#a44b59" }}>
                                Integrity −{ciiV2.integrityPenalty.toFixed(2)}
                            </span>
                            <span className="rounded-full px-2 py-1" style={{ background: "#eef5f5", color: "#45676b" }}>
                                Final {final.toFixed(1)}/100
                            </span>
                        </div>
                        <div className="mt-2 rounded-r-[11px] border-l-[3px] p-2.5 text-[8px] leading-relaxed" style={{ borderColor: "#5b4da5", background: "#f7f5ff", color: "#625b78" }}>
                            <b>Badge guardrail:</b> {ciiV2.gateExplanation} Extra hours, money or partners can never buy a high badge if
                            outcomes, evidence or core quality are weak.
                        </div>
                    </div>
                </div>
            </Card>

            <Card>
                <SectionHead no="9" title="Section-by-Section AI Analysis" tag="CLICK TO OPEN REASONING" />
                <div className="mt-2 grid gap-2">
                    {ciiV2.sections.map((s) => {
                        const pct = s.weight ? (s.score / s.weight) * 100 : 0;
                        const open = openSection === s.id;
                        return (
                            <div key={s.id} className="overflow-hidden rounded-[13px] border" style={{ borderColor: "#dfe8e9" }}>
                                <button
                                    onClick={() => setOpenSection(open ? null : s.id)}
                                    className="grid w-full grid-cols-[36px_1fr_100px_65px] items-center gap-2.5 p-2.5 text-left"
                                >
                                    <div className="grid h-9 w-9 place-items-center rounded-[10px] text-[9px] font-black" style={{ background: "#edf7f5", color: "#176b61" }}>
                                        §{s.id}
                                    </div>
                                    <div>
                                        <h3 className="text-[10px] font-bold">{s.title}</h3>
                                    </div>
                                    <div className="h-[7px] overflow-hidden rounded-full" style={{ background: "#e5eeee" }}>
                                        <i className="block h-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${TEAL},#2dd4bf)` }} />
                                    </div>
                                    <div className="text-right text-[10px] font-black">
                                        {s.score.toFixed(2)}
                                        <small className="block text-[7px] font-normal" style={{ color: "#819095" }}>
                                            / {s.weight}
                                        </small>
                                    </div>
                                </button>
                                {open && (
                                    <div className="border-t p-3" style={{ borderColor: "#eaf0f0" }}>
                                        {(s.good || s.limit) && (
                                            <div className="mb-2 grid gap-2 md:grid-cols-2">
                                                {s.good && (
                                                    <div className="rounded-[11px] border p-2.5 text-[8px] leading-relaxed" style={{ background: "#eef9f5", borderColor: "#cce6dc", color: "#2e6c61" }}>
                                                        <b className="mb-1 block">✓ WHAT SCORED WELL</b>
                                                        {s.good}
                                                    </div>
                                                )}
                                                {s.limit && (
                                                    <div className="rounded-[11px] border p-2.5 text-[8px] leading-relaxed" style={{ background: "#fff7ec", borderColor: "#ead9bf", color: "#765e3c" }}>
                                                        <b className="mb-1 block">△ WHAT LIMITED THE SCORE</b>
                                                        {s.limit}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse text-[8px]">
                                                <thead>
                                                    <tr style={{ color: "#718187" }}>
                                                        <th className="border-b p-2 text-left" style={{ borderColor: "#edf1f1" }}>CRITERION</th>
                                                        <th className="border-b p-2 text-left" style={{ borderColor: "#edf1f1" }}>WT.</th>
                                                        <th className="border-b p-2 text-left" style={{ borderColor: "#edf1f1" }}>AI RATING</th>
                                                        <th className="border-b p-2 text-left" style={{ borderColor: "#edf1f1" }}>WHY</th>
                                                        <th className="border-b p-2 text-left" style={{ borderColor: "#edf1f1" }}>POINTS</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {s.criteria.map((c) => {
                                                        const tone = anchorTone(c.anchor);
                                                        return (
                                                            <tr key={c.key}>
                                                                <td className="border-b p-2" style={{ borderColor: "#edf1f1" }}>
                                                                    <b>{c.label}</b>
                                                                </td>
                                                                <td className="border-b p-2" style={{ borderColor: "#edf1f1" }}>{c.weight}</td>
                                                                <td className="border-b p-2" style={{ borderColor: "#edf1f1" }}>
                                                                    <span className="rounded-full px-1.5 py-1 font-black" style={{ background: tone.bg, color: tone.fg }}>
                                                                        {c.anchor}/4 · {CII_V2_ANCHORS[c.anchor]}
                                                                    </span>
                                                                </td>
                                                                <td className="border-b p-2" style={{ borderColor: "#edf1f1" }}>{c.note || "—"}</td>
                                                                <td className="border-b p-2 font-black" style={{ borderColor: "#edf1f1" }}>{c.points.toFixed(2)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>

            <div className="grid gap-3 md:grid-cols-2">
                <Card>
                    <h2 className="text-[13px] font-bold">Verified Contribution Bonus · +{ciiV2.bonus.total.toFixed(2)} / 6</h2>
                    {CII_V2_BONUS_CHANNELS.map((b) => {
                        const amount = ciiV2.bonus[b.key];
                        const why = ciiV2.bonusWhy?.[b.key];
                        return (
                            <div key={b.key} className="border-b py-2" style={{ borderColor: "#edf1f1" }}>
                                <b className="text-[9px]">
                                    {b.name} · +{amount.toFixed(2)} / {b.max}
                                </b>
                                {why && (
                                    <div className="text-[8px] leading-relaxed" style={{ color: "#6e8085" }}>
                                        {why}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </Card>
                <Card>
                    <h2 className="text-[13px] font-bold">Integrity Adjustment · −{ciiV2.integrityPenalty.toFixed(2)}</h2>
                    <p className="text-[10px]" style={{ color: MUTED }}>
                        Penalty is reserved for contradictions or gaming — never for a small project, zero budget, no formal
                        partner, or an honest limitation.
                    </p>
                    {ciiV2.integrityWhy && (
                        <div className="mt-2 rounded-[14px] border p-2.5 text-[9px] leading-relaxed" style={{ borderColor: "#ead8aa", background: "#fff9e8", color: "#725b24" }}>
                            {ciiV2.integrityWhy}
                        </div>
                    )}
                    {ciiV2.redFlags && ciiV2.redFlags.length > 0 && (
                        <ul className="mt-2 list-disc pl-4 text-[9px]" style={{ color: "#a44b59" }}>
                            {ciiV2.redFlags.map((f, i) => (
                                <li key={i}>{f}</li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </>
    );
}

function EvidencePane({ ciiV2 }: { ciiV2: CiiV2Result | null }) {
    if (!ciiV2) {
        return (
            <Card>
                <p className="text-[10px]" style={{ color: MUTED }}>Run the analyser first to see evidence matching.</p>
            </Card>
        );
    }
    return (
        <Card>
            <SectionHead no="AI" title="Evidence-to-Claim Match Engine" tag="CROSS-SECTION VERIFICATION" />
            <div className="my-3 rounded-[16px] border p-3" style={{ borderColor: "#d9e6ed", background: "linear-gradient(135deg,#f0f7fb,#fff)" }}>
                <b className="block text-[29px]" style={{ color: "#2b6175" }}>{ciiV2.evidenceAverage}%</b>
                <span className="text-[8px] font-black" style={{ color: "#6c8189" }}>AVERAGE CLAIM↔EVIDENCE MATCH</span>
                <div className="mt-1 text-[8px]" style={{ color: "#60777f" }}>{ciiV2.evidence.length} evidence items mapped</div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[8px]">
                    <thead>
                        <tr style={{ color: "#6f8287" }}>
                            <th className="border-b p-2 text-left" style={{ borderColor: "#ebf0f0" }}>ID / FILE</th>
                            <th className="border-b p-2 text-left" style={{ borderColor: "#ebf0f0" }}>CLAIM CHECKED</th>
                            <th className="border-b p-2 text-left" style={{ borderColor: "#ebf0f0" }}>TYPE</th>
                            <th className="border-b p-2 text-left" style={{ borderColor: "#ebf0f0" }}>MATCH</th>
                            <th className="border-b p-2 text-left" style={{ borderColor: "#ebf0f0" }}>WHY</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ciiV2.evidence.map((e) => {
                            const tone = verdictTone(e.verdict);
                            return (
                                <tr key={e.id}>
                                    <td className="border-b p-2" style={{ borderColor: "#ebf0f0" }}>
                                        <b>{e.id}</b>
                                        <br />
                                        {e.file}
                                    </td>
                                    <td className="border-b p-2" style={{ borderColor: "#ebf0f0" }}>{e.claim}</td>
                                    <td className="border-b p-2" style={{ borderColor: "#ebf0f0" }}>{e.type}</td>
                                    <td className="border-b p-2" style={{ borderColor: "#ebf0f0" }}>
                                        <span className="rounded-full px-1.5 py-1 font-black" style={{ background: tone.bg, color: tone.fg }}>{e.verdict}</span>
                                        <br />
                                        <span className="font-black" style={{ color: "#235c6c" }}>{e.match}%</span>
                                    </td>
                                    <td className="border-b p-2" style={{ borderColor: "#ebf0f0" }}>{e.why}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {ciiV2.evidence.length === 0 && (
                    <p className="p-2 text-[9px]" style={{ color: MUTED }}>No evidence files were mapped by the analyser.</p>
                )}
            </div>
        </Card>
    );
}

function RubricPane() {
    return (
        <>
            <Card>
                <SectionHead no="R" title="Universal CII Rubric · All SDGs · All Community-Service Types" tag="0–4 ANALYTIC ANCHORS" />
                <div className="grid gap-2 md:grid-cols-2">
                    {CII_V2_ANCHORS.map((a, i) => (
                        <div key={a} className="rounded-[14px] border p-2.5" style={{ borderColor: LINE }}>
                            <b className="text-[9px]">{i} · {a}</b>
                        </div>
                    ))}
                </div>
            </Card>
            <Card>
                <h2 className="text-[13px] font-bold">94-point core architecture + 6 verified bonus points</h2>
                {CII_V2_SECTIONS.map((s) => (
                    <div key={s.id} className="grid grid-cols-[35px_1fr_70px] items-center gap-2 border-b py-2" style={{ borderColor: "#edf1f1" }}>
                        <span className="grid h-[27px] w-[31px] place-items-center rounded-[9px] text-[9px] font-black text-white" style={{ background: NAVY }}>{s.id}</span>
                        <div>
                            <b className="text-[9px]">{s.title}</b>
                            <div className="text-[7.5px]" style={{ color: "#728388" }}>{s.criteria.length} weighted subcriteria {s.id === 1 ? "· individual" : "· project-level"}</div>
                        </div>
                        <b className="text-right text-[9px]">{s.weight} pts</b>
                    </div>
                ))}
            </Card>
            <Card>
                <SectionHead no="+" title="Contribution Bonus Benchmarks" tag="MAX +6" />
                <div className="grid gap-2 md:grid-cols-2">
                    {CII_V2_BONUS_CHANNELS.map((g) => (
                        <div key={g.key} className="rounded-[14px] border p-2.5" style={{ borderColor: LINE }}>
                            <b className="text-[9px]">{g.name}</b>
                            <p className="text-[8px] leading-relaxed" style={{ color: MUTED }}>
                                {g.tiers.map((t, i) => (
                                    <span key={i}>
                                        {t.label} → <strong>+{t.amount.toFixed(2)}</strong>
                                        <br />
                                    </span>
                                ))}
                            </p>
                        </div>
                    ))}
                </div>
            </Card>
        </>
    );
}

function BadgesPane({ currentLevel }: { currentLevel?: number }) {
    return (
        <Card>
            <SectionHead no="🏅" title="CIEL PK CII Badge Library" tag="AUTO-ALLOTTED BY FINAL SCORE" />
            <p className="mb-3 text-[10px]" style={{ color: MUTED }}>
                Faculty does not manually choose a badge. Once the CII is approved, the score band automatically determines the
                badge locked onto the student&apos;s final Flashcard.
            </p>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
                {CII_V2_LEVELS.map((l: CiiV2Level) => (
                    <div
                        key={l.level}
                        className="rounded-[15px] border p-2.5 text-center"
                        style={l.level === currentLevel ? { borderColor: TEAL, background: "#f5fbf9", boxShadow: "0 0 0 3px rgba(14,125,116,0.08)" } : { borderColor: LINE }}
                    >
                        <div className="text-[40px]">{l.icon}</div>
                        <b className="mt-1 block text-[9px]">Level {l.level} · {l.name}</b>
                        <small className="text-[7px]" style={{ color: "#728388" }}>
                            {l.min}–{l.level === 7 ? 100 : Math.floor(l.max)} · {l.quality}
                            {l.level === currentLevel ? (
                                <>
                                    <br />
                                    <strong>← CURRENT SCORE</strong>
                                </>
                            ) : null}
                        </small>
                    </div>
                ))}
            </div>
        </Card>
    );
}

function DecisionPane({
    ciiV2,
    locked,
    ciiV2Lock,
    facultyNote,
    setFacultyNote,
    returnNote,
    setReturnNote,
    approving,
    deciding,
    onApprove,
    onReturn,
    onFlag,
}: {
    ciiV2: CiiV2Result | null;
    locked: boolean;
    ciiV2Lock: CiiV2Lock | null;
    facultyNote: string;
    setFacultyNote: (v: string) => void;
    returnNote: string;
    setReturnNote: (v: string) => void;
    approving: boolean;
    deciding: boolean;
    onApprove: () => void;
    onReturn: () => void;
    onFlag: () => void;
}) {
    const lvl = ciiV2 ? levelByNumber(ciiV2.level.level) : null;
    return (
        <Card>
            <SectionHead no="F" title="Faculty Decision" tag={locked ? "LOCKED" : "REVIEW REQUIRED"} />
            <p className="mb-3 text-[10px]" style={{ color: MUTED }}>
                The AI score is automatic. Faculty reviews the evidence, reasoning and integrity flags before approving the
                result. A return/flag does not silently rewrite the score.
            </p>
            <div className="grid gap-2.5 md:grid-cols-2">
                <div className="rounded-[14px] border p-2.5" style={{ borderColor: LINE }}>
                    <b className="text-[9px]">✅ Approve CII + Issue Badge</b>
                    <p className="text-[8px]" style={{ color: MUTED }}>
                        Confirms the rubric score and locks {lvl?.name || "the badge"} onto the student Flashcard.
                    </p>
                    <textarea
                        value={facultyNote}
                        onChange={(e) => setFacultyNote(e.target.value)}
                        disabled={locked}
                        placeholder="Optional faculty note…"
                        className="mt-1.5 min-h-[75px] w-full rounded-[10px] border p-2 text-[9px]"
                        style={{ borderColor: "#dbe6e8" }}
                    />
                    <button
                        onClick={onApprove}
                        disabled={locked || approving || !ciiV2}
                        className="mt-1.5 rounded-[11px] px-3.5 py-2.5 text-[10px] font-black text-white disabled:opacity-50"
                        style={{ background: "linear-gradient(90deg,#0d6766,#21a695)" }}
                    >
                        {approving ? "Locking…" : "Approve · Lock CII · Issue Badge"}
                    </button>
                </div>
                <div className="rounded-[14px] border p-2.5" style={{ borderColor: LINE }}>
                    <b className="text-[9px]">↩ Return / ⚑ Flag</b>
                    <p className="text-[8px]" style={{ color: MUTED }}>
                        Use when evidence is missing, contradictory, or clarification is required. The record remains unlocked.
                    </p>
                    <textarea
                        value={returnNote}
                        onChange={(e) => setReturnNote(e.target.value)}
                        disabled={locked}
                        placeholder="State exactly what needs clarification or review…"
                        className="mt-1.5 min-h-[75px] w-full rounded-[10px] border p-2 text-[9px]"
                        style={{ borderColor: "#dbe6e8" }}
                    />
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <button
                            onClick={onReturn}
                            disabled={locked || deciding}
                            className="rounded-[11px] border px-3 py-2 text-[9px] font-black disabled:opacity-50"
                            style={{ borderColor: LINE, color: "#405f64" }}
                        >
                            ↩ Return to Student
                        </button>
                        <button
                            onClick={onFlag}
                            disabled={locked || deciding}
                            className="rounded-[11px] border px-3 py-2 text-[9px] font-black disabled:opacity-50"
                            style={{ borderColor: "#efd0d6", background: "#fff6f7", color: "#9a4557" }}
                        >
                            ⚑ Admin Review
                        </button>
                    </div>
                </div>
            </div>
            <div className="mt-2.5 rounded-[16px] border p-3" style={{ borderColor: "#d8d8ea", background: "linear-gradient(135deg,#faf9ff,#fff)" }}>
                <h3 className="text-[11px] font-bold">{locked ? "🔒 CII record locked" : "🔓 Lock has not yet been applied"}</h3>
                <p className="text-[8px]" style={{ color: "#6b657c" }}>
                    {locked
                        ? "The approved score and badge are frozen. Any later correction should create a new version rather than silently editing this record."
                        : "Approval creates a SHA-256 decision hash, timestamp and locked student return package."}
                </p>
                {locked && ciiV2Lock && (
                    <div className="mt-1.5 break-all rounded-[8px] p-2 font-mono text-[7px]" style={{ background: "#f0eef9", color: "#5e5773" }}>
                        {ciiV2Lock.hash}
                    </div>
                )}
            </div>
        </Card>
    );
}

function ReturnPane({
    studentName,
    projectTitle,
    ciiV2,
    ciiV2Lock,
    locked,
}: {
    studentName: string;
    projectTitle: string;
    ciiV2: CiiV2Result | null;
    ciiV2Lock: CiiV2Lock | null;
    locked: boolean;
}) {
    if (!ciiV2) {
        return (
            <Card>
                <p className="text-[10px]" style={{ color: MUTED }}>Run the analyser to preview the student return package.</p>
            </Card>
        );
    }
    const lvl = ciiV2.level;
    return (
        <>
            {!locked && (
                <Card className="mb-3">
                    <h2 className="text-[13px] font-bold">Student return package is waiting for Faculty approval</h2>
                    <p className="text-[10px]" style={{ color: MUTED }}>
                        Approve and lock the CII in the Faculty Decision tab to issue the badge.
                    </p>
                </Card>
            )}
            <div className="mx-auto max-w-[720px] overflow-hidden rounded-[24px] border bg-white shadow-[0_24px_60px_rgba(6,38,46,0.14)]" style={{ borderColor: "#dce7e8" }}>
                <div className="grid items-center gap-4 p-5 text-white md:grid-cols-[1fr_140px]" style={{ background: "linear-gradient(125deg,#052b33,#0e6664)" }}>
                    <div>
                        <div className="text-[8px] font-black tracking-[0.16em]" style={{ color: "#a8eee4" }}>
                            {locked ? "FACULTY VERIFIED · CII LOCKED" : "FACULTY REVIEW PREVIEW"}
                        </div>
                        <h1 className="my-1 text-[21px] font-bold">{projectTitle}</h1>
                        <p className="text-[9px] leading-relaxed" style={{ color: "#d4f3ef" }}>
                            {studentName} · Community Service
                            <br />
                            Final impact record generated from the submitted report and evidence package.
                        </p>
                    </div>
                    <div className="text-center text-[64px]">{lvl.icon}</div>
                </div>
                <div className="p-4">
                    <div className="grid items-center gap-3 md:grid-cols-[125px_1fr]">
                        <div className="rounded-[16px] p-3 text-center" style={{ background: "#eaf8f4" }}>
                            <b className="block text-[28px]">{ciiV2.final.toFixed(1)}</b>
                            <span className="text-[7px] font-black" style={{ color: "#62797d" }}>COMPOSITE IMPACT INDEX / 100</span>
                        </div>
                        <div>
                            <h2 className="mb-1 text-[16px] font-bold">{lvl.icon} Level {lvl.level} · {lvl.name}</h2>
                            <p className="text-[8.5px] leading-relaxed" style={{ color: "#667a7f" }}>
                                Evidence-to-claim match: {ciiV2.evidenceAverage}% · Faculty status: {locked ? "Approved & Locked" : "Preview only"}
                            </p>
                        </div>
                    </div>
                    <div className="mt-3 grid gap-1.5 md:grid-cols-2">
                        {ciiV2.sections.map((s) => (
                            <div key={s.id} className="flex justify-between gap-2 rounded-[9px] border p-2 text-[7.7px]" style={{ borderColor: "#e2ebeb" }}>
                                <b style={{ color: "#244b50" }}>§{s.id} {s.title}</b>
                                <span className="font-black" style={{ color: TEAL }}>{s.score.toFixed(1)}/{s.weight}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 border-t border-dashed pt-2.5 text-[7.5px] leading-relaxed" style={{ borderColor: "#dce5e5", color: "#687d82" }}>
                        {locked && ciiV2Lock ? (
                            <>
                                🔒 <b>CIEL PK CII LOCK</b> · Approved {new Date(ciiV2Lock.lockedAt).toLocaleString()}
                                <br />
                                Decision hash: <span className="break-all font-mono">{ciiV2Lock.hash}</span>
                            </>
                        ) : (
                            "🔓 This preview is not yet final. The badge and score become immutable only after Faculty approval."
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
