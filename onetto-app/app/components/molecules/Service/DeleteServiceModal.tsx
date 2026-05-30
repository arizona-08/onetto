'use client';

import React from 'react'
import { Service } from '@/app/types'

interface DeleteServiceModalProps {
  service: Service;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteServiceModal({ service, onConfirm, onCancel }: DeleteServiceModalProps) {
  return (
    <div className="bg-white rounded-md shadow-lg w-full max-w-md p-6">
      <h3 className="text-lg font-title font-bold text-zinc-800">Supprimer le service</h3>
      <p className="text-sm text-zinc-500 mt-2">
        Etes-vous sur de vouloir supprimer le service "{service.name}" ? Cette action est definitive.
      </p>
      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          className="px-4 py-2 rounded-md text-sm text-zinc-700 hover:bg-zinc-100"
          onClick={onCancel}
        >
          Annuler
        </button>
        <button
          className="px-4 py-2 rounded-md text-sm text-white bg-red-500 hover:bg-red-600"
          onClick={onConfirm}
        >
          Supprimer
        </button>
      </div>
    </div>
  )
}

export default DeleteServiceModal
