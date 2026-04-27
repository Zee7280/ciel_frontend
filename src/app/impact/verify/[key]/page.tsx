import ImpactReportVerificationClient from "@/components/ImpactReportVerificationClient";

type PageProps = {
    params: Promise<{ key: string }>;
};

export default async function ImpactVerifyPage({ params }: PageProps) {
    const { key } = await params;
    const verificationKey = decodeURIComponent(key || "");
    return <ImpactReportVerificationClient verificationKey={verificationKey} />;
}
