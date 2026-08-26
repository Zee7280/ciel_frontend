"use client";

import { useEffect, useRef, useState } from "react";
import {
    FLASH_CARD_INDEX,
    STUDENT_GUIDE_SECTIONS,
    wizardStepToGuideIndex,
} from "./studentCommunityGuide.data";
import "./student-community-guide.css";

export { wizardStepToGuideIndex };

type StudentCommunityGuideProps = {
    /** Live report step 1–10, or a raw guide index 0–9 via initialGuideIndex. */
    wizardStep?: number;
    initialGuideIndex?: number;
    showHero?: boolean;
    compact?: boolean;
};

export default function StudentCommunityGuide({
    wizardStep,
    initialGuideIndex,
    showHero = true,
    compact = false,
}: StudentCommunityGuideProps) {
    const start =
        typeof initialGuideIndex === "number"
            ? initialGuideIndex
            : wizardStepToGuideIndex(wizardStep ?? 1);
    const [cur, setCur] = useState(start);
    const [stagesOn, setStagesOn] = useState([false, false, false, false, false]);
    const timers = useRef<number[]>([]);

    useEffect(() => {
        setCur(start);
        setStagesOn([false, false, false, false, false]);
        timers.current.forEach((id) => window.clearTimeout(id));
        timers.current = [];
    }, [start]);

    useEffect(() => () => {
        timers.current.forEach((id) => window.clearTimeout(id));
    }, []);

    const go = (i: number) => {
        setCur(i);
        if (i !== FLASH_CARD_INDEX) setStagesOn([false, false, false, false, false]);
    };

    const playRun = () => {
        timers.current.forEach((id) => window.clearTimeout(id));
        timers.current = [];
        setStagesOn([false, false, false, false, false]);
        [0, 1, 2, 3, 4].forEach((i) => {
            const id = window.setTimeout(() => {
                setStagesOn((prev) => {
                    const next = [...prev];
                    next[i] = true;
                    return next;
                });
            }, 400 + i * 900);
            timers.current.push(id);
        });
    };

    const s = cur < FLASH_CARD_INDEX ? STUDENT_GUIDE_SECTIONS[cur] : null;

    return (
        <div className="scg" style={{ background: compact ? "transparent" : "var(--bg)" }}>
            {showHero ? (
                <>
                    <div className="logo">
                        CIEL <span>PK</span> · Community Engagement — The Student Guide
                    </div>
                    <div className="hero">
                        <div className="k">THE WHOLE FORM, FILLED — ZAIN&apos;S COMPLETE REPORT INSIDE EVERY SECTION</div>
                        <h1>Nine sections. One flash card. Every field, shown. 🎓</h1>
                        <p>
                            Each section gives you tiny steps, then <b>Zain &amp; Ali&apos;s SOS Classroom report filled exactly as it looks in the form</b>{" "}
                            — every field, every chip, every image — plus the live banner it produces. Finish with ⭐ THE FLASH CARD and watch the
                            system run to the certificate.
                        </p>
                    </div>
                </>
            ) : null}

            <div className="rail">
                {STUDENT_GUIDE_SECTIONS.map((sec, i) => (
                    <button key={sec.t} type="button" className={`rb ${i === cur ? "on" : ""}`} onClick={() => go(i)}>
                        <span className="re">{sec.e}</span>
                        <b>{sec.t}</b>
                        <span className="rw">{sec.w.split(" ·")[0]}</span>
                    </button>
                ))}
                <button type="button" className={`rb fcb ${cur === FLASH_CARD_INDEX ? "on" : ""}`} onClick={() => go(FLASH_CARD_INDEX)}>
                    <span className="re">⭐</span>
                    <b>THE FLASH CARD</b>
                    <span className="rw">watch it run</span>
                </button>
            </div>

            {s ? (
                <div className="view">
                    <div className="shero" style={{ background: `linear-gradient(120deg,${s.grad})` }}>
                        <span className="se">{s.e}</span>
                        <h2>Section {s.t}</h2>
                        <span className="wpill">🧠 AI READS: {s.w}</span>
                        <span className="sm">{s.sub}</span>
                    </div>
                    <div className="card">
                        <div className="ct c-how">📋 HOW TO FILL — TINY STEPS</div>
                        <div className="tl">
                            {s.how.map((h, i) => (
                                <div key={h} className="step" data-n={String(i + 1)}>
                                    {h}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="card">
                        <div className="ct c-ex">✅ THE COMPLETE FILL — EVERY FIELD OF ZAIN&apos;S REPORT</div>
                        <div className="mock" dangerouslySetInnerHTML={{ __html: s.ex }} />
                        <div className="ban">
                            <div className="banh">
                                🧠 THE LIVE BANNER THIS PRODUCES <span className="live">● UPDATES AS YOU TYPE · THIS IS WHAT GETS SCORED</span>
                            </div>
                            <div className="banb" dangerouslySetInnerHTML={{ __html: s.ban }} />
                        </div>
                    </div>
                    <div className="irow">
                        <div className="card" style={{ margin: 0 }}>
                            <div className="ct c-no">❌ AVOID</div>
                            <div className="no">{s.no}</div>
                        </div>
                        <div className="card" style={{ margin: 0 }}>
                            <div className="ct c-tip">💡 PRO TIP</div>
                            <div className="tip">{s.tip}</div>
                        </div>
                        <div className="card" style={{ margin: 0 }}>
                            <div className="ct c-ai">🧠 WHY IT MATTERS TO YOUR CII</div>
                            <div className="ai">{s.ai}</div>
                        </div>
                    </div>
                    <div className="navrow" style={{ marginTop: 11 }}>
                        {cur > 0 ? (
                            <button type="button" className="nv" onClick={() => go(cur - 1)}>
                                ← {STUDENT_GUIDE_SECTIONS[cur - 1].t}
                            </button>
                        ) : null}
                        <button type="button" className="nv next" onClick={() => go(cur + 1)}>
                            {cur < 8 ? `Next: ${STUDENT_GUIDE_SECTIONS[cur + 1].t} →` : "Next: ⭐ The Flash Card →"}
                        </button>
                    </div>
                </div>
            ) : (
                <FlashCardRun stagesOn={stagesOn} onPlay={playRun} onBack={() => go(8)} onRestart={() => go(0)} />
            )}
        </div>
    );
}

function FlashCardRun({
    stagesOn,
    onPlay,
    onBack,
    onRestart,
}: {
    stagesOn: boolean[];
    onPlay: () => void;
    onBack: () => void;
    onRestart: () => void;
}) {
    return (
        <div className="view">
            <div className="shero" style={{ background: "linear-gradient(120deg,#4c1d95,#8b5cf6)" }}>
                <span className="se">⭐</span>
                <h2>The Flash Card — watch the system run</h2>
                <span className="wpill">SUBMIT → CII → APPROVE → LIVE → 📜</span>
                <span className="sm">You never “write” the flash card — it assembles itself from your nine banners. Press play:</span>
            </div>
            <button type="button" className="runbtn" onClick={onPlay}>
                ▶ Run the system — submit to certificate
            </button>
            <div className={`rstage ${stagesOn[0] ? "on" : ""}`}>
                <div className="rl">1 · YOU SUBMIT FROM THE FINAL SECTION</div>
                <div className="rc">
                    The card assembles — achievements on top, story, evidence as zoomable images:
                    <div className="fc">
                        <div className="fch">
                            <div className="uni">CIEL PK · COMMUNITY ENGAGEMENT · BNU</div>
                            <b>SOS Classroom Learning Environment Transformation</b>
                            <div className="who">Zain +1 · SOS Children&apos;s Villages · 4–29 May 2026</div>
                        </div>
                        <div className="ach">
                            <div className="mrow">
                                <span className="mtag">⏱️ 23.5h · CLOCK 16.5/16 🏆</span>
                                <span className="mtag">🫶 120 REACHED</span>
                                <span className="mtag">📈 +49% MEASURED</span>
                                <span className="mtag">💵 PKR 8,000</span>
                                <span className="mtag">📸 7 IMAGES</span>
                                <span className="mtag">🎯 3 SDGs</span>
                                <span className="mtag">🌱 PARTIAL — HONEST</span>
                            </div>
                        </div>
                    </div>
                    <div style={{ fontSize: 8.5, color: "var(--muted)", marginTop: 5 }}>📄 + your 12-page PDF, auto-assembled from every banner</div>
                </div>
            </div>
            <div className={`rstage ${stagesOn[1] ? "on" : ""}`}>
                <div className="rl">2 · THE CII COMPUTES ITSELF — NO ONE PRESSES ANYTHING</div>
                <div className="rc">
                    <span className="big">86.1</span> <b style={{ fontSize: 11 }}>/100 · 🏅 Level 6 — Distinguished Impact Contributor</b>
                    <br />
                    All 9 sections scored with explanations (§4 dual-lens 60/40) · bonuses +3.5 · red-flag scan clean · Badge Readiness ✅
                </div>
            </div>
            <div className={`rstage ${stagesOn[2] ? "on" : ""}`}>
                <div className="rl">3 · FACULTY RECEIVES IT ALREADY SCORED — AND APPROVES ONCE</div>
                <div className="rc">
                    Prof. Bilal Ahmed sees card + PDF + CII + section-wise explanation. One click — the only human approval in the whole system.
                </div>
            </div>
            <div className={`rstage ${stagesOn[3] ? "on" : ""}`}>
                <div className="rl">4 · LIVE EVERYWHERE — THE CII TRAVELS WITH EVERY HAND-OFF</div>
                <div className="rc">
                    <span className="dchip">🎓 ZAIN — CARD + PDF + CII + BADGE</span>
                    <span className="dchip">🧑‍🏫 FACULTY — CARD + PDF + CII</span>
                    <span className="dchip">🏛️ BNU — CARD + CII</span>
                    <span className="dchip">🤝 SOS — CARD + CII</span>
                    <span className="dchip">🇵🇰 HEC — CARD + CII</span>
                    <span className="dchip">🌍 CIEL PK — CARD LIVE · PDF ARCHIVED 🔐</span>
                </div>
            </div>
            <div className={`rstage ${stagesOn[4] ? "on" : ""}`}>
                <div className="rl">5 · THE CERTIFICATE ISSUES ITSELF 📜</div>
                <div className="rc">
                    Live on CIEL PK = certificate auto-generated: name, badge level, CII, hours, partner — <b>downloadable, with a QR code</b> anyone
                    can scan to open your live card. Forgery impossible. It hangs on your Impact Wall next to the flash card, forever.
                    <br />
                    <span style={{ fontSize: 9, fontWeight: 800, color: "var(--vio)" }}>
                        And the loop keeps paying: every award model any stakeholder runs lands its badges back on YOUR wall. ↺
                    </span>
                </div>
            </div>
            <div className="navrow">
                <button type="button" className="nv" onClick={onBack}>
                    ← 9 · Final
                </button>
                <button type="button" className="nv next" onClick={onRestart}>
                    ↺ Back to Section 1
                </button>
            </div>
        </div>
    );
}
