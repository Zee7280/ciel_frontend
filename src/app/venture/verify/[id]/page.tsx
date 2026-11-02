import PathVerificationClient from "@/components/PathVerificationClient";

type PageProps = { params: Promise<{ id: string }> };

export default async function VerifyPage({ params }: PageProps) {
    const { id } = await params;
    return <PathVerificationClient kind="venture" id={decodeURIComponent(id || "")} />;
}
