import { formatDisplayId } from "@/utils/displayIds";

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
    const title = typeof d.title === "string" ? d.title : "—";
    const mode = typeof d.mode === "string" ? d.mode : "";
    const types = Array.isArray(d.types) ? (d.types as string[]).filter((t) => typeof t === "string") : [];
    const visibility = typeof d.visibility === "string" ? d.visibility : "";
    const studentRow = studentCreatorFromDetail(d);
    const hasStudentInfo =
        studentRow.name ||
        studentRow.email ||
        studentRow.id ||
        studentRow.university ||
        studentRow.department ||
        studentRow.phone;

    const objectives = d.objectives && typeof d.objectives === "object" ? (d.objectives as Record<string, unknown>) : null;
    const objDesc = objectives && typeof objectives.description === "string" ? objectives.description : "";
    const benCount =
        objectives && typeof objectives.beneficiaries_count === "number" ? objectives.beneficiaries_count : undefined;
    const benTypes = Array.isArray(objectives?.beneficiaries_type)
        ? (objectives!.beneficiaries_type as string[]).filter((t) => typeof t === "string")
        : [];

    const timeline = d.timeline && typeof d.timeline === "object" ? (d.timeline as Record<string, unknown>) : null;
    const activity =
        d.activity_details && typeof d.activity_details === "object"
            ? (d.activity_details as Record<string, unknown>)
            : d.activityDetails && typeof d.activityDetails === "object"
              ? (d.activityDetails as Record<string, unknown>)
              : null;
    const responsibilities =
        activity && typeof activity.student_responsibilities === "string"
            ? activity.student_responsibilities
            : activity && typeof activity.studentResponsibilities === "string"
              ? activity.studentResponsibilities
              : "";

    const skillsRaw = activity?.skills_gained ?? activity?.skillsGained;
    const skills = Array.isArray(skillsRaw) ? (skillsRaw as string[]).filter((s) => typeof s === "string") : [];

    const sdgInfo = d.sdg_info && typeof d.sdg_info === "object" ? (d.sdg_info as Record<string, unknown>) : null;
    const supervision = d.supervision && typeof d.supervision === "object" ? (d.supervision as Record<string, unknown>) : null;
    const executing =
        d.executing_context && typeof d.executing_context === "object"
            ? (d.executing_context as Record<string, unknown>)
            : d.executingContext && typeof d.executingContext === "object"
              ? (d.executingContext as Record<string, unknown>)
              : null;

    const loc = d.location && typeof d.location === "object" ? (d.location as Record<string, unknown>) : null;

    const participation =
        d.participation_scope && typeof d.participation_scope === "object"
            ? (d.participation_scope as Record<string, unknown>)
            : null;
    const deptRest =
        participation?.department_restriction && typeof participation.department_restriction === "object"
            ? (participation.department_restriction as Record<string, unknown>)
            : null;
    const deptList = Array.isArray(deptRest?.departments) ? (deptRest!.departments as string[]).filter(Boolean) : [];

    const extCollab =
        d.external_partner_collaboration && typeof d.external_partner_collaboration === "object"
            ? (d.external_partner_collaboration as Record<string, unknown>)
            : null;
    const partnerOrgRoot =
        d.partner_organization && typeof d.partner_organization === "object"
            ? (d.partner_organization as Record<string, unknown>)
            : null;
    const partnerOrg =
        pickNestedStr(supervision as Record<string, unknown> | null, "partner_org_name", "external_partner_org_name") ||
        (typeof extCollab?.organization_name === "string" ? extCollab.organization_name : "") ||
        (typeof partnerOrgRoot?.organization_name === "string" ? partnerOrgRoot.organization_name : "");
    const partnerPerson =
        pickNestedStr(
            supervision as Record<string, unknown> | null,
            "partner_contact_person",
            "external_partner_contact_person",
        ) ||
        (typeof extCollab?.contact_person === "string" ? extCollab.contact_person : "") ||
        (typeof partnerOrgRoot?.contact_person === "string" ? partnerOrgRoot.contact_person : "");
    const partnerEmail =
        pickNestedStr(supervision as Record<string, unknown> | null, "partner_email", "external_partner_email") ||
        (typeof extCollab?.official_email === "string" ? extCollab.official_email : "") ||
        (typeof partnerOrgRoot?.official_email === "string" ? partnerOrgRoot.official_email : "");
    const execPartner =
        executing && executing.partner && typeof executing.partner === "object"
            ? (executing.partner as Record<string, unknown>)
            : null;
    const epOrg = execPartner && typeof execPartner.organization_name === "string" ? execPartner.organization_name : "";
    const epPerson = execPartner && typeof execPartner.contact_person === "string" ? execPartner.contact_person : "";
    const epMail = execPartner && typeof execPartner.official_email === "string" ? execPartner.official_email : "";

    return (
        <div className="space-y-6 text-sm">
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

            <div>
                <h3 className="font-bold text-lg text-slate-900">{title}</h3>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-600">
                    {mode ? (
                        <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">{mode}</span>
                    ) : null}
                    {visibility ? (
                        <span className="bg-slate-100 px-2 py-0.5 rounded font-medium capitalize">{visibility}</span>
                    ) : null}
                </div>
            </div>

            {types.length > 0 ? (
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Activity types</p>
                    <p className="text-slate-800">{types.join(", ")}</p>
                </div>
            ) : null}

            {timeline ? (
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Timeline</p>
                    <ul className="list-disc list-inside text-slate-700 space-y-1">
                        {typeof timeline.type === "string" ? <li>Type: {timeline.type}</li> : null}
                        {typeof timeline.start_date === "string" ? <li>Start: {timeline.start_date}</li> : null}
                        {typeof timeline.end_date === "string" ? <li>End: {timeline.end_date}</li> : null}
                        {typeof timeline.expected_hours === "number" ? <li>Expected hours (per student): {timeline.expected_hours}</li> : null}
                        {typeof timeline.volunteers_required === "number" ? <li>Volunteers: {timeline.volunteers_required}</li> : null}
                    </ul>
                </div>
            ) : null}

            {loc && (loc.city || loc.venue) ? (
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Location</p>
                    <p className="text-slate-800">
                        {[typeof loc.venue === "string" ? loc.venue : "", typeof loc.city === "string" ? loc.city : ""]
                            .filter(Boolean)
                            .join(", ") || "—"}
                    </p>
                </div>
            ) : null}

            {objDesc ? (
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Objectives</p>
                    <p className="text-slate-800 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100">{objDesc}</p>
                </div>
            ) : null}

            {benCount !== undefined || benTypes.length > 0 ? (
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Beneficiaries</p>
                    <p className="text-slate-800">
                        {benCount !== undefined ? <>Planned count: {benCount}. </> : null}
                        {benTypes.length > 0 ? <>Types: {benTypes.join(", ")}</> : null}
                    </p>
                </div>
            ) : null}

            {participation ? (
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Participation scope</p>
                    <ul className="list-disc list-inside text-slate-700 space-y-1">
                        {typeof participation.rule === "string" ? <li>Rule: {participation.rule}</li> : null}
                        {typeof participation.creator_university_name === "string" ? (
                            <li>Creator university: {participation.creator_university_name}</li>
                        ) : null}
                        {deptRest && typeof deptRest.scope === "string" ? (
                            <li>
                                Departments ({deptRest.scope}): {deptList.length ? deptList.join(", ") : "—"}
                            </li>
                        ) : null}
                    </ul>
                </div>
            ) : null}

            {sdgInfo ? (
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">SDG</p>
                    <p className="text-slate-800">
                        Primary SDG ID: {String(sdgInfo.sdg_id ?? sdgInfo.sdgId ?? "—")} · Target:{" "}
                        {String(sdgInfo.target_id ?? sdgInfo.targetId ?? "—")}
                    </p>
                </div>
            ) : null}

            {responsibilities ? (
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Student responsibilities</p>
                    <p className="text-slate-800 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100">{responsibilities}</p>
                </div>
            ) : null}

            {skills.length > 0 ? (
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Skills</p>
                    <p className="text-slate-800">{skills.join(", ")}</p>
                </div>
            ) : null}

            {supervision ? (
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Faculty supervision (as submitted)</p>
                    <ul className="list-disc list-inside text-slate-700 space-y-1">
                        {typeof supervision.supervisor_name === "string" ? <li>Supervisor: {supervision.supervisor_name}</li> : null}
                        {typeof supervision.role === "string" ? <li>Role: {supervision.role}</li> : null}
                        {typeof supervision.contact === "string" ? <li>Official email: {supervision.contact}</li> : null}
                        {typeof supervision.faculty_department === "string" ? <li>Department: {supervision.faculty_department}</li> : null}
                        {typeof supervision.faculty_university_name === "string" ? (
                            <li>University (context): {supervision.faculty_university_name}</li>
                        ) : null}
                    </ul>
                </div>
            ) : null}

            {partnerOrg || partnerPerson || partnerEmail || epOrg || epPerson || epMail ? (
                <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
                    <p className="text-xs font-bold text-amber-900 uppercase mb-2">Partner organization (if applicable)</p>
                    <ul className="space-y-1 text-slate-800">
                        <li>
                            <span className="text-slate-500">Organization:</span> {partnerOrg || epOrg || "—"}
                        </li>
                        <li>
                            <span className="text-slate-500">Contact person:</span> {partnerPerson || epPerson || "—"}
                        </li>
                        <li>
                            <span className="text-slate-500">Email:</span> {partnerEmail || epMail || "—"}
                        </li>
                    </ul>
                </div>
            ) : null}
        </div>
    );
}
