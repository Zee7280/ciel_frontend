"use client";

import { useEffect, useMemo, useState } from "react";
import "./detailed-report-guide.css";

type GuideBlock = {
    id: string;
    num: string;
    icon: string;
    title: string;
    short: string;
    blurb: string;
    tag: string;
    purpose: string;
    keywords: string;
    leftTitle: string;
    left: string[];
    leftOrdered?: boolean;
    rightTitle?: string;
    right?: string[];
    rightAi?: boolean;
    rightNote?: string;
    exampleTitle: string;
    example: string;
    weak?: string;
    strong?: string;
    pattern?: string;
    checks: string[];
};

const SECTIONS: GuideBlock[] = [
    {
        id: "s1",
        num: "1",
        icon: "⏱️",
        title: "Participation",
        short: "Participation",
        blurb: "Identity, team configuration, session logs, hours clock, activity ledger and declarations.",
        tag: "PROVE YOU WERE THERE",
        purpose: "Build a reliable record of who participated, when, where, for how long, what they did and what proof exists. Every registered member must reach the service-hour requirement set in the approved opportunity before final submission.",
        keywords: "participation hours attendance session team identity otp location photos declaration contribution",
        leftTitle: "What you need to complete",
        leftOrdered: true,
        left: [
            "Confirm personal and academic identity.",
            "Add team members using their real institutional details; they verify through OTP.",
            "Log each session separately: date, start/end time, organization/location, pinned location, activity type and accomplishment.",
            "Attach supporting photos where appropriate.",
            "Monitor the hours clock for every team member.",
            "Complete the authenticity/declaration statements.",
        ],
        rightTitle: "What faculty / AI will look for",
        right: [
            "Do session times add up to the claimed hours?",
            "Are dates, locations and activities plausible and consistent?",
            "Does each team member meet the required hours?",
            "Do photos or later evidence support the session story?",
            "Is the accomplishment specific rather than vague?",
        ],
        exampleTitle: "EXCELLENT SESSION ENTRY",
        example: "20 May 2026 · 09:00–12:00 · SOS Children’s Village Lahore · Field activity. “Sorted and labelled 75 donated books, reorganised four shelves and created a simple borrowing register with SOS staff.” Evidence: 2 on-site photos + completed register.",
        weak: "“Worked 8 hours at SOS.”",
        strong: "Split the 8 hours into the actual dated sessions. State what happened in each session and attach proof.",
        pattern: "“During this session, I/we [specific action] for [beneficiary/site], producing [countable output] and documenting it through [evidence].”",
        checks: ["✓ Real date/time", "✓ Exact/pinned location", "✓ Specific accomplishment", "✓ Evidence attached", "✓ Every member reaches target"],
    },
    {
        id: "s2",
        num: "2",
        icon: "🔎",
        title: "Project Context",
        short: "Project Context",
        blurb: "The problem, affected community, baseline, evidence source and academic lens — before intervention.",
        tag: "ESTABLISH THE STARTING POINT",
        purpose: "Show what was true before your project. This becomes the baseline against which Section 4 measures change. Do not describe your activities or achievements here.",
        keywords: "context baseline problem beneficiaries affected gap observation partner data academic discipline before",
        leftTitle: "The five questions",
        leftOrdered: true,
        left: [
            "What problem did you see? Be specific.",
            "Who was affected? Name the beneficiary group.",
            "Approximately how many? Give the best defensible number.",
            "What was missing and how did you know? Select gaps and evidence sources.",
            "How did your field of study help? Name the academic lens or technique.",
        ],
        rightTitle: "What faculty / AI will look for",
        right: [
            "A clear, bounded problem — not “the community had issues.”",
            "A defined population and defensible scale.",
            "Evidence of need: observation, partner data, survey, records, interview, etc.",
            "An academic connection that is actually used.",
            "No results accidentally written into the baseline.",
        ],
        exampleTitle: "EXCELLENT BASELINE",
        example: "“Before the intervention, Classroom 4 had two non-functional lights, no learning displays and limited storage. Approximately 120 children aged 5–12 used the space. The condition was identified through direct observation and confirmed by SOS staff. Our design training helped us assess lighting, layout and usable learning space.”",
        weak: "“The school had many problems and we wanted to help children.”",
        strong: "Name the exact condition, who it affected, how many people were affected and how you knew.",
        pattern: "“Before our project, [specific problem] affected approximately [number + group]. We identified this through [source(s)]. From a [discipline] perspective, we used [method/skill] to understand the gap.”",
        checks: ["✓ Before only", "✓ Specific problem", "✓ Beneficiary group", "✓ Number", "✓ Evidence source", "✓ Academic lens"],
    },
    {
        id: "s3",
        num: "3",
        icon: "🌍",
        title: "SDG Mapping",
        short: "SDG Mapping",
        blurb: "Registered SDGs from the opportunity plus any genuine additional SDG connections revealed during implementation.",
        tag: "SHOW THE CONTRIBUTION LOGIC",
        purpose: "Explain how the work contributes to an SDG target/indicator. The primary SDG(s) selected in Create Opportunity remain locked for consistency. You may add up to two additional SDGs discovered through the actual work.",
        keywords: "sdg target indicator contribution pathway additional goals locked registered sustainability goals",
        leftTitle: "What to write",
        left: [
            "Describe the evidence-backed contribution to the registered target/indicator.",
            "If adding another SDG, complete the Target + Indicator + Contribution Logic; sub-indicator/local metric is optional.",
            "Use a pathway: Activity → Output → Change → SDG target.",
            "Use cautious wording: “contributed to” when you cannot prove causality.",
        ],
        rightTitle: "What faculty / AI will look for",
        right: [
            "Does the selected SDG truly match the project?",
            "Is the target more specific than the broad SDG title?",
            "Does the indicator/local metric relate to something you actually measured?",
            "Are extra SDGs meaningful rather than decorative?",
        ],
        exampleTitle: "EXCELLENT CONTRIBUTION LOGIC",
        example: "“Repairing lighting, reorganising storage and installing learning displays improved the physical learning environment of Classroom 4. These changes support SDG 4 Target 4.A by improving the safety and functionality of an education facility used daily by approximately 120 children.”",
        weak: "“This project supports SDG 4 because it is about education.”",
        strong: "Connect your actual activities and measured outputs to a specific target and explain the beneficiary effect.",
        checks: ["✓ Target named", "✓ Indicator/local metric considered", "✓ Evidence-backed logic", "✓ No SDG shopping"],
    },
    {
        id: "s4",
        num: "4",
        icon: "🛠️",
        title: "Activities, Outputs & Outcomes",
        short: "Activities & Outcomes",
        blurb: "Part A: what you did and counted. Part B: what changed because of it.",
        tag: "THE CORE IMPACT SECTION",
        purpose: "Separate delivery from change. Activities/outputs describe what happened on the day. Outcomes compare the situation before and after, using the strongest evidence available.",
        keywords: "activities outputs outcomes measurable change baseline endline beneficiary reach counting method overlap limitations confidence before after",
        leftTitle: "Part A · Activities & outputs",
        left: [
            "Create one block per major activity.",
            "Add title, status, category/sub-category and who did what.",
            "Record countable outputs with quantity and unit.",
            "Record people reached, who they were, how counted, location and overlap with other activities.",
            "Do not double-count the same people across activities.",
        ],
        rightTitle: "Part B · Outcomes & change",
        rightAi: false,
        right: [
            "Complete: Before… / Now… / We know because…",
            "Add at least one measurable outcome.",
            "Use the same metric at baseline and endline.",
            "Select confidence honestly: Directly Measured / Partner Confirmed / Observed / Estimated.",
            "Name the data source and state challenges/limitations.",
        ],
        rightNote: "Do activity counts reconcile with evidence? Is reach unique or overlapping? Does the baseline compare to the same endline metric? Are outcome claims proportional to the evidence? Are limitations acknowledged? One strong directly measured outcome is more valuable than several vague claims.",
        exampleTitle: "EXCELLENT ACTIVITY + OUTCOME EXAMPLE",
        example: "Activity: Classroom repainting · Completed · Infrastructure → Classroom Improvement. Team painted one classroom, installed 14 learning displays and organised 4 storage zones. 120 children were served, counted from the partner’s student register. Outcome: Attendance rate 55% → 82% (+49%). Confidence: Directly Measured. Source: compared the same SOS attendance register for four weeks before and four weeks after. Limitation: short follow-up period means long-term attendance cannot yet be claimed.",
        weak: "“We conducted 6 sessions and students became more confident.”",
        strong: "“6 sessions” is an output. If confidence changed, define how confidence was measured before and after, or state it as observation rather than fact.",
        pattern: "“Before [metric + baseline]. After [same metric + endline]. We know because [source/method]. This suggests [careful interpretation], although [limitation].”",
        checks: ["✓ Activity ≠ outcome", "✓ Quantities have units", "✓ Reach counting method", "✓ Overlap declared", "✓ Same baseline/endline metric", "✓ Limitation stated"],
    },
    {
        id: "s5",
        num: "5",
        icon: "📦",
        title: "Resources",
        short: "Resources",
        blurb: "Time and effort only, or a transparent record of money, materials, space, logistics and other support.",
        tag: "TRACE EVERY INPUT",
        purpose: "Show what the project ran on and how efficiently resources were used. A zero-budget project is not weaker; it can demonstrate excellent resource efficiency.",
        keywords: "resources budget money materials donation venue equipment expertise sponsor receipt verification zero budget",
        leftTitle: "If no resources beyond time",
        left: ["Select Just our time & effort. Do not invent costs to make the project appear larger."],
        rightTitle: "If resources were used",
        rightAi: false,
        right: [
            "One entry per resource.",
            "Type, amount, unit.",
            "Source(s).",
            "Verification method.",
            "One clear line: what did this resource make possible?",
        ],
        exampleTitle: "EXCELLENT RESOURCE ENTRY",
        example: "“PKR 8,000 · Cash/Funding · Private Sponsor · Evidence Uploaded + Partner Confirmed → purchased paint and classroom storage materials.”",
        weak: "“We received donations and some materials.”",
        strong: "Name the resource, quantity/value, source, verification and what it enabled.",
        checks: ["✓ Amount/unit", "✓ Source", "✓ Verification", "✓ Enabled-use statement", "✓ No inflated valuation"],
    },
    {
        id: "s6",
        num: "6",
        icon: "🤝",
        title: "Partnerships",
        short: "Partnerships",
        blurb: "What the linked partner and any additional partners genuinely contributed.",
        tag: "NAME THE ROLE, NOT THE LOGO",
        purpose: "Demonstrate real collaboration. A partner should be included because they contributed something identifiable — access, co-delivery, funding, expertise, records, verification or community connection.",
        keywords: "partnerships partner ngo corporate host site co-delivery funding mentorship verification records community access contribution",
        leftTitle: "What to enter",
        left: [
            "Select every role the linked partner actually played.",
            "Write one specific contribution line.",
            "Add another partner only if they genuinely contributed.",
            "For every additional partner, name what they did.",
        ],
        rightTitle: "What faculty / AI will look for",
        right: [
            "Is this a true partnership or merely a name/logo?",
            "Did the partner verify any claims?",
            "Did the partner improve access, delivery or continuity?",
            "Do partner claims match evidence elsewhere?",
        ],
        exampleTitle: "EXCELLENT PARTNER DESCRIPTION",
        example: "“SOS Children’s Villages Pakistan · Host Site + Verification & Records + Community Access → provided classroom access, staff coordination, beneficiary records and verification of student attendance.”",
        weak: "“We partnered with three organisations.”",
        strong: "State exactly what each organisation did. If an organisation did nothing beyond receiving an email, do not present it as a partner.",
        checks: ["✓ Role selected", "✓ Concrete contribution", "✓ Verification link", "✓ Extra partners are genuine"],
    },
    {
        id: "s7",
        num: "7",
        icon: "📸",
        title: "Evidence",
        short: "Evidence",
        blurb: "Auto-collected proof plus any additional files, ethics confirmation and visibility choice.",
        tag: "BACK EVERY IMPORTANT CLAIM",
        purpose: "Make the report independently checkable while protecting people’s dignity and privacy. Evidence can remain Institutional or Private and still be fully useful for verification.",
        keywords: "evidence photos attendance consent privacy public institutional private survey results feedback confirmation documents ethics dignity verification",
        leftTitle: "Evidence that helps",
        left: [
            "Activity photos with consent.",
            "Attendance/registration sheets.",
            "Partner confirmation.",
            "Survey/feedback results.",
            "Resource delivery proof or receipts.",
            "Training materials or outputs.",
            "Before/after documentation.",
        ],
        rightTitle: "What faculty / AI will look for",
        right: [
            "What exact claim does each file support?",
            "Do participant/reach numbers reconcile?",
            "Is the evidence from this project?",
            "Are consent, privacy and dignity respected?",
            "Are important claims unsupported?",
        ],
        exampleTitle: "EXCELLENT EVIDENCE DESCRIPTION",
        example: "“Attendance sheet — confirms 40 unique participants across three sessions.” / “Partner letter — confirms classroom access and 18 verified student service hours.” / “Before/after photos — document lighting and display improvements.”",
        weak: "Upload 20 photos with no explanation.",
        strong: "Use fewer, relevant items and state what each one proves. Choose Public only when consent and policy allow it.",
        checks: ["✓ Relevant proof", "✓ Claim explained", "✓ Consent", "✓ Privacy", "✓ Correct visibility", "✓ Identifiers blurred if needed"],
    },
    {
        id: "s8",
        num: "8",
        icon: "🪞",
        title: "Reflection",
        short: "Reflection",
        blurb: "Learning, academic application, skill development and honest competency self-assessment.",
        tag: "SHOW HOW YOU CHANGED",
        purpose: "Move beyond “I enjoyed volunteering.” Reflection should show self-awareness, learning, changed thinking and how academic knowledge was applied in a real community setting.",
        keywords: "reflection learning skills competencies academic integration personal learning self rating leadership communication teamwork data empathy sustainability",
        leftTitle: "The strongest reflections include",
        left: [
            "A specific lesson learned.",
            "A moment that changed your perspective.",
            "An academic method/skill you actually used.",
            "A personal learning paragraph.",
            "An academic application paragraph.",
            "Honest 1–5 competency ratings.",
        ],
        rightTitle: "What faculty / AI will look for",
        right: [
            "Specificity rather than generic praise.",
            "Reflection connected to project events.",
            "Evidence that selected skills were used.",
            "Realistic self-ratings — not automatic 5s.",
            "Recognition of mistakes, adaptation and ethical learning.",
        ],
        exampleTitle: "EXCELLENT REFLECTION",
        example: "“I initially assumed our layout plan would solve the classroom problem. During the first meeting, SOS staff explained that storage access mattered more than display quantity. We changed the design and reduced decorative elements. The experience taught me that community expertise should shape the intervention, not simply validate a student plan.”",
        weak: "“I learned leadership, teamwork and communication. It was a great experience.”",
        strong: "Name the event that taught you something, what you changed, and what skill or concept you used.",
        pattern: "“I used to think ____. During ____, I noticed ____. I changed ____. This taught me ____. In my discipline, I applied ____ by ____.”",
        checks: ["✓ Specific learning", "✓ Real event", "✓ Academic technique", "✓ Honest ratings", "✓ Evidence-backed skills"],
    },
    {
        id: "s9",
        num: "9",
        icon: "🌱",
        title: "Sustainability + Consistency Review",
        short: "Sustainability",
        blurb: "What continues, what stops, what mechanism remains, whether it can scale, and whether the report is internally consistent.",
        tag: "THE LAST MILE",
        purpose: "Assess what survives after the student team leaves. CIEL PK rewards credible continuation mechanisms and honest limits — not forced optimism.",
        keywords: "sustainability continuation yes partial no handover ownership integration funding follow up scale system influence consistency review final",
        leftTitle: "What to complete",
        left: [
            "Choose Yes / Partial / No.",
            "Explain what continues, what stops and what support is still required.",
            "Select continuation mechanisms: partner-led, community ownership, institutional integration, handover, funding, follow-up, etc.",
            "Select realistic scaling potential and system influence.",
            "Resolve automated consistency flags.",
        ],
        rightTitle: "What faculty / AI will look for",
        right: [
            "Is continuation supported by a real mechanism?",
            "Does the sustainability claim match partner/resource information?",
            "Are scaling claims realistic?",
            "Do hours, reach, resources, outcomes and evidence agree across the report?",
            "Are contradictions corrected before submission?",
        ],
        exampleTitle: "EXCELLENT SUSTAINABILITY STATEMENT",
        example: "“Partial. The renovated classroom remains in daily use without additional student input. Weekly tutoring will stop unless SOS staff continue it. We handed over session plans and trained two staff members. A three-month follow-up has been scheduled. The physical model could be replicated in other classrooms, but the tutoring component requires staff capacity.”",
        weak: "“Yes, the impact will continue and can be scaled everywhere.”",
        strong: "Name the person/system/resource that keeps it going, and separate what is truly sustainable from what will stop.",
        checks: ["✓ Honest Yes/Partial/No", "✓ Mechanism named", "✓ Support needed", "✓ Realistic scale", "✓ Consistency flags cleared"],
    },
    {
        id: "flash",
        num: "F",
        icon: "🏅",
        title: "Flashcard, AI Summary & Faculty Submission",
        short: "Flashcard & Submit",
        blurb: "The public-facing summary generated from your report — review it before sending.",
        tag: "YOUR IMPACT RECORD",
        purpose: "The flashcard is not a place to add new claims. It summarises the report you already completed. It should accurately carry the key facts and highlights from every section and become the concise record faculty reviews and approves.",
        keywords: "flashcard faculty approval ai summary report pdf evidence cii score submit review summary",
        leftTitle: "Before you accept the AI summary",
        left: [
            "Check names, dates, hours and locations.",
            "Check beneficiary numbers and avoid double-counting.",
            "Check Before → After statements.",
            "Check resources and partner contributions.",
            "Check evidence captions and visibility.",
            "Check reflection and sustainability summaries.",
            "Make sure limitations were not removed or exaggerated.",
        ],
        rightTitle: "What happens next",
        right: ["Once the report is complete, the flashcard and detailed report assemble automatically. Faculty receives the record for final review. Your job is to ensure the AI summary reflects your real work accurately before submission."],
        exampleTitle: "FINAL STUDENT QUALITY CHECK",
        example: "Ask yourself: “Could a person who never attended this project understand what the problem was, what we did, what changed, how we know, what evidence exists, what I learned, and what continues?” If the answer is yes — and every number can be defended — your record is ready.",
        checks: ["✓ Complete", "✓ Accurate", "✓ Evidence-backed", "✓ Consistent", "✓ Ethical", "✓ Student-reviewed AI summary"],
    },
];

const STORAGE_KEY = "ciel.student.csReportGuide.explored";
const RULES = ["Use real data", "Never invent evidence", "Say when a number is estimated", "Do not double-count people", "Privacy does not reduce evidence quality", "Honest limitations strengthen the report"];

function readExplored(): string[] {
    if (typeof window === "undefined") return [];
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
        return [];
    }
}

export default function DetailedStudentReportGuide() {
    const [query, setQuery] = useState("");
    const [collapsed, setCollapsed] = useState<string[]>([]);
    const [explored, setExplored] = useState<string[]>([]);
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [toast, setToast] = useState("");
    const [active, setActive] = useState("s1");

    useEffect(() => {
        setExplored(readExplored());
    }, []);

    useEffect(() => {
        const onScroll = () => {
            let best = "s1";
            let distance = Number.POSITIVE_INFINITY;
            for (const section of SECTIONS) {
                const node = document.getElementById(`dg-${section.id}`);
                if (!node) continue;
                const gap = Math.abs(node.getBoundingClientRect().top - 110);
                if (gap < distance) {
                    distance = gap;
                    best = section.id;
                }
            }
            setActive(best);
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [query, unreadOnly, collapsed]);

    const showToast = (message: string) => {
        setToast(message);
        window.setTimeout(() => setToast(""), 1700);
    };

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return SECTIONS.filter((section) => {
            if (unreadOnly && explored.includes(section.id)) return false;
            if (!q) return true;
            const hay = `${section.title} ${section.blurb} ${section.purpose} ${section.keywords} ${section.example}`.toLowerCase();
            return hay.includes(q);
        });
    }, [query, unreadOnly, explored]);

    const jump = (id: string) => {
        setCollapsed((current) => current.filter((item) => item !== id));
        window.setTimeout(() => {
            document.getElementById(`dg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 30);
    };

    const step = (delta: number) => {
        const ids = visible.map((section) => section.id);
        const index = Math.max(0, ids.indexOf(active));
        const next = ids[Math.max(0, Math.min(ids.length - 1, index + delta))];
        if (next) jump(next);
    };

    const toggleExplored = (id: string) => {
        setExplored((current) => {
            const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            showToast(next.includes(id) ? "Section added to your explored journey" : "Section marked as unread");
            return next;
        });
    };

    const pct = Math.round((explored.length / SECTIONS.length) * 100);

    return (
        <div className="dg">
            <div className="dg-bar print:hidden">
                <input
                    className="dg-search"
                    value={query}
                    onChange={(event) => {
                        setUnreadOnly(false);
                        setQuery(event.target.value);
                    }}
                    placeholder="Search: baseline, evidence, outcome, partner, reflection…"
                    aria-label="Search the report guide"
                />
                <div className="dg-prog">
                    <div className="dg-prog-top">
                        <span>YOUR GUIDE JOURNEY</span>
                        <span>{explored.length}/{SECTIONS.length} explored</span>
                    </div>
                    <div className="dg-prog-bar"><i style={{ width: `${pct}%` }} /></div>
                </div>
                <button type="button" className="dg-btn soft" onClick={() => { setQuery(""); setUnreadOnly(false); }}>Clear</button>
                <button type="button" className="dg-btn" onClick={() => window.print()}>Print</button>
            </div>

            <section className="dg-hero" id="dg-start">
                <div className="ey">CIEL PK · COMMUNITY ENGAGEMENT REPORT</div>
                <h2>Detailed Student Guidance</h2>
                <p>
                    This guide follows the fields and sequence of the current CIEL PK report. It explains <b>what each section is trying to capture, what a strong answer looks like, what evidence to prepare, what faculty/AI will check, and what weak answers to avoid.</b> Examples are illustrative — replace them with your own verified project facts.
                </p>
                <div className="dg-rules">
                    {RULES.map((rule) => <span key={rule}>{rule}</span>)}
                </div>
                <div className="dg-journey">
                    {SECTIONS.map((section) => (
                        <button key={section.id} type="button" onClick={() => jump(section.id)}>
                            {section.icon} {section.num === "F" ? "★" : section.num} · {section.short}
                        </button>
                    ))}
                </div>
            </section>

            <div className="dg-notice">
                <div aria-hidden>⚠️</div>
                <div>
                    <b>Your report is a verified impact record, not a marketing brochure.</b>
                    <p>Do not write what you think faculty wants to hear. Write what actually happened. If something did not work, say so. If an outcome cannot be measured, state the limitation. The flashcard and scoring dossier are generated from these entries, so consistency across sections matters.</p>
                </div>
            </div>

            <div className="dg-tip">
                <b>Make this guide work like a coach: </b>
                click any section header to fold or unfold it, search when you are stuck on a word, and mark sections as explored. Progress is remembered on this device only.
            </div>

            <div className="dg-tools print:hidden">
                <button type="button" onClick={() => setCollapsed([])}>＋ Expand all</button>
                <button type="button" onClick={() => setCollapsed(SECTIONS.map((section) => section.id))}>− Collapse all</button>
                <button type="button" onClick={() => { setUnreadOnly(true); setCollapsed([]); showToast("Showing sections not yet explored"); }}>◎ Show sections not explored</button>
                <button type="button" onClick={() => { setExplored([]); localStorage.removeItem(STORAGE_KEY); setUnreadOnly(false); showToast("Guide progress reset"); }}>↺ Reset progress</button>
            </div>

            {visible.length === 0 ? (
                <p className="mt-4 text-sm text-[#667b82]">No sections match that search.</p>
            ) : null}

            {visible.map((section) => {
                const isCollapsed = collapsed.includes(section.id);
                const done = explored.includes(section.id);
                return (
                    <section key={section.id} id={`dg-${section.id}`} className="dg-sec" data-num={section.num}>
                        <button type="button" className="dg-head" aria-expanded={!isCollapsed} onClick={() => setCollapsed((current) => current.includes(section.id) ? current.filter((item) => item !== section.id) : [...current, section.id])}>
                            <span className="dg-no">{section.num === "F" ? "⭐" : section.num}</span>
                            <span>
                                <h3>{section.title}</h3>
                                <p>{section.blurb}</p>
                            </span>
                            <span className="dg-tag">{section.tag}</span>
                            <span className="dg-chev" aria-hidden>{isCollapsed ? "›" : "⌄"}</span>
                        </button>
                        {isCollapsed ? null : (
                            <div className="dg-body">
                                <div className="dg-purpose">
                                    <b>Purpose</b>
                                    <p>{section.purpose}</p>
                                </div>
                                <div className="dg-cols">
                                    <div className="dg-box">
                                        <h4>{section.leftTitle}</h4>
                                        {section.leftOrdered ? (
                                            <ol>{section.left.map((item) => <li key={item}>{item}</li>)}</ol>
                                        ) : (
                                            <ul>{section.left.map((item) => <li key={item}>{item}</li>)}</ul>
                                        )}
                                    </div>
                                    {section.right ? (
                                        <div className={section.rightAi === false ? "dg-box" : "dg-box ai"}>
                                            <h4>{section.rightTitle}</h4>
                                            <ul>{section.right.map((item) => <li key={item}>{item}</li>)}</ul>
                                        </div>
                                    ) : null}
                                </div>
                                {section.rightNote ? <div className="dg-box ai wide"><h4>What faculty / AI will look for</h4><p>{section.rightNote}</p></div> : null}
                                <div className="dg-example">
                                    <b>{section.exampleTitle}</b>
                                    <p>{section.example}</p>
                                </div>
                                {section.weak && section.strong ? (
                                    <div className="dg-pair">
                                        <div className="dg-ws weak"><strong>WEAK</strong><p>{section.weak}</p></div>
                                        <div className="dg-arr" aria-hidden>→</div>
                                        <div className="dg-ws strong"><strong>STRONGER</strong><p>{section.strong}</p></div>
                                    </div>
                                ) : null}
                                {section.pattern ? (
                                    <div className="dg-pattern">
                                        <b>Useful sentence pattern</b>
                                        <p>{section.pattern}</p>
                                    </div>
                                ) : null}
                                <div className="dg-checks">
                                    {section.checks.map((item) => <span key={item}>{item}</span>)}
                                </div>
                                <div className="dg-done">
                                    <div>
                                        <b>Ready to move on?</b>
                                        <small>Mark this section after you understand what to enter and what evidence is expected.</small>
                                    </div>
                                    <button type="button" className={done ? "dg-mark on" : "dg-mark"} onClick={() => toggleExplored(section.id)}>
                                        {done ? "✓ Explored" : "Mark as explored"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>
                );
            })}

            <div className="dg-foot">
                <b>CIEL PK Student Standard: </b>
                Strong community-engagement reporting does not depend on expensive projects, dramatic claims or perfect outcomes. It depends on integrity, clear evidence, careful measurement, community respect and thoughtful learning. A small project documented exceptionally well can be stronger than a large project documented poorly.
            </div>

            <div className="dg-dock print:hidden">
                <button type="button" className="alt" onClick={() => step(-1)}>← Previous</button>
                <button type="button" onClick={() => step(1)}>Next section →</button>
            </div>
            {toast ? <div className="dg-toast print:hidden">{toast}</div> : null}
        </div>
    );
}
