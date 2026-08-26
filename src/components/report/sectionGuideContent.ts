/** Structured section guide copy (replaces low-res /public/section-guides PNGs). */

export type GuideScoreTip = { label: string };

export type GuideSectionBlock = {
    type: "section";
    code?: string;
    title: string;
    bullets: string[];
    avoid?: string[];
    note?: string;
    tip?: string;
};

export type GuideBlock =
    | { type: "intro"; text: string }
    | GuideSectionBlock
    | { type: "scoreTips"; title: string; tips: GuideScoreTip[] }
    | { type: "examples"; strong: string; weak: string; weakWhy?: string }
    | { type: "avoidList"; title?: string; items: string[] }
    | { type: "footer"; text: string }
    | { type: "steps"; title: string; steps: string[] }
    | { type: "callout"; variant: "info" | "success" | "warning"; title?: string; text: string };

export type SectionGuideContent = {
    title: string;
    subtitle: string;
    blocks: GuideBlock[];
};

export const SECTION_GUIDE_CONTENT: Partial<Record<number, SectionGuideContent>> = {
    1: {
        title: "Section 1 Guide — Attendance",
        subtitle: "Please read these guidelines carefully to update your attendance correctly.",
        blocks: [
            {
                type: "intro",
                text: "Please update your attendance carefully, whether you are working individually or as part of a team.",
            },
            {
                type: "section",
                code: "1",
                title: "How to Update Attendance",
                bullets: [
                    "Select your name from the list and start uploading your attendance record.",
                    "Attendance can be updated while you are doing the work, or after the work has been completed.",
                    "For each entry provide: date, start/end time, location, type of work, and a brief description of your contribution.",
                    "Ideal duration: minimum 2 hours per entry, maximum 9 hours per day.",
                    "Research, field work, planning, preparation, and coordination may be included if relevant and documented.",
                    "Be realistic — anything above 9 hours in one day may look unrealistic and hurt credibility.",
                    "Once details are added, click Add to update your attendance.",
                ],
            },
            {
                type: "section",
                code: "2",
                title: "Minimum Requirement",
                bullets: [
                    "Complete the minimum community engagement hours shared in the opportunity guidelines.",
                ],
                note: "As per HEC requirement, every undergraduate student must complete a minimum of 16 hours of community engagement work.",
            },
            {
                type: "section",
                code: "3",
                title: "Attendance Verification",
                bullets: [
                    "By default, attendance is verified by your Faculty Supervisor.",
                    "If a partner organization is involved, you can choose Faculty Supervisor or Partner Supervisor.",
                    "Once selected, all entries go to that stakeholder for approval.",
                    "After approval, you may move to Section 2.",
                ],
            },
            {
                type: "steps",
                title: "Approval Process",
                steps: [
                    "Supervisor or faculty logs in to their dashboard.",
                    "They open Attendance Review and approve your entries.",
                    "Approved attendance is locked.",
                    "Section 10 unlocks after attendance approval.",
                    "You may still complete Sections 2–9 before attendance is approved.",
                ],
            },
            {
                type: "footer",
                text: "Please ensure that your attendance record is accurate, realistic, and properly documented. Good luck!",
            },
        ],
    },
    2: {
        title: "Section 2 Guide — Project Context",
        subtitle: "How to fill this section effectively and score well",
        blocks: [
            {
                type: "intro",
                text: "This section explains the baseline situation before your intervention. Focus on the problem, the affected group, your academic understanding, and the evidence that informed your baseline analysis.",
            },
            {
                type: "section",
                code: "2.2",
                title: "Problem / System Need",
                bullets: [
                    "Describe the baseline condition before your project began.",
                    "Explain the specific issue, who was affected, and what gap existed.",
                    "Mention why a structured intervention was needed.",
                    "Write clearly and factually in 20–200 words.",
                ],
                avoid: ["Do not describe activities", "Do not describe results or outcomes"],
            },
            {
                type: "section",
                code: "2.3",
                title: "Academic Discipline Applied",
                bullets: [
                    "Select your primary academic discipline.",
                    "Explain how your academic knowledge helped you analyse the problem.",
                    "Mention relevant concepts, tools, methods, or frameworks.",
                    "Show how your discipline shaped your engagement approach.",
                ],
                note: "Be specific: explain how your subject knowledge was applied.",
            },
            {
                type: "section",
                code: "2.4",
                title: "Baseline Evidence Source",
                bullets: [
                    "Select the evidence that informed your understanding of the problem.",
                    "Use relevant sources such as observations, partner input, site visits, records, or community feedback.",
                    "Choose evidence that directly supports your baseline description.",
                    "Review the system-generated summary for accuracy before submitting.",
                ],
            },
            {
                type: "scoreTips",
                title: "How to Score Well",
                tips: [
                    { label: "Stay baseline-focused" },
                    { label: "Be specific and realistic" },
                    { label: "Connect with your discipline" },
                    { label: "Use relevant evidence" },
                    { label: "Follow the word limits" },
                ],
            },
            {
                type: "footer",
                text: "A strong Section 2 explains the situation before the intervention — not what you did later.",
            },
        ],
    },
    3: {
        title: "Section 3 Guide — SDG Contribution Mapping",
        subtitle: "How to fill this section effectively and score high",
        blocks: [
            {
                type: "intro",
                text: "This section explains how your project connects with the Sustainable Development Goals (SDGs). Show which SDG your project supports, who benefits, and what specific change your activities are expected to create.",
            },
            {
                type: "section",
                code: "3.1",
                title: "Opportunity’s Registered SDGs",
                bullets: [
                    "These SDGs are already selected by the admin (locked).",
                    "Review the registered Goal, Target, and Indicator carefully.",
                    "Your explanation must align with the locked SDG pathway.",
                ],
            },
            {
                type: "section",
                code: "3.1.1",
                title: "Contribution Logic Statement",
                bullets: [
                    "Explain the pathway to change: Activity → How it helps → Who benefits → What shift occurs.",
                    "Connect your explanation directly to the selected SDG Target.",
                    "Be specific, realistic, and clear.",
                ],
                tip: "Formula: Our project contributes to [SDG] by [activity]. This supports [target] because [reason]. The main beneficiaries are [who]. The expected shift is [specific improvement].",
            },
            {
                type: "examples",
                strong:
                    "Our project contributes to SDG 4 by improving the classroom learning environment for SOS students. Through classroom support, it helps create a safer, more inclusive space for learning — supporting Target 4.A.",
                weak: "Our project supports SDG 4 because we helped students and did education activities.",
                weakWhy: "Too vague — does not explain the pathway, target, or expected shift.",
            },
            {
                type: "section",
                code: "3.2",
                title: "Secondary SDG Mapping (Optional)",
                bullets: [
                    "You may add up to two additional SDGs only if the connection is genuine.",
                    "Do not select extra SDGs just to make the project look stronger.",
                    "Only choose a secondary SDG if you can clearly explain its relevance.",
                ],
            },
            {
                type: "scoreTips",
                title: "How to Score High",
                tips: [
                    { label: "Stay target-focused" },
                    { label: "Name the beneficiaries" },
                    { label: "Explain the specific shift" },
                    { label: "Align with Section 4 activities" },
                    { label: "Keep it realistic and evidence-ready" },
                ],
            },
            {
                type: "avoidList",
                items: [
                    "Do not use generic SDG language only.",
                    "Do not list activities without impact logic.",
                    "Do not choose unrelated secondary SDGs.",
                    "Do not overclaim large impact from a small project.",
                ],
            },
            {
                type: "footer",
                text: "A strong Section 3 does not only name an SDG — it explains how your project leads to a meaningful and realistic change.",
            },
        ],
    },
    4: {
        title: "Section 4 Guide — Activities, Outputs & Scale",
        subtitle: "How to fill this section effectively and score high",
        blocks: [
            {
                type: "intro",
                text: "This section explains what you actually did, what your project produced, and who directly benefited. Add one activity block for each major effort.",
            },
            {
                type: "section",
                code: "4.1",
                title: "Activity Blocks",
                bullets: [
                    "Add one major activity at a time with title, status, category, and a 20–200 word description.",
                    "Answer: what was done, who was involved, how it was done, and why it mattered.",
                ],
                tip: "Strong activity writing is specific, measurable, and realistic.",
            },
            {
                type: "section",
                code: "4.2",
                title: "Delivery Execution",
                bullets: [
                    "Select mode: Field-Based, Online, or Hybrid.",
                    "Select implementation model honestly (Individual, Team-Based, Partner-Led, etc.).",
                    "Enter sessions/events/drives and briefly explain implementation roles.",
                ],
            },
            {
                type: "section",
                code: "4.3",
                title: "Measurable Outputs",
                bullets: [
                    "Record the direct product of the activity: title, type, quantity, unit, verification note.",
                    "Match output type with the activity category.",
                    "Examples: 3 sessions conducted · 60 kits distributed · 45 students reached.",
                ],
            },
            {
                type: "section",
                code: "4.4–4.6",
                title: "Beneficiary Reach & Scale",
                bullets: [
                    "Enter people reached, categories, location, and overlap honestly.",
                    "Choose geographic reach realistically.",
                    "In project-level summary, count distinct beneficiaries carefully.",
                ],
                note: "Do not inflate numbers. Repeated beneficiaries should not be counted again unless justified.",
            },
            {
                type: "scoreTips",
                title: "How to Score High",
                tips: [
                    { label: "Be specific" },
                    { label: "Use measurable outputs" },
                    { label: "Match category, mode, and output type" },
                    { label: "Keep beneficiary counts realistic" },
                    { label: "Add evidence-ready notes" },
                ],
            },
            {
                type: "avoidList",
                items: [
                    "Do not exaggerate scale or geography.",
                    "Do not mismatch activity category and output type.",
                    "Do not leave verification notes blank.",
                    "Do not count the same beneficiaries repeatedly.",
                    "Do not write vague one-line descriptions.",
                ],
            },
            {
                type: "footer",
                text: "A strong Section 4 shows what was done, what was produced, and who was reached — clearly, realistically, and with evidence-ready detail.",
            },
        ],
    },
    5: {
        title: "Section 5 Guide — Outcomes & Results",
        subtitle: "What changed because of your project?",
        blocks: [
            {
                type: "intro",
                text: "Explain the real change created by your project. Describe what happened before and after your intervention, measure it with data, and reflect on limitations.",
            },
            {
                type: "callout",
                variant: "info",
                title: "Output vs Outcome",
                text: "OUTPUT = what you did or produced (e.g. 50 students attended). OUTCOME = the change that happened (e.g. 35 students improved understanding).",
            },
            {
                type: "section",
                code: "5.1",
                title: "Observed Change (Narrative)",
                bullets: [
                    "Write 20–200 words covering before (baseline), after (change), who changed, link to Section 4, and field observations.",
                ],
            },
            {
                type: "examples",
                strong:
                    "Before hygiene sessions, many students had limited handwashing knowledge. After three interactive sessions, they could identify key practices. This linked to Section 4 awareness activities using posters and demonstrations.",
                weak: "Our project was very successful and students learned a lot.",
                weakWhy: "No before/after comparison, no specific change, no Section 4 link.",
            },
            {
                type: "section",
                code: "5.2",
                title: "Measurable Outcomes",
                bullets: [
                    "For each outcome select: Category · Metric Group · Baseline · Endline · Confidence Level.",
                    "Confidence: Directly Measured · Partner Confirmed · Observed · Estimated.",
                ],
                tip: "Do not select ‘Directly Measured’ unless you actually measured the change.",
            },
            {
                type: "section",
                code: "5.3",
                title: "Challenges & Limitations",
                bullets: [
                    "Be honest: limited time, small reach, limited data, short-term measurement, attendance variation, resources, partner schedules.",
                    "Every project has some limitation — “no challenges” sounds unrealistic.",
                ],
            },
            {
                type: "scoreTips",
                title: "How to Score High",
                tips: [
                    { label: "Change-focused writing" },
                    { label: "Connect to Section 4" },
                    { label: "Baseline → endline" },
                    { label: "Realistic claims" },
                    { label: "Honest confidence & limits" },
                ],
            },
            {
                type: "footer",
                text: "Focus on before–after change, realistic measurement, honest confidence, and a clear link to Section 4.",
            },
        ],
    },
    6: {
        title: "Section 6 Guide — Resources & Implementation Support",
        subtitle: "What resources helped your project happen?",
        blocks: [
            {
                type: "intro",
                text: "Explain resources used: money, materials, equipment, venue, volunteer time, transport, digital tools, media, expert help, or other contributions. Small resources count too.",
            },
            {
                type: "section",
                code: "Step 1",
                title: "Resource Confirmation",
                bullets: [
                    "A: Time & volunteer effort only — no financial/material/external resources.",
                    "B: Yes — financial, material, or other resources were used → continue to Step 2.",
                ],
            },
            {
                type: "section",
                code: "Step 2",
                title: "Resource Contribution Details",
                bullets: [
                    "Add one entry per major resource: Type · Amount · Unit · Source · Verification · Purpose (one clear line).",
                    "Explain what it was, who provided it, how it was used, which activity it supported, and what benefit it enabled.",
                ],
            },
            {
                type: "section",
                code: "Step 3",
                title: "Optional Evidence Upload",
                bullets: [
                    "Up to 5 files per resource (max 10MB each).",
                    "Receipts, sponsorship letters, emails, photos, venue confirmation, partner letters, etc.",
                ],
            },
            {
                type: "scoreTips",
                title: "Tips to Score High (Bonus +3)",
                tips: [
                    { label: "List every meaningful resource" },
                    { label: "Use real numbers & units" },
                    { label: "Link to activities & outcomes" },
                    { label: "Upload proof when possible" },
                    { label: "Verified sources score higher" },
                ],
            },
            {
                type: "avoidList",
                items: [
                    "Leaving amount or unit blank",
                    "Vague statements with no source",
                    "No link to activities or purpose",
                    "Exaggerating support",
                    "Listing the same resource multiple times",
                ],
            },
            {
                type: "footer",
                text: "A strong Section 6 is specific, quantified, source-based, linked to activities, and supported with evidence wherever possible.",
            },
        ],
    },
    7: {
        title: "Section 7 Guide — Partnerships & Collaboration",
        subtitle: "Recognize the people and organizations who supported your project.",
        blocks: [
            {
                type: "intro",
                text: "List only partners who provided real support, coordination, resources, expertise, hosting, or verification — not organizations that were only informed or tagged.",
            },
            {
                type: "callout",
                variant: "success",
                title: "Recognition floor",
                text: "Meaningful attempt earns at least 5.5 marks. One genuine partner is a meaningful achievement.",
            },
            {
                type: "section",
                code: "7.1",
                title: "Enter Partner Details",
                bullets: [
                    "Identification: official name, contact name, number, email.",
                    "Classification: partner type and contribution type(s).",
                    "Role & verification: role in project and verification level.",
                ],
            },
            {
                type: "examples",
                strong:
                    "XYZ Welfare Trust hosted the project, provided venue access, identified beneficiaries, shared attendance records, verified outcomes, and donated hygiene kits.",
                weak: "We informed many organizations about our project.",
                weakWhy: "No active involvement, role, or verification.",
            },
            {
                type: "scoreTips",
                title: "Tips to Score High",
                tips: [
                    { label: "Active partners only" },
                    { label: "Official names & contacts" },
                    { label: "Clear contribution" },
                    { label: "Upload proof" },
                    { label: "Link to Sections 4 & 5" },
                ],
            },
            {
                type: "avoidList",
                items: [
                    "Listing orgs that were only informed/tagged",
                    "No clear role or verification",
                    "Vague or incomplete info",
                    "Exaggerating partner involvement",
                ],
            },
            {
                type: "footer",
                text: "Be honest, specific, and transparent. Strong partnerships strengthen impact, credibility, and your report score.",
            },
        ],
    },
    8: {
        title: "Section 8 Guide — Evidence & Verification",
        subtitle: "Proof of activity & credibility layer",
        blocks: [
            {
                type: "intro",
                text: "This section proves and confirms the work you reported. Evidence must be real and relevant — more types of evidence means higher credibility.",
            },
            {
                type: "callout",
                variant: "success",
                title: "Recognition floor",
                text: "Meaningful attempt earns at least 5.5 marks.",
            },
            {
                type: "steps",
                title: "How to complete this section",
                steps: [
                    "Step 1 — Upload evidence (or mark that you do not have evidence).",
                    "Step 2 — Classify evidence types (photos, attendance, letters, surveys, etc.).",
                    "Step 3 — Describe evidence in 20–200 words (what it shows, date, location, numbers).",
                    "Step 4 — Confirm ethics & consent checkboxes.",
                    "Step 5 — Choose media visibility (Public / Limited / Internal).",
                    "Step 6 — Optional partner verification.",
                ],
            },
            {
                type: "examples",
                strong:
                    "Photos and attendance sheet from the 15 Sept hygiene session confirm 60 participants across three sessions; slides verify structured content delivered.",
                weak: "There are some photos from our activity.",
                weakWhy: "Too vague — no details, connection, or verification.",
            },
            {
                type: "scoreTips",
                title: "Tips to Score High",
                tips: [
                    { label: "Multiple evidence types" },
                    { label: "Match activities" },
                    { label: "Detailed description" },
                    { label: "Dated, clear files" },
                    { label: "Consent & partner verify" },
                ],
            },
            {
                type: "avoidList",
                items: [
                    "Vague description with no date",
                    "Poor quality or irrelevant files",
                    "Only photos with no context",
                    "Missing consent or verification",
                ],
            },
            {
                type: "footer",
                text: "Strong, verified evidence builds trust and boosts your entire report score.",
            },
        ],
    },
    9: {
        title: "Section 9 Guide — Reflection",
        subtitle: "Student growth & academic integration",
        blocks: [
            {
                type: "intro",
                text: "Capture what you learned, how academic knowledge was applied, and how this experience shaped your personal and professional development.",
            },
            {
                type: "callout",
                variant: "success",
                title: "Recognition floor",
                text: "Meaningful attempt earns at least 2.7 marks (section max 5).",
            },
            {
                type: "section",
                code: "Step 1",
                title: "Academic Integration (1 mark)",
                bullets: [
                    "How does this project connect to your academic program?",
                    "Explain how studies, skills, or course content helped.",
                ],
            },
            {
                type: "section",
                code: "Step 2",
                title: "Personal Learning Reflection (2 marks)",
                bullets: [
                    "New knowledge/skills, challenges and how you handled them, values, teamwork/leadership, mindset changes.",
                ],
            },
            {
                type: "section",
                code: "Step 3",
                title: "Long-term Impact (1 mark)",
                bullets: [
                    "How will this experience shape future goals, career, or community involvement?",
                ],
            },
            {
                type: "section",
                code: "Step 4",
                title: "Overall Growth & Key Takeaway (1 mark)",
                bullets: [
                    "Biggest takeaway, how you changed, and a one-sentence growth summary.",
                ],
            },
            {
                type: "scoreTips",
                title: "How to Score High",
                tips: [
                    { label: "Write in your own words" },
                    { label: "Use specific examples" },
                    { label: "Connect to academics" },
                    { label: "Show challenges & growth" },
                    { label: "Proofread clearly" },
                ],
            },
            {
                type: "avoidList",
                items: [
                    "Very short one-line answers",
                    "Generic or AI-copied text",
                    "No academic/future connection",
                    "Ignoring challenges",
                ],
            },
            {
                type: "footer",
                text: "A strong reflection shows maturity, self-awareness, and purpose.",
            },
        ],
    },
    10: {
        title: "Section 10 Guide — Sustainability",
        subtitle: "Long-term impact & system continuity",
        blocks: [
            {
                type: "intro",
                text: "Show whether impact continues beyond your involvement. Not all projects are sustainable — honest reporting strengthens credibility.",
            },
            {
                type: "callout",
                variant: "success",
                title: "Recognition floor",
                text: "Meaningful attempt earns at least 2.7 marks (section max 5).",
            },
            {
                type: "section",
                code: "Step 1",
                title: "Continuation Status (1 mark)",
                bullets: [
                    "Yes — impact continues independently.",
                    "Partial — some elements continue with support.",
                    "No — impact stops when your involvement ends.",
                ],
            },
            {
                type: "section",
                code: "Step 2",
                title: "Explanation of Continuation (2 marks)",
                bullets: [
                    "20–200 words: what continues, who continues it, support needed, what may stop, and how this ensures long-term impact.",
                ],
            },
            {
                type: "section",
                code: "Step 3",
                title: "Sustainability Mechanisms (1 mark)",
                bullets: [
                    "Select real mechanisms: partner-led continuation, community ownership, institutional integration, resource handover, policy change, funding, follow-up plan — or none.",
                ],
            },
            {
                type: "section",
                code: "Step 4",
                title: "Scaling & System Influence (1 mark)",
                bullets: [
                    "Scaling potential and any policy/institutional influence — even small influence counts.",
                ],
            },
            {
                type: "scoreTips",
                title: "How to Score High",
                tips: [
                    { label: "Clear continuity plan" },
                    { label: "Who continues & how" },
                    { label: "Support & structures" },
                    { label: "Scaling potential" },
                    { label: "Honest & practical" },
                ],
            },
            {
                type: "avoidList",
                items: [
                    "Vague “we will see” answers",
                    "No responsible person or plan",
                    "No mechanisms explained",
                    "Ignoring scaling or long-term planning",
                ],
            },
            {
                type: "footer",
                text: "Sustainability is about impact that lasts. Demonstrate continuity, systems, and long-term vision.",
            },
        ],
    },
};
