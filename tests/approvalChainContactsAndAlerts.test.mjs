import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const card = read("src/components/ciel/community-service/OpportunityApprovalCard.tsx");
const create = read("src/app/dashboard/student/paths/community-service/CommunityServiceCreate.tsx");
const chrome = read("src/components/ciel/dashboard/MockupChrome.tsx");
const facultyCs = read("src/app/dashboard/faculty/community-service/page.tsx");
const facultyHome = read("src/app/dashboard/faculty/page.tsx");
const contact = read("src/utils/cielContact.ts");

test("approval chain boxes carry the reviewer's email and phone for Faculty, Partner and CIEL PK", () => {
    assert.match(card, /email\?: string;\s*phone\?: string;/, "step type has email/phone");
    assert.match(card, /data-ciel-step-email/, "email line rendered in the box");
    assert.match(card, /data-ciel-step-phone/, "phone line rendered in the box");
    // The faculty supervisor's number is CIEL PK admin only.
    assert.match(card, /role: "Faculty",[\s\S]*?email: facultyEmail \|\| undefined,[\s\S]*?phone: \(viewer === "admin" && facultyPhone\) \|\| undefined/);
    assert.match(card, /role: viewer === "ngo" \? "NGO" : "Partner",[\s\S]*?email: partnerEmail \|\| undefined,\s*phone: partnerPhone \|\| undefined/);
    assert.match(card, /role: "CIEL PK",[\s\S]*?email: CIEL_SUPPORT_EMAIL,\s*phone: CIEL_SUPPORT_WHATSAPP_DISPLAY/);
    // Reads the same fields the student "mine" list already returns.
    assert.match(card, /"faculty_contact_email"/);
    assert.match(card, /"faculty_contact_phone"/);
    assert.match(card, /"partner_contact_email"/);
    assert.match(card, /"partner_contact_phone"/);
});

test("approval chain email / phone lines open mail and WhatsApp with a default message about the opportunity", () => {
    // The phone line is a wa.me link to that reviewer's number; the email line is a prefilled mailto.
    assert.match(card, /import \{ formatSentWaiting, mailtoHref, whatsappDigits \} from "@\/utils\/reminderLinks";/);
    assert.match(card, /const waDigits = step\.phone \? whatsappDigits\(step\.phone\) : "";/);
    assert.match(card, /const waHref = contact && waDigits \? `https:\/\/wa\.me\/\$\{waDigits\}\?text=\$\{encodeURIComponent\(message\)\}` : "";/);
    assert.match(card, /const mailHref = contact && step\.email \? mailtoHref\(step\.email, approvalChainSubject\(contact\), `\$\{message\}\\n\\n`\) : "";/);
    assert.match(card, /data-ciel-step-whatsapp[\s\S]*?<span aria-hidden>💬<\/span> \{step\.phone\}/);
    assert.match(card, /data-ciel-step-email-link/);
    // Without a number / contact the plain text stays (nothing to open).
    assert.match(card, /<>☎ \{step\.phone\}<\/>/);
    // The default message: the waiting box asks for the approval, the others name the opportunity.
    assert.match(card, /export function approvalChainMessage\(/);
    assert.match(card, /if \(step\.state === "cur"\) \{\s*return `\$\{greeting\}, \$\{about\} is awaiting your approval on CIEL PK\. Please review it when convenient\.`;/);
    assert.match(card, /return `\$\{greeting\}, I am contacting you about \$\{about\} on CIEL PK\.`;/);
    assert.match(card, /const about = `"\$\{contact\.title\}"\$\{contact\.code \? ` \(\$\{contact\.code\}\)` : ""\}`;/);
    assert.match(card, /contact\.code \? `CIEL PK Community Service Approval · \$\{contact\.code\}` : `CIEL PK · \$\{contact\.title\}`/);
    // Every card gets the opportunity from the model (title + public code); the student list passes it too.
    assert.match(card, /chainContact: \{\s*title: pickStr\(row, "title", "project_title", "projectTitle", "name"\) \|\| "Opportunity",\s*code: formatOpportunityCode\(row\) \|\| undefined,/);
    assert.match(card, /contact=\{chainContact \?\? \{ title, code: idLabel \|\| undefined \}\}/);
    assert.match(create, /<ApprovalChain steps=\{chain\.steps\} badWord=\{tab === "closed" \? "Rejected" : "Revision"\} contact=\{chain\.chainContact\} \/>/);
    // The global bridge turns every wa.me link into the app on phones / desktop app or Web on computers.
    assert.match(read("src/app/layout.tsx"), /<WhatsAppLinkBridge \/>/);
});

test("CIEL PK contact points match the footer / floating support button", () => {
    assert.match(contact, /CIEL_SUPPORT_EMAIL = "support@cielpk.com"/);
    assert.match(contact, /CIEL_SUPPORT_WHATSAPP_E164 = "923712243575"/);
    assert.match(read("src/components/FloatingSupportButton.tsx"), /923712243575/);
    assert.match(read("src/components/Footer.tsx"), /support@cielpk\.com/);
});

test("student reminder buttons preview the recipient and content before anything is sent", () => {
    // Email: a preview panel with the address, subject and content, then an explicit send.
    assert.match(create, /data-ciel-email-preview/);
    assert.match(create, /Email preview · goes to/);
    assert.match(create, /Subject:<\/span> \{emailSubject\}/);
    assert.match(create, /Content:<\/span> \{emailContent\}/);
    assert.match(create, /`Send email to \$\{who\}`/);
    assert.match(create, /CIEL PK — faculty approval requested: \$\{op\.title\}/, "subject mirrors the backend faculty mail");
    assert.match(create, /CIEL PK — partner verification requested: \$\{op\.title\}/, "subject mirrors the backend partner mail");
    // The Email button itself no longer fires the request straight away.
    assert.doesNotMatch(create, /onClick=\{\(\) => void sendReviewerEmail\(\)\}\s*className="rounded-\[9px\] bg-\[#edf4fb\]/);
    // WhatsApp: number + message shown, wa.me link (bridge opens app / web), share sheet when no number.
    assert.match(create, /data-ciel-whatsapp-preview/);
    assert.match(create, /WhatsApp preview · goes to/);
    assert.match(create, /https:\/\/wa\.me\/\$\{reviewerDigits\}\?text=\$\{encodeURIComponent\(whatsappText\)\}/);
    assert.match(create, /: whatsappShareHref\(whatsappText\)/);
    assert.match(create, /whatsappDigits\(reviewerPhoneRaw \|\| ""\)/, "accepts 03xx / +92 formats");
    assert.match(create, /Open WhatsApp/);
    assert.match(create, /Copy message/);
    // CIEL PK stage reminders go to the support desk, never a disabled button.
    assert.match(create, /reviewerRole === "admin"\s*\? CIEL_SUPPORT_EMAIL/);
    assert.match(create, /reviewerRole === "admin"\s*\? CIEL_SUPPORT_WHATSAPP_E164/);
    assert.doesNotMatch(create, /No WhatsApp number saved for this reviewer/);
});

test("WhatsApp links in the app are handed to the WhatsApp app / web client by the global bridge", () => {
    const layout = read("src/app/layout.tsx");
    assert.match(layout, /<WhatsAppLinkBridge \/>/);
    const bridge = read("src/components/WhatsAppLinkBridge.tsx");
    assert.match(bridge, /openWhatsApp\(parts\.text, parts\.digits\)/);
});

test("a revision blinks on the student's Community Service tile and on My Opportunities / My Reports", () => {
    const home = read("src/app/dashboard/student/page.tsx");
    assert.match(home, /canEditReturnedOpportunity\(row\)/, "counts opportunities a reviewer sent back");
    assert.match(home, /alertCount=\{card\.key === "communityService" \? csRevisionCount : undefined\}/, "Community Service home card blinks with the returned count");
    const hub = read("src/app/dashboard/student/paths/community-service/CommunityServiceHub.tsx");
    assert.match(hub, /title="My Opportunities"[\s\S]*?alertCount=\{oppActionCount\}/);
    assert.match(hub, /title="My Reports"[\s\S]*?alertCount=\{reportActionCount\}/);
});

test("an email deep link survives the login redirect (next=) and lands on Action Required", () => {
    const api = read("src/utils/api.ts");
    assert.match(api, /window\.location\.replace\(`\/login\$\{next\}`\)/);
    assert.match(api, /here\.startsWith\("\/dashboard"\)/, "only dashboard pages are remembered");
    // The dashboard session guard (first thing that runs for a signed-out visitor) keeps it too,
    // so the "Open member portal" email button lands on the portal after sign-in.
    const guard = read("src/components/DashboardSessionGuard.tsx");
    assert.match(guard, /router\.replace\(here\.startsWith\("\/dashboard"\) \? `\/login\?next=\$\{encodeURIComponent\(here\)\}` : "\/login"\)/);
    assert.doesNotMatch(guard, /if \(decision\.action === "login"\) router\.replace\("\/login"\);/);
    const login = read("src/app/login/page.tsx");
    assert.match(login, /searchParams\.get\("next"\)/);
    assert.match(login, /isSafeInternalReturnPath\(nextParam\)/);
    // The Action Required sub-tab is the create view with filter=action (what the email links to).
    const page = read("src/app/dashboard/student/paths/community-service/page.tsx");
    assert.match(page, /\?view=create&filter=action/);
});

test("a dead reviewer link explains that each round issues a fresh link and points to the newest email / dashboard", () => {
    for (const p of ["src/app/verify/faculty/page.tsx", "src/app/verify/partner/page.tsx"]) {
        const src = read(p);
        assert.match(src, /Each review round issues a fresh link/, p);
        assert.match(src, /open the newest CIEL PK email/, p);
    }
});

test("team roster changes pop up once on any dashboard page (email + in-app notice already exist)", () => {
    const popup = read("src/components/TeamChangePopup.tsx");
    assert.match(popup, /\/api\/v1\/notifications\?type=\$\{TEAM_NOTIFICATION_TYPE\}&status=unread&limit=10/);
    assert.match(popup, /TEAM_NOTIFICATION_TYPE = "team"/, "same type the backend roster notice writes");
    assert.match(popup, /notifications\/\$\{encodeURIComponent\(id\)\}\/read/, "Got it marks the notice read");
    assert.match(popup, /TEAM_POPUP_SEEN_KEY_PREFIX/, "shown once per notification");
    assert.match(popup, /data-ciel-team-change-popup/);
    assert.match(popup, /role="dialog"/);
    const layout = read("src/app/dashboard/layout.tsx");
    assert.match(layout, /<TeamChangePopup \/>/, "mounted for every dashboard page");
});

test("Browse Opportunities is offered to Faculty, Partner, NGO and University from their Community Service hubs", () => {
    const tiles = [
        ["src/app/dashboard/faculty/community-service/page.tsx", "/dashboard/faculty/browse"],
        ["src/app/dashboard/partner/community-service/PartnerCommunityServiceHub.tsx", "/dashboard/partner/browse"],
        ["src/app/dashboard/partner/community-service/NgoCommunityServiceHub.tsx", "/dashboard/partner/browse"],
        ["src/app/dashboard/partner/community-service/UniversityCommunityServiceHub.tsx", "/dashboard/partner/browse"],
    ];
    for (const [p, href] of tiles) {
        const src = read(p);
        assert.match(src, new RegExp(`href="${href}"[\\s\\S]{0,200}title="Browse Opportunities"`), p);
    }
    // The pages themselves: the published list, view only, inside the dashboard chrome.
    for (const p of ["src/app/dashboard/faculty/browse/page.tsx", "src/app/dashboard/partner/browse/page.tsx"]) {
        assert.match(read(p), /<ExploreOpportunitiesView variant="dashboard" \/>/, p);
    }
    const sidebar = read("src/components/Sidebar.tsx");
    assert.match(sidebar, /href: "\/dashboard\/partner\/browse"/);
    assert.match(sidebar, /href: "\/dashboard\/faculty\/browse"/);
});

test("a phone number is never shown as the reviewer's name on the student card", () => {
    assert.match(create, /function looksLikePhone\(value: string \| null \| undefined\): boolean/);
    assert.match(create, /function personName\(value: string \| null \| undefined\): string/);
    assert.match(create, /if \(role === "faculty"\) return personName\(op\.faculty_contact_name\) \|\| "Faculty";/);
    assert.match(create, /return personName\(op\.partner_contact_name\) \|\| \(org && !\/\^partner \\\/ ngo\$\/i\.test\(org\) \? org : ""\) \|\| "Partner \/ NGO";/);
    assert.doesNotMatch(create, /return op\.partner_contact_name\?\.trim\(\) \|\| "Partner \/ NGO";/);
});

test("report mission card lists every registered SDG (primary + supporting), matching the flashcard", () => {
    const chrome = read("src/app/dashboard/student/report/ReportFormChrome.tsx");
    assert.match(chrome, /\.\.\.a\.sdgs\.filter\(\(row\) => row\.role === "primary"\),\s*\.\.\.a\.sdgs\.filter\(\(row\) => row\.role !== "primary"\),/);
    assert.match(chrome, /registeredSdgNumbers\.map\(\(n\) => `SDG \$\{n\}`\)\.join\(" \+ "\)/);
    assert.doesNotMatch(chrome, /\.filter\(\(row\) => row\.role === "primary"\)\s*\.map\(\(row\) => `SDG \$\{row\.goalNumber\}`\)/);
    const merge = read("src/app/dashboard/student/report/utils/reportSdgMerge.ts");
    assert.match(merge, /role: "secondary"/, "supporting SDGs are part of the merged snapshot rows");
});

test("team members reach their member portal from My Reports, and the portal leads back there (no orphan page)", () => {
    const ws = read("src/app/dashboard/student/paths/community-service/CommunityServiceWorkspace.tsx");
    assert.match(ws, /if \(project\.is_team_member\) \{/);
    assert.match(ws, /const portalHref = `\/dashboard\/student\/projects\/\$\{encodeURIComponent\(project\.id\)\}\/participation`;/);
    assert.match(ws, /label: "Open member portal", href: portalHref, style: "primary"/);
    assert.match(ws, /label: "View team report"/);
    const types = read("src/app/dashboard/student/types.ts");
    assert.match(types, /is_team_member\?: boolean;/);
    const portal = read("src/app/dashboard/student/projects/[projectId]/participation/page.tsx");
    assert.doesNotMatch(portal, /\/dashboard\/student\/engagement"/, "the legacy Engagement page is not in the student nav");
    assert.match(portal, /href="\/dashboard\/student\/paths\/community-service\?view=workspace"[\s\S]{0,200}Back to My Reports/);
});

test("browse screens say they are Community Service (the only path with opportunities)", () => {
    const browse = read("src/app/dashboard/student/browse/page.tsx");
    assert.match(browse, /Browse Community Service opportunities/);
    assert.match(browse, /Coursework, FYP and Venture records live in their own/);
    const explore = read("src/components/opportunities/ExploreOpportunitiesView.tsx");
    assert.match(explore, /Community Service Marketplace/);
});

test("supporting SDGs show everywhere the primary does: browse cards, faculty approvals list; report payload carries them", () => {
    const explore = read("src/components/opportunities/ExploreOpportunitiesView.tsx");
    assert.match(explore, /const secondaryIds = \(Array\.isArray\(raw\.secondary_sdgs\) \? raw\.secondary_sdgs : \[\]\)/);
    assert.match(explore, /Array\.isArray\(raw\.sdg_ids\) && raw\.sdg_ids\.length/);
    const approvals = read("src/utils/facultyApprovals.ts");
    assert.match(approvals, /sdgIds\?: string\[\];/);
    assert.match(approvals, /sdgIds: Array\.isArray\(\(r as \{ sdg_ids\?: unknown \}\)\.sdg_ids\)/);
    const page = read("src/app/dashboard/faculty/approvals/page.tsx");
    assert.equal((page.match(/project\.sdgIds\?\.length \? project\.sdgIds\.map\(\(id\) => `SDG \$\{id\}`\)\.join\(" \+ "\)/g) || []).length, 2, "both approvals cards");
    assert.doesNotMatch(page, /^\s*project\.sdg \? `SDG \$\{project\.sdg\}` : "",$/m);
});

test("the notifications dropdown stays above the report's sticky toolbar on phones", () => {
    const header = read("src/components/DashboardHeader.tsx");
    assert.match(header, /sticky top-0 z-40 flex min-h-\[56px\]/, "header (and its dropdown) above the z-30 report toolbar");
    const css = read("src/app/dashboard/student/report/community-engagement-report.css");
    assert.match(css, /\.cer \.cer-sticky-head \{\s*position: sticky;\s*top: 56px;\s*z-index: 30;/);
});

test("faculty Community Service Projects: 'View flashcard' opens the approved opportunity's flashcard (read-only)", () => {
    const card = read("src/components/ciel/community-service/ProjectMonitorCard.tsx");
    assert.match(card, /onViewFlashcard\?: \(projectId: string\) => void;/);
    assert.match(card, /row\.project_id && onViewFlashcard \? \([\s\S]*?View flashcard/);
    const page = read("src/app/dashboard/faculty/community-service/page.tsx");
    assert.match(page, /onViewFlashcard=\{\(projectId\) =>\s*void reviewActions\.openOpportunityDetail\(projectId, \{ showActions: false \}\)/);
    // The dialogs are mounted once at page level, so the Projects view can open them too.
    assert.equal((page.match(/\{reviewActions\.dialogs\}/g) || []).length, 1);
    assert.match(page, /\{reviewActions\.dialogs\}\s*\{helpOpen \? \(/);
});

test("dashboard tiles can blink a notification count, and faculty review tiles use it", () => {
    assert.match(chrome, /alertCount\?: number;/);
    assert.match(chrome, /data-ciel-tile-alert/);
    assert.match(chrome, /animate-pulse/);
    assert.match(chrome, /motion-reduce:animate-none/);
    assert.match(chrome, /\$\{alerts\} \$\{alertNoun\}\$\{alerts === 1 \? "" : "s"\}/, "1 NOTIFICATION / 2 NOTIFICATIONS");
    assert.match(facultyCs, /title="Review Opportunities"[\s\S]*?alertCount=\{pendingApprovalsHero\}/);
    assert.match(facultyHome, /title="Community Service"[\s\S]*?alertCount=\{communityActions\}/);
});

test("CIEL PK admin: 'WhatsApp <reviewer>' opens a chat with the waiting faculty / partner, not a blank share", () => {
    const followUp = read("src/components/ciel/community-service/ApprovalFollowUpActions.tsx");
    const admin = read("src/app/dashboard/admin/approvals/page.tsx");
    assert.match(followUp, /phone\?: string \| null;/, "optional reviewer number");
    assert.match(followUp, /const waDigits = whatsappDigits\(phone \|\| ""\);/);
    assert.match(followUp, /waDigits \? `https:\/\/wa\.me\/\$\{waDigits\}\?text=\$\{encodeURIComponent\(waText\)\}` : whatsappShareHref\(waText\)/, "no number keeps the old share link");
    assert.match(admin, /<ApprovalFollowUpActions[\s\S]*?phone=\{\(\(\) => \{\s*const v = projRow\[waiterRole === "faculty" \? "faculty_contact_phone" : "partner_contact_phone"\];/);
    // The chain card already reads the same backend fields for its Faculty / Partner boxes.
    assert.match(card, /pickStr\(row, "faculty_contact_phone", "faculty_phone"\)/);
    assert.match(card, /pickStr\(row, "partner_contact_phone", "partner_phone"\)/);
});

test("a faculty supervisor's phone number is shown to CIEL PK admin only", () => {
    const flash = read("src/app/dashboard/student/create-opportunity/StudentOpportunityFlashcard.tsx");
    const admin = read("src/app/dashboard/admin/approvals/page.tsx");
    // Flashcard: hidden unless the page opts in; only the admin approvals page does.
    assert.match(flash, /showFacultyPhone = false,/);
    assert.match(flash, /const facultyWa = showFacultyPhone \? whatsappDigits\(model\.facultyWhatsapp\) : "";/);
    assert.match(admin, /<StudentOpportunityFlashcard[\s\S]*?showFacultyPhone\s*\/>/);
    const optedIn = [
        "src/app/projects/[id]/page.tsx",
        "src/app/verify/faculty/page.tsx",
        "src/app/verify/partner/page.tsx",
        "src/app/dashboard/student/browse/[id]/page.tsx",
        "src/app/dashboard/student/create-opportunity/page.tsx",
        "src/app/dashboard/partner/verify/page.tsx",
        "src/components/faculty/FacultyOpportunityDetailBody.tsx",
    ].filter((p) => /showFacultyPhone/.test(read(p)));
    assert.deepEqual(optedIn, [], "no other page shows the faculty number");
    // Approval chain: the Faculty box carries a phone for the admin viewer only.
    assert.match(card, /phone: \(viewer === "admin" && facultyPhone\) \|\| undefined/);
    // Student's own list: the faculty reminder has no WhatsApp number.
    assert.match(create, /reviewerRole === "faculty"\s*\? null\s*: reviewerRole === "partner"/);
});

test("CIEL PK admin → partner org: the approval request message (admin view only)", () => {
    const admin = read("src/app/dashboard/admin/approvals/page.tsx");
    const followUp = read("src/components/ciel/community-service/ApprovalFollowUpActions.tsx");
    for (const line of [
        "`Hello ${name},`",
        "`${student} has selected your organization as a partner for ${title}, and the opportunity is awaiting your approval.`",
        "Please check your email from CIEL PK and approve it there. If you don’t have an account yet, register at cielpk.com under Organization or NGO, whichever best fits your organization. Then review the opportunity in your dashboard.",
        "CIEL PK helps document and showcase community service projects, your organization’s contribution, and the impact created. Your approval will help the student move forward and ensure the project is recorded on the platform.",
        "If you have any questions, please visit cielpk.com or reply to this message. Thank you for supporting student and community impact.",
    ]) {
        assert.ok(card.includes(line), line);
    }
    assert.ok(!card.includes("￼"), "no stray object-replacement character from the pasted text");
    // Only the admin view carries the partner invite; the waiting Partner / NGO box uses it.
    assert.match(card, /\.\.\.\(viewer === "admin" && requiresPartner\s*\? \{ partnerInvite:/);
    assert.match(card, /step\.state === "cur" && contact\.partnerInvite && \(step\.role === "Partner" \|\| step\.role === "NGO"\)/);
    // The admin's "WhatsApp <partner>" button sends the same message to the partner's number.
    assert.match(followUp, /const waText = whatsappMessage\?\.trim\(\) \? whatsappMessage : copy\.whatsappText;/);
    assert.match(admin, /waiterRole === "partner" && partnerInvite\s*\? partnerApprovalRequestMessage\(\{ \.\.\.partnerInvite, title: approvalModel\.chainContact\.title \}\)/);
});
