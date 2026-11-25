"use client";

import { useParams } from "next/navigation";
import FypV9Workspace from "@/app/dashboard/student/paths/fyp-thesis/FypV9Workspace";

/** A faculty member's own FYP — the student FYP form in faculty mode (self-certified, no review loop). */
export default function FacultyFypWorkspacePage() {
    const params = useParams<{ id: string }>();
    return <FypV9Workspace id={params.id} mode="faculty" />;
}
