"use client";

import { useEffect, useState, type ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  busy?: boolean;
  /** Require a non-empty reason; passed to onConfirm. */
  requireReason?: boolean;
  reasonLabel?: string;
  /** Require typing this exact text to enable confirm. */
  requireTyped?: string;
  onConfirm: (reason: string) => void | Promise<void>;
  onCancel: () => void;
};

export default function ConfirmModal({
  open,
  title,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  requireReason = false,
  reasonLabel = "Reason",
  requireTyped,
  onConfirm,
  onCancel,
}: Props) {
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      setTyped("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const reasonOk = !requireReason || reason.trim().length > 0;
  const typedOk = !requireTyped || typed.trim() === requireTyped.trim();
  const disabled = busy || !reasonOk || !typedOk;
  const danger = tone === "danger";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => !busy && onCancel()}
    >
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={`text-base font-semibold ${danger ? "text-red-700" : "text-gray-900"}`}>{title}</h3>
        {children ? <div className="mt-2 text-sm text-gray-600">{children}</div> : null}
        {requireReason ? (
          <label className="mt-4 block text-sm font-medium text-gray-700">
            {reasonLabel} <span className="text-red-600">*</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm"
            />
          </label>
        ) : null}
        {requireTyped ? (
          <label className="mt-4 block text-sm font-medium text-gray-700">
            Type <span className="font-mono text-red-700">{requireTyped}</span> to confirm
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm"
            />
          </label>
        ) : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm(reason.trim())}
            disabled={disabled}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
