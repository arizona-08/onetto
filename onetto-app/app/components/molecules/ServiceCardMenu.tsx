'use client';
import { EllipsisVertical } from 'lucide-react'
import React from 'react'

interface ServiceCardMenuProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

function ServiceCardMenu({ isOpen, setIsOpen }: ServiceCardMenuProps) {
  return (
    <div className="relative min-w-8 flex justify-end cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
      <EllipsisVertical className="w-5 h-5 text-zinc-500 cursor-pointer" />

      <div className={`${isOpen ? 'block' : 'hidden'} absolute top-full right-0 bg-white border border-zinc-200 rounded-md shadow-lg mt-1 w-40 p-1 z-10`}>
        <button className="block w-full text-left px-4 py-2 text-sm text-zinc-700 rounded-md hover:bg-zinc-100">Modifier</button>
        <button className="block w-full text-left px-4 py-2 text-sm text-red-500 rounded-md hover:bg-zinc-100">Suprimer</button>
      </div>
    </div>
  )
}

export default ServiceCardMenu