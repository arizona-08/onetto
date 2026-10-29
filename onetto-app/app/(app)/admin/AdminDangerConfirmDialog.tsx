"use client";

import { useEffect, useId, useRef, useState } from "react";

export default function AdminDangerConfirmDialog({
  title,
  description,
  confirmationWord,
  actionLabel,
  isSubmitting,
  error,
  onConfirm,
  onClose,
  tone = "danger",
}: {
  title: string;
  description: string;
  confirmationWord: string;
  actionLabel: string;
  isSubmitting: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
  tone?: "danger" | "neutral";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [understood, setUnderstood] = useState(false);
  const [typedWord, setTypedWord] = useState("");

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
        {title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-zinc-700">{description}</p>
      <label className="mt-5 flex items-start gap-3 text-sm text-zinc-800">
        <input
          type="checkbox"
          checked={understood}
          onChange={(event) => setUnderstood(event.target.checked)}
          className="mt-1 accent-red-700"
        />
        Je comprends les conséquences de cette action.
      </label>
      <label className="mt-4 block text-sm font-medium text-zinc-800">
        Saisissez « {confirmationWord} » pour confirmer
        <input
          type="text"
          value={typedWord}
          onChange={(event) => setTypedWord(event.target.value)}
          autoComplete="off"
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 outline-none focus:border-red-600"
        />
      </label>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={
            isSubmitting || !understood || typedWord !== confirmationWord
          }
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${tone === "danger" ? "bg-red-700" : "bg-primary"}`}
        >
          {isSubmitting ? "Traitement…" : actionLabel}
        </button>
      </div>
    </dialog>
  );
}
