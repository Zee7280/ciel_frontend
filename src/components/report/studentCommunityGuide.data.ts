/** Static copy from student-guide-final.html — Community Engagement student guide. */

const L = (t: string) => `<div class="ml">${t}</div>`;
const V = (t: string) => `<div class="mv">${t}</div>`;
const A = (t: string) => `<div class="mv auto">⚙️ ${t}</div>`;
const CH = (on: string[], off: string[] = []) =>
    `<div class="chips">${on.map((c) => `<span class="chip">${c} ✓</span>`).join("")}${off
        .map((c) => `<span class="chip off">${c}</span>`)
        .join("")}</div>`;
const IMGS = (a: Array<[string, string, string?]>) =>
    `<div class="gal">${a
        .map(
            (x) =>
                `<div class="ph" style="background:linear-gradient(135deg,${x[1]})">${x[0]}<span class="b">${x[2] || "JPG"}</span></div>`,
        )
        .join("")}</div>`;
const G2 = (a: string, b: string) => `<div class="g2"><div>${a}</div><div>${b}</div></div>`;

export type StudentGuideSection = {
    e: string;
    t: string;
    w: string;
    grad: string;
    sub: string;
    how: string[];
    ex: string;
    ban: string;
    no: string;
    tip: string;
    ai: string;
};

export const STUDENT_GUIDE_SECTIONS: StudentGuideSection[] = [
    {
        e: "🧑‍🤝‍🧑",
        t: "1 · Participation",
        w: "10 PTS · FLOOR 7.0",
        grad: "#0e7d74,#2dd4bf",
        sub: "Who you are, who your crew is, every hour you worked — with the clock that unlocks the finish line.",
        how: [
            "Verify yourself: personal tab (name per CNIC, mobile) + academic tab (programme, department, semester) — one OTP to your university email.",
            "Add each teammate: their individual + academic config, OTP to THEIR email — that link puts this project on their dashboard too.",
            "Log every session: date, start–end (hours compute automatically), organization, pinned location, activity type, ≤40 words on what you accomplished, photos.",
            "Watch the ⏱️ clock — this opportunity was created with 16h/student. The Final Section stays 🔒 until yours strikes it.",
            "Sign the 3-line declaration. No attendance approvals exist — faculty approves once, at the very end.",
        ],
        ex:
            L("1.1 IDENTITY — PERSONAL ✓ OTP VERIFIED") +
            G2(V("Full name · <i>ZAIN AHMED</i> · CNIC 58888-9978888-8"), V("📩 zain@bnu.edu.pk — <i>✅ OTP verified</i>")) +
            L("1.1 IDENTITY — ACADEMIC") +
            G2(V("BArch — Architecture · <i>Architecture & Design</i>"), V("Semester 6 · 💛 Voluntary / extracurricular")) +
            L("1.2 TEAM — EACH MEMBER OTP-LINKED TO THEIR OWN DASHBOARD") +
            V("👤 <i>ALI RAZA</i> · CNIC ✓ · ali@bnu.edu.pk <i>✅ OTP confirmed</i> · BBA · SBA · Semester 6 · 📘 Part of a course") +
            L("1.3 SESSIONS LOGGED — ALL FIELDS, EVERY TIME") +
            V(
                "① 20/05 · 09:00–12:00 <i>(3h auto)</i> · SOS Children's Village · 📍 pinned · 🥾 Field visit — “Tested 6 water samples and briefed 40 residents on safe storage” <i>(14/40 words)</i>",
            ) +
            V("② 22/05 · 09:00–17:00 <i>(8h)</i> · 🎨 Activity session — “Repainted classroom walls with the children's art team”") +
            V("③ 24/05 · 10:00–15:30 <i>(5.5h)</i> · 🧑‍🏫 Tutoring session — “Ran two reading circles and set up the learning corner”") +
            IMGS([
                ["🧑‍🏫", "#facc15,#b45309"],
                ["🎨", "#f472b6,#9d174d"],
                ["🖼️", "#38bdf8,#0e7490"],
                ["📚", "#7fb069,#3f7e44"],
            ]) +
            L("1.4 THE HOURS CLOCK") +
            `<div class="meterrow"><span>ZAIN</span><span class="meter"><i style="width:100%"></i></span><span style="color:var(--teal)">16.5h / 16h 🏆 MET</span></div><div class="meterrow"><span style="opacity:.7">ALI</span><span class="meter"><i style="width:44%"></i></span><span style="color:var(--gold)">7h / 16h</span></div>` +
            L("1.5 DECLARATION") +
            CH(["Entries authentic", "Locks at submission", "Consent to sharing"]),
        ban: "Our team of 2 logged <b>23.5 verified-track hours</b> across <b>3 pinned sessions</b> at SOS Children's Village, with <b>4 photos</b> attached as evidence — every session carrying its date, time, location, type and description.",
        no: "“Worked 8 hours” with no date, pin or photo — hours without detail look like hours that didn't happen.",
        tip: "Log the same day. On-site photos with your team in them are the strongest evidence there is.",
        ai: "Identity + clock + pinned sessions are the foundation (weight 10, floor 7.0) — and they power the honest-participation lift that protects your whole CII from ever falling below 58.",
    },
    {
        e: "🔍",
        t: "2 · Context",
        w: "10 PTS · FLOOR 5.5",
        grad: "#0369a1,#38bdf8",
        sub: "The world BEFORE your project — specific, countable, sourced.",
        how: [
            "Q1 — the problem you saw (25–60 words, countable).",
            "Q2 — who was affected, and roughly how many.",
            "Q3 — what was missing: tap chips, add your own under ✏️ Other.",
            "Q4 — how you knew: observation, surveys, partner data…",
            "Q5 — your discipline and how it helped.",
            "Your baseline statement builds itself → tap 🧠 Generate for the strong paragraph.",
        ],
        ex:
            L("Q1 · THE PROBLEM · 31/60 WORDS") +
            V(
                "“Classroom 4 at the SOS Village had <i>broken lighting, peeling walls and no learning displays</i>, which made children reluctant to spend time there and teachers unable to run interactive lessons.”",
            ) +
            L("Q2 · WHO & HOW MANY") +
            G2(V("children aged 5–12 at the SOS Village"), V("≈ <i>120</i>")) +
            L("Q3 · WHAT WAS MISSING") +
            CH(["📦 Resources", "⚙️ Systems"], ["🧰 Skills", "🚪 Access", "💡 Awareness"]) +
            L("Q4 · HOW WE KNEW") +
            CH(["👀 Observation", "🤝 Partner-provided data"]) +
            L("Q5 · DISCIPLINE & HOW IT HELPED") +
            V("Architecture & Design — “we used our design training to <i>audit lighting, seating and acoustics against classroom standards</i>”") +
            L("🧠 GENERATED AI BASELINE") +
            A(
                "“Before our project began, Classroom 4 had broken lighting, peeling walls and no learning displays. This weighed most heavily on roughly 120 children aged 5–12… Our understanding was not guesswork: it was grounded in observation and partner-provided data.”",
            ),
        ban: 'A specific, countable baseline — <b>“Classroom 4: broken lighting, no displays, ≈120 children”</b> — grounded in 2 named sources, with the discipline doing real work in the audit.',
        no: "“The community had many problems and we wanted to help” — no specific problem, no number, no source.",
        tip: "Section 4 Part B measures change against this exact line — specific and countable now means provable later.",
        ai: "This section pays twice: it scores §2 (weight 10) AND makes your §4 measured change believable. Named sources are what lift the anchor.",
    },
    {
        e: "🎯",
        t: "3 · SDG Mapping",
        w: "10 PTS · FLOOR 5.5",
        grad: "#C5192D,#fda4af",
        sub: "One registered goal (locked by the creator) + up to two of yours — each with a written pathway.",
        how: [
            "Your primary SDG arrives locked — registered by whoever created the opportunity.",
            "Write its pathway to change: how activities lead to the target, who benefits, what shifts (40–120 words).",
            "Tap up to TWO more SDGs off the colored wall; pick the closest target for each.",
            "Write each extra's pathway — no pathway, no credit.",
        ],
        ex:
            L("3.1 REGISTERED · 🔒 LOCKED BY ADMIN") +
            V(
                '<span style="background:#C5192D;color:#fff;border-radius:6px;padding:2px 8px;font-weight:800;font-size:9px">★ SDG 4</span> Quality Education · Target 4.A — inclusive and safe schools · Indicator 4.A.1',
            ) +
            L("3.1.1 PATHWAY · 43 WORDS") +
            V(
                "“Our repainting, lighting repair and learning-corner installation directly upgrade Classroom 4 into an inclusive and safe learning space, so the <i>120 resident children</i> gain an environment that meets <i>Target 4.A</i> standards.”",
            ) +
            L("3.2 ZAIN'S TWO PICKS OFF THE WALL") +
            V(
                '<span style="background:#4C9F38;color:#fff;border-radius:6px;padding:2px 8px;font-weight:800;font-size:9px">SDG 3</span> Target 3.4 — “a calmer, brighter classroom reduces stress and supports the children\'s daily well-being”',
            ) +
            V(
                '<span style="background:#FD9D24;color:#fff;border-radius:6px;padding:2px 8px;font-weight:800;font-size:9px">SDG 11</span> Target 11.7 — “the refreshed courtyard corner gives the village an inclusive shared learning space”',
            ),
        ban: "<b>1 registered goal + 2 student-mapped SDGs</b>, each with its own written pathway to change — capped at two, because honest alignment beats a long list.",
        no: "Tapping five SDGs because they all “sort of relate” — the wall caps you at two extras on purpose.",
        tip: "An honest closest-fit target, explained, reads better than a forced perfect match.",
        ai: "The evaluator asks: would the project be identical without this SDG? Written pathways separate authenticity (anchor 4–5) from name-dropping (anchor ≤2).",
    },
    {
        e: "🛠️",
        t: "4 · Activities & Outputs",
        w: "25 PTS · FLOOR 13.5 — THE BIGGEST",
        grad: "#7c3aed,#c084fc",
        sub: "One section, two parts: Part A what you DID (counts) · Part B what CHANGED (before → after). Dual-lens scored 60/40.",
        how: [
            "PART A — one card per major effort: title, status, category → sub-category, who did what.",
            "Count the countable: outputs with quantity + unit; people reached + how you counted; who they were; where.",
            "Declare overlap honestly if two activities served the same people.",
            "PART B — finish: Before… / Now… / We know because… — the story drafts itself, edit freely (60–150 words).",
            "Add measurable outcomes: same metric BEFORE and NOW; improvement computes itself.",
            "Name the challenges and write your limitations (20–60 words) — honesty scores.",
        ],
        ex:
            L("PART A · ACTIVITY 1") +
            V("<i>Classroom repainting & lighting repair</i> · ✅ Completed · 🏗️ Infrastructure → Classroom / School Improvement") +
            V("Who did what — “Zain led the repaint, Ali handled materials, SOS staff prepared the room each morning.”") +
            L("THINGS WE COUNTED") +
            G2(V("<i>1</i> classroom renovated (Facilities Improved)"), V("<i>14</i> learning displays (Resources Distributed)")) +
            L("WHO THIS SERVED") +
            V(
                "<i>120 people</i> · Mostly Unique · Children, Students · counted by <i>Verified registration / list</i> · Single Site — Classroom 4, SOS Village",
            ) +
            L("PART B · THE STORY · 3 BLANKS → DRAFT") +
            V(
                "Before: “classes were held in a dark, bare room with no materials” → Now: “<i>120 children learn in a renovated, equipped classroom</i>” → We know because: “we compared attendance registers and photos from day one”",
            ) +
            L("MEASURABLE OUTCOME") +
            A("Attendance rate (%) · <i>55 → 82</i> · <b>+49%</b> · Directly Measured — “compared the SOS register 4 weeks before vs after”") +
            L("CHALLENGES & LIMITS · 28/60 WORDS") +
            CH(["💰 Limited budget", "📏 Hard to measure change"]) +
            V(
                "“Our measurement covers only four weeks, so we cannot yet claim the gain will hold across the school year; budget limits meant one classroom, not two.”",
            ),
        ban: "<b>1 activity · 15 outputs · 120 reached</b> → attendance <b>55 → 82 (+49%), directly measured</b> against the §2 baseline — limits named openly, because honest boundaries make measured change believable.",
        no: "Mixing the parts: “children learn better” is Part B change, not a Part A count — and “6 sessions” is a count, not a change.",
        tip: "One directly-measured outcome beats five estimates. Claims without numbers cap Part B at anchor 3.",
        ai: "The heaviest section — weight 25, dual-lens (60% execution + 40% measured change). Zain's directly-measured +49% is what carried his card to Level 6.",
    },
    {
        e: "📦",
        t: "5 · Resources",
        w: "15 PTS · FLOOR 8.0 — HIGH RECOGNITION",
        grad: "#b45309,#fbbf24",
        sub: "What the project ran on — every rupee and every item traced to what it made possible.",
        how: [
            "Choose honestly: 💪 “just our time & effort” (a proud answer!) or 📦 “we used resources”.",
            "One entry per resource: type → amount + unit → source → verification.",
            "One clear line: what did it make possible?",
            "Attach the receipt — it shows as an image, zoomable.",
        ],
        ex:
            L("6.1 MODE") +
            CH(["📦 We used resources"], ["💪 Time & effort only"]) +
            L("ENTRY 1 — COMPLETE") +
            V("💵 Finances · <i>PKR 8,000</i> · Source: <i>Private Sponsor / Donor</i> · Verification: <i>Partner Confirmed</i>") +
            V("What it made possible — “<i>bought paint and furniture for both classrooms</i>”") +
            L("RECEIPT — ATTACHED AS AN IMAGE") +
            IMGS([["🧾", "#94a3b8,#334155", "PDF"]]),
        ban: "The project mobilised <b>PKR 8,000</b> from a private sponsor — <b>partner-confirmed, receipt attached</b> — traced to its exact use: paint and furniture for both classrooms.",
        no: "“We used some money and materials” — no amount, no source, no receipt. Untraced resources score as unverified.",
        tip: "Cash, goods, skills, design work, transport, volunteer time, even social-media support all count — borderline cases score GENEROUSLY here.",
        ai: "Weight 15 + its own bonus up to +1.5. A zero-budget project declared proudly scores as efficiency, never as a gap.",
    },
    {
        e: "🤝",
        t: "6 · Partnerships",
        w: "10 PTS · FLOOR 5.5",
        grad: "#0f766e,#5eead4",
        sub: "Who stood with you — carried from Section 1, verified in one click.",
        how: [
            "Your Section-1 partner is already here — nothing re-typed.",
            "Tap every role they actually played.",
            "One line on what they contributed.",
            "Add any other partners with name + role.",
        ],
        ex:
            L("7.1 PARTNER · AUTO FROM §1") +
            V("🏛️ <i>SOS Children's Villages Pakistan</i> · coordinator@sos-pakistan.org.pk — linked since Section 1") +
            L("ROLES THEY PLAYED") +
            CH(["🏫 Host site", "🧾 Verification & records"], ["🤝 Co-delivery", "💵 Funding", "🧑‍🏫 Mentorship", "📣 Community access"]) +
            L("THEIR CONTRIBUTION · ONE LINE") +
            V("“gave us the classroom, staff time, and <i>verified our attendance</i>”") +
            L("7.2 OTHER PARTNERS") +
            V("— none · one genuine partner, properly evidenced, is enough"),
        ban: "<b>SOS Children's Villages</b> stood with us as host site and verifier — “gave us the classroom, staff time, and verified our attendance.” A partnership on record since Section 1, never re-typed.",
        no: "Listing organizations you only emailed once. A partner is someone who did something you can name.",
        tip: "ONE genuine partner is highly appreciated — the roles you tap tell the AI which claims your partner can vouch for.",
        ai: "Weight 10 + partnership bonus up to +1.0. Partner-verified claims are the strongest kind in your whole report.",
    },
    {
        e: "📸",
        t: "7 · Evidence",
        w: "10 PTS · FLOOR 5.5",
        grad: "#0891b2,#67e8f9",
        sub: "Every claim, backed by a picture — auto-collected, consent-confirmed, visibility yours.",
        how: [
            "Everything you uploaded anywhere lands here automatically — always as images, never file lists.",
            "“Anything else to add?” — classify new files, say what each shows.",
            "Tick the ethics confirmation: consent, privacy, dignity.",
            "Choose visibility — Public 🌟 earns extra points.",
        ],
        ex:
            L("8.1 AUTO-COLLECTED — 7 FILES, ALL IMAGES") +
            IMGS([
                ["🧑‍🏫", "#facc15,#b45309"],
                ["🎨", "#f472b6,#9d174d"],
                ["🖼️", "#38bdf8,#0e7490"],
                ["📚", "#7fb069,#3f7e44"],
                ["🧾", "#94a3b8,#334155", "PDF"],
                ["📋", "#facc15,#b45309"],
                ["🤝", "#7fb069,#3f7e44", "DOC"],
            ]) +
            L("8.2 ADDED HERE") +
            V("📋 Attendance sheet — “<i>confirms 40 participants across three sessions</i>”") +
            L("ETHICS") +
            CH(["✅ Genuine & gathered responsibly — consent, privacy, dignity"]) +
            L("VISIBILITY") +
            A("🌐 <i>PUBLIC 🌟 — earns extra verification points.</i> Good work always deserves to be shown to the world. (Faces can be blurred on request.)"),
        ban: "<b>7 evidence images on record</b> — every claim maps to a checkable file, consent confirmed, visibility <b>public 🌟</b>. Evidence supports; nothing contradicts.",
        no: "Photos of identifiable children without consent. And never hide a gap — the AI names honest gaps kindly, contradictions harshly.",
        tip: "Going Public feeds the evidence-strength bonus AND your credibility in every other section.",
        ai: "Weight 10 + evidence bonus up to +1.0. Every file is re-verified against your claims — matching evidence lifts you; contradicting evidence is the one thing floors don't protect.",
    },
    {
        e: "🪞",
        t: "8 · Reflection",
        w: "5 PTS · FLOOR 2.7",
        grad: "#9f1239,#fb7185",
        sub: "What the work did to YOU — skills, moments, and honest self-ratings.",
        how: [
            "Tap the skills you grew — 20 options + your own under ✏️ Other.",
            "Finish three sentences: biggest learning · a moment that changed you · an academic skill you applied.",
            "Your reflection paragraphs draft themselves — edit freely.",
            "Rate yourself 1–5 on 12 competencies: 1 just starting · 3 independent · 5 could teach it.",
        ],
        ex:
            L("SKILLS GROWN") +
            CH(["💬 Communication", "🤝 Teamwork", "📊 Working with data"], ["⭐ Leadership", "🎨 Design thinking", "💻 Digital tools"]) +
            L("THREE SENTENCES") +
            V(
                "Biggest learning — “that <i>listening to the community matters more than my plan</i>” · Moment — “seeing children choose books over the playground on day one” · Academic skill — “I used simple data tracking to measure attendance improvements”",
            ) +
            L("SELF-RATINGS · 12 COMPETENCIES") +
            A("Cognitive 4·4·3 · Practical 4·5·4 · Social & Civic 4·3·4 · Transformative 3·3·4 → <i>⭐ 3.8/5 — an honest spread, not a row of 5s</i>"),
        ban: "<b>3 skills grown · self-rated 3.8/5</b> — an honest spread the rubric can cross-check against 23.5 verified hours and the evidence on file.",
        no: "A row of twelve 5s — the AI cross-checks ratings against evidence. Inflated scores with thin proof read worse than honest middles.",
        tip: "The academic-application line is where your degree earns its place — name the actual technique you used.",
        ai: "Weight 5, but honesty here echoes across the whole CII — an honest spread strengthens the credibility of every other section.",
    },
    {
        e: "🌱",
        t: "9 · Final — Sustainability",
        w: "5 PTS + TRIGGERS THE CII",
        grad: "#04252b,#0e7d74",
        sub: "🔒 Unlocks when §1 is done and your clock is met. Answer honestly, read the AI review, submit — the CII runs itself.",
        how: [
            "Unlocks only when Section 1 is complete AND your hours clock strikes the target.",
            "Answer: 🌿 Yes / ♻️ Partial / ⏸️ No — a candid Partial outranks a hollow Yes.",
            "Explain what continues, what stops, what support is needed (min 100, aim 100–180 words).",
            "Tap the mechanisms that keep it alive — or honestly say none do. Then scaling + system influence.",
            "Read the 🧠 AI review of all nine sections and the delivery map — then SUBMIT. That click runs the CII automatically.",
        ],
        ex:
            L("10.1 WILL IT CONTINUE?") +
            CH(["♻️ Partial — some elements continue with support"], ["🌿 Yes", "⏸️ No"]) +
            L("WHAT CONTINUES, WHAT STOPS · 110 WORDS") +
            V(
                "“The renovated classroom and furniture stay in daily use — that continues on its own. <i>Weekly tutoring stops unless SOS staff take it over</i>; we handed over session plans and trained two staff members…”",
            ) +
            L("WHAT KEEPS IT ALIVE") +
            CH(["🛡️ Partner-led continuation", "🧰 Resource handover", "📆 Follow-up plan scheduled"]) +
            L("SCALING & INFLUENCE") +
            G2(V("🌍 Scalable to other communities"), V("🏫 Yes — institutional level")) +
            L("🧠 AI REVIEW OF ALL SECTIONS") +
            A("§1–§9 all ✅ · clock 16.5/16h · numbers agree across §2, §4, §6 · “<i>internally consistent — this report is ready to travel</i>”") +
            L("WHERE IT TRAVELS") +
            A("Card+PDF assemble → faculty approves ONCE → you: card+PDF+CII · university/partner/HEC: card+CII · CIEL PK: card live + PDF archived 🔐"),
        ban: "Continuation: <b>partial — honestly declared</b>, held by 3 named mechanisms, scalable to other communities. A candid partial with mechanisms outranks a hollow yes, every time.",
        no: "“Yes, the impact will continue forever” with no mechanism named.",
        tip: "If you picked No, your WHY is exactly the learning CIEL exists to capture. Nothing honest is ever penalized.",
        ai: "Weight 5 — and this section presses the button: submitting from here runs the evaluator automatically. Faculty receives your report already scored.",
    },
];

export const FLASH_CARD_INDEX = STUDENT_GUIDE_SECTIONS.length;

/** Map live report wizard (1–9 form + 10 flash) onto the 9-section + flash-card guide. */
export function wizardStepToGuideIndex(step: number): number {
    if (step <= 0) return 0;
    if (step <= 9) return step - 1;
    return FLASH_CARD_INDEX;
}
