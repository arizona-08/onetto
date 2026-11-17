"use client";
import { EllipsisVertical } from "lucide-react";
import React from "react";

interface ClientCardMenuProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  clientId: string;
  triggerEdit?: (clientId: string) => void;
  triggerDelete?: (clientId: string) => void;
}

function ClientCardMenu({
  isOpen,
  setIsOpen,
  clientId,
  triggerEdit,
  triggerDelete,
}: ClientCardMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [setIsOpen]);

  return (
    <div ref={menuRef} className="relative min-w-8">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-ui-subtle text-ui-secondary transition-colors hover:bg-ui-primary-soft hover:text-ui-primary focus-visible:outline-2 focus-visible:outline-ui-primary"
        aria-label="Actions du client"
        aria-expanded={isOpen}
      >
        <EllipsisVertical className="h-5 w-5" />
      </button>

      <div
        className={`${isOpen ? "block" : "hidden"} absolute right-0 top-full z-20 mt-1 w-40 rounded-ui-control border border-ui-border bg-ui-surface p-1 shadow-ui-popover`}
      >
        <button
          type="button"
          className="block w-full rounded-lg px-4 py-2 text-left text-sm text-ui-text hover:bg-ui-subtle"
          onClick={() => {
            setIsOpen(false);
            triggerEdit?.(clientId);
          }}
        >
          Modifier
        </button>
        <button
          type="button"
          className="block w-full rounded-lg px-4 py-2 text-left text-sm text-ui-danger hover:bg-ui-danger-soft"
          onClick={() => {
            setIsOpen(false);
            triggerDelete?.(clientId);
          }}
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}

export default ClientCardMenu;
