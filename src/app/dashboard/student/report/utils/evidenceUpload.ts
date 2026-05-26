import { authenticatedFetch, isTokenValid } from "@/utils/api";
import {
    resolvePreferredApiV1Base,
    resolveTutorialMultipartUploadApiV1Base,
} from "@/utils/backendApiV1Base";
import { MAX_REPORT_UPLOAD_BYTES, MAX_REPORT_UPLOAD_LABEL } from "./fileUploadLimits";

/** Same-origin BFF / Vercel often rejects multipart bodies above ~1MB; presign + S3 PUT avoids that. */
const MULTIPART_BODY_LIMIT_BYTES = 1024 * 1024;
const PRESIGN_TIMEOUT_MS = 30_000;
/** Large evidence (up to 500MB) may need long uploads on slow connections. */
const S3_PUT_TIMEOUT_MS = 60 * 60 * 1000;

async function extractEvidenceUploadFailureDetail(res: Response): Promise<string> {
    if (res.status === 413) {
        return "file too large for the server limit — use a smaller photo or compress the PDF, then try again.";
    }
    try {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
            const j = (await res.json()) as Record<string, unknown>;
            const m = j.message;
            if (typeof m === "string" && m.trim()) return m.trim();
            if (Array.isArray(m)) {
                const parts = m
                    .filter((x): x is string => typeof x === "string")
                    .map((s) => s.trim())
                    .filter(Boolean);
                if (parts.length) return parts.join(" ");
            }
        } else {
            const text = (await res.text()).trim();
            if (text) return text.slice(0, 280);
        }
    } catch {
        /* ignore parse errors */
    }
    return `HTTP ${res.status}. Check the file type (photos, PDF, Word, or video) and connection, then retry.`;
}

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

type PresignedUpload = {
    uploadUrl?: string;
    publicUrl?: string;
    url?: string;
    key?: string;
};

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

const getPresignedUpload = (json: unknown): PresignedUpload => {
    if (!json || typeof json !== "object") return {};
    const record = json as Record<string, unknown>;
    const data = record.data && typeof record.data === "object"
        ? record.data as Record<string, unknown>
        : record;

    return {
        uploadUrl: typeof data.uploadUrl === "string" ? data.uploadUrl : undefined,
        publicUrl: typeof data.publicUrl === "string" ? data.publicUrl : undefined,
        url: typeof data.url === "string" ? data.url : undefined,
        key: typeof data.key === "string" ? data.key : undefined,
    };
};

function apiV1PathToNestUrl(apiV1Path: string, nestApiV1Base: string): string {
    const base = nestApiV1Base.replace(/\/+$/, "");
    const suffix = apiV1Path.startsWith("/api/v1") ? apiV1Path.slice("/api/v1".length) : apiV1Path;
    return `${base}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
}

async function postJsonWithAuth(url: string, body: Record<string, unknown>): Promise<Response | null> {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("ciel_token") : null;
    if (!isTokenValid(token)) return null;
    return fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
}

/** Presign via same-origin BFF (small JSON), then direct Nest if needed. */
async function requestPresign(apiV1Path: string, body: Record<string, unknown>): Promise<Response | null> {
    const viaBff = await authenticatedFetch(
        apiV1Path,
        { method: "POST", body: JSON.stringify(body) },
        { timeoutMs: PRESIGN_TIMEOUT_MS },
    );
    if (viaBff?.ok) return viaBff;

    const directBase = resolveTutorialMultipartUploadApiV1Base() ?? resolvePreferredApiV1Base();
    if (!directBase) return viaBff;

    try {
        const directUrl = apiV1PathToNestUrl(apiV1Path, directBase);
        const direct = await postJsonWithAuth(directUrl, body);
        if (direct?.ok) return direct;
    } catch {
        /* try multipart fallback below */
    }
    return viaBff;
}

async function uploadViaMultipartDirect(
    projectId: string,
    section: string,
    field: string,
    file: File,
): Promise<EvidenceRecord> {
    const nestBase = resolveTutorialMultipartUploadApiV1Base() ?? resolvePreferredApiV1Base();
    if (!nestBase) {
        throw new Error(
            `Evidence upload failed for ${file.name}: configure a direct API host for large files (multipart cannot use the web app origin).`,
        );
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("project_id", projectId);
    formData.append("section", section);
    formData.append("field", field);

    const token = localStorage.getItem("ciel_token");
    if (!isTokenValid(token)) {
        throw new Error(`Evidence upload failed for ${file.name}: session expired — sign in again.`);
    }

    const url = apiV1PathToNestUrl(
        `/api/v1/student/reports/${encodeURIComponent(projectId)}/evidence`,
        nestBase,
    );
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), S3_PUT_TIMEOUT_MS);
    let res: Response;
    try {
        res = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeoutId);
    }

    if (!res.ok) {
        const detail = await extractEvidenceUploadFailureDetail(res);
        throw new Error(`Evidence upload failed for ${file.name}: ${detail}`);
    }
    const json = await res.json().catch(() => ({}));
    return normalizeUploadedFile(json, file);
}

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

async function uploadViaPresignedPut(
    projectId: string,
    section: string,
    field: string,
    file: File,
): Promise<EvidenceRecord> {
    const isSection8Evidence = section === "section8";
    const presignPath = isSection8Evidence
        ? `/api/v1/student/reports/${encodeURIComponent(projectId)}/evidence/presign`
        : "/api/v1/student/reports/upload/presign";

    const body: Record<string, unknown> = isSection8Evidence
        ? {
            project_id: projectId,
            section,
            field,
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            size: file.size,
        }
        : {
            section: `${projectId}/${section}/${field}`,
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            size: file.size,
        };

    const res = await requestPresign(presignPath, body);

    if (!res) {
        throw new Error(
            `Evidence upload failed for ${file.name}: session may have expired or the network blocked the request — sign in again and retry.`,
        );
    }

    if (!res.ok) {
        const detail = await extractEvidenceUploadFailureDetail(res);
        throw new Error(`Evidence upload failed for ${file.name}: ${detail}`);
    }

    const json = await res.json().catch(() => ({}));
    const signed = getPresignedUpload(json);
    if (!signed.uploadUrl || !(signed.publicUrl || signed.url)) {
        throw new Error(`Evidence upload failed for ${file.name}: upload URL missing from server response.`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), S3_PUT_TIMEOUT_MS);
    let putRes: Response;
    try {
        putRes = await fetch(signed.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type || "application/octet-stream" },
            body: file,
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeoutId);
    }

    if (!putRes.ok) {
        const detail = (await putRes.text().catch(() => "")).trim();
        throw new Error(
            `Evidence upload failed for ${file.name}: S3 upload failed (${putRes.status})${detail ? ` ${detail.slice(0, 240)}` : ""}`,
        );
    }

    return normalizeUploadedFile(
        {
            data: {
                url: signed.publicUrl || signed.url,
                key: signed.key,
            },
        },
        file,
    );
}

async function uploadEvidenceFile(
    projectId: string,
    section: string,
    field: string,
    file: File,
): Promise<EvidenceRecord> {
    if (file.size > MAX_REPORT_UPLOAD_BYTES) {
        throw new Error(
            `Evidence upload failed for ${file.name}: file exceeds ${MAX_REPORT_UPLOAD_LABEL} limit.`,
        );
    }

    // Always presign → direct S3 PUT so large files never hit API/Vercel body limits.
    void MULTIPART_BODY_LIMIT_BYTES;
    try {
        return await uploadViaPresignedPut(projectId, section, field, file);
    } catch (presignErr) {
        if (file.size <= MULTIPART_BODY_LIMIT_BYTES) {
            const directBase = resolveTutorialMultipartUploadApiV1Base();
            if (directBase) {
                try {
                    return await uploadViaMultipartDirect(projectId, section, field, file);
                } catch {
                    /* fall through */
                }
            }
        }
        throw presignErr;
    }
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
