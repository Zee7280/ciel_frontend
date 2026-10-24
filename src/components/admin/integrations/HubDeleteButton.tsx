"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { HUB_ADMIN_BASE, hubRequest, type HubDataResponse } from "@/utils/integrationHub";

type DeletionCheck = {
    deletable: boolean;
    reason: string | null;
    events: number;
    records: number;
    evidence: number;
    connections: number;
};

/**
 * Delete for platforms / connections that never received data. Asks the backend first whether the
 * item is deletable and explains why not otherwise (retire / revoke keeps history auditable).
 */
export default function HubDeleteButton({
    kind,
    id,
    name,
    className,
    onDeleted,
}: {
    kind: "platforms" | "connections";
    id: string;
    name: string;
    className: string;
    onDeleted: () => void;
}) {
    const [check, setCheck] = useState<DeletionCheck | null>(null);
    const [checking, setChecking] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const label = kind === "platforms" ? "platform" : "connection";

    const start = async () => {
        if (checking) return;
        setChecking(true);
        try {
            const j = await hubRequest<HubDataResponse<DeletionCheck>>(`${HUB_ADMIN_BASE}/${kind}/${id}/deletion-check`);
            setCheck(j.data);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not check deletion");
        } finally {
            setChecking(false);
        }
    };

    const confirm = async () => {
        setDeleting(true);
        try {
            await hubRequest(`${HUB_ADMIN_BASE}/${kind}/${id}`, { method: "DELETE" });
            toast.success(`${name} deleted`);
            setCheck(null);
            onDeleted();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Delete failed");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
            <button type="button" className={`${className} text-red-700`} disabled={checking} onClick={() => void start()}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
            <ConfirmDialog
                open={Boolean(check)}
                title={check?.deletable ? `Delete ${name}?` : `${name} cannot be deleted`}
                description={
                    check?.deletable ? (
                        kind === "platforms" ? (
                            <>
                                This permanently removes the platform, its credentials and its {check.connections} unused connection
                                {check.connections === 1 ? "" : "s"}. It never sent any data, so no records are lost. The action is
                                recorded in the audit log.
                            </>
                        ) : (
                            <>This permanently removes the connection. It never received any data. The action is recorded in the audit log.</>
                        )
                    ) : (
                        <>
                            {check?.reason}
                            {check && check.events + check.records + check.evidence > 0 ? (
                                <span className="mt-2 block text-xs text-slate-500">
                                    Holds {check.events} events, {check.records} records and {check.evidence} evidence files.
                                </span>
                            ) : null}
                        </>
                    )
                }
                confirmLabel={check?.deletable ? `Delete ${label}` : "OK"}
                variant={check?.deletable ? "danger" : "default"}
                loading={deleting}
                onCancel={() => setCheck(null)}
                onConfirm={check?.deletable ? confirm : () => setCheck(null)}
            />
        </>
    );
}
