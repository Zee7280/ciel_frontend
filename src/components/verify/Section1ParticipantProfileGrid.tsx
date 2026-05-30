import type { ReactNode } from "react";
import { VERIFY_DOSSIER_FIELD_GRID } from "@/utils/verifyDossierFieldGrid";
import {
    buildSection1ParticipantDossierFields,
    normalizeSection1ParticipantRow,
    type Section1DossierField,
} from "@/utils/section1ParticipantDossierFields";
import { VerifyDossierFieldValue } from "@/components/verify/VerifyDossierFieldValue";
import clsx from "clsx";

export type Section1DossierFieldRenderer = (field: Section1DossierField) => ReactNode;

function DefaultField({ field, insetClassName }: { field: Section1DossierField; insetClassName?: string }) {
    return (
        <div className={clsx("mb-4 flex min-w-0 flex-col", field.fullWidth && "md:col-span-2")}>
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {field.label}
            </span>
            <div className={clsx("rounded-xl border border-slate-100 bg-slate-50/90 px-3 py-2.5 text-justify", insetClassName)}>
                <VerifyDossierFieldValue value={field.value} />
            </div>
        </div>
    );
}

function FieldGroup({
    title,
    fields,
    renderField,
    insetClassName,
}: {
    title: string;
    fields: Section1DossierField[];
    renderField?: Section1DossierFieldRenderer;
    insetClassName?: string;
}) {
    const render = renderField ?? ((field) => <DefaultField field={field} insetClassName={insetClassName} />);
    return (
        <div>
            <h4 className="mb-2 border-b border-slate-100 pb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                {title}
            </h4>
            <div className={VERIFY_DOSSIER_FIELD_GRID}>{fields.map((field) => render(field))}</div>
        </div>
    );
}

export function Section1ParticipantProfileGrid({
    participant,
    hoursDisplay,
    renderField,
    insetClassName,
}: {
    participant: unknown;
    hoursDisplay?: string;
    renderField?: Section1DossierFieldRenderer;
    /** Optional class for default inset boxes (admin dossier styling). */
    insetClassName?: string;
}) {
    const row = normalizeSection1ParticipantRow(participant);
    const { personal, academic, participation } = buildSection1ParticipantDossierFields(row, { hoursDisplay });

    return (
        <div className="space-y-4">
            <FieldGroup title="Personal information" fields={personal} renderField={renderField} insetClassName={insetClassName} />
            <FieldGroup title="Academic information" fields={academic} renderField={renderField} insetClassName={insetClassName} />
            <FieldGroup title="Participation summary" fields={participation} renderField={renderField} insetClassName={insetClassName} />
        </div>
    );
}
