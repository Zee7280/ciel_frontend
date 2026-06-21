import { NextResponse } from "next/server";
import { fetchBackendPublicJson } from "@/utils/publicBffProxyFetch";

export const dynamic = "force-dynamic";

type ReportScoringConfigPayload = {
    success: true;
    data: {
        cii_section_max_by_key: Record<string, number>;
        cii_section_weights_by_number: Record<
            string,
            { key: string; title: string; max: number }
        >;
        cii_section_max_total: number;
        max_daily_attendance_hours_per_student: number;
        daily_attendance_cap_message: string;
    };
};

const FALLBACK: ReportScoringConfigPayload = {
    success: true,
    data: {
        cii_section_max_by_key: {
            participation: 10,
            context: 10,
            sdg: 10,
            outputs: 15,
            outcomes: 10,
            resources: 15,
            partnerships: 10,
            evidence: 10,
            learning: 5,
            sustainability: 5,
        },
        cii_section_weights_by_number: {
            "1": { key: "participation", title: "Identity & Participation", max: 10 },
            "2": { key: "context", title: "Project Context & Discipline", max: 10 },
            "3": { key: "sdg", title: "SDG Strategy & Intent", max: 10 },
            "4": { key: "outputs", title: "Activities & Output Scale", max: 15 },
            "5": { key: "outcomes", title: "Outcomes & Measurable Change", max: 10 },
            "6": { key: "resources", title: "Resource Mobilization", max: 15 },
            "7": { key: "partnerships", title: "Partnerships & Collaboration", max: 10 },
            "8": { key: "evidence", title: "Evidence & Verification", max: 10 },
            "9": { key: "learning", title: "Personal & Academic Reflection", max: 5 },
            "10": { key: "sustainability", title: "Sustainability & Continuation", max: 5 },
        },
        cii_section_max_total: 100,
        max_daily_attendance_hours_per_student: 9,
        daily_attendance_cap_message: "Daily attendance cannot exceed 9 hours",
    },
};

/** Public CII weights + attendance cap. Proxies backend when configured. */
export async function GET() {
    const result = await fetchBackendPublicJson<ReportScoringConfigPayload>("report-scoring-config", {
        logLabel: "public/report-scoring-config",
    });

    if (!result.ok || !result.data?.success || !result.data.data) {
        return NextResponse.json(FALLBACK);
    }

    return NextResponse.json(result.data);
}
