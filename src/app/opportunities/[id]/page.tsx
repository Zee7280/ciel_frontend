import { redirect } from "next/navigation";

type PageProps = {
    params: Promise<{ id: string }>;
};

/** Legacy path; canonical opportunity detail route is `/projects/[id]`. */
export default async function LegacyOpportunityDetailPage({ params }: PageProps) {
    const { id } = await params;
    // `id` is already decoded by Next.js's dynamic-route param parsing — do not decode it again
    // (a stray literal `%` in the id would make decodeURIComponent throw and crash this route).
    redirect(`/projects/${encodeURIComponent(id || "")}`);
}
