/**
 * Maps the app's report (+ opportunity) onto the `ciel-pk-impact-package-v1` snapshot that the
 * standalone package viewer (`/ciel-impact-package.html`) understands via `CIELPackage.load()`.
 *
 * Pure on purpose: no React, no `@/` aliases, so it can be unit-tested with node:test. The caller
 * resolves the audience, visibility and evidence list with the in-app helpers and passes them in.
 *
 * What it guarantees:
 *   - attendance `participantId`s are rewritten to the viewer's roster keys (`lead` / `member-N`),
 *     otherwise every row shows "Participant unresolved" and eligible hours are 0;
 *   - the app's `approval_status` / `entryStatus` become the viewer's `status`;
 *   - CNIC / mobile are masked (student copy) or removed (partner / public);
 *   - evidence is embedded as a link only when it is public AND the public-share consent is on;
 *     everything else is listed by name with no file attached;
 *   - the official score / badge are only included once an admin has approved the report;
 *   - file URLs, OTPs and binary blobs never travel inside `data`.
 */

export const CIEL_PACKAGE_FORMAT = "ciel-pk-impact-package-v1";

export type PackageAudience = "student" | "faculty" | "university" | "admin" | "partner" | "public";
export type PackageVisibility = "public" | "restricted" | "private";

export type PackageEvidenceInput = {
    id: string;
    url: string;
    name: string;
    kind?: string;
    section?: string;
    claim?: string;
};

export type CielPackageInput = {
    report: Record<string, unknown>;
    opportunity?: Record<string, unknown> | null;
    audience: PackageAudience;
    /** Effective visibility (public already downgraded to restricted when consent is missing). */
    visibility: PackageVisibility;
    publicConsent: boolean;
    files: PackageEvidenceInput[];
    approved: boolean;
    score?: number | null;
    badge?: string | null;
    requiredHours?: number | null;
    uniqueBeneficiaries?: number | null;
    sdgNumbers?: number[];
    now?: Date;
};

export type CielPackageSnapshot = {
    format: typeof CIEL_PACKAGE_FORMAT;
    generatedAt: string;
    project: Record<string, unknown>;
    data: Record<string, unknown>;
    evidence: Array<Record<string, unknown>>;
    review: Record<string, unknown>;
    audience: PackageAudience;
};

type Rec = Record<string, unknown>;

const asRec = (v: unknown): Rec => (v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : {});
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (v === null || v === undefined || typeof v === "object" ? "" : String(v).trim());
const firstStr = (...vals: unknown[]): string => {
    for (const v of vals) {
        const s = str(v);
        if (s && s.toLowerCase() !== "undefined" && s.toLowerCase() !== "null") return s;
    }
    return "";
};

/** `lead:ID` → `ID`, `member:3:ID` / `member:self:ID` → `ID`, anything else unchanged. */
export function stripParticipantPrefix(id: unknown): string {
    const s = str(id);
    if (s.startsWith("lead:")) return s.slice("lead:".length);
    const m = /^member:[^:]+:(.+)$/.exec(s);
    return m?.[1] ? m[1] : s;
}

const norm = (v: unknown) => str(v).toLowerCase();

/**
 * Rewrites an attendance row's participant reference to the viewer's roster key:
 * `lead` for the team lead, `member-<index>` for team members (index into `team_members`).
 */
export function resolveRosterKey(participantId: unknown, section1: Rec): string {
    const raw = str(participantId);
    const lead = asRec(section1.team_lead);
    const members = asArr(section1.team_members).map(asRec);
    const leadKeys = [lead.id, lead.participantId, lead.email, lead.cnic].map(norm).filter(Boolean);
    const memberKeys = (m: Rec) => [m.id, m.participantId, m.email, m.cnic].map(norm).filter(Boolean);

    if (!raw) return members.length === 0 ? "lead" : "";
    if (raw === "lead" || raw.startsWith("lead:")) return "lead";
    const byIndex = /^member:(\d+):/.exec(raw);
    if (byIndex) {
        const idx = Number(byIndex[1]);
        if (members[idx]) return `member-${idx}`;
    }
    if (/^member-\d+$/.test(raw) && members[Number(raw.slice(7))]) return raw;

    const plain = norm(stripParticipantPrefix(raw));
    if (plain && leadKeys.includes(plain)) return "lead";
    const at = members.findIndex((m) => memberKeys(m).includes(plain));
    if (at >= 0) return `member-${at}`;
    return raw;
}

/** `35202-1234567-1` → `•••••-•••••••-1`-style tail, keeping only the last `keep` digits. */
export function maskDigits(value: unknown, keep: number): string {
    const s = str(value);
    if (!s) return "";
    const total = (s.match(/\d/g) || []).length;
    if (total <= keep) return s.replace(/\d/g, "•");
    let seen = 0;
    return s.replace(/\d/g, (d) => {
        seen += 1;
        return total - seen < keep ? d : "•";
    });
}

const SECRET_KEY = /otp|password|passcode|secret|token/i;
/** App bookkeeping that is not a saved answer (computed metrics, wizard flags, verification state). */
const INTERNAL_KEY =
    /^(metrics|finalized|summary_stage|validation_status|verified_summary|linked_items|ladder_ui|redFlags|isNonCompliant|individual_metrics|attendance_verification_[a-z_]+)$/;
const URL_KEY = /^(url|href|src|file_?url|download_?url|signed_?url|data_?url|storage_?path|path|blob|preview_?url|thumbnail)$/i;
const PII_KEYS = ["cnic", "mobile", "phone", "email"];
/** Lists of uploaded files / media links. They become display names in `data`; the originals ride in `evidence`. */
const FILE_LIST_KEY = /^(evidence_files|formalization_files|partner_verification_files|media_urls|evidence_urls|attachments)$/;
const FILE_SINGLE_KEY = /^(evidence_file|evidence_url)$/;

const basename = (u: string): string =>
    decodeURIComponent((u.split(/[?#]/)[0].split("/").pop() || "").trim()) || "Attachment";

/** Human label for a file reference (File, {name,url}, URL string or plain name). Never a URL. */
export function fileLabel(v: unknown): string {
    if (typeof v === "string") {
        const t = v.trim();
        if (!t) return "";
        return /^(https?:|blob:|data:)/i.test(t) ? basename(t) : t;
    }
    if (!v || typeof v !== "object") return "";
    const r = v as Rec;
    const n = firstStr(r.name, r.filename, r.file_name, r.original_name, r.originalName, r.title);
    if (n) return n;
    const u = firstStr(r.url, r.href, r.src, r.signedUrl, r.fileUrl, r.file_url);
    return u ? basename(u) : "";
}

function sanitize(value: unknown, depth = 0): unknown {
    if (depth > 12) return undefined;
    if (value === null || value === undefined) return value;
    if (typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") return undefined;
    if (typeof value === "string") return value.startsWith("data:") ? "" : value;
    if (typeof value !== "object") return value;
    if (typeof File !== "undefined" && value instanceof File) return undefined;
    if (typeof Blob !== "undefined" && value instanceof Blob) return undefined;
    if (Array.isArray(value)) return value.map((v) => sanitize(v, depth + 1));
    const out: Rec = {};
    for (const [k, v] of Object.entries(value as Rec)) {
        if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
        if (SECRET_KEY.test(k) || URL_KEY.test(k) || INTERNAL_KEY.test(k)) continue;
        if (FILE_LIST_KEY.test(k)) {
            out[k] = (Array.isArray(v) ? v : v ? [v] : []).map(fileLabel).filter(Boolean);
            continue;
        }
        if (FILE_SINGLE_KEY.test(k)) {
            const label = fileLabel(v);
            if (label) out[k] = label;
            continue;
        }
        const next = sanitize(v, depth + 1);
        if (next !== undefined) out[k] = next;
    }
    return out;
}

function applyPrivacy(person: Rec, audience: PackageAudience): Rec {
    const hide = audience === "partner" || audience === "public";
    const out = { ...person };
    for (const key of PII_KEYS) {
        if (!(key in out)) continue;
        if (hide) out[key] = "";
        else if (key === "cnic") out[key] = maskDigits(out[key], 4);
        else if (key === "mobile" || key === "phone") out[key] = maskDigits(out[key], 3);
    }
    return out;
}

function attendanceStatus(row: Rec): string {
    return firstStr(row.status, row.entryStatus, row.approval_status);
}

const dateOnly = (v: unknown) => {
    const s = str(v);
    return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s;
};

/** The viewer's attendance checks accept `HH:MM` only; the app sometimes stores `9:00`. */
const hhmm = (v: unknown) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(str(v));
    return m ? `${m[1].padStart(2, "0")}:${m[2]}` : str(v);
};

/**
 * The viewer's form schema names identity fields differently from the app
 * (`fullName` / `universityName` / `academicProgram` / `semester` vs `name` / `university` /
 * `degree` / `year`). Write both spellings so the flashcard, roster and sign-off check never read blank.
 */
function identityAliases(person: Rec): Rec {
    const out = { ...person };
    const full = firstStr(out.fullName, out.name);
    if (full) {
        out.fullName = full;
        out.name = full;
    }
    const uni = firstStr(out.universityName, out.university);
    if (uni) out.universityName = uni;
    const prog = firstStr(out.academicProgram, out.degree, out.program);
    if (prog) out.academicProgram = prog;
    const sem = firstStr(out.semester, out.year);
    if (sem) out.semester = sem;
    return out;
}

function buildData(input: CielPackageInput): Rec {
    const out: Rec = {};
    for (let n = 1; n <= 11; n += 1) {
        const key = `section${n}`;
        if (input.report[key] !== undefined) out[key] = sanitize(input.report[key]);
    }

    const s1 = asRec(out.section1);
    if (Object.keys(s1).length) {
        const rawS1 = asRec(input.report.section1);
        s1.team_lead = identityAliases(applyPrivacy(asRec(s1.team_lead), input.audience));
        s1.team_members = asArr(s1.team_members).map((m) => identityAliases(applyPrivacy(asRec(m), input.audience)));
        s1.attendance_logs = asArr(s1.attendance_logs).map((l) => {
            const row = asRec(l);
            return {
                ...row,
                date: dateOnly(row.date),
                start_time: hhmm(row.start_time),
                end_time: hhmm(row.end_time),
                participantId: resolveRosterKey(row.participantId, rawS1),
                status: attendanceStatus(row),
            };
        });
        out.section1 = s1;
    }

    // The viewer's "2.2 · Baseline statement" card reads `section2.baseline_statement`; the app keeps
    // that statement in `summary_text` (the AI context summary, or the composed baseline before it runs).
    const s2 = asRec(out.section2);
    if (Object.keys(s2).length && !firstStr(s2.baseline_statement)) {
        const statement = firstStr(s2.summary_text, s2.baseline_smart_draft);
        if (statement) s2.baseline_statement = statement;
        out.section2 = s2;
    }

    return out;
}

/**
 * Where in the report this file was attached, as the viewer's data path (e.g. `section8.evidence_files`,
 * `section1.attendance_logs[2].evidence_file`), plus the same label `data` carries — the viewer
 * de-duplicates inventory vs. data placeholders on `source|name`, so both must agree.
 */
function fileSourcePath(report: Rec, f: PackageEvidenceInput): { source: string; name: string } {
    const wantUrl = str(f.url);
    const wantName = str(f.name);
    const lists: Array<[string, unknown]> = [];
    for (let n = 1; n <= 10; n += 1) {
        const sec = asRec(report[`section${n}`]);
        for (const k of Object.keys(sec)) if (FILE_LIST_KEY.test(k)) lists.push([`section${n}.${k}`, sec[k]]);
    }
    asArr(asRec(report.section1).attendance_logs).forEach((l, i) => {
        const r = asRec(l);
        for (const k of ["evidence_file", "evidence_url", "evidence_urls"]) {
            if (r[k] !== undefined && r[k] !== null) lists.push([`section1.attendance_logs[${i}].${k}`, r[k]]);
        }
    });
    for (const [path, v] of lists) {
        const items = Array.isArray(v) ? v : [v];
        for (const item of items) {
            const r = item && typeof item === "object" ? (item as Rec) : {};
            const url = typeof item === "string" ? item.trim() : firstStr(r.url, r.href, r.src, r.signedUrl, r.fileUrl, r.file_url);
            const label = fileLabel(item);
            if ((wantUrl && url === wantUrl) || (label && wantName && label === wantName)) {
                return { source: path, name: label || wantName };
            }
        }
    }
    const sec = /^section\d+$/.test(str(f.section)) ? `${str(f.section)}.evidence_files` : "section8.evidence_files";
    return { source: sec, name: wantName };
}

function buildEvidence(input: CielPackageInput): Array<Record<string, unknown>> {
    const embed = input.visibility === "public" && input.publicConsent;
    const kindMime: Record<string, string> = {
        image: "image/*",
        video: "video/*",
        audio: "audio/*",
        archive: "application/zip",
        file: "",
    };
    return input.files.map((f, i) => {
        const id = f.id || `E${String(i + 1).padStart(3, "0")}`;
        const stored = Boolean(str(f.url));
        const { source, name } = fileSourcePath(input.report, f);
        return {
            id,
            name: name || f.name || `Evidence ${i + 1}`,
            type: kindMime[f.kind || "file"] ?? "",
            source,
            caption: f.claim || "",
            visibility: input.visibility,
            // The original stays on the CIEL server; the viewer only gets a link when it may show it.
            serverStored: stored,
            storageId: stored ? id : "",
            url: embed && /^https:\/\//i.test(f.url || "") ? f.url : "",
        };
    });
}

function buildProject(input: CielPackageInput, data: Rec): Rec {
    const opp = asRec(input.opportunity);
    const nestedOpp = asRec(opp.opportunity);
    const o = Object.keys(nestedOpp).length && nestedOpp.id ? nestedOpp : opp;
    const rep = input.report;
    const s11 = asRec(asRec(data).section11);
    const org = asRec(o.organization);
    const loc = asRec(o.location);
    const timeline = asRec(o.timeline);
    const supervision = asRec(o.supervision);
    const lead = asRec(asRec(data.section1).team_lead);
    const nums = (input.sdgNumbers || []).filter((n) => Number.isFinite(n) && n >= 1 && n <= 17);

    const project: Rec = {
        id: firstStr(rep.publicId, rep.public_id, o.publicId, o.public_id, o.id, rep.project_id, rep.id),
        title: firstStr(o.title, rep.project_title, rep.title),
        start_date: dateOnly(firstStr(o.start_date, o.startDate, timeline.start_date, rep.start_date)),
        end_date: dateOnly(firstStr(o.end_date, o.endDate, timeline.end_date, rep.end_date)),
        required_hours_per_student: input.requiredHours ?? undefined,
        maximum_hours_per_day: 9,
        timezone: "Asia/Karachi",
        faculty: firstStr(
            supervision.supervisor_name,
            supervision.supervisorName,
            supervision.facultyName,
            rep.faculty_name,
            rep.facultyName,
            o.faculty_name,
            rep.supervisor_name,
        ),
        university: firstStr(rep.university_name, rep.university, o.university_name, o.universityName, org.university, lead.university),
        venue: firstStr(o.location_text, o.locationText, o.venue, loc.venue, loc.address, o.address),
        sdg_primary: nums.length ? [nums[0]] : [],
        sdg_secondary: nums.slice(1),
        unique_beneficiaries: input.uniqueBeneficiaries ?? undefined,
        submitted_at: firstStr(rep.submitted_at, rep.submittedAt),
        signed_at: firstStr(s11.signed_at),
    };
    for (const k of Object.keys(project)) {
        const v = project[k];
        if (v === "" || v === undefined || (Array.isArray(v) && v.length === 0)) delete project[k];
    }
    return project;
}

export function buildCielPackageSnapshot(input: CielPackageInput): CielPackageSnapshot {
    const data = buildData(input);
    const review: Rec = {};
    if (input.approved && typeof input.score === "number" && Number.isFinite(input.score)) {
        review.status = "approved";
        review.score = input.score;
        if (input.badge) review.badge = input.badge;
    }
    return {
        format: CIEL_PACKAGE_FORMAT,
        generatedAt: (input.now ?? new Date()).toISOString(),
        project: buildProject(input, data),
        data,
        evidence: buildEvidence(input),
        review,
        audience: input.audience,
    };
}
