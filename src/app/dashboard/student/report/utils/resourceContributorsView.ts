/**
 * V21 Section 5 / Section 6 view helpers: what each resource box still needs, the "Who gave what"
 * roll-up, the contributing-partners list and the thank-you email preview. Pure functions over the
 * stored report rows so the form, Partnerships and the tests read the same wording.
 */
import {
    contributorDisplayName, contributorIdentity, contributorIsNamed, contributorKindOf, contributorOrgRequired,
    contributorPhoneLooksValid, contributorShareOf, contributorTypeOf, isMixedResourceSource, isOutsideContribution,
    normalizeContributorPhone, OTHER_CONTRIBUTOR_TYPE, resourceAmountNumber, resourceContributedBy,
} from "./resourceContributors";

export type ResourceRow = Record<string, unknown> & {
    type?: string; type_other?: string; amount?: string; unit?: string; unit_other?: string;
    sources?: string[]; source_other?: string; purpose?: string; verification?: string[] | string; verification_other?: string;
    student_team_share?: string; contributed_by?: string;
    contributor_name?: string; contributor_org?: string; contributor_email?: string; contributor_phone_code?: string; contributor_phone?: string;
    contributor_public_recognition?: boolean; evidence_trail?: string;
};

export const CASH_UNITS = ["PKR", "USD", "EUR", "GBP"] as const;
const CURRENCY_RE = /(?:PKR|USD|EUR|GBP|AED|SAR)/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTHER_TYPES = ["Other / Custom", "Other (Specify)"];
const OTHER_UNITS = ["Other…", "Other (Specify)"];
export const OTHER_VERIFICATION = "Other Verification";

const clean = (value: unknown) => String(value ?? "").trim();

export function resourceName(row: ResourceRow): string {
    const type = clean(row.type);
    return OTHER_TYPES.includes(type) ? clean(row.type_other) : type;
}
export function resourceUnit(row: ResourceRow): string {
    const unit = clean(row.unit);
    return OTHER_UNITS.includes(unit) ? clean(row.unit_other) : unit;
}
export function isCashResource(row: ResourceRow): boolean {
    return (CASH_UNITS as readonly string[]).includes(clean(row.unit)) || /cash|funding|financial/i.test(clean(row.type));
}
export function currencyOf(unit: string): string {
    return clean(unit).match(CURRENCY_RE)?.[0] || "";
}
export function fmtAmount(n: number): string {
    return Number.isInteger(n) ? n.toLocaleString("en-PK") : n.toLocaleString("en-PK", { maximumFractionDigits: 4 });
}
export function verificationList(row: ResourceRow): string[] {
    const raw = row.verification;
    return Array.isArray(raw) ? raw.map(clean).filter(Boolean) : clean(raw) ? [clean(raw)] : [];
}

/** "PKR 8,000" for cash, "14 items" otherwise; "" until a positive amount is entered. */
export function resourceAmountText(row: ResourceRow): string {
    const n = resourceAmountNumber(row.amount);
    if (n === null || n <= 0) return "";
    const unit = resourceUnit(row);
    const currency = currencyOf(unit);
    return isCashResource(row) && currency ? `${currency} ${fmtAmount(n)}` : `${fmtAmount(n)}${unit ? ` ${unit}` : ""}`;
}

/** "PKR 5,000 · Cash / Funding" — one contribution line (shared by the roll-up, Partnerships and the email). */
export function shareText(row: ResourceRow, amount: number | null): string {
    const unit = resourceUnit(row);
    const currency = currencyOf(unit);
    const n = amount ?? 0;
    const value = isCashResource(row) && currency ? `${currency} ${fmtAmount(n)}` : `${fmtAmount(n)} ${unit}`.trim();
    return `${value} · ${resourceName(row) || "Resource"}`;
}

/** The student team's own part of an entry: the total (team), its recorded share (both) or nothing. */
export function teamShareOf(row: ResourceRow): number | null {
    const who = resourceContributedBy(row);
    if (who === "team") return resourceAmountNumber(row.amount);
    if (who === "both") return resourceAmountNumber(row.student_team_share);
    return null;
}

/** "+92 300 1234567" from the stored code + number ("" when nothing usable). */
export function contributorPhoneDisplay(row: ResourceRow): string {
    const full = normalizeContributorPhone(row.contributor_phone_code, row.contributor_phone);
    if (!full) return "";
    const code = clean(row.contributor_phone_code).replace(/\D/g, "");
    const digits = full.slice(code.length + 1);
    return `+${code} ${code === "92" && digits.length === 10 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits}`;
}

/** Who the box says contributed it, for the folded summary line. */
export function contributedByText(row: ResourceRow): string {
    const who = resourceContributedBy(row);
    if (who === "team") return "Student team";
    if (who !== "outside" && who !== "both") return "";
    const named = clean(row.contributor_name) || clean(row.contributor_org);
    return `${who === "both" ? "Student team + " : ""}${named ? contributorDisplayName(row) : "contributor to be named"}`;
}

/* ---------- what each box still needs, tagged by step (1 resource · 2 contributor · 3 proof) ---------- */

export type BoxCheck = { step: 1 | 2 | 3; key: string; text: string; contributor: boolean };

export function contributorChecks(row: ResourceRow): Array<[string, string]> {
    const out: Array<[string, string]> = [];
    const type = contributorTypeOf(row);
    const org = contributorKindOf(row) === "organization";
    if (!type || (type === OTHER_CONTRIBUTOR_TYPE && !clean(row.source_other))) out.push(["who they are", "Choose what kind of contributor they are."]);
    if (!clean(row.contributor_name)) out.push(["name", org ? "Add the contact person’s full name." : "Add the contributor’s full name."]);
    if (contributorOrgRequired(row) && !clean(row.contributor_org)) out.push(["organization", "Add the organization name."]);
    if (!contributorPhoneLooksValid(row.contributor_phone_code, row.contributor_phone)) out.push(["WhatsApp", "Add the WhatsApp number as country code + mobile number, e.g. +92 300 1234567."]);
    if (!EMAIL_RE.test(clean(row.contributor_email))) out.push(["email", "Add a valid contributor email — the thank-you summary is sent to it."]);
    return out;
}

export function resourceBoxChecks(row: ResourceRow, proofCount: number): BoxCheck[] {
    const out: BoxCheck[] = [];
    const add = (step: 1 | 2 | 3, key: string, text: string, contributor = false) => out.push({ step, key, text, contributor });
    const amount = resourceAmountNumber(row.amount);
    if (!clean(row.type) || (OTHER_TYPES.includes(clean(row.type)) && !clean(row.type_other))) add(1, "what it was", "Choose what the resource was.");
    if (amount === null || amount <= 0) add(1, "amount", "Enter a positive amount or quantity.");
    if (!clean(row.unit) || (OTHER_UNITS.includes(clean(row.unit)) && !clean(row.unit_other))) add(1, "unit", "Choose the unit.");
    if (clean(row.purpose).split(/\s+/).filter(Boolean).length < 3) add(1, "what it made possible", "Say what this resource made possible — one clear line.");
    const who = resourceContributedBy(row);
    if (!who) add(2, "who contributed", "Choose who contributed this resource.");
    if (isOutsideContribution(row)) {
        contributorChecks(row).forEach(([key, text]) => add(2, key, text, true));
        if (isMixedResourceSource(row.sources)) {
            const share = resourceAmountNumber(row.student_team_share);
            if (clean(row.student_team_share) === "" || share === null || share < 0) add(2, "team’s share", "Record the student team’s own share in the same unit (enter 0 if none).", true);
            else if (amount !== null && share >= amount) add(2, "team’s share", "The student team’s own share must be smaller than the total, so that the outside contributor’s share is above zero. If the team paid for all of it, choose “Our student team”.", true);
        }
        if (!clean(row.evidence_trail)) add(3, "what the proof shows", "Say what the proof shows: where it came from, how it was used, who received it.", true);
    }
    if (proofCount <= 0) add(3, "a proof file", "Upload a receipt, photo, letter or other proof.");
    const kinds = verificationList(row);
    if (!kinds.length || (kinds.includes(OTHER_VERIFICATION) && !clean(row.verification_other))) add(3, "kind of proof", "Choose what kind of proof it is.");
    return out;
}

export function stepLabels(checks: BoxCheck[], step: 1 | 2 | 3): string[] {
    return [...new Set(checks.filter((c) => c.step === step && c.key).map((c) => c.key))];
}

/** "✓ Done" · "Still needed: amount · unit" · "4 things to fill" */
export function stepStateText(labels: string[]): string {
    if (!labels.length) return "✓ Done";
    return labels.length <= 2 ? `Still needed: ${labels.join(" · ")}` : `${labels.length} things to fill`;
}

/* ---------- 5.3 · who gave what (built from the boxes) ---------- */

export type ContributorGroup = {
    key: string;
    display: string;
    kind: "individual" | "organization";
    name: string;
    org: string;
    email: string;
    phone: string;
    publicRecognition: boolean;
    items: Array<{ index: number; row: ResourceRow; share: number | null; enabled: string }>;
    complete: boolean;
    previewReady: boolean;
};

export function groupContributors(resources: ResourceRow[], proofCountFor: (index: number) => number): ContributorGroup[] {
    const groups = new Map<string, ContributorGroup>();
    resources.forEach((row, index) => {
        if (!isOutsideContribution(row) || !contributorIsNamed(row)) return;
        const key = contributorIdentity(row) || `row|${index}`;
        const share = contributorShareOf(row);
        const complete = !resourceBoxChecks(row, proofCountFor(index)).length;
        const group = groups.get(key) || {
            key,
            display: contributorDisplayName(row),
            kind: contributorKindOf(row),
            name: clean(row.contributor_name),
            org: clean(row.contributor_org),
            email: clean(row.contributor_email),
            phone: contributorPhoneDisplay(row),
            publicRecognition: row.contributor_public_recognition === true,
            items: [],
            complete: true,
            previewReady: false,
        };
        group.items.push({ index, row, share, enabled: clean(row.purpose) });
        group.complete = group.complete && complete;
        if (!group.email) group.email = clean(row.contributor_email);
        if (!group.phone) group.phone = contributorPhoneDisplay(row);
        if (!group.name) group.name = clean(row.contributor_name);
        if (!group.org) group.org = clean(row.contributor_org);
        groups.set(key, group);
    });
    return [...groups.values()].map((g) => ({
        ...g,
        previewReady: !contributorChecks(g.items[0].row).length && g.items.some((q) => (q.share ?? 0) > 0),
    }));
}

export function contributorRoleText(group: ContributorGroup): string {
    return [
        group.items.some((q) => isCashResource(q.row)) ? "Funding / sponsorship" : "",
        group.items.some((q) => !isCashResource(q.row)) ? "In-kind / resource support" : "",
    ].filter(Boolean).join(" + ");
}

export function contributorGaveText(group: ContributorGroup): string {
    return group.items
        .filter((q) => (q.share ?? 0) > 0)
        .map((q) => shareText(q.row, q.share) + (q.enabled ? ` → ${q.enabled}` : ""))
        .join("; ") || "amount not entered yet";
}

export function whoPublic(group: ContributorGroup): string {
    return group.publicRecognition ? group.display : "A contributor (not named publicly)";
}

/** Lines for the student team's own contribution (team-funded entries and the team's share of mixed ones). */
export function teamContributionLines(resources: ResourceRow[]): string[] {
    return resources.flatMap((row) => {
        if (!resourceName(row)) return [];
        const own = teamShareOf(row);
        if (own === null || own <= 0) return [];
        return [shareText(row, own) + (clean(row.purpose) && resourceContributedBy(row) === "team" ? ` → ${clean(row.purpose)}` : "")];
    });
}

/* ---------- where the report is, for the thank-you email state ---------- */

export type ReportStage = "draft" | "pending" | "live";

export function reportStage(data: { status?: unknown; admin_status?: unknown; admin_approval_status?: unknown; report_status?: unknown }): ReportStage {
    const all = [data.admin_approval_status, data.admin_status, data.report_status, data.status].map((v) => clean(v).toLowerCase());
    if (all.some((s) => /approved|verified|published|live|completed/.test(s))) return "live";
    if (all.some((s) => /submitted|pending|review|awaiting/.test(s))) return "pending";
    return "draft";
}

export function contributorStage(group: ContributorGroup, stage: ReportStage): [string, "ok" | "wait" | "warn"] {
    if (!group.complete) return ["Details incomplete", "warn"];
    if (stage === "live") return ["Report approved · thank-you email issued by CIEL PK", "ok"];
    if (stage === "pending") return ["Queued · sends when CIEL PK Admin approves", "wait"];
    return ["Ready · sends after Admin approval", "ok"];
}

export const THANK_YOU_FLOW_STEPS: Array<[string, string]> = [
    ["Student records the contributor", "Name, WhatsApp number, email and what they gave."],
    ["Report is submitted", "The contributor record is locked with the report."],
    ["CIEL PK Admin approves", "The report and the contribution are checked together."],
    ["Thank-you email is sent", "CIEL PK emails each contributor their contribution summary."],
    ["Contributor registers — anytime", "Same email → their contribution record is waiting."],
];

export function flowStepAt(stage: ReportStage): number {
    return stage === "live" ? 5 : stage === "pending" ? 3 : 1;
}

export function recognitionNote(count: number, stage: ReportStage): string {
    if (!count) return "";
    const who = `${count} contributor${count === 1 ? "" : "s"}`;
    if (stage === "live") return `Report approved. CIEL PK issues the thank-you email and contribution summary to ${who}. Each can register at any time with the same email to see their contribution record.`;
    if (stage === "pending") return `${who} will be emailed a thank-you with their contribution summary as soon as CIEL PK Admin approves this report. Nothing has been sent yet.`;
    return `${who} will be emailed a thank-you with their contribution summary once this report is submitted and approved by CIEL PK Admin. Nothing has been sent yet. Each can register on CIEL PK at any time with the same email to see their contribution record.`;
}

/* ---------- partnership link ---------- */

type PartnerLike = { name?: unknown; pakistan_contact_name?: unknown; pakistan_contact_email?: unknown };
const norm = (value: unknown) => clean(value).toLowerCase().replace(/\s+/g, " ");

export function matchesPartner(group: ContributorGroup, partner: PartnerLike): boolean {
    const name = norm(partner.name);
    if (!name) return false;
    const sameOrg = group.kind === "organization" && !!norm(group.org) && norm(group.org) === name;
    const sameMail = !!norm(group.email) && norm(group.email) === norm(partner.pakistan_contact_email);
    const samePerson = group.kind === "individual" && !!norm(group.name)
        && (norm(group.name) === name || norm(group.name) === norm(partner.pakistan_contact_name))
        && (sameMail || !norm(partner.pakistan_contact_email));
    return sameOrg || sameMail || samePerson;
}

/** The partner (6.1 / 6.2) this contributor already is, so the contribution is counted once; "" when new. */
export function linkedPartnerName(group: ContributorGroup, partners: PartnerLike[]): string {
    const hit = partners.find((p) => matchesPartner(group, p));
    return hit ? clean(hit.name) : "";
}

export function partnerCountWithContributors(partners: PartnerLike[], groups: ContributorGroup[]): number {
    const named = partners.filter((p) => clean(p.name));
    return named.length + groups.filter((g) => !linkedPartnerName(g, named)).length;
}

export function contributingPartnerLines(groups: ContributorGroup[], partners: PartnerLike[], publicView = false): string[] {
    return groups.map((g) => {
        const link = linkedPartnerName(g, partners);
        const gave = g.items.filter((q) => (q.share ?? 0) > 0).map((q) => shareText(q.row, q.share)).join("; ") || "amount not entered yet";
        return `${publicView ? whoPublic(g) : g.display} — ${contributorRoleText(g) || "Contribution"}: ${gave}${link ? ` (same as partner ${link}; counted once)` : " (contributing partner)"}`;
    });
}

export function contributorPublicSummary(groups: ContributorGroup[], stage: ReportStage): string {
    const n = groups.length;
    if (!n) return "No outside contributors recorded.";
    return `${n} outside contributor${n === 1 ? "" : "s"} recorded and carried into Partnerships as contributing partner${n === 1 ? "" : "s"}; thank-you email ${stage === "live" ? "issued by CIEL PK after approval." : "follows Admin approval."}`;
}

/* ---------- thank-you email (preview only — CIEL PK's server sends it after Admin approval) ---------- */

export type ThankYouContext = {
    projectTitle: string;
    projectCode: string;
    partnerName?: string;
    university?: string;
    location?: string;
    dates?: string;
    teamNames?: string[];
};

export function thankYouEmailSubject(ctx: ThankYouContext): string {
    return `Thank you for supporting “${ctx.projectTitle}” — your contribution summary | CIEL PK`;
}

export function thankYouProjectLine(ctx: ThankYouContext): string {
    return `“${ctx.projectTitle}”${ctx.university ? `, carried out by students of ${ctx.university}` : ""}${ctx.partnerName ? ` with ${ctx.partnerName}` : ""}`;
}

export function thankYouCashTotals(group: ContributorGroup): Array<[string, number]> {
    const totals: Record<string, number> = {};
    group.items.forEach(({ row, share }) => {
        if (!isCashResource(row) || !(share && share > 0)) return;
        const unit = currencyOf(resourceUnit(row)) || resourceUnit(row);
        totals[unit] = (totals[unit] || 0) + share;
    });
    return Object.entries(totals);
}

export function thankYouEmailText(group: ContributorGroup, ctx: ThankYouContext): string {
    const items = group.items.filter((q) => (q.share ?? 0) > 0);
    const cashTotals = thankYouCashTotals(group);
    const inKind = items.filter((q) => !isCashResource(q.row)).length;
    const where = [ctx.location, ctx.dates].filter(Boolean).join(" · ");
    return `Dear ${group.name || group.display},\n\nThank you${group.kind === "organization" && group.org ? ` — and thank you to ${group.org} —` : ""} for supporting the student community project ${thankYouProjectLine(ctx)}${where ? ` (${where})` : ""}.\n\nCIEL PK has reviewed and approved the project report. This is the summary of what you contributed:\n\n`
        + items.map((q, i) => `${i + 1}. ${shareText(q.row, q.share)}${q.enabled ? `\n   What it made possible: ${q.enabled}` : ""}`).join("\n")
        + (cashTotals.length ? `\n\nTotal cash contributed: ${cashTotals.map(([u, n]) => `${u} ${fmtAmount(n)}`).join(" + ")}` : "")
        + (inKind ? `\nIn-kind contributions: ${inKind}` : "")
        + `\n\nProject reference: ${ctx.projectCode}${ctx.teamNames?.length ? `\nStudent team: ${ctx.teamNames.join(", ")}` : ""}`
        + `\n\nSEE YOUR CONTRIBUTION RECORD — ANYTIME\nYou can register on CIEL PK (cielpk.com) at any time using this email address (${group.email}). Your contribution to this project is already saved under it, and any future project you support will be added automatically. Registering is optional — this email is your acknowledgement either way.`
        + `\n\nIf any detail above is not correct, please let CIEL PK know so that the record can be corrected.\n\nWith appreciation,\nCIEL PK · Community Impact Education Lab Pakistan\ncielpk.com`;
}
