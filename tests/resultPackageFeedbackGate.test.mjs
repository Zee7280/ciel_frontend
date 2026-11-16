// A verified report's result package opens only after the student gives feedback (once per report).
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

test("the gate checks per-report status, blocks with the survey, and opens the package after submit", () => {
    const gate = read("src/components/feedback/ResultPackageFeedbackGate.tsx");
    assert.match(gate, /RESULT_FEEDBACK_STATUS_API = "\/api\/v1\/feedback\/cep-experience\/status"/);
    assert.match(gate, /\?reportId=\$\{encodeURIComponent\(reportId\)\}/);
    assert.match(gate, /submitCepFeedback\(answers, reportId\)/);
    assert.match(gate, /if \(state === "open"\) return <>\{children\}<\/>;/);
    // A failed status check never locks the student out of a verified result.
    assert.match(gate, /if \(!res\?\.ok\) \{\s*setState\("open"\);/);
    assert.match(gate, /Submit feedback & open my result package/);
    // No close / snooze on the gate.
    assert.doesNotMatch(gate, /Remind me in 2 weeks/);
});

test("the report page wraps the verified flash card / result package in the gate, team members excluded", () => {
    const page = read("src/app/dashboard/student/report/page.tsx");
    assert.match(page, /ciiVerifiedSummaryLock && !isTeamMemberAttendanceOnly && resultReportId \? \(/);
    assert.match(page, /<ResultPackageFeedbackGate reportId=\{resultReportId\}>\{flashCard\}<\/ResultPackageFeedbackGate>/);
});

test("the dashboard prompt and the gate share one question set and one submit", () => {
    const prompt = read("src/components/feedback/CepExperienceFeedbackPrompt.tsx");
    assert.match(prompt, /export function CepFeedbackQuestions\(/);
    assert.match(prompt, /export async function submitCepFeedback\(a: CepFeedbackAnswers, reportId\?: string \| null\)/);
    assert.match(prompt, /\.\.\.\(reportId \? \{ reportId \} : \{\}\)/);
    assert.match(prompt, /<CepFeedbackQuestions answers=\{answers\} onChange=\{setAnswers\} \/>/);
});
