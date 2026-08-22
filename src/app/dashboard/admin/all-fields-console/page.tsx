import { redirect } from "next/navigation";

/** Legacy route; folded into CIEL Master's "View as stakeholder" / "Field ownership registry" tabs. */
export default function AllFieldsConsolePage() {
    redirect("/dashboard/admin/master-analytics");
}
