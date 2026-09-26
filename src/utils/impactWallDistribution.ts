/** Post-faculty-approval package each stakeholder gets on Community Service → My Impact Wall. */
export type ImpactWallViewer = "student" | "faculty" | "university" | "ngo" | "partner" | "admin";

export type ImpactWallPackage = {
    detailedPdf: boolean;
    combinedPdf: boolean;
    certificate: boolean;
    qrDownload: boolean;
};

export const IMPACT_WALL_PACKAGE: Record<ImpactWallViewer, ImpactWallPackage> = {
    student: { detailedPdf: true, combinedPdf: true, certificate: true, qrDownload: true },
    faculty: { detailedPdf: true, combinedPdf: true, certificate: false, qrDownload: false },
    university: { detailedPdf: true, combinedPdf: true, certificate: false, qrDownload: false },
    ngo: { detailedPdf: false, combinedPdf: false, certificate: false, qrDownload: false },
    partner: { detailedPdf: false, combinedPdf: false, certificate: false, qrDownload: false },
    admin: { detailedPdf: true, combinedPdf: true, certificate: true, qrDownload: true },
};

export type ImpactWallPackageHrefs = {
    detailedOnScreen?: string;
    detailedPdf?: string;
    combinedPdf?: string;
    certificate?: string;
    verify?: string;
};
