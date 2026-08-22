import { redirect } from "next/navigation";

/** Legacy route; folded into the "Analytics & Impact" page's Impact & SDGs / Stakeholder lens tabs. */
export default function AdminImpactPage() {
    redirect("/dashboard/admin/analytics");
}
