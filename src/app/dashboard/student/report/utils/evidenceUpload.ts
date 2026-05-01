import { authenticatedFetch } from "@/utils/api";

type EvidenceRecord = {
    file?: File;
    name?: string;
    fileName?: string;
    filename?: string;
    originalName?: string;
    size?: number;
    bytes?: number;
    file_size?: number;
    size_bytes?: number;
    type?: string;
    mimeType?: string;
    mimetype?: string;
    url?: string;
    path?: string;
    evidence_url?: string;
    file_url?: string;
    location?: string;
    lastModified?: number;
    [key: string]: unknown;
};

type EvidenceItem = File | EvidenceRecord | string;

const isNativeFile = (item: EvidenceItem): item is File => (
    typeof File !== "undefined" && item instanceof File
);

const isRecord = (item: EvidenceItem): item is EvidenceRecord => (
    typeof item === "object" && item !== null && !isNativeFile(item)
);

const getPendingFile = (item: EvidenceItem): File | null => {
    if (isNativeFile(item)) return item;
    if (isRecord(item) && isNativeFile(item.file as EvidenceItem)) return item.file as File;
    return null;
};

const getUrl = (item: unknown): string => {
    if (typeof item === "string") return item;
    if (!item || typeof item !== "object") return "";
    const record = item as EvidenceRecord;
    const url = record.url || record.evidence_url || record.file_url || record.location || record.path;
    return typeof url === "string" ? url : "";
};

const getUploadPayload = (json: unknown): unknown => {
    if (!json || typeof json !== "object") return json;
    const record = json as Record<string, unknown>;
    const data = record.data;

    if (Array.isArray(data)) return data[0];
    if (data && typeof data === "object") {
        const dataRecord = data as Record<string, unknown>;
        if (Array.isArray(dataRecord.files)) return dataRecord.files[0];
        if (Array.isArray(dataRecord.evidence_files)) return dataRecord.evidence_files[0];
        if (dataRecord.file) return dataRecord.file;
        return data;
    }

    if (Array.isArray(record.files)) return record.files[0];
    if (Array.isArray(record.evidence_files)) return record.evidence_files[0];
    if (record.file) return record.file;
    return json;
};

const normalizeUploadedFile = (uploaded: unknown, source: File): EvidenceRecord => {
    const payload = getUploadPayload(uploaded);
    const record = payload && typeof payload === "object" ? payload as EvidenceRecord : {};
    const url = getUrl(payload);

    return {
        ...record,
        name: record.name || record.fileName || record.filename || record.originalName || source.name,
        size: record.size ?? record.bytes ?? record.file_size ?? record.size_bytes ?? source.size,
        type: record.type || record.mimeType || record.mimetype || source.type,
        ...(url ? { url } : {}),
    };
};

const stripRuntimeFile = (item: EvidenceItem): EvidenceItem => {
    if (isNativeFile(item)) {
        return {
            name: item.name,
            size: item.size,
            type: item.type,
            lastModified: item.lastModified,
        };
    }

    if (!isRecord(item)) return item;

    const metadata = { ...item };
    delete metadata.file;
    return metadata;
};

async function uploadEvidenceFile(
    projectId: string,
    section: string,
    field: string,
    file: File,
): Promise<EvidenceRecord> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("project_id", projectId);
    formData.append("section", section);
    formData.append("field", field);

    const res = await authenticatedFetch(
        `/api/v1/student/reports/${encodeURIComponent(projectId)}/evidence`,
        {
            method: "POST",
            body: formData,
        },
        {
            timeoutMs: 60000,
        },
    );

    if (!res || !res.ok) {
        throw new Error(`Evidence upload failed for ${file.name}`);
    }

    const json = await res.json().catch(() => ({}));
    return normalizeUploadedFile(json, file);
}

async function uploadEvidenceList(
    projectId: string,
    section: string,
    field: string,
    files: EvidenceItem[] | undefined,
): Promise<EvidenceItem[]> {
    if (!Array.isArray(files) || files.length === 0) return [];

    const uploaded: EvidenceItem[] = [];

    for (const item of files) {
        const pendingFile = getPendingFile(item);
        if (pendingFile) {
            uploaded.push(await uploadEvidenceFile(projectId, section, field, pendingFile));
            continue;
        }

        uploaded.push(stripRuntimeFile(item));
    }

    return uploaded;
}

/** If the API only allows certain `section` values, keep draft save working with file metadata (user may re-attach). */
async function uploadEvidenceListWithFallback(
    projectId: string,
    section: string,
    field: string,
    files: EvidenceItem[] | undefined,
): Promise<EvidenceItem[]> {
    try {
        return await uploadEvidenceList(projectId, section, field, files);
    } catch (err) {
        console.warn(`[reports] Evidence upload failed (${section}/${field}); saving file metadata only`, err);
        if (!Array.isArray(files) || files.length === 0) return [];
        return files.map((item) => stripRuntimeFile(item));
    }
}

/** Remove File/Blob or huge data-URL strings so JSON draft bodies stay under gateway body limits (avoid HTTP 413). */
const MAX_DRAFT_INLINE_STRING = 400_000;

export function stripHeavyBinaryFromDraftPayload<T>(value: T): T {
    if (typeof File !== "undefined" && value instanceof File) {
        return {
            name: value.name,
            size: value.size,
            type: value.type,
            lastModified: value.lastModified,
        } as T;
    }
    if (typeof Blob !== "undefined" && value instanceof Blob) {
        return { size: value.size, type: value.type } as T;
    }
    if (typeof value === "string") {
        if (value.length <= MAX_DRAFT_INLINE_STRING) return value;
        if (value.startsWith("data:")) return true as T;
        return `${value.slice(0, MAX_DRAFT_INLINE_STRING)}…` as T;
    }
    if (Array.isArray(value)) {
        return value.map((v) => stripHeavyBinaryFromDraftPayload(v)) as T;
    }
    if (value && typeof value === "object") {
        const obj = value as Record<string, unknown>;
        const out: Record<string, unknown> = {};
        for (const k of Object.keys(obj)) {
            out[k] = stripHeavyBinaryFromDraftPayload(obj[k]);
        }
        return out as T;
    }
    return value;
}

async function resolveAttendanceLogEvidenceFiles(
    projectId: string,
    logs: Record<string, unknown>[] | undefined,
): Promise<Record<string, unknown>[] | undefined> {
    if (!Array.isArray(logs) || logs.length === 0) return logs;

    const out: Record<string, unknown>[] = [];
    for (let i = 0; i < logs.length; i++) {
        const log = { ...logs[i] };
        const raw = log.evidence_file;
        let file: File | null = null;
        if (typeof File !== "undefined" && raw instanceof File) {
            file = raw;
        } else if (raw && typeof raw === "object" && typeof File !== "undefined" && (raw as EvidenceRecord).file instanceof File) {
            file = (raw as EvidenceRecord).file as File;
        }
        if (file) {
            const safeId = typeof log.id === "string" && log.id.trim()
                ? log.id.replace(/[^\w.-]+/g, "_")
                : `row_${i}`;
            try {
                const rec = await uploadEvidenceFile(projectId, "section1", `attendance_${safeId}`, file);
                const url = getUrl(rec);
                log.evidence_file = url || true;
            } catch (err) {
                console.warn("[reports] Attendance evidence upload failed; storing file metadata only", err);
                log.evidence_file = {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified,
                };
            }
        }
        out.push(log);
    }
    return out;
}

export async function prepareReportEvidenceForSave<T extends object>(
    reportData: T,
    projectId: string,
): Promise<T> {
    const reportRecord = reportData as Record<string, unknown>;

    const section1 = (reportRecord.section1 || {}) as { attendance_logs?: Record<string, unknown>[]; [key: string]: unknown };
    const attendanceLogs = await resolveAttendanceLogEvidenceFiles(projectId, section1.attendance_logs);

    const section6 = (reportRecord.section6 || {}) as {
        evidence_files?: EvidenceItem[];
        [key: string]: unknown;
    };
    const section6Files = await uploadEvidenceListWithFallback(
        projectId,
        "section6",
        "evidence_files",
        section6.evidence_files,
    );

    const section7 = (reportRecord.section7 || {}) as {
        formalization_files?: EvidenceItem[];
        [key: string]: unknown;
    };
    const section7Files = await uploadEvidenceListWithFallback(
        projectId,
        "section7",
        "formalization_files",
        section7.formalization_files,
    );

    const section8 = (reportRecord.section8 || {}) as {
        evidence_files?: EvidenceItem[];
        partner_verification_files?: EvidenceItem[];
        [key: string]: unknown;
    };
    const evidenceFiles = await uploadEvidenceList(projectId, "section8", "evidence_files", section8.evidence_files);
    const partnerFiles = await uploadEvidenceList(
        projectId,
        "section8",
        "partner_verification_files",
        section8.partner_verification_files,
    );

    const evidenceUrls = evidenceFiles
        .map(getUrl)
        .filter((url): url is string => Boolean(url));

    const merged = {
        ...reportData,
        evidence_urls: evidenceUrls,
        section1: {
            ...section1,
            ...(attendanceLogs ? { attendance_logs: attendanceLogs } : {}),
        },
        section6: {
            ...section6,
            evidence_files: section6Files,
        },
        section7: {
            ...section7,
            formalization_files: section7Files,
        },
        section8: {
            ...section8,
            evidence_files: evidenceFiles,
            partner_verification_files: partnerFiles,
        },
    } as T;

    return stripHeavyBinaryFromDraftPayload(merged);
}
