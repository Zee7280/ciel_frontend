export const MAX_REPORT_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_REPORT_IMAGE_UPLOAD_LABEL = "5 MB";

const IMAGE_EXTENSION_PATTERN = /\.(avif|gif|heic|heif|jpe?g|png|svg|webp)$/i;

export function isReportImageFile(file: File): boolean {
    return file.type.startsWith("image/") || IMAGE_EXTENSION_PATTERN.test(file.name);
}

export function splitReportFilesByImageSize(files: File[]): {
    accepted: File[];
    rejected: File[];
} {
    const accepted: File[] = [];
    const rejected: File[] = [];

    files.forEach((file) => {
        if (isReportImageFile(file) && file.size > MAX_REPORT_IMAGE_UPLOAD_BYTES) {
            rejected.push(file);
            return;
        }
        accepted.push(file);
    });

    return { accepted, rejected };
}
