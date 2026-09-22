"use client";

import { useEffect, useState } from "react";
import "./one-page-student-guide.css";

type GuideSection = {
    n: string;
    icon: string;
    title: string;
    purpose: string;
    points: string[];
    good: string;
    avoid: string;
    ai: string;
};

const SECTIONS: GuideSection[] = [
    {
        n: "1",
        icon: "⏱️",
        title: "Participation",
        purpose: "Show what you actually did",
        points: [
            "Verify your profile/team.",
            "Log each session: date, time, location, activity, accomplishment, photos.",
            "Meet the required hours for every member.",
        ],
        good: "20 May · 9–12 · SOS Village · “Sorted 75 books and labelled 4 shelves” · 2 photos.",
        avoid: "Avoid: “Worked 8 hours.”",
        ai: "Do the dates, times, locations and session descriptions reconcile with the hours claimed? Is every team member meeting the required commitment, and is there evidence that the work actually happened?",
    },
    {
        n: "2",
        icon: "🔎",
        title: "Project Context",
        purpose: "Describe the situation before your project",
        points: [
            "Name the specific problem.",
            "Who was affected and approximately how many?",
            "What was missing? How did you know?",
            "How did your discipline help you understand it?",
        ],
        good: "“Classroom 4 had broken lighting and no learning displays; ~120 children were affected, based on observation and partner records.”",
        avoid: "Avoid: activities/results here.",
        ai: "Is the community need specific and supported by observation, partner information or another credible baseline source? Can the starting point later be compared with the outcome?",
    },
    {
        n: "3",
        icon: "🌍",
        title: "SDG Mapping",
        purpose: "Explain the real pathway to an SDG target",
        points: [
            "Registered SDGs are locked from the opportunity.",
            "Explain what actually happened that contributed.",
            "Add up to 2 genuine extra SDGs only when discovered through the work.",
        ],
        good: "“Lighting repairs and learning displays improved the classroom environment, directly supporting Target 4.A.”",
        avoid: "Avoid: selecting SDGs because they “sound related.”",
        ai: "Is the SDG connection genuine, or decorative? Strong entries link activity → output/outcome → target/indicator and explain the contribution without exaggerating causality.",
    },
    {
        n: "4",
        icon: "🛠️",
        title: "Activities, Outputs & Outcomes",
        purpose: "Separate what you did from what changed",
        points: [
            "Part A: activity, responsibility, countable outputs, people reached, counting method.",
            "Part B: Before → Now → We know because; baseline/endline and limitations.",
        ],
        good: "“1 classroom renovated, 14 displays; attendance 55% → 82%, from registers.”",
        avoid: "Avoid: calling “6 sessions” an outcome.",
        ai: "Can the system separate activities and outputs from real outcomes? Are beneficiary numbers counted carefully, baseline and endline comparable, and limitations stated honestly?",
    },
    {
        n: "5",
        icon: "📦",
        title: "Resources",
        purpose: "Account for what made the work possible",
        points: [
            "Choose time/effort only OR resources used.",
            "For each resource: type, amount/unit, source, verification, use.",
        ],
        good: "“PKR 8,000 · sponsor · receipt + partner confirmed → paint and furniture.”",
        avoid: "Avoid: “We used some money/material.”",
        ai: "Are resources traceable from source to use? A zero-budget project can still be excellent; what matters is transparency, efficiency and what the resources enabled.",
    },
    {
        n: "6",
        icon: "🤝",
        title: "Partnerships",
        purpose: "Show what partners actually contributed",
        points: [
            "Select partner role(s).",
            "Write one concrete contribution line.",
            "Add other partners only if they genuinely contributed.",
        ],
        good: "“SOS · host site + verification → provided classroom access, staff time and attendance records.”",
        avoid: "Avoid: listing organisations you only contacted.",
        ai: "Did the partner genuinely contribute access, supervision, expertise, verification, resources or continuation? A logo alone is not a partnership.",
    },
    {
        n: "7",
        icon: "📸",
        title: "Evidence",
        purpose: "Make claims independently checkable",
        points: [
            "Review auto-collected photos/documents.",
            "Add missing proof and state what it proves.",
            "Confirm consent, privacy and dignity.",
            "Choose Public / Institutional / Private.",
        ],
        good: "“Attendance sheet confirms 40 participants across 3 sessions.”",
        avoid: "Avoid: photos without consent or context.",
        ai: "Does each important claim have relevant proof? Do numbers reconcile across evidence sources, and are consent, privacy and dignity protected?",
    },
    {
        n: "8",
        icon: "🪞",
        title: "Reflection",
        purpose: "Show learning, not praise",
        points: [
            "Select genuine skills developed.",
            "Describe one lesson, one perspective-changing moment, one academic technique applied.",
            "Rate yourself honestly.",
        ],
        good: "“I learned that listening to the partner changed our plan more than our original assumptions did.”",
        avoid: "Avoid: twelve perfect ratings with no proof.",
        ai: "Does the reflection show a real event, learning, adaptation and academic application? Honest skill ratings are stronger than perfect ratings with thin evidence.",
    },
    {
        n: "9",
        icon: "🌱",
        title: "Sustainability + Consistency",
        purpose: "Explain what survives after you leave",
        points: [
            "Choose Yes / Partial / No honestly.",
            "What continues? What stops? What support is needed?",
            "Select continuation mechanisms, scale potential and system influence.",
            "Resolve consistency flags before submitting.",
        ],
        good: "“Partial: the renovated room stays in use; tutoring stops unless staff continue it. Plans were handed over to two staff.”",
        avoid: "Avoid: “The impact will continue forever.”",
        ai: "What survives after students leave, and through what mechanism? Strong sustainability is specific about ownership, handover, resources, follow-up and limits.",
    },
];

const CHECKS = [
    "✓ Hours reconcile",
    "✓ Numbers match",
    "✓ No double-counting",
    "✓ Evidence supports claims",
    "✓ Limitations stated",
    "✓ Privacy respected",
    "✓ AI summary checked",
];

export default function OnePageStudentGuide() {
    const [reading, setReading] = useState(false);
    const [open, setOpen] = useState<GuideSection | null>(null);
    const [focused, setFocused] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(null);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    const jumpTo = (section: GuideSection) => {
        setFocused(section.n);
        document.getElementById(`og-sec-${section.n}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(() => setFocused((current) => (current === section.n ? null : current)), 1800);
    };

    return (
        <div className={reading ? "og-root reading" : "og-root"}>
            <div className="og-quick print:hidden">
                <div className="og-brand">
                    <div className="og-logo">C</div>
                    <div>
                        <b>READ THIS BEFORE YOU START</b>
                        <small>CIEL PK · COMMUNITY ENGAGEMENT REPORT · QUICK STUDENT GUIDE</small>
                    </div>
                </div>
                <div className="og-actions">
                    <button type="button" className="og-btn alt" onClick={() => setReading((value) => !value)}>
                        {reading ? "One-page mode" : "Reading mode"}
                    </button>
                    <button type="button" className="og-btn" onClick={() => window.print()}>
                        Print / Save
                    </button>
                </div>
                <div className="og-nav">
                    {SECTIONS.map((section) => (
                        <button key={section.n} type="button" className={focused === section.n ? "on" : ""} onClick={() => jumpTo(section)}>
                            {section.n} {section.title}
                        </button>
                    ))}
                </div>
            </div>

            <article className="og-page">
                <header className="og-head">
                    <div>
                        <div className="og-brandline">CIEL PK · COMMUNITY IMPACT EDUCATION LAB PAKISTAN</div>
                        <h1>Before You Start — Community Engagement Report Guide</h1>
                        <p>
                            Read this first, then begin your report. In less than five minutes you will understand what every section expects, what a strong answer looks like, and what to avoid. Your goal is not to make the project sound impressive — it is to make your contribution <b>specific, measurable, honest and verifiable</b>.
                        </p>
                    </div>
                    <div className="og-badge">
                        <div>
                            <b>9</b>
                            <span>SECTIONS + FLASHCARD</span>
                        </div>
                    </div>
                </header>

                <div className="og-golden">
                    <div className="ico">🎯</div>
                    <div>
                        <b>The golden rule: Claim → Measure → Prove → Reflect.</b>
                        <p>Use real dates, real numbers and real evidence. If something is estimated, say it is estimated. Do not double-count beneficiaries. Privacy-protected evidence is still valid evidence.</p>
                    </div>
                    <div className="og-rule">SPECIFIC &gt; IMPRESSIVE</div>
                </div>

                <div className="og-grid">
                    {SECTIONS.map((section) => (
                        <div
                            key={section.n}
                            id={`og-sec-${section.n}`}
                            role="button"
                            tabIndex={0}
                            className={focused === section.n ? "og-sec focused" : "og-sec"}
                            onClick={() => setOpen(section)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    setOpen(section);
                                }
                            }}
                        >
                            <span className="og-hint">CLICK TO EXPLORE</span>
                            <div className="og-top">
                                <span className="og-ico" aria-hidden>{section.icon}</span>
                                <span className="og-num">{section.n}</span>
                                <h2>{section.title}</h2>
                            </div>
                            <div className="og-purpose">{section.purpose}</div>
                            <ul>
                                {section.points.map((point) => (
                                    <li key={point}>{point}</li>
                                ))}
                            </ul>
                            <div className="og-ex"><b>Good:</b> {section.good}</div>
                            <div className="og-avoid">{section.avoid}</div>
                        </div>
                    ))}
                </div>

                <section className="og-final">
                    <div>
                        <h3>⭐ Flashcard & Faculty Submission</h3>
                        <p>
                            Your flashcard is an AI summary of the report, not a second report. Review every summary carefully before accepting it. It should show the key facts from all sections, the Before → After story, evidence highlights and the scoring dossier. Submit only when the record is complete and accurate.
                        </p>
                    </div>
                    <div className="og-checks">
                        {CHECKS.map((item) => (
                            <span key={item}>{item}</span>
                        ))}
                    </div>
                </section>

                <footer className="og-foot">
                    <span><b>Remember:</b> one directly measured result is stronger than five unsupported claims.</span>
                    <button type="button" className="og-print print:hidden" onClick={() => window.print()}>
                        Print / Save One Page
                    </button>
                </footer>
            </article>

            {open ? (
                <div className="og-spot print:hidden" onClick={(event) => { if (event.target === event.currentTarget) setOpen(null); }}>
                    <div className="og-spotbox" role="dialog" aria-modal="true" aria-label={`Section ${open.n}`}>
                        <div className="og-spothead">
                            <div className="text-[30px]" aria-hidden>{open.icon}</div>
                            <div>
                                <h3>Section {open.n} · {open.title}</h3>
                                <p>Student-friendly deep view · example + AI/faculty lens</p>
                            </div>
                            <button type="button" className="og-spotx" onClick={() => setOpen(null)} aria-label="Close">✕</button>
                        </div>
                        <div className="og-spotbody">
                            <div className="og-spotgrid">
                                <div className="og-spotcard">
                                    <b>🎯 WHAT THIS SECTION WANTS</b>
                                    <p>{open.purpose}. {open.points.join(" ")}</p>
                                </div>
                                <div className="og-spotcard">
                                    <b>✅ STRONG EXAMPLE</b>
                                    <p>{open.good}</p>
                                </div>
                            </div>
                            <div className="og-spotai">
                                <b>🧠 WHAT FACULTY / AI WILL NOTICE</b>
                                <p>{open.ai}</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
