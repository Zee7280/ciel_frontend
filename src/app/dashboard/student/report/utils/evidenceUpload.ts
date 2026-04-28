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

async function uploadEvidenceFile(projectId: string, field: string, file: File): Promise<EvidenceRecord> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("project_id", projectId);
    formData.append("section", "section8");
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
    field: string,
    files: EvidenceItem[] | undefined,
): Promise<EvidenceItem[]> {
    if (!Array.isArray(files) || files.length === 0) return [];

    const uploaded: EvidenceItem[] = [];

    for (const item of files) {
        const pendingFile = getPendingFile(item);
        if (pendingFile) {
            uploaded.push(await uploadEvidenceFile(projectId, field, pendingFile));
            continue;
        }

        uploaded.push(stripRuntimeFile(item));
    }

    return uploaded;
}

export async function prepareReportEvidenceForSave<T extends object>(
    reportData: T,
    projectId: string,
): Promise<T> {
    const reportRecord = reportData as Record<string, unknown>;
    const section8 = (reportRecord.section8 || {}) as {
        evidence_files?: EvidenceItem[];
        partner_verification_files?: EvidenceItem[];
        [key: string]: unknown;
    };
    const evidenceFiles = await uploadEvidenceList(projectId, "evidence_files", section8.evidence_files);
    const partnerFiles = await uploadEvidenceList(
        projectId,
        "partner_verification_files",
        section8.partner_verification_files,
    );

    const evidenceUrls = evidenceFiles
        .map(getUrl)
        .filter((url): url is string => Boolean(url));

    return {
        ...reportData,
        evidence_urls: evidenceUrls,
        section8: {
            ...section8,
            evidence_files: evidenceFiles,
            partner_verification_files: partnerFiles,
        },
    } as T;
}
