import { redirect } from "next/navigation";

/** Legacy My Projects listing — Community Service now lives in My Opportunities. */
export default function StudentProjectsPage() {
    redirect("/dashboard/student/paths/community-service?view=create");
}
