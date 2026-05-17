import { toast } from "sonner";

/** Public detail URL (`/projects/[id]`) — same as browse list and My Projects share. */
export function buildOpportunityShareUrl(opportunityId: string): string {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/projects/${encodeURIComponent(opportunityId)}`;
}

export async function copyOpportunityShareLink(opportunityId: string): Promise<void> {
    const url = buildOpportunityShareUrl(opportunityId);
    if (!url) return;
    try {
        await navigator.clipboard.writeText(url);
        toast.success("Project link copied");
    } catch {
        toast.error("Could not copy link");
    }
}
