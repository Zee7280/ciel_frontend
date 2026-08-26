/** How-to copy for the 8-step coursework wizard — aligned with STEPS in course-project/[id]/page.tsx. */

export type CourseworkGuideSection = {
    emoji: string;
    code: string;
    title: string;
    blurb: string;
    steps: string[];
    example: string;
    dont: string;
    tip: string;
};

export const COURSEWORK_GUIDE_SECTIONS: CourseworkGuideSection[] = [
    {
        emoji: "📌",
        code: "§1",
        title: "Course",
        blurb: "Your course, programme & teacher — mostly auto-filled.",
        steps: [
            "Pick your programme from the HEC list",
            "Name your course & semester",
            "Add teammates by email — an approval link goes to your teacher",
        ],
        example: "“Marketing Management · BBA · Semester 5 · with Zain Ahmed.”",
        dont: "Don’t invent a course name — it’s checked against records.",
        tip: "Your teacher’s email here is who approves your card later.",
    },
    {
        emoji: "🚀",
        code: "§2",
        title: "Format",
        blurb: "What kind of work is this? 26 formats, 5 pathways.",
        steps: [
            "Tap your format(s) — essay, campaign, artwork, app, lab report…",
            "If more than one, choose which leads",
            "The form re-languages itself to your pathway",
        ],
        example: "“Campaign / communication + video + slides — campaign leads.”",
        dont: "Don’t force your work into a format it isn’t — Other exists.",
        tip: "The rubric judges you on your own pathway’s scale.",
    },
    {
        emoji: "🎯",
        code: "§3",
        title: "Aims",
        blurb: "The issue, your aim, your objectives.",
        steps: [
            "Name the real-world issue in one line",
            "State your aim — what you tried to achieve",
            "List up to 3 concrete objectives",
        ],
        example: "“How can a university cafeteria cut single-use plastic without raising meal prices?”",
        dont: "Don’t write a vague aim like “raise awareness about sustainability.”",
        tip: "An idea you can say in one sentence scores best.",
    },
    {
        emoji: "🛠️",
        code: "§4",
        title: "Process",
        blurb: "What you actually did — activities & method.",
        steps: [
            "Tap your activities (research, designing, filming…)",
            "Describe your method briefly",
            "State your scale with the tap-builder — numbers + units",
        ],
        example: "“Surveyed 120 students; A/B-tested two poster designs; 3-week run.”",
        dont: "Don’t pad — a brief class exercise honestly framed beats an inflated one.",
        tip: "Scale is judged against your pathway, not someone else’s.",
    },
    {
        emoji: "📦",
        code: "§5",
        title: "Results",
        blurb: "Output → findings → results → limitation → recommendations.",
        steps: [
            "Name your main output (the thing you made)",
            "Add findings, then metrics: number + unit + status chip (Measured / Estimated / Target)",
            "Name ONE honest limitation + up to 3 recommendations",
        ],
        example: "“Quiz uplift +38% (measured) · reach 4,200 (measured) · limitation: 3-week window only.”",
        dont: "Don’t tag an estimate as “measured” — the analysis cross-checks.",
        tip: "The limitation LIFTS your honesty score. Never skip it.",
    },
    {
        emoji: "🌍",
        code: "§6",
        title: "SDG map",
        blurb: "Your goals, targets & why they’re real.",
        steps: [
            "Pick your primary SDG ★ + up to 2 supporting",
            "Choose the closest target for each",
            "Write one line on how your work reaches it",
        ],
        example: "“SDG 12 · targets 12.8 + 12.5 — the campaign teaches responsible consumption directly.”",
        dont: "Don’t name-drop goals — an unexplained SDG reads as decoration.",
        tip: "Honest “not applicable” scores respectably too.",
    },
    {
        emoji: "💡",
        code: "§7",
        title: "Reflection",
        blurb: "What you learned & what transfers.",
        steps: [
            "What did you genuinely learn?",
            "One piece of advice for the next class",
            "What skills did you grow?",
        ],
        example: "“Message framing beats production polish — baseline attitudes first, next time.”",
        dont: "Don’t write “I learned a lot” — specifics or nothing.",
        tip: "Advice the next cohort can use is what scores here.",
    },
    {
        emoji: "📩",
        code: "§8",
        title: "Submit",
        blurb: "Evidence (optional), declaration, your flash card.",
        steps: [
            "Attach evidence — as many files as you like",
            "Read your flash card — it’s in YOUR voice; edit until it sounds like you",
            "Tick the declaration & submit to your teacher",
        ],
        example: "“4 files attached — matched against the claims on your card.”",
        dont: "Don’t attach unrelated files — mismatches are flagged for your teacher.",
        tip: "Evidence is optional — but matched evidence is appreciated on your card.",
    },
];
