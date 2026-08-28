import CourseworkVerificationClient from "@/components/CourseworkVerificationClient";

type PageProps = {
    params: Promise<{ key: string }>;
};

export default async function CourseworkVerifyPage({ params }: PageProps) {
    const { key } = await params;
    const verificationKey = decodeURIComponent(key || "");
    return <CourseworkVerificationClient verificationKey={verificationKey} />;
}
