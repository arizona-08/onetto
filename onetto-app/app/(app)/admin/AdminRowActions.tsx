"use client";

import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { useToast } from "@/app/components/context/ToastContext";
import AdminDangerConfirmDialog from "./AdminDangerConfirmDialog";

type EditField = {
  name: string;
  label: string;
  value: string | number;
  type?: "text" | "email" | "number";
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
};

type Action = {
  title: string;
  description: string;
  endpoint: string;
  method: "PATCH" | "DELETE";
  confirmationWord: string;
  successMessage: string;
  body?: Record<string, string>;
};

type Edit = {
  title: string;
  description?: string;
  endpoint: string;
  fields: EditField[];
  successMessage: string;
};

function getErrorMessage(error: { message: string | string[] }) {
  return Array.isArray(error.message) ? error.message.join(" ") : error.message;
}

function EditDialog({
  edit,
  isSubmitting,
  error,
  onSubmit,
  onClose,
}: {
  edit: Edit;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!isSubmitting) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl backdrop:bg-zinc-950/40"
    >
      <h3 id={titleId} className="font-title text-lg font-semibold">
        {edit.title}
      </h3>
      {edit.description && (
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          {edit.description}
        </p>
      )}
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        {edit.fields.map((field) => (
          <label
            key={field.name}
            className="block text-sm font-medium text-zinc-800"
          >
            {field.label}
            {field.options ? (
              <select
                name={field.name}
                defaultValue={field.value}
                className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 outline-none focus:border-primary"
              >
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name={field.name}
                type={field.type ?? "text"}
                defaultValue={field.value}
                required={field.required}
                min={field.type === "number" ? 0 : undefined}
                step={field.type === "number" ? "any" : undefined}
                className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 outline-none focus:border-primary"
              />
            )}
          </label>
        ))}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSubmitting ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export default function AdminRowActions({
  edit,
  danger,
  restore,
}: {
  edit?: Edit;
  danger?: Action;
  restore?: Action;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [mode, setMode] = useState<"edit" | "danger" | "restore" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedAction = mode === "restore" ? restore : danger;

  function open(nextMode: "edit" | "danger" | "restore") {
    setError(null);
    setMode(nextMode);
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!edit) return;
    setIsSubmitting(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const body = Object.fromEntries(
      edit.fields.map((field) => {
        const value = formData.get(field.name);
        return [
          field.name,
          field.type === "number" ? Number(value) : String(value ?? ""),
        ];
      }),
    );
    const response = await apiClient(edit.endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    setIsSubmitting(false);
    if (!response.ok) {
      setError(getErrorMessage(response.error));
      return;
    }
    setMode(null);
    showToast(edit.successMessage, "success");
    router.refresh();
  }

  async function submitAction() {
    if (!selectedAction) return;
    setIsSubmitting(true);
    setError(null);
    const response = await apiClient(selectedAction.endpoint, {
      method: selectedAction.method,
      ...(selectedAction.body
        ? { body: JSON.stringify(selectedAction.body) }
        : {}),
    });
    setIsSubmitting(false);
    if (!response.ok) {
      setError(getErrorMessage(response.error));
      return;
    }
    setMode(null);
    showToast(selectedAction.successMessage, "success");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {edit && (
        <button
          type="button"
          onClick={() => open("edit")}
          aria-label={edit.title}
          title={edit.title}
          className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100 hover:text-primary"
        >
          <Pencil aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
      {danger && (
        <button
          type="button"
          onClick={() => open("danger")}
          aria-label={danger.title}
          title={danger.title}
          className="rounded-md p-2 text-zinc-600 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
      {restore && (
        <button
          type="button"
          onClick={() => open("restore")}
          aria-label={restore.title}
          title={restore.title}
          className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100 hover:text-primary"
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
      {mode === "edit" && edit && (
        <EditDialog
          edit={edit}
          isSubmitting={isSubmitting}
          error={error}
          onSubmit={submitEdit}
          onClose={() => setMode(null)}
        />
      )}
      {(mode === "danger" || mode === "restore") && selectedAction && (
        <AdminDangerConfirmDialog
          title={selectedAction.title}
          description={selectedAction.description}
          confirmationWord={selectedAction.confirmationWord}
          actionLabel={mode === "restore" ? "Réactiver" : "Confirmer"}
          tone={mode === "restore" ? "neutral" : "danger"}
          isSubmitting={isSubmitting}
          error={error}
          onConfirm={submitAction}
          onClose={() => setMode(null)}
        />
      )}
    </div>
  );
}
