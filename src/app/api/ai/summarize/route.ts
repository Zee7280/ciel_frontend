import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

export async function POST(req: Request) {
    try {
        const { section, data } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Gemini API Key is not configured" }, { status: 500 });
        }

        let prompt = "";

        switch (section) {
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

            case "section3":
                prompt = `You are a student writing a formal community service report. Summarize the SDG contribution intent. 
                Focus on your INTENT and PLAN to address the goal. 
                Strictly write in the first person ('I' or 'We'). Write exactly 2 concise sentences. 
                Do NOT use any markdown formatting, asterisks, or bullet points. Output plain text only.
                
                Primary SDG: ${data.primary_sdg?.goal_title}
                Intent Statement: ${data.contribution_intent_statement}`;
                break;

            case "section4":
                prompt = `You are a student writing a formal community service report. Summarize the activities and outputs delivered in this project.
                Be specific about quantities, categories, and reach. 
                Strictly write in the first person ('I' or 'We'). Write exactly 3 concise sentences. 
                Do NOT use any markdown formatting, asterisks, or bullet points. Output plain text only.
                
                Activities: ${JSON.stringify(data.activities)}
                Beneficiaries: ${data.total_beneficiaries}
                Outputs: ${JSON.stringify(data.outputs)}`;
                break;

            case "section5":
                prompt = `You are a student writing a formal community service report. Summarize the impact and measurable outcomes achieved.
                Highlight the change from baseline to endline data. 
                Strictly write in the first person ('I' or 'We'). Write exactly 3 concise sentences. 
                Do NOT use any markdown formatting, asterisks, or bullet points. Output plain text only.
                
                Observed Change: ${data.observed_change}
                Metrics: ${JSON.stringify(data.measurable_outcomes)}`;
                break;

            case "section8":
                prompt = `You are a student writing a formal community service report. Generate a verification statement confirming the uploaded evidence and ethical compliance of this project.
                Validate that strict ethical standards were met during execution.
                Strictly write in the first person ('I' or 'We'). Write exactly 2 to 3 concise sentences. 
                Do NOT use any markdown formatting, asterisks, or bullet points. Output plain text only.
                
                Evidence Types: ${JSON.stringify(data.evidence_types)}
                Ethical Compliance: ${JSON.stringify(data.ethical_compliance)}`;
                break;

            case "section9":
                prompt = `You are a student writing a formal community service report. Summarize your personal reflection and academic integration.
                Highlight personal growth and how academic knowledge was applied.
                Strictly write in the first person ('I' or 'We'). Write exactly 3 concise sentences. 
                Do NOT use any markdown formatting, asterisks, or bullet points. Output plain text only.
                
                Academic Application: ${data.academic_application}
                Personal Learning: ${data.personal_learning}`;
                break;

            case "section10":
                prompt = `You are a student writing a formal community service report. Summarize the sustainability and future continuation plans for this project.
                Highlight the mechanisms put in place to ensure long-term impact.
                Strictly write in the first person ('I' or 'We'). Write exactly 2 to 3 concise sentences. 
                Do NOT use any markdown formatting, asterisks, or bullet points. Output plain text only.
                
                Continuation Status: ${data.continuation_status}
                Mechanisms: ${JSON.stringify(data.mechanisms)}
                Details: ${data.continuation_details}`;
                break;

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
                prompt = `Summarize the following project data professional for a formal report: ${JSON.stringify(data)} `;
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ summary: text.trim() });
    } catch (error: any) {
        console.error("AI Summarization Error:", error);

        // Handle Gemini-specific 429 error (Rate Limit)
        if (error.status === 429) {
            return NextResponse.json({
                error: "AI limit reached (429). Please wait a minute and try again. Google's Free Tier has usage limits."
            }, { status: 429 });
        }

        // Handle Gemini-specific 503 error (Overloaded)
        if (error.status === 503) {
            return NextResponse.json({
                error: "AI service is currently busy (503). Google's servers are overloaded. Please try again in 10-20 seconds."
            }, { status: 503 });
        }

        return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
    }
}
