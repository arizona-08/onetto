"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import InviteUserDialog from "./InviteUserDialog";

export default function AdminInviteUser() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Ajouter un utilisateur
      </button>
      {isOpen && <InviteUserDialog onClose={() => setIsOpen(false)} />}
    </>
  );
}
