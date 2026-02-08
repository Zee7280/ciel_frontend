import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

export default function ReportHeader() {
    return (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
            <CardHeader>
                <CardTitle className="text-blue-900">SECTION 0 — INSTRUCTIONS (Student Guidance)</CardTitle>
                <CardDescription className="text-blue-700">
                    Why this exists: Helps students fill out the report accurately.
                </CardDescription>
            </CardHeader>
            <CardContent className="text-blue-800 space-y-4">
                <p className="font-medium">
                    “Fill this report truthfully with documented evidence. Provide quantitative data where possible (counts, numbers, hours) and qualitative explanations that clearly describe what happened, why it happened, and how it contributed to broader outcomes.”
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4">
                    <div className="bg-white/50 p-3 rounded-lg">
                        <span className="font-bold block mb-1">Stakeholders Served</span>
                        Students, Quality Assurance
                    </div>
                    <div className="bg-white/50 p-3 rounded-lg">
                        <span className="font-bold block mb-1">Key Requirement</span>
                        Documented Evidence
                    </div>
                    <div className="bg-white/50 p-3 rounded-lg">
                        <span className="font-bold block mb-1">Focus</span>
                        Quantitative & Qualitative
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
