import ContributionCertificateClient from "@/components/ContributionCertificateClient";

type PageProps = {
    params: Promise<{ token: string }>;
};

/** Public contribution certificate for a resource contributor named in a verified report (email link). */
export default async function ContributionCertificatePage({ params }: PageProps) {
    const { token } = await params;
    return <ContributionCertificateClient token={decodeURIComponent(token || "")} />;
}
