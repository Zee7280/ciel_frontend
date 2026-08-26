import { redirect } from "next/navigation";

/** Student analytics lives on Impact — one nav item, impact-related metrics only. */
export default function StudentAnalyticsRedirectPage() {
    redirect("/dashboard/student/impact");
}
