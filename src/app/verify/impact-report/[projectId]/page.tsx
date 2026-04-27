import { redirect } from "next/navigation";

type PageProps = {
    params: Promise<{ projectId: string }>;
};

/** Legacy path; canonical route is `/impact/verify/[key]`. */
export default async function LegacyVerifyImpactReportPage({ params }: PageProps) {
    const { projectId } = await params;
    const key = decodeURIComponent(projectId || "");
    redirect(`/impact/verify/${encodeURIComponent(key)}`);
}
