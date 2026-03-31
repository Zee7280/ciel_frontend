import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function POST(req: Request) {
    try {

        const { section, data } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: "Gemini API Key is not configured" },
                { status: 500 }
            );
        }

        let prompt = "";

        switch (section) {

            // =====================================================
            // SECTION 2 AUTO SUMMARY
            // =====================================================
            case "section2":
                prompt = `You are a professional institutional impact analyst. Generate a structured baseline summary based on the following student project information.

                Inputs:
                - Project Title: ${data.projectTitle}
                - Partner Organization: ${data.partnerOrg}
                - Location: ${data.location}
                - Project Duration: ${data.duration}
                - Problem / System Need: ${data.problem_statement}
                - Academic Discipline: ${data.discipline}
                - Discipline Contribution: ${data.discipline_contribution}
                - Baseline Evidence Sources: ${data.baseline_evidence} ${data.baseline_evidence_other ? `(${data.baseline_evidence_other})` : ''}

                Generate a summary with exactly these 5 numbered sections:
                1. Identified Problem: Clearly describe the issue or system gap that existed before the intervention.
                2. Affected Beneficiary Group: Identify who was affected and where.
                3. Baseline Evidence: Explain what data or sources informed the understanding of the problem.
                4. Academic Perspective: Explain how the student's academic discipline helped analyze the situation.
                5. Intervention Justification: Explain why a structured intervention was necessary.

                Constraints:
                - Limit the entire summary to 120–150 words.
                - Use professional institutional language.
                - Do not describe activities, results, or outcomes.
                - Focus strictly on the baseline context.
                - Do NOT use markdown formatting (no bolding, no asterisks). Output plain text only.`;
                break;

            // =====================================================
            // SECTION 3 AUTO SUMMARY
            // =====================================================
            case "section3":
                prompt = `You are a student writing a formal community service report. Summarize the SDG contribution intent. 
                Focus on your INTENT and PLAN to address the goal. 
                Strictly write in the first person ('I' or 'We'). Write exactly 2 concise sentences. 
                Do NOT use any markdown formatting, asterisks, or bullet points. Output plain text only.
                
                Primary SDG: ${data.primary_sdg?.goal_title}
                Intent Statement: ${data.contribution_intent_statement}`;
                break;

            // =====================================================
            // SECTION 4 AUTO SUMMARY
            // =====================================================
            case "section4":
                prompt = `You are a professional institutional analyst. Generate a structured report summary for Section 4 (Activities & Outputs) based on the project data.
                
                Strictly follow these three steps:
                1. Implementation Profile: Describe what activities were conducted, the delivery mode, total sessions, and overall duration. Identify the dominant activity cluster if multiple types exist.
                2. Output Profile: Summarize the outputs delivered, their diversity, and scale. Analyze "Other" output types and classify them into closest meaningful categories if possible, or mention them generically.
                3. Beneficiary Profile: Describe progress in reaching beneficiary groups, total number reached, and whether vulnerable/priority groups were included.

                Constraints:
                - Do NOT interpret outcomes, improvements, or impact (e.g., avoid "improved health" or "empowered community").
                - Focus strictly on what was conducted and delivered.
                - Write exactly 3-4 professional, concise sentences.
                - Use a neutral, institutional tone.
                - Do NOT use markdown (bolding, lists, etc). Output plain text only.
                
                Data:
                - Activities: ${JSON.stringify(data.activities)}
                - Total Sessions: ${data.total_sessions}
                - Project Duration: ${data.engagementProfile?.engagement_span || 'Not specified'} days
                - Outputs: ${JSON.stringify(data.outputs)}
                - Total Beneficiaries: ${data.total_beneficiaries}
                - Beneficiary Categories: ${JSON.stringify(data.beneficiary_categories)}
                - Team Contributions: ${JSON.stringify(data.team_contributions)}`;
                break;

            // =====================================================
            // SECTION 5 AUTO SUMMARY
            // =====================================================
            case "section5_summary":
                prompt = `
Generate a concise outcome summary for Section 5 — Outcomes & Results.

Inputs:
Primary SDG: ${data.primary_sdg}
SDG Target: ${data.sdg_target}
Total Beneficiaries Reached: ${data.total_beneficiaries}
Output Types Recorded: ${JSON.stringify(data.outputs)}
Observed Change Narrative: ${data.observed_change}
Measurable Outcomes: ${JSON.stringify(data.measurable_outcomes)}
Challenges & Limitations Narrative: ${data.challenges}

Instructions:
1. Summarize the main change observed among beneficiaries.
2. Briefly reference the measurable outcome (baseline vs endline).
3. Indicate the type of outcome achieved (skills, behaviour, access etc).
4. Acknowledge any key limitation if mentioned.

Rules:
Maximum 50 words.
Use neutral professional language.
Do not exaggerate impact.
Do not claim SDG achievement.

Output:
Write one concise paragraph (35–50 words).
`;
                break;

            // =====================================================
            // SECTION 5 EVALUATION
            // =====================================================
            case "section5_evaluation":
                prompt = `Evaluate Section 5 — Outcomes & Results of a community engagement report and calculate the Composite Impact Index (CII) score.

INPUTS
Project Snapshot:
- Primary SDG: ${data.primary_sdg}
- SDG Target: ${data.sdg_target}
- Participation Mode: ${data.participation_mode}
- Total Beneficiaries Reached: ${data.total_beneficiaries}
- Output Types Recorded: ${JSON.stringify(data.outputs)}
- Total Verified Student Hours: ${data.total_verified_hours}

Observed Change Narrative:
${data.observed_change}

Measurable Outcomes:
${JSON.stringify(data.measurable_outcomes)}

Challenges & Limitations Narrative:
${data.challenges}

------------------------------------------------

STEP 1 — OUTCOME NARRATIVE QUALITY (0–5)
0 = no meaningful outcome narrative
1 = vague or generic statement
2 = basic explanation with weak activity linkage
3 = clear explanation linked to project activities
4 = strong explanation showing logical change pathway
5 = highly coherent, realistic, and specific outcome description

STEP 2 — MEASUREMENT INTEGRITY (0–8)
0 = no measurable outcome
2 = numbers present but unclear or inconsistent
4 = basic baseline vs endline comparison
6 = clearly defined measurable indicator
8 = strong measurement with full logical consistency

STEP 3 — MAGNITUDE OF CHANGE (0–5)
Formula: Improvement Ratio = (Endline − Baseline) / Baseline
0 = no change or unclear improvement
1 = small improvement (<20%)
3 = moderate improvement (20–40%)
4 = strong improvement (40–70%)
5 = significant improvement (>70%)

STEP 4 — EVIDENCE CONFIDENCE (0–3)
Estimated → 1, Observed → 2, Partner Confirmed → 2.5, Directly Measured → 3

STEP 5 — REFLECTION & LIMITATIONS (0–4)
0 = no reflection, 1 = generic, 2 = basic, 3 = clear, 4 = strong analytical reflection

------------------------------------------------

OUTPUT FORMAT
Return:
Outcome Narrative Evaluation
Measurement Integrity Assessment
Magnitude of Change Assessment
Evidence Confidence Assessment
Reflection Assessment

Section 5 CII Score = ___ / 25
Quality Level: Poor / Basic / Good / Strong / Exceptional
Final short explanation (80–120 words) explaining why the score was assigned.
`;
                break;

            // =====================================================
            // SECTION 6 AUTO SUMMARY
            // =====================================================
            case "section6_summary":
                prompt = `
Generate the auto-generated summary for Section 6 — Resources & Implementation Support.

Inputs:
Primary SDG: ${data.primary_sdg}
SDG Target: ${data.sdg_target}
Total Beneficiaries Reached: ${data.total_beneficiaries}
Total Verified Student Hours: ${data.total_verified_hours}
Resource Confirmation Model: ${data.resource_model}
Resource Entries: ${JSON.stringify(data.resources)}
Evidence Upload Presence: ${data.evidence}

Instructions:
1. Identify whether the project relied only on volunteer effort or included additional resources.
2. Briefly summarize the main resource categories used.
3. Mention key supporting sources.
4. Indicate verification level.

Rules:
Maximum 50 words.
Neutral institutional language.

Output:
Write one concise paragraph (35–50 words).
`;
                break;

            // =====================================================
            // SECTION 6 EVALUATION
            // =====================================================
            case "section6_evaluation":
                prompt = `
Evaluate Section 6 — Resources & Implementation Support of a community engagement report and calculate the Composite Impact Index (CII) score.

INPUTS
Project Snapshot:
Primary SDG: ${data.primary_sdg}
Total Beneficiaries: ${data.total_beneficiaries}
Verified Hours: ${data.total_verified_hours}
Resources Recorded: ${JSON.stringify(data.resources)}
Evidence: ${data.evidence}

------------------------------------------------
STEP 1 — RESOURCE DIVERSITY (0–2)
Volunteer effort only → 0, 1 category → 1, 2+ categories → 2  

STEP 2 — EXTERNAL SUPPORT STRENGTH (0–2)
Student only → 0, One external source → 1, Two+ external sources → 2  

STEP 3 — VERIFICATION CREDIBILITY (0–1)
Self reported → 0, Evidence or official confirmation → 1  

STEP 4 — FINAL SCORE
Section 6 CII = Diversity + Support + Verification (Max 5)

------------------------------------------------
OUTPUT FORMAT
Resource Profile
Verification Profile
Section 6 CII Score = _ / 5
Quality Level: Minimal / Moderate / Strong / Exceptional
Provide explanation (50–80 words).
`;
                break;

            // =====================================================
            // SECTION 7 SUMMARY
            // =====================================================
            case "section7_summary":
                prompt = `
Generate the auto-generated summary for Section 7 — Partnerships & Collaboration.

Inputs:
Partnership Confirmation: ${data.confirmation}
Partner Entries: ${JSON.stringify(data.partners)}
Partnership Documentation: ${data.documentation}

Instructions:
1. Identify whether the project involved partners or implemented independently.
2. State number and types of partners.
3. Briefly describe main roles or contributions.
4. Mention verification level and formal documentation.

Rules:
Maximum 50 words. Neutral factual institutional language.

Output:
Write one concise paragraph (35–50 words).
`;
                break;

            // =====================================================
            // SECTION 7 EVALUATION
            // =====================================================
            case "section7_evaluation":
                prompt = `
Evaluate Section 7 — Partnerships & Collaboration and calculate the Composite Impact Index (CII) score.

INPUTS
Partners: ${JSON.stringify(data.partners)}
Documentation: ${data.documentation}

------------------------------------------------
STEP 1 — PARTNERSHIP PRESENCE (0–1)
Independent → 0, Partners involved → 1  

STEP 2 — PARTNER DIVERSITY (0–3)
1 → 1, 2 → 2, 3 → 2.5, 4+ → 3  

STEP 3 — SECTOR DIVERSITY (0–2)
One → 1, Two → 1.5, Three+ → 2  

STEP 4 — ROLE DEPTH (0–2)
Limited operational → 1, Active collaboration → 1.5, Strategic multi-role → 2  

STEP 5 — VERIFICATION (0–1)
Self reported → 0, Verified → 1  

STEP 6 — FORMALIZATION (0–1)
None → 0, Letter/email → 0.5, MOU/Gov approval → 1  

STEP 7 — FINAL SCORE
Section 7 CII = Presence + Diversity + Sector + Role + Verification + Formalization (Max 10)

------------------------------------------------
OUTPUT FORMAT
Partnership Overview
Collaboration Profile
Verification & Documentation
Section 7 CII Score = _ / 10
Quality Level: None / Basic / Moderate / Strong / Strategic
Provide explanation (60–80 words).
`;
                break;

            // =====================================================
            // SECTION 8 SUMMARY
            // =====================================================
            case "section8_summary":
                prompt = `
Generate the auto-generated summary for Section 8 — Evidence, Verification & Ethical Compliance.

Inputs:
Evidence Files Uploaded: ${data.evidence_count}
Evidence Types: ${JSON.stringify(data.evidence_types)}
Evidence Description: ${data.description}
Ethical Compliance: ${data.ethics}
Partner Verification: ${data.partner_verification}

Instructions:
1. State quantity and types of evidence.
2. Mention ethical confirmations and partner verification.
3. Describe documentation level.

Rules:
Maximum 50 words. Neutral institutional tone.

Output:
Write one concise paragraph (35–50 words).
`;
                break;

            // =====================================================
            // SECTION 8 EVALUATION
            // =====================================================
            case "section8_evaluation":
                prompt = `
Evaluate Section 8 — Evidence, Verification & Ethical Compliance.

Evidence Files: ${data.evidence_count}
Evidence Types: ${JSON.stringify(data.evidence_types)}
Description: ${data.description}

------------------------------------------------
STEP 1 — EVIDENCE PRESENCE (0–2)
0 files → 0, 1 file → 1, 2+ files → 2  

STEP 2 — EVIDENCE QUANTITY (0–2)
1 file → 1, 2–3 files → 1.5, 4+ files → 2  

STEP 3 — EVIDENCE DIVERSITY (0–2)
1 category → 1, 2 categories → 1.5, 3+ categories → 2  

STEP 4 — DESCRIPTION QUALITY (0–2)
Vague → 0.5, Basic → 1, Clear → 1.5, Precise → 2  

STEP 5 — EXTERNAL VERIFICATION (0–2)
None → 0, Declared → 1, File uploaded → 2  

FINAL SCORE
Section 8 CII = Presence + Quantity + Diversity + Description + Verification (Max 10)

OUTPUT FORMAT
Evidence Overview
Verification Profile
Section 8 CII Score = _ / 10
Quality Level: Minimal / Basic / Structured / Strong / Externally Verified
Provide explanation (50–80 words).
`;
                break;

            // =====================================================
            // SECTION 9 SUMMARY
            // =====================================================
            case "section9_summary":
                prompt = `
Generate the auto-generated summary for Section 9 — Reflection, Learning & Academic Integration.

Inputs:
Academic Integration Level: ${data.integration_level}
Personal Reflection: ${data.reflection}
Academic Application: ${data.academic_application}
Competency Ratings: ${JSON.stringify(data.competencies)}

Instructions:
1. Summarize key learning outcomes and academic knowledge application.
2. Indicate competency development and sustainability thinking.

Rules:
Maximum 50 words. Neutral institutional tone.

Output:
Write one concise paragraph (35–50 words).
`;
                break;

            // =====================================================
            // SECTION 9 EVALUATION
            // =====================================================
            case "section9_evaluation":
                prompt = `Evaluate Section 9 — Reflection, Learning & Academic Integration and calculate the Composite Impact Index (CII) score.

INPUTS
Step 1 — Academic Integration Level: ${data.integration_level}
Step 2 — Personal Learning Reflection: ${data.reflection}
Step 3 — Academic Application: ${data.academic_application}
Step 4 — Sustainability Reflection: ${data.sustainability_reflection}
Step 5 — Competency Ratings: ${JSON.stringify(data.competencies)}

------------------------------------------------
STEP 1 — ACADEMIC INTEGRATION SCORE (0–1)
Voluntary → 0.25, Course-linked → 0.5, Credit-bearing → 0.75, Capstone/Thesis → 1, Research-integrated → 1

STEP 2 — REFLECTION DEPTH (0–1.5)
Basic activities → 0.5, Basic reflection → 1, Clear insights → 1.25, Deep reflection → 1.5

STEP 3 — ACADEMIC APPLICATION (0–1)
Generic → 0, Basic → 0.5, Clear application of methods/frameworks → 1

STEP 4 — SUSTAINABILITY & SYSTEMS THINKING (0–0.5)
No → 0, Basic → 0.25, Clear analysis → 0.5

STEP 5 — COMPETENCY DEVELOPMENT (0–1)
Avg 1-2 → 0.25, 2.1-3 → 0.5, 3.1-4 → 0.75, 4.1-5 → 1

------------------------------------------------
OUTPUT FORMAT
Learning Overview
Reflection Assessment
Section 9 CII Score = _ / 5
Learning Level: Minimal / Basic / Good / Strong / Excellent
Provide brief explanation (60–80 words).
`;
                break;

            // =====================================================
            // SECTION 10 SUMMARY
            // =====================================================
            case "section10_summary":
                prompt = `
Generate the auto-generated summary for Section 10 — Sustainability & Continuation.

Inputs:
Continuation Status: ${data.status}
Continuation Explanation: ${data.explanation}
Sustainability Mechanisms: ${JSON.stringify(data.mechanisms)}
Scaling Potential: ${data.scaling}
Policy Influence: ${data.policy}

Instructions:
1. State continuation status and mechanisms.
2. Indicate scaling potential and policy influence.

Rules:
Maximum 50 words. Neutral institutional tone.

Output:
Write one concise paragraph (35–50 words).
`;
                break;

            // =====================================================
            // SECTION 10 EVALUATION
            // =====================================================
            case "section10_evaluation":
                prompt = `Evaluate Section 10 — Sustainability & Continuation and calculate the Composite Impact Index (CII) score.

INPUTS
Step 1 — Continuation Status: ${data.status}
Step 2 — Continuation Explanation: ${data.explanation}
Step 3 — Sustainability Mechanisms: ${JSON.stringify(data.mechanisms)}
Step 4 — Scaling Potential: ${data.scaling}
Step 5 — Policy / Institutional Influence: ${data.policy}

------------------------------------------------
STEP 1 — CONTINUATION STATUS (0–2)
No → 0.5, Partial → 1.25, Yes → 2

STEP 2 — CONTINUATION EXPLANATION QUALITY (0–1)
Vague → 0.25, Basic → 0.5, Clear → 0.75, Strong logic → 1

STEP 3 — SUSTAINABILITY MECHANISMS (0–1)
0 → 0, 1 → 0.4, 2 → 0.7, 3+ → 1

STEP 4 — SCALING & SYSTEM INFLUENCE (0–1)
Scaling Base: Not → 0.1, Institution → 0.4, Community → 0.7, Policy → 0.8
Influence Bonus: None → 0, Inst → +0.1, Comm → +0.15, Policy → +0.2
Max Score = 1

------------------------------------------------
OUTPUT FORMAT
Sustainability Overview
Scaling & Influence
Section 10 CII Score = _ / 5
Sustainability Level: Weak / Basic / Moderate / Strong / Excellent
Provide short explanation (50–80 words).
`;
                break;

            // =====================================================
            // SECTION 11 EXECUTIVE SUMMARY
            // =====================================================
            case "section11":
                prompt = `You are an expert grant writer and impact analyst. Write a comprehensive "Executive Impact Summary" for a Community Engagement Report.
                Synthesize the following project data into exactly THREE cohesive, professional paragraphs:
                Paragraph 1: Context & Intent (Summarize the problem, academic discipline, and SDG alignment).
                Paragraph 2: Execution & Collaboration (Summarize the activities, beneficiary reach, resources used, and key partnerships).
                Paragraph 3: Outcomes & Legacy (Summarize the measurable changes, academic/personal reflections, and sustainability plans).
                
                Do NOT use any markdown formatting (no asterisks, no hash tags, no bolding, no lists). Output plain text only, using double newlines between the 3 paragraphs.
                
                Data:
                - Section 1 (Verified Hours): ${data.section1?.metrics?.total_verified_hours}
                - Section 2 (Problem): ${data.section2?.problem_statement}
                - Section 3 (SDG): Goal ${data.section3?.primary_sdg?.goal_number}
                - Section 4 (Activities & Reach): ${data.section4?.total_beneficiaries} beneficiaries. Actions: ${JSON.stringify(data.section4?.activities)}
                - Section 5 (Outcomes): ${data.section5?.observed_change}
                - Section 6 (Resources): ${JSON.stringify(data.section6?.resources)}
                - Section 7 (Partnerships): ${JSON.stringify(data.section7?.partners)}
                - Section 9 (Reflection): ${data.section9?.personal_learning}
                - Section 10 (Sustainability): ${JSON.stringify(data.section10?.mechanisms)}`;
                break;

            default:
                prompt = `Summarize project data professionally: ${JSON.stringify(data)}`;
        }


        const result = await model.generateContent(prompt);

        const response = await result.response;

        const text = response.text();


        return NextResponse.json({
            summary: text.trim()
        });


    } catch (error: any) {

        console.error("AI Error:", error);

        if (error.status === 429) {
            return NextResponse.json(
                { error: "AI limit reached. Please wait." },
                { status: 429 }
            );
        }

        if (error.status === 503) {
            return NextResponse.json(
                { error: "AI servers overloaded. Try again shortly." },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: "Failed to generate AI response" },
            { status: 500 }
        );

    }
}