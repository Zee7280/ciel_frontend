/** Locked Student Report → Impact Package contract (FINAL-110-SYNC). */
export const IMPACT_PACKAGE_CONTENT_SOURCES = [
    { id: "1", name: "Participation & Individual Effort", keys: ["section1"] },
    { id: "2", name: "Community Need & Starting Point", keys: ["section2"] },
    { id: "3", name: "SDG Contribution", keys: ["section3"] },
    { id: "4", name: "Activities, Outputs & Measured Change", keys: ["section4", "section5"] },
    { id: "5", name: "Resources & Stewardship", keys: ["section6"] },
    { id: "6", name: "Partnership & Collaboration", keys: ["section7"] },
    { id: "7", name: "Evidence, Ethics & Verification", keys: ["section8"] },
    { id: "8", name: "Reflection & Academic Growth", keys: ["section9"] },
    { id: "9", name: "Sustainability & Handover", keys: ["section10"] },
] as const;

export type ImpactPackagePacketIntegrity = {
    ok: boolean;
    issues: string[];
    content_sections: number;
    answer_fields: number;
    evidence_files: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

export function validateImpactPackagePacketClient(report: unknown): ImpactPackagePacketIntegrity {
    const row = asRecord(report) || {};
    const issues: string[] = [];
    let present = 0;
    let fields = 0;
    for (const src of IMPACT_PACKAGE_CONTENT_SOURCES) {
        const missing = src.keys.filter((key) => !asRecord(row[key]));
        if (missing.length) {
            issues.push(`Missing Detailed Report content section ${src.id} (${src.name}).`);
        } else {
            present += 1;
        }
        for (const key of src.keys) {
            const rec = asRecord(row[key]);
            if (rec) fields += Object.keys(rec).length;
        }
    }
    return {
        ok: issues.length === 0,
        issues,
        content_sections: present,
        answer_fields: fields,
        evidence_files: 0,
    };
}

/** Prefer the stored submit packet; otherwise score live section objects. */
export function readImpactPackagePacketIntegrity(data: unknown): ImpactPackagePacketIntegrity | null {
    const row = asRecord(data);
    const pack = asRecord(row?.review_package);
    const pi = asRecord(pack?.packet_integrity);
    if (typeof pi?.ok === "boolean") {
        return {
            ok: pi.ok,
            issues: Array.isArray(pi.issues) ? pi.issues.map(String) : [],
            content_sections: typeof pi.content_sections === "number" ? pi.content_sections : 0,
            answer_fields: typeof pi.answer_fields === "number" ? pi.answer_fields : 0,
            evidence_files: typeof pi.evidence_files === "number" ? pi.evidence_files : 0,
        };
    }
    return null;
}

export function resolveImpactPackagePacketIntegrity(data: unknown): ImpactPackagePacketIntegrity {
    return readImpactPackagePacketIntegrity(data) || validateImpactPackagePacketClient(data);
}
