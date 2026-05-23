/** Aligned with Nest `STUDENT_REPORT_MAX_FILE_BYTES` in `student-report-file-upload.ts`. */
export const MAX_REPORT_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_REPORT_UPLOAD_LABEL = "50 MB";

/** @deprecated Use {@link MAX_REPORT_UPLOAD_BYTES} */
export const MAX_REPORT_IMAGE_UPLOAD_BYTES = MAX_REPORT_UPLOAD_BYTES;
/** @deprecated Use {@link MAX_REPORT_UPLOAD_LABEL} */
export const MAX_REPORT_IMAGE_UPLOAD_LABEL = MAX_REPORT_UPLOAD_LABEL;

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
        if (file.size > MAX_REPORT_UPLOAD_BYTES) {
            rejected.push(file);
            return;
        }
        accepted.push(file);
    });

    return { accepted, rejected };
}
