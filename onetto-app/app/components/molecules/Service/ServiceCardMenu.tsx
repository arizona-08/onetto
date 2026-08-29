'use client';
import { EllipsisVertical } from 'lucide-react'
import React from 'react'

interface ServiceCardMenuProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  serviceId: string;
  triggerEdit?: (serviceId: string) => void;
  triggerDelete?: (serviceId: string) => void;
}

function ServiceCardMenu({ isOpen, setIsOpen, serviceId, triggerEdit, triggerDelete }: ServiceCardMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [setIsOpen]);

  return (
    <div ref={menuRef} className="relative min-w-8">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
        aria-label="Actions du service"
      >
        <EllipsisVertical className="h-5 w-5" />
      </button>

      <div className={`${isOpen ? 'block' : 'hidden'} absolute right-0 top-full z-10 mt-1 w-40 rounded-xl border border-zinc-200 bg-white p-1`}>
        <button className="block w-full text-left px-4 py-2 text-sm text-zinc-700 rounded-md hover:bg-zinc-100" onClick={() => {
          setIsOpen(false);
          triggerEdit?.(serviceId);
        }}>
          Modifier
        </button>
        <button className="block w-full text-left px-4 py-2 text-sm text-red-500 rounded-md hover:bg-zinc-100" onClick={() => {
          setIsOpen(false);
          triggerDelete?.(serviceId);
        }}>
          Supprimer
        </button>
      </div>
    </div>
  )
}

export default ServiceCardMenu
