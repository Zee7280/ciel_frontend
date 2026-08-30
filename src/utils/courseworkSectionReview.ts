import { type CourseProjectEntry, stripEmoji } from "./courseProjectTypes";
import { isPathEntryApproved, isPathEntryWaiting } from "./reviewQueue";
import { reviewStatusLabel } from "./pathReviewStatus";

export type SectionCheck = {
    label: string;
    ok: boolean;
    note: string;
};

/** Field-based section review for faculty — no scores. Same idea as the merit model: explainable checks from the submitted wizard, never a number. */
export function reviewCourseProjectSections(entry: CourseProjectEntry): SectionCheck[] {
    const si = entry.studentInfo || {};
    const ai = entry.assignmentInfo || {};
    const am = entry.aimsInfo || {};
    const pr = entry.processInfo || {};
    const re = entry.resultsInfo || {};
    const sm = entry.sdgMapping || {};
    const rf = entry.reflectionInfo || {};
    const inc = entry.moduleInclusion || {};
    const formats = ai.formats?.length ? ai.formats : ai.format ? [ai.format] : [];
    const metrics = re.metrics || [];
    const files = [...(entry.assignmentFileUrl ? [entry.assignmentFileUrl] : []), ...(entry.evidenceUrls || [])];
    const claimedMeasured = metrics.some((m) => m.status === "Actual — measured");

    const courseOk = !!(entry.course?.trim() && si.teacherEmail?.trim());
    const formatOk = formats.length > 0;
    const conceptOk = !!(ai.realWorldIssue?.trim() || (inc.aim !== false && am.aimStatement?.trim()) || ai.whatAsked?.trim());
    const makingOk =
        inc.act === false && inc.meth === false
            ? true
            : !!(pr.activities?.length || pr.methods?.length || pr.sampleScale?.trim());
    const limitationOk = inc.lim === false || !!(re.limitationType?.trim() || re.limitationDetail?.trim());
    const resultsOk = !!(re.outputs?.length || re.outputDescription?.trim() || re.findings?.some(Boolean) || metrics.length);
    const responseOk = resultsOk && limitationOk;
    const sdgOk = !!(sm.notApplicable || (sm.entries?.length && sm.entries.some((e) => e.how?.trim() || e.targets?.length)));
    const reflectionOk = !!(rf.lessonLearned?.trim() && (rf.adviceNextSemester?.trim() || rf.nextSteps?.trim() || rf.skills?.length));
    const evidenceOk = !claimedMeasured || files.length > 0;

    return [
        {
            label: "§1 Course & identity",
            ok: courseOk,
            note: courseOk
                ? `verified against the submitted record${si.teacherName ? ` · ${si.teacherName}` : ""}`
                : "course or supervisor email is missing — check step 1",
        },
        {
            label: "§2 Format & pathway",
            ok: formatOk,
            note: formatOk
                ? `${formats.map((f) => stripEmoji(f).split(" (")[0]).join(" + ")} — matches the declared work`
                : "no format declared",
        },
        {
            label: "§3 Concept",
            ok: conceptOk,
            note: conceptOk
                ? (ai.realWorldIssue || am.aimStatement || ai.whatAsked || "aim present").trim()
                : "issue / aim is missing or too thin",
        },
        {
            label: "§4 Making",
            ok: makingOk,
            note: makingOk
                ? [pr.activities?.length ? `${pr.activities.length} activities` : null, pr.sampleScale ? `scale: ${pr.sampleScale}` : null]
                      .filter(Boolean)
                      .join(" · ") || "process documented"
                : "activities, method or scale missing for this pathway",
        },
        {
            label: "§5 Response — results & limitation",
            ok: responseOk,
            note: !resultsOk
                ? "output / findings / metrics missing"
                : !limitationOk
                  ? "limitation section empty — honesty is the gap"
                  : "results present; limitation named",
        },
        {
            label: "§6 SDG map",
            ok: sdgOk,
            note: sm.notApplicable
                ? "honestly declared not applicable"
                : sdgOk
                  ? `SDG ${sm.entries?.[0]?.goalNumber}${sm.entries?.[0]?.targets?.length ? ` · ${sm.entries[0].targets.join(", ")}` : ""}`
                  : "SDG named without a target or pathway — reads as name-dropping",
        },
        {
            label: "§7 Reflection",
            ok: reflectionOk,
            note: reflectionOk
                ? "lesson and transfer present"
                : "reflection too thin to transfer — lesson or advice for the next class is missing",
        },
        {
            label: "§8 Evidence — authenticity",
            ok: evidenceOk,
            note: files.length
                ? `${files.length} file${files.length === 1 ? "" : "s"} attached${claimedMeasured ? " · measured claims have files" : ""}`
                : claimedMeasured
                  ? "measured results claimed with no attached files — flag for the teacher"
                  : "no files attached (optional) — card still reviewable",
        },
    ];
}

export function pendingFacultyReview(entry: { status?: string; facultyApprovalStatus?: string | null }) {
    return isPathEntryWaiting(entry);
}

export function isFacultyApproved(entry: { status?: string; facultyApprovalStatus?: string | null }) {
    return isPathEntryApproved(entry);
}

export type CourseworkStatusTone = "draft" | "under_review" | "revision_requested" | "rejected" | "approved";

/** Single source of truth for how a coursework entry's lifecycle status reads to a human — every
 * card/pill/badge across student/faculty/university/admin views should call this instead of
 * re-deriving its own copy from status+facultyApprovalStatus. */
export function courseworkStatusLabel(entry: {
    status?: string;
    facultyApprovalStatus?: string | null;
}): { tone: CourseworkStatusTone; label: string } {
    return reviewStatusLabel(entry.status, entry.facultyApprovalStatus, "revision_requested");
}
