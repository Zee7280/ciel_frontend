import { NextResponse } from "next/server";
import { parseSection11AuditSummary } from "@/lib/parseCIIauditSummary";

// Gemini (paused): restore import + init + `model.generateContent(prompt)` below when using GEMINI_API_KEY again.
// import { GoogleGenerativeAI } from "@google/generative-ai";
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

type OpenAiCompletionOpts = {
    temperature?: number;
    /** When set, requests reproducible sampling (same inputs → same text for supported models). */
    seed?: number;
};

async function generateSummaryWithOpenAI(
    userPrompt: string,
    opts?: OpenAiCompletionOpts,
): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY missing");
    }

    const model = process.env.OPENAI_SUMMARY_MODEL?.trim() || "gpt-4o-mini";

    const temperature = opts?.temperature ?? 0.4;
    const requestBody: Record<string, unknown> = {
        model,
        messages: [
            {
                role: "system",
                content:
                    "You are ChatGPT, acting as a precise institutional impact analyst. Follow instructions exactly. Output plain text only unless a specific format is requested.",
            },
            { role: "user", content: userPrompt },
        ],
        temperature,
    };
    if (opts?.seed !== undefined) {
        requestBody.seed = opts.seed;
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
    });

    const responseJson = (await res.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
        error?: { message?: string };
    };

    if (!res.ok) {
        const err = new Error(responseJson.error?.message || `OpenAI error (${res.status})`) as Error & {
            status?: number;
        };
        err.status = res.status;
        throw err;
    }

    const text = responseJson.choices?.[0]?.message?.content?.trim();
    if (!text) {
        throw new Error("OpenAI returned empty content");
    }

    return text;
}

export async function POST(req: Request) {
    try {

        const { section, data } = await req.json();

        if (!process.env.OPENAI_API_KEY?.trim()) {
            return NextResponse.json(
                { error: "OpenAI API key is not configured" },
                { status: 500 }
            );
        }

        let prompt = "";

        switch (section) {

            // =====================================================
            // SECTION 1 EVALUATION
            // =====================================================
            case "section1_evaluation":
                prompt = `Evaluate Section 1 — PARTICIPATION, IDENTITY & ATTENDANCE INTEGRITY and calculate the Composite Impact Index (CII) score.

INPUTS:
Data: ${JSON.stringify(data)}

SECTION 1 — PARTICIPATION, IDENTITY & ATTENDANCE INTEGRITY
Weight = 20
S1=S1_base+B

Where:
S1_base = base participation score out of 15 
B = bonus for extra hours out of 5 

Base Formula
S1_base=15×(0.10*I + 0.10*A + 0.35*H + 0.20*F + 0.15*C + 0.10*L)

Where:
I = identity completeness score 
A = academic/team setup completeness score 
H = individual hours compliance score 
F = visit frequency score 
C = continuity/spread score 
L = attendance log quality score 
All scores are between 0 and 1.

How values are calculated:
1) Identity Completeness Score (I)
Check whether the student’s identity and verification fields are complete enough for auditability.
Scoring rule:
1.00 = all required identity fields complete and verified 
0.75 = fields complete but one verification missing 
0.50 = partial identity information 
0.25 = major identity gaps 
0.00 = unusable / unverifiable identity 

2) Academic / Team Setup Completeness Score (A)
Check whether the student is properly linked to the academic and team structure of the project.
Scoring rule:
1.00 = all core academic and team fields complete 
0.75 = minor missing information 
0.50 = several missing fields 
0.25 = weak/incomplete linkage 
0.00 = no meaningful academic/team setup 

3) Individual Hours Compliance Score (H)
H = min((IH_i) / RHS, 1)
Where IH_i = individual student hours completed, RHS = required hours per student.

4) Visit Frequency Score (F)
Let: V_i = actual number of visits, V_exp = max(2, ceiling(RHS/8))
Then: F = min(V_i / V_exp, 1)

5) Continuity / Spread Score (C)
Let: D_span = days between first and last attendance + 1, D_exp = max(2, ceiling(V_exp * 1.5))
Then: C = min(D_span / D_exp, 1)

6) Attendance Log Quality Score (L)
L = 0.20*Q_d + 0.20*Q_t + 0.20*Q_p + 0.20*Q_a + 0.20*Q_r
Each sub-component is scored from 0 to 1.
Q_d = 1 if date is properly recorded 
Q_t = 1 if duration/start-end time is properly recorded 
Q_p = 1 if partner/location is clearly identified 
Q_a = 1 if the work description is specific and meaningful 
Q_r = 1 if logs appear realistic, not repetitive/copied/fake-looking 

7) Bonus for extra hours (B)
Only if student is already eligible (IH_i > RHS):
B = min(5, 5 × (IH_i - RHS) / RHS)
If IH_i <= RHS, then B = 0

------------------------------------------------

OUTPUT FORMAT
Return:
Identity Completeness (I) = ___
Academic / Team Setup (A) = ___
Individual Hours Compliance (H) = ___
Visit Frequency (F) = ___
Continuity / Spread (C) = ___
Attendance Log Quality (L) = ___
Bonus (B) = ___

Section 1 CII Score = ___ / 20
Quality Level: Poor / Basic / Good / Strong / Exceptional
Provide a short explanation (80-120 words) explaining why the score was assigned.`;
                break;

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
            // SECTION 2 EVALUATION
            // =====================================================
            case "section2_evaluation":
                prompt = `Evaluate Section 2 — PROJECT CONTEXT & BASELINE UNDERSTANDING and calculate the Composite Impact Index (CII) score.

INPUTS:
Data: ${JSON.stringify(data)}

SECTION 2 — PROJECT CONTEXT & BASELINE UNDERSTANDING
Weight = 10
S2=10×(0.35*P + 0.25*B + 0.20*E + 0.20*D)

Where:
P = problem clarity 
B = baseline specificity 
E = evidence/source credibility 
D = discipline linkage 

1) Problem Clarity Score (P):
P = 0.25*P1 + 0.20*P2 + 0.15*P3 + 0.20*P4 + 0.20*P5
P1 = 1 if the core issue is clearly defined 
P2 = 1 if the affected population is clearly named 
P3 = 1 if the setting/community is clearly identified 
P4 = 1 if the student explains why the issue matters 
P5 = 1 if the problem is focused and concrete rather than vague 

2) Baseline Specificity Score (B):
B = 0.25*B1 + 0.25*B2 + 0.20*B3 + 0.15*B4 + 0.15*B5
B1 = 1 if pre-project condition is clearly described 
B2 = 1 if description is specific 
B3 = 1 if baseline is logically tied to the stated problem 
B4 = 1 if some indicator/observation/metric is given 
B5 = 1 if baseline looks credible and relevant 

3) Evidence / Source Credibility Score (E):
E = 0.20*E1 + 0.25*E2 + 0.25*E3 + 0.15*E4 + 0.15*E5
E1 = 1 if a source is actually cited or referenced 
E2 = 1 if source directly supports the problem/baseline 
E3 = 1 if source is credible 
E4 = 1 if source is concrete rather than generic 
E5 = 1 if source is appropriate for the context 

4) Discipline Linkage Score (D):
D = 0.20*D1 + 0.25*D2 + 0.20*D3 + 0.20*D4 + 0.15*D5
D1 = 1 if department/discipline is explicitly identified 
D2 = 1 if project linkage is clearly explained 
D3 = 1 if student shows actual use of discipline-based knowledge 
D4 = 1 if the linkage is relevant and not forced 
D5 = 1 if the student explains what role the discipline played in action 

OUTPUT FORMAT
Return:
Problem Clarity (P) = ___
Baseline Specificity (B) = ___
Evidence Credibility (E) = ___
Discipline Linkage (D) = ___

Section 2 CII Score = ___ / 10
Provide a brief explanation of the score.`;
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
            // SECTION 3 EVALUATION
            // =====================================================
            case "section3_evaluation":
                prompt = `Evaluate Section 3 — SDG CONTRIBUTION MAPPING and calculate the Composite Impact Index (CII) score.

INPUTS:
Data: ${JSON.stringify(data)}

SECTION 3 — SDG CONTRIBUTION MAPPING
Weight = 10
Final Section 3 Formula
S3=S3_base+S3_bonus

Base score
S3_base=9×(0.40*M + 0.25*T + 0.20*I + 0.15*J)

Bonus for optional secondary SDGs
S3_bonus=min(1, B_1 + B_2)

For each optional secondary SDG:
B_k=0.5×(0.50*R_k + 0.50*J_k)

M = SDG match accuracy
M = 0.25*M1 + 0.20*M2 + 0.20*M3 + 0.20*M4 + 0.15*M5
(M1: problem-to-SDG fit, M2: activity-to-SDG fit, M3: outcome-to-SDG fit, M4: primacy of SDG, M5: absence of contradiction)

T = target alignment quality
T = 0.20*T1 + 0.25*T2 + 0.20*T3 + 0.20*T4 + 0.15*T5
(T1: belongs to SDG, T2: matches purpose, T3: matches activities, T4: matches outcomes, T5: specificity)

I = indicator relevance
I = 0.20*I1 + 0.25*I2 + 0.25*I3 + 0.15*I4 + 0.15*I5

J = justification strength
J = 0.20*J1 + 0.20*J2 + 0.20*J3 + 0.20*J4 + 0.20*J5

R_k = relevance of secondary SDG
R_k = 0.30*R1_k + 0.25*R2_k + 0.25*R3_k + 0.20*R4_k

J_k = justification quality of secondary SDG
J_k = 0.30*K1_k + 0.25*K2_k + 0.25*K3_k + 0.20*K4_k

Calculate everything with values from 0 to 1 for subparts.
OUTPUT FORMAT
Return:
SDG Match (M) = ___
Target Alignment (T) = ___
Indicator Relevance (I) = ___
Justification (J) = ___
Secondary Bonus (S3_bonus) = ___

Section 3 CII Score = ___ / 10
Provide a brief explanation of the score.`;
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
                - Total Beneficiaries: ${data.project_summary?.distinct_total_beneficiaries}
                - Beneficiary Categories: ${JSON.stringify(data.beneficiary_categories)}
                - Team Contributions: ${JSON.stringify(data.team_contributions)}`;
                break;

            // =====================================================
            // SECTION 4 EVALUATION
            // =====================================================
            case "section4_evaluation":
                prompt = `Evaluate Section 4 — ACTIVITIES, OUTPUTS & SCALE and calculate the Composite Impact Index (CII) score.

INPUTS:
Data: ${JSON.stringify(data)}

SECTION 4 — ACTIVITIES, OUTPUTS & SCALE
Weight = 15
Core Formula
S4=15×(0.25*A + 0.25*O + 0.20*B + 0.15*M + 0.15*S)

Where:
A = Activity Block Quality 
O = Output Quality & Measurability 
B = Beneficiary Reach & Counting Clarity 
M = Delivery & Implementation Model Clarity 
S = Scale Credibility & Implementation Magnitude 

Each variable is scored from 0 to 1 using numeric benchmarks:
1.00 = Excellent, 0.80 = Good, 0.60 = Moderate, 0.40 = Weak, 0.20 = Very Weak, 0.00 = Absent

A = 0.20*A1 + 0.20*A2 + 0.25*A3 + 0.15*A4 + 0.20*A5
O = 0.20*O1 + 0.25*O2 + 0.20*O3 + 0.20*O4 + 0.15*O5
B = 0.20*B1 + 0.20*B2 + 0.20*B3 + 0.20*B4 + 0.20*B5
M = 0.20*M1 + 0.20*M2 + 0.20*M3 + 0.20*M4 + 0.20*M5
S = 0.20*S1 + 0.20*S2 + 0.20*S3 + 0.15*S4 + 0.25*S5

OUTPUT FORMAT
Return:
Activity Quality (A) = ___
Output Quality (O) = ___
Beneficiary Clarity (B) = ___
Delivery Clarity (M) = ___
Scale Credibility (S) = ___

Section 4 CII Score = ___ / 15
Classify quality: 13-15=Excellent, 10.5-12.9=Good, 8-10.4=Moderate, 5-7.9=Weak, 0-4.9=Very Weak
Provide a brief explanation of the score.`;
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
Total Beneficiaries Reached: ${data.project_summary?.distinct_total_beneficiaries}
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
                prompt = `Evaluate Section 5 — OUTCOMES & RESULTS and calculate the Composite Impact Index (CII) score.

INPUTS:
Data: ${JSON.stringify(data)}

SECTION 5 — OUTCOMES & RESULTS
Weight = 20
Core Formula
S5=20×(0.25*N + 0.30*M + 0.20*C + 0.15*L + 0.10*R)

Where:
N = quality of change narrative 
M = measurable outcome strength 
C = confidence / credibility of measurement 
L = linkage with outputs and baseline 
R = realism of claims 

SCORING SCALE FOR ALL SUB-INDICATORS:
1.00 = Excellent / fully demonstrated 
0.75 = Good / mostly demonstrated 
0.50 = Moderate / partially demonstrated 
0.25 = Weak / minimally demonstrated 
0.00 = Very weak / absent / unsupported 

1) N = QUALITY OF CHANGE NARRATIVE
N = 0.25*N1 + 0.20*N2 + 0.20*N3 + 0.15*N4 + 0.20*N5
(N1: change stated, N2: affected group identified, N3: type of change described, N4: before/after logic present, N5: narrative specificity/coherence)

2) M = MEASURABLE OUTCOME STRENGTH
M = 0.20*M1 + 0.20*M2 + 0.20*M3 + 0.20*M4 + 0.20*M5
(M1: outcome is measurable, M2: relevant metric/unit, M3: value/magnitude provided, M4: reflects change not activity, M5: strength/significance)

3) C = CONFIDENCE / CREDIBILITY OF MEASUREMENT
C = 0.20*C1 + 0.20*C2 + 0.20*C3 + 0.20*C4 + 0.20*C5
(C1: source identified, C2: method explained, C3: evidence exists, C4: consistency with implementation, C5: credibility of inference)

4) L = LINKAGE WITH OUTPUTS AND BASELINE
L = 0.20*L1 + 0.20*L2 + 0.20*L3 + 0.20*L4 + 0.20*L5
(L1: baseline-to-outcome, L2: activity-to-outcome, L3: output-to-outcome, L4: internal consistency, L5: attributable to intervention)

5) R = REALISM OF CLAIMS
R = 0.25*R1 + 0.25*R2 + 0.20*R3 + 0.15*R4 + 0.15*R5
(R1: proportionality, R2: plausibility of magnitude, R3: evidence sufficiency, R4: absence of exaggeration, R5: acknowledgment of limits)

OUTPUT FORMAT
Return:
Narrative Quality (N) = ___
Measurable Score (M) = ___
Confidence (C) = ___
Linkage (L) = ___
Realism (R) = ___

Section 5 CII Score = ___ / 20
Provide a brief explanation of the score.`;
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
Total Beneficiaries Reached: ${data.project_summary?.distinct_total_beneficiaries}
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
                prompt = `Evaluate Section 6 — RESOURCES & IMPLEMENTATION SUPPORT and calculate the Composite Impact Index (CII) score.

INPUTS:
Data: ${JSON.stringify(data)}

SECTION 6 — RESOURCES & IMPLEMENTATION SUPPORT
Weight = 5
Core Formula
S6=5×(0.30*R + 0.25*S + 0.25*P + 0.20*V)

Where:
R = resource relevance 
S = source clarity 
P = purpose justification 
V = verification of support 

SCORING SCALE FOR ALL SUB-INDICATORS:
1.00 = Excellent / fully demonstrated 
0.75 = Good / mostly demonstrated 
0.50 = Moderate / partially demonstrated 
0.25 = Weak / minimally demonstrated 
0.00 = Very weak / absent / unsupported 

1) R = RESOURCE RELEVANCE
R = 0.25*R1 + 0.25*R2 + 0.20*R3 + 0.15*R4 + 0.15*R5
(R1: relevance to activities, R2: relevance to implementation needs, R3: relevance to outputs, R4: proportionality, R5: absence of decorative entries)

2) S = SOURCE CLARITY
S = 0.25*S1 + 0.20*S2 + 0.20*S3 + 0.15*S4 + 0.20*S5
(S1: source identified, S2: source specificity, S3: source traceability, S4: distinction between sources, S5: overall clarity)

3) P = PURPOSE JUSTIFICATION
P = 0.20*P1 + 0.20*P2 + 0.20*P3 + 0.20*P4 + 0.20*P5
(P1: purpose stated, P2: linked to activity, P3: linked to implementation, P4: explanation of use, P5: specificity/coherence)

4) V = VERIFICATION OF SUPPORT
V = 0.20*V1 + 0.20*V2 + 0.20*V3 + 0.20*V4 + 0.20*V5
(V1: presence of supporting basis, V2: relevance of proof, V3: external confirmation, V4: consistency with records, V5: overall credibility)

OUTPUT FORMAT
Return:
Resource Relevance (R) = ___
Source Clarity (S) = ___
Purpose Justification (P) = ___
Verification (V) = ___

Section 6 CII Score = ___ / 5
Provide a brief explanation of the score.`;
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
                prompt = `Evaluate Section 7 — PARTNERSHIPS & COLLABORATION and calculate the Composite Impact Index (CII) score.

INPUTS:
Data: ${JSON.stringify(data)}

SECTION 7 — PARTNERSHIPS & COLLABORATION
Weight = 5
Core Formula
S7=5×(0.25*Re + 0.25*Ro + 0.25*Co + 0.25*Ve)

Where:
Re = partner relevance 
Ro = role clarity 
Co = contribution depth 
Ve = verification strength 

SCORING SCALE FOR ALL SUB-INDICATORS:
1.00 = Excellent / fully demonstrated 
0.75 = Good / mostly demonstrated 
0.50 = Moderate / partially demonstrated 
0.25 = Weak / minimally demonstrated 
0.00 = Very weak / absent / unsupported 

1) Re = PARTNER RELEVANCE
Re = 0.25*Re1 + 0.20*Re2 + 0.20*Re3 + 0.20*Re4 + 0.15*Re5
(Re1: relevance to problem, Re2: relevance to activities, Re3: relevance to beneficiaries, Re4: relevance to outcomes, Re5: non-decorative fit)

2) Ro = ROLE CLARITY
Ro = 0.20*Ro1 + 0.20*Ro2 + 0.20*Ro3 + 0.20*Ro4 + 0.20*Ro5
(Ro1: role explicitly stated, Ro2: role is specific, Ro3: role linked to function, Ro4: role distinction from others, Ro5: overall clarity)

3) Co = CONTRIBUTION DEPTH
Co = 0.20*Co1 + 0.20*Co2 + 0.20*Co3 + 0.20*Co4 + 0.20*Co5
(Co1: type significance, Co2: usefulness to project, Co3: depth/intensity, Co4: effect on delivery, Co5: continuity/value)

4) Ve = VERIFICATION STRENGTH
Ve = 0.20*Ve1 + 0.20*Ve2 + 0.20*Ve3 + 0.20*Ve4 + 0.20*Ve5
(Ve1: evidence exists, Ve2: evidence is relevant, Ve3: external confirmation strength, Ve4: consistency with records, Ve5: overall credibility)

OUTPUT FORMAT
Return:
Partner Relevance (Re) = ___
Role Clarity (Ro) = ___
Contribution Depth (Co) = ___
Verification Strength (Ve) = ___

Section 7 CII Score = ___ / 5
Provide a brief explanation of the score.`;
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
                prompt = `Evaluate Section 8 — EVIDENCE RELIABILITY, ETHICS & VERIFICATION and calculate the Composite Impact Index (CII) score.

INPUTS:
Data: ${JSON.stringify(data)}

SECTION 8 — EVIDENCE RELIABILITY, ETHICS & VERIFICATION
Weight = 5
Core Formula
S8=5×(0.30*C + 0.25*V + 0.20*R + 0.15*E + 0.10*X)

Where:
C = cross-section consistency 
V = external verification strength 
R = relevance of uploaded proof 
E = ethics compliance 
X = absence of contradiction / suspicion 

SCORING SCALE FOR ALL SUB-INDICATORS:
1.00 = Excellent / fully reliable 
0.75 = Good / mostly reliable 
0.50 = Moderate / partially reliable 
0.25 = Weak / doubtful 
0.00 = Very weak / absent / strongly suspicious 

1) C = CROSS-SECTION CONSISTENCY
C = 0.25*C1 + 0.25*C2 + 0.20*C3 + 0.15*C4 + 0.15*C5
(C1: consistency with attendance, C2: consistency with activities, C3: consistency with outputs, C4: consistency with partners, C5: consistency with timeline)

2) V = EXTERNAL VERIFICATION STRENGTH
V = 0.20*V1 + 0.20*V2 + 0.20*V3 + 0.20*V4 + 0.20*V5
(V1: existence of external verification, V2: relevance, V3: specificity, V4: credibility of source, V5: strength of linkage to claims)

3) R = RELEVANCE OF UPLOADED PROOF
R = 0.25*R1 + 0.20*R2 + 0.20*R3 + 0.20*R4 + 0.15*R5
(R1: relevance to activity, R2: relevance to output, R3: relevance to context, R4: interpretability of proof, R5: file-type appropriateness)

4) E = ETHICS COMPLIANCE
E = 0.25*E1 + 0.20*E2 + 0.20*E3 + 0.20*E4 + 0.15*E5
(E1: no harmful sensitive exposure, E2: dignity maintained, E3: contextually appropriate use, E4: consent/permission logic, E5: no exploitative style)

5) X = ABSENCE OF CONTRADICTION / SUSPICION
X = 0.20*X1 + 0.20*X2 + 0.20*X3 + 0.20*X4 + 0.20*X5
(X1: absence of duplication, X2: timeline alignment, X3: numerical consistency, X4: no inflation signals, X5: overall suspicion-free profile)

OUTPUT FORMAT
Return:
Cross-Section Consistency (C) = ___
External Verification (V) = ___
Relevance of Proof (R) = ___
Ethics Compliance (E) = ___
Absence of Contradiction (X) = ___

Section 8 CII Score = ___ / 5
Provide a brief explanation of the score.`;
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
                prompt = `Evaluate Section 9 — REFLECTION, LEARNING & COMPETENCY DEVELOPMENT and calculate the Composite Impact Index (CII) score.

INPUTS:
Data: ${JSON.stringify(data)}

SECTION 9 — REFLECTION, LEARNING & COMPETENCY DEVELOPMENT
Weight = 5
Core Formula
S9=5×(0.30*L + 0.25*A + 0.25*C + 0.20*T)

Where:
L = learning depth 
A = academic application 
C = competency insight 
T = transformative understanding 

SCORING SCALE FOR ALL SUB-INDICATORS:
1.00 = Excellent / fully demonstrated 
0.75 = Good / mostly demonstrated 
0.50 = Moderate / partially demonstrated 
0.25 = Weak / minimally demonstrated 
0.00 = Very weak / absent / unsupported 

1) L = LEARNING DEPTH
L = 0.20*L1 + 0.20*L2 + 0.20*L3 + 0.20*L4 + 0.20*L5
(L1: lesson identified clearly, L2: lesson specific to project, L3: reflection beyond description, L4: connected to real experience, L5: depth and maturity)

2) A = ACADEMIC APPLICATION
A = 0.20*A1 + 0.20*A2 + 0.20*A3 + 0.20*A4 + 0.20*A5
(A1: academic field identified, A2: concept/tool referenced, A3: applied meaningfully, A4: relevant to project, A5: explanation clear and specific)

3) C = COMPETENCY INSIGHT
C = 0.20*C1 + 0.20*C2 + 0.20*C3 + 0.20*C4 + 0.20*C5
(C1: competency identified, C2: relevant to project, C3: development explained, C4: supported by examples, C5: self-awareness shown)

4) T = TRANSFORMATIVE UNDERSTANDING
T = 0.20*T1 + 0.20*T2 + 0.20*T3 + 0.20*T4 + 0.20*T5
(T1: perspective shift identified, T2: social/ethical understanding deepened, T3: personal/professional growth insight, T4: connected to community realities, T5: durable meaning)

OUTPUT FORMAT
Return:
Learning Depth (L) = ___
Academic Application (A) = ___
Competency Insight (C) = ___
Transformative Understanding (T) = ___

Section 9 CII Score = ___ / 5
Provide a brief explanation of the score.`;
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
                prompt = `Evaluate Section 10 — SUSTAINABILITY, CONTINUATION & SCALING and calculate the Composite Impact Index (CII) score.

INPUTS:
Data: ${JSON.stringify(data)}

SECTION 10 — SUSTAINABILITY, CONTINUATION & SCALING
Weight = 5
Core Formula
S10=5×(0.30*C + 0.25*M + 0.25*S + 0.20*P)

Where:
C = continuation realism 
M = sustainability mechanism strength 
S = scaling potential 
P = policy/system relevance 

SCORING SCALE FOR ALL SUB-INDICATORS:
1.00 = Excellent / fully demonstrated 
0.75 = Good / mostly demonstrated 
0.50 = Moderate / partially demonstrated 
0.25 = Weak / minimally demonstrated 
0.00 = Very weak / absent / unsupported 

1) C = CONTINUATION REALISM
C = 0.20*C1 + 0.20*C2 + 0.20*C3 + 0.20*C4 + 0.20*C5
(C1: continuation plan stated, C2: what will continue is identified, C3: limits/stops acknowledged, C4: support requirements identified, C5: claim is realistic)

2) M = SUSTAINABILITY MECHANISM STRENGTH
M = 0.20*M1 + 0.20*M2 + 0.20*M3 + 0.20*M4 + 0.20*M5
(M1: mechanism exists, M2: mechanism relevance, M3: mechanism clarity, M4: mechanism feasibility, M5: mechanism strength/dependability)

3) S = SCALING POTENTIAL
S = 0.20*S1 + 0.20*S2 + 0.20*S3 + 0.20*S4 + 0.20*S5
(S1: scaling possibility identified, S2: replicability of project model, S3: transferability, S4: enabling conditions exist, S5: scaling claim is realistic)

4) P = POLICY / SYSTEM RELEVANCE
P = 0.20*P1 + 0.20*P2 + 0.20*P3 + 0.20*P4 + 0.20*P5
(P1: system/policy relevance identified, P2: connection to issue, P3: practical value beyond immediate project, P4: broader usefulness, P5: realism of claim)

OUTPUT FORMAT
Return:
Continuation Realism (C) = ___
Sustainability Mechanism Strength (M) = ___
Scaling Potential (S) = ___
Policy/System Relevance (P) = ___

Section 10 CII Score = ___ / 5
Provide a brief explanation of the score.`;
                break;

            // =====================================================
            // CII INDEX OVERALL REVIEW
            // =====================================================
            case "cii_index":
                prompt = `You are ChatGPT acting as a CIEL Composite Impact Index (CII) auditor.

Review the submitted report data and the calculated CII index values. Do not invent missing evidence.

INPUTS:
Data: ${JSON.stringify(data)}

TASK:
1. Explain the overall CII index score in professional institutional language.
2. Identify the strongest scoring areas.
3. Identify weak or risky areas that may reduce the CII index.
4. Cross-check whether the numeric score is consistent with the report evidence.
5. Provide short improvement guidance without changing the score.

OUTPUT FORMAT:
CII Index Score: ___ / 100
CII Level: ___
Score Interpretation: ___
Strong Areas: ___
Weak Areas / Risks: ___
Audit Remark: ___

Keep the full response under 180 words.`;
                break;

            // =====================================================
            // SECTION 11 EXECUTIVE SUMMARY
            // =====================================================
            case "section11":
                prompt = `GLOBAL MASTER INSTRUCTION (MANDATORY HEADER)
You are an AI Auditor for CIEL (Community Impact Evaluation Lab).

Your role is NOT just to evaluate but to critically REVIEW, VALIDATE, and IDENTIFY inconsistencies across the report.

You must:
- Cross-check all sections (1-10)
- Use the provided CII index data when present to explain score credibility
- Detect contradictions, exaggerations, missing logic, or weak justification
- Identify inflated claims vs actual inputs
- Flag unclear, generic, or AI-generated vague responses
- Ensure alignment between:
  - Activities (Section 4)
  - Outputs (Section 4)
  - Outcomes (Section 5)
  - Resources (Section 6)
  - SDGs (Section 3)
- Ensure all claims are evidence-backed (Section 8)

STRICT RULES:
- Do NOT assume missing information
- Do NOT reward vague or generic answers
- Do NOT ignore inconsistencies
- Do NOT change any provided numeric CII score; audit and explain it only

Always give:
1. Section Quality (Strong / Moderate / Weak)
2. Red Flags (if any)
3. Missing Elements
4. Improvement Feedback (clear + actionable)

Tone:
Professional, direct, and audit-style.

SECTION 1 — IDENTITY & ATTENDANCE
Review Section 1 (Identity & Attendance).

Check:
- Are total hours realistic per session?
- Are dates consistent or artificially compressed?
- Is attendance believable for the number of sessions?
- Any duplication or inflated hours?
- Does duration align with expected RHS?

Flag:
- Unrealistic time logs
- Too many hours in one day
- Identical repetitive entries
- Suspicious patterns

Output:
1. Quality
2. Red Flags
3. Missing Data
4. Feedback

SECTION 2 — PROJECT CONTEXT
Review Section 2 (Baseline & Problem Definition).

Check:
- Is this truly a PRE-intervention situation?
- Any outcomes or results wrongly mentioned?
- Is the problem specific and grounded?
- Is target population clearly defined?

Flag:
- Vague problem statements
- Generic societal issues without context
- Activities mentioned instead of baseline

Output:
1. Quality
2. Red Flags
3. Missing Elements
4. Feedback

SECTION 3 — SDG MAPPING
Review Section 3 (SDG Mapping).

Check:
- Is SDG logically linked to the problem?
- Are targets correctly aligned?
- Is justification specific or generic?
- Does SDG align with actual activities?

Flag:
- Forced SDG mapping
- Copy-paste SDG language
- Weak or irrelevant linkage

Output:
1. Quality
2. Red Flags
3. Missing Elements
4. Feedback

SECTION 4 — ACTIVITIES, OUTPUTS & SCALE
Review Section 4 (Activities & Outputs).

Check:
- Are activities clearly described?
- Are outputs measurable and specific?
- Does scale match attendance (Section 1)?
- Are outputs realistic?

Cross-check:
- Section 1 hours vs activities
- Activities vs outcomes (Section 5)

Flag:
- Inflated outputs
- Vague activities
- No measurable units
- Mismatch with time spent

Output:
1. Quality
2. Red Flags
3. Missing Elements
4. Feedback

SECTION 5 — OUTCOMES & RESULTS
Review Section 5 (Outcomes).

Check:
- Are outcomes directly linked to activities?
- Are outcomes measurable or just claims?
- Is there baseline vs endline logic?
- Are outcomes exaggerated?

Flag:
- "We improved awareness" without proof
- No metrics
- Outcomes not supported by Section 4
- Unrealistic impact

Output:
1. Quality
2. Red Flags
3. Missing Elements
4. Feedback

SECTION 6 — RESOURCES
Review Section 6 (Resources).

Check:
- Are resources clearly defined?
- Is there logical use of resources?
- Does resource value match outputs?

Cross-check:
- Outputs vs resources efficiency

Flag:
- Missing resource explanation
- No linkage to activities
- Unrealistic resource claims

Output:
1. Quality
2. Red Flags
3. Missing Elements
4. Feedback

SECTION 7 — PARTNERSHIPS
Review Section 7 (Partnerships).

Check:
- Is partner role clearly defined?
- Is collaboration meaningful or superficial?
- Any verification mentioned?

Flag:
- Fake/unclear partner involvement
- No defined role
- No collaboration evidence

Output:
1. Quality
2. Red Flags
3. Missing Elements
4. Feedback

SECTION 8 — EVIDENCE & VERIFICATION
Review Section 8 (Evidence).

Check:
- Does evidence match activities?
- Are descriptions specific?
- Is evidence verifiable?

Cross-check:
- Activities (Section 4)
- Outcomes (Section 5)

Flag:
- Generic descriptions
- Mismatch with activities
- Weak verification

Output:
1. Quality
2. Red Flags
3. Missing Elements
4. Feedback

SECTION 9 — LEARNING & COMPETENCIES
Review Section 9 (Reflection & Learning).

Check:
- Is reflection personal and specific?
- Are skills clearly identified?
- Is academic linkage present?

Flag:
- Generic reflection
- No real learning insight
- No discipline linkage

Output:
1. Quality
2. Red Flags
3. Missing Elements
4. Feedback

SECTION 10 — SUSTAINABILITY
Review Section 10 (Sustainability).

Check:
- Is continuation clearly explained?
- Is there a system/partner responsible?
- Are resources transferred?

Flag:
- No real sustainability plan
- Vague continuation
- No ownership

Output:
1. Quality
2. Red Flags
3. Missing Elements
4. Feedback

FINAL CII RED FLAG SUMMARY PROMPT
Now perform a FINAL AUDIT across ALL sections (1-10).

Your task is to identify CROSS-SECTION inconsistencies.

Check:
- Activities (Section 4) vs Outcomes (Section 5)
- Hours (Section 1) vs Outputs (Section 4)
- Resources (Section 6) vs Impact (Section 5)
- SDG (Section 3) vs actual intervention
- Evidence (Section 8) vs claims

Identify:
- CRITICAL RED FLAGS: Major inconsistencies, false claims, inflated impact
- MODERATE ISSUES: Weak logic, missing links, unclear justification
- MINOR ISSUES: Clarity, structure, or detail improvements

Also provide:
1. Overall Credibility Score (High / Medium / Low)
2. Risk Level (Safe / Reject)
3. CII Index Score exactly as supplied in the submitted CII index data
4. Top 5 Required Fixes before approval
5. Final Auditor Remark (Professional, report-style, including whether the calculated CII index is well supported by the submitted evidence)

IMPORTANT:
Do not recommend revision cycles. This is a one-time submission workflow.

BONUS:
If serious inconsistencies are found, include a concise STUDENT FEEDBACK section focused on transparency and future learning only (not resubmission).

OUTPUT FORMAT RULES:
- Output plain text only.
- Use exactly 11 blocks separated by double newlines (one blank line between blocks).
- Start each block with SECTION N — on a new line; do not concatenate multiple SECTION headers into one paragraph.
- Each block must be a single concise paragraph.
- Do not use markdown bullets, tables, or code fences in the final answer.
- Do not mention file names, JSON, or internal system IDs.
- If evidence is missing, explicitly say: Not evidenced in the submitted inputs.
- If there are no major issues in a category, explicitly say: No major red flags identified from the provided inputs.

Use this exact final structure:

SECTION 1 — IDENTITY & ATTENDANCE: Quality: ... Red Flags: ... Missing Data: ... Feedback: ...

SECTION 2 — PROJECT CONTEXT: Quality: ... Red Flags: ... Missing Elements: ... Feedback: ...

SECTION 3 — SDG MAPPING: Quality: ... Red Flags: ... Missing Elements: ... Feedback: ...

SECTION 4 — ACTIVITIES, OUTPUTS & SCALE: Quality: ... Red Flags: ... Missing Elements: ... Feedback: ...

SECTION 5 — OUTCOMES & RESULTS: Quality: ... Red Flags: ... Missing Elements: ... Feedback: ...

SECTION 6 — RESOURCES: Quality: ... Red Flags: ... Missing Elements: ... Feedback: ...

SECTION 7 — PARTNERSHIPS: Quality: ... Red Flags: ... Missing Elements: ... Feedback: ...

SECTION 8 — EVIDENCE & VERIFICATION: Quality: ... Red Flags: ... Missing Elements: ... Feedback: ...

SECTION 9 — LEARNING & COMPETENCIES: Quality: ... Red Flags: ... Missing Elements: ... Feedback: ...

SECTION 10 — SUSTAINABILITY: Quality: ... Red Flags: ... Missing Elements: ... Feedback: ...

SECTION 11 — FINAL AUDIT SUMMARY: CRITICAL RED FLAGS: ... MODERATE ISSUES: ... MINOR ISSUES: ... Overall Credibility Score: High/Medium/Low. Risk Level: Safe/Reject. CII Index Score: ___ / 100. Top 5 Required Fixes: 1) ... 2) ... 3) ... 4) ... 5) ... Final Auditor Remark: ... Add Student Feedback only if serious inconsistencies are found.

Submitted Report Data:
${JSON.stringify(data)}`;
                break;

            default:
                prompt = `Summarize project data professionally: ${JSON.stringify(data)}`;
        }


        const openAiOpts: OpenAiCompletionOpts | undefined =
            section === "section11"
                ? {
                      temperature: 0,
                      seed: 277011,
                  }
                : undefined;

        const text = await generateSummaryWithOpenAI(prompt, openAiOpts);
        const summary = text.trim();

        if (section === "section11") {
            const auditMeta = parseSection11AuditSummary(summary);
            return NextResponse.json({
                summary,
                ...(auditMeta ? { auditMeta } : {}),
            });
        }

        return NextResponse.json({
            summary,
        });


    } catch (error: unknown) {

        console.error("AI Error:", error);

        const status =
            typeof error === "object" && error !== null && "status" in error
                ? (error as { status?: unknown }).status
                : undefined;

        if (status === 429) {
            return NextResponse.json(
                { error: "AI limit reached. Please wait." },
                { status: 429 }
            );
        }

        if (status === 503) {
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