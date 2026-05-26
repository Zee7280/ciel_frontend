/**
 * HTML `accept` for student report / evidence multipart uploads — keep in sync with Nest
 * `studentReportMulterFileFilter` in ciel_backend (`src/common/student-report-file-upload.ts`).
 */
export const REPORT_ATTACHMENT_ACCEPT =
    ".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,.doc,.docx," +
    "video/*," +
    ".mp4,.m4v,.mov,.qt,.webm,.avi,.mkv,.wmv,.flv,.mpeg,.mpg,.mp2,.mpe,.mpv," +
    ".3gp,.3g2,.ogv,.ogg,.mts,.m2ts,.ts,.vob,.asf,.rm,.rmvb,.f4v,.divx";
