'use client';

import React from 'react'
import { Client } from '@/app/types'

interface DeleteClientModalProps {
  client: Client;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteClientModal({ client, isDeleting, onConfirm, onCancel }: DeleteClientModalProps) {
  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <h3 id="delete-client-title" className="font-title text-lg font-bold text-zinc-800">
        Supprimer le client
      </h3>
      <p className="text-sm text-zinc-500 mt-2">
        Êtes-vous sûr de vouloir supprimer le client « {client.name} » ? Cette action est définitive.
      </p>
      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          className="px-4 py-2 rounded-md text-sm text-zinc-700 hover:bg-zinc-100"
          onClick={onCancel}
          disabled={isDeleting}
        >
          Annuler
        </button>
        <button
          className="px-4 py-2 rounded-md text-sm text-white bg-red-500 hover:bg-red-600"
          onClick={onConfirm}
          disabled={isDeleting}
        >
          {isDeleting ? 'Suppression…' : 'Supprimer'}
        </button>
      </div>
    </div>
  )
}

export default DeleteClientModal
