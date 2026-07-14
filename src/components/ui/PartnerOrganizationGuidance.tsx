import { Building2, Info } from "lucide-react";
import clsx from "clsx";

type PartnerOrganizationGuidanceProps = {
    /** Where this note appears — copy is tuned slightly per flow. */
    context?: "create" | "enroll";
    className?: string;
};

/**
 * Explains why students must add a partner organization when the opportunity
 * will be carried out with any external org (NGO, corporate, community, etc.).
 */
export default function PartnerOrganizationGuidance({
    context = "create",
    className,
}: PartnerOrganizationGuidanceProps) {
    const body =
        context === "enroll" ? (
            <>
                If this activity will be carried out with any external organization (NGO, corporate partner, school,
                hospital, community group, or similar), make sure partner details are already on the opportunity
                record. If they are missing, edit the listing and add the organization in{" "}
                <strong className="font-semibold text-blue-900">Section F2</strong> before you enroll. The partner
                contact should register on CIEL with the <strong className="font-semibold text-blue-900">same official email</strong>{" "}
                you enter and approve the opportunity so attendance and verification can proceed.
            </>
        ) : (
            <>
                If you plan to carry out this opportunity with any external organization (NGO, corporate partner,
                school, hospital, community group, or similar), select{" "}
                <strong className="font-semibold text-blue-900">Yes — partner organization involved</strong> and add
                complete partner details below. The organization’s contact person must register on CIEL using the{" "}
                <strong className="font-semibold text-blue-900">same official email</strong> you provide and approve
                the listing. Without this step, partner verification and attendance review cannot move forward.
            </>
        );

    return (
        <div
            className={clsx(
                "rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm text-blue-950 flex gap-3",
                className,
            )}
            role="note"
        >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                {context === "create" ? <Building2 className="h-4 w-4" aria-hidden /> : <Info className="h-4 w-4" aria-hidden />}
            </div>
            <div className="min-w-0 space-y-1">
                <p className="text-xs font-black uppercase tracking-wider text-blue-800">
                    Partner organization required for external org activities
                </p>
                <p className="text-xs font-medium leading-relaxed text-blue-900/90">{body}</p>
            </div>
        </div>
    );
}
