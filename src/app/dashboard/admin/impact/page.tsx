import { redirect } from "next/navigation";

/** Legacy URL — My Impact Wall is the published Community Service flash deck. */
export default function AdminImpactPage() {
    redirect("/dashboard/admin/community-service?view=wall");
}
