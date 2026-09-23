import { formatDisplayId } from "@/utils/displayIds";
import {
    buildOpportunityRecordFlashcard,
    StudentOpportunityFlashcard,
} from "@/app/dashboard/student/create-opportunity/StudentOpportunityFlashcard";

function pickNestedStr(o: Record<string, unknown> | null, ...keys: string[]): string {
    if (!o) return "";
    for (const k of keys) {
        const v = o[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
}

/** Best-effort: detail API may expose creator/student under different keys. */
function studentCreatorFromDetail(d: Record<string, unknown>): {
    name: string;
    email: string;
    id: string;
    university: string;
    department: string;
    phone: string;
} {
    const user = d.user && typeof d.user === "object" ? (d.user as Record<string, unknown>) : null;
    const student = d.student && typeof d.student === "object" ? (d.student as Record<string, unknown>) : null;
    const creator = d.creator && typeof d.creator === "object" ? (d.creator as Record<string, unknown>) : null;
    const profile =
        d.student_profile && typeof d.student_profile === "object"
            ? (d.student_profile as Record<string, unknown>)
            : d.creator_profile && typeof d.creator_profile === "object"
              ? (d.creator_profile as Record<string, unknown>)
              : null;

    const name =
        pickNestedStr(creator, "name", "full_name", "fullName") ||
        pickNestedStr(d, "creator_name", "student_name", "submitted_by_name", "owner_name") ||
        pickNestedStr(student, "name", "full_name", "fullName") ||
        pickNestedStr(user, "name", "fullName") ||
        pickNestedStr(profile, "name", "full_name");
    const email =
        pickNestedStr(creator, "email") ||
        pickNestedStr(d, "creator_email", "student_email", "submitted_by_email", "owner_email") ||
        pickNestedStr(student, "email") ||
        pickNestedStr(user, "email") ||
        pickNestedStr(profile, "email");
    const id =
        pickNestedStr(creator, "id", "user_id") ||
        pickNestedStr(d, "creator_id", "student_id", "student_user_id", "created_by", "owner_id") ||
        pickNestedStr(student, "id", "user_id") ||
        pickNestedStr(user, "id") ||
        pickNestedStr(profile, "id", "user_id");
    const university =
        pickNestedStr(creator, "university", "institution") ||
        pickNestedStr(d, "creator_university", "student_university") ||
        pickNestedStr(student, "university", "institution") ||
        pickNestedStr(profile, "university", "institution");
    const department =
        pickNestedStr(creator, "department") ||
        pickNestedStr(d, "creator_department", "student_department") ||
        pickNestedStr(student, "department") ||
        pickNestedStr(profile, "department");
    const phone =
        (typeof d.student_contact === "string" && d.student_contact.trim()) ||
        pickNestedStr(creator, "phone", "contact", "mobile") ||
        pickNestedStr(student, "phone", "contact", "mobile") ||
        pickNestedStr(user, "phone", "contact", "mobile") ||
        pickNestedStr(profile, "phone", "contact", "mobile");

    return { name, email, id, university, department, phone };
}

export function FacultyOpportunityDetailBody({ d }: { d: Record<string, unknown> }) {
    const studentRow = studentCreatorFromDetail(d);
    const hasStudentInfo =
        studentRow.name ||
        studentRow.email ||
        studentRow.id ||
        studentRow.university ||
        studentRow.department ||
        studentRow.phone;

    return (
        <div className="space-y-4">
            {hasStudentInfo ? (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                    <p className="text-xs font-bold text-blue-800 uppercase mb-2">Student (submitter)</p>
                    <ul className="space-y-1 text-slate-800">
                        {studentRow.name ? (
                            <li>
                                <span className="text-slate-500">Name:</span> {studentRow.name}
                            </li>
                        ) : null}
                        {studentRow.email ? (
                            <li>
                                <span className="text-slate-500">Email:</span> {studentRow.email}
                            </li>
                        ) : null}
                        {studentRow.id ? (
                            <li>
                                <span className="text-slate-500">User / student id:</span> {formatDisplayId(studentRow.id, "STU")}
                            </li>
                        ) : null}
                        {studentRow.university ? (
                            <li>
                                <span className="text-slate-500">University:</span> {studentRow.university}
                            </li>
                        ) : null}
                        {studentRow.department ? (
                            <li>
                                <span className="text-slate-500">Department:</span> {studentRow.department}
                            </li>
                        ) : null}
                        {studentRow.phone ? (
                            <li>
                                <span className="text-slate-500">Contact:</span> {studentRow.phone}
                            </li>
                        ) : null}
                    </ul>
                </div>
            ) : null}
            <StudentOpportunityFlashcard
                model={buildOpportunityRecordFlashcard(d, {
                    studentName: studentRow.name,
                    facultyName: typeof (d.supervision as { supervisor_name?: string } | undefined)?.supervisor_name === "string"
                        ? (d.supervision as { supervisor_name?: string }).supervisor_name
                        : undefined,
                    facultyEmail: typeof (d.supervision as { contact?: string } | undefined)?.contact === "string"
                        ? (d.supervision as { contact?: string }).contact
                        : undefined,
                    university: studentRow.university,
                })}
            />
        </div>
    );
}
