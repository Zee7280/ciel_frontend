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
                prompt = `Summarize the following project context and problem definition for a social impact report. 
                Focus on WHY this project is necessary. Keep it professional, objective, and around 2-3 sentences.
                
                Problem Statement: ${data.problem_statement}
                Discipline: ${data.discipline}
                Contribution: ${data.discipline_contribution}
                Problem Category: ${data.problem_category}`;
                break;

            case "section3":
                prompt = `Summarize the SDG contribution intent for this project. 
                Focus on the INTENT and PLAN, not outcomes. Keep it professional and concise (2 sentences).
                
                Primary SDG: ${data.primary_sdg?.goal_title}
                Intent Statement: ${data.contribution_intent_statement}`;
                break;

            case "section4":
                prompt = `Summarize the activities and outputs delivered in this project.
                Be specific about quantities and categories. Keep it professional and factual.
                
                Activities: ${JSON.stringify(data.activities)}
                Beneficiaries: ${data.total_beneficiaries}
                Outputs: ${JSON.stringify(data.outputs)}`;
                break;

            case "section5":
                prompt = `Summarize the impact and measurable outcomes achieved.
                Highlight the change from baseline to endline. Keep it professional and inspiring.
                
                Observed Change: ${data.observed_change}
                Metrics: ${JSON.stringify(data.measurable_outcomes)}`;
                break;

            case "section8":
                prompt = `Generate a verification statement for the evidence and ethical compliance of this project.
                Mention the types of evidence uploaded and that ethical standards were met.
                
                Evidence Types: ${JSON.stringify(data.evidence_types)}
                Ethical Compliance: ${JSON.stringify(data.ethical_compliance)}`;
                break;

            default:
                prompt = `Summarize the following project data professional for a formal report: ${JSON.stringify(data)}`;
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
