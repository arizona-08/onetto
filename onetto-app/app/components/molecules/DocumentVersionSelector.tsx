'use client'

import { getDocumentVersions } from '@/lib/documents/document'
import { DocumentVersion } from '@/app/types'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type DocumentVersionSelectorProps = {
  documentId: string;
  versionNumber: number;
  mode: 'display' | 'edit';
}

export default function DocumentVersionSelector({ documentId, versionNumber, mode }: DocumentVersionSelectorProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const router = useRouter()

  useEffect(() => {
    async function loadVersions() {
      const response = await getDocumentVersions(documentId)
      if (response.ok) setVersions(response.data)
    }
    void loadVersions()
  }, [documentId])

  if (versions.length <= 1) return null

  return (
    <label className="flex w-fit items-center gap-2 text-sm font-semibold text-zinc-600">
      Version
      <select
        value={documentId}
        onChange={(event) => router.push(mode === 'edit' ? `/documents/${event.target.value}/update-draft` : `/documents/${event.target.value}`)}
        className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm font-semibold text-primary outline-none focus:border-primary"
      >
        {versions.map((version) => (
          <option key={version.id} value={version.id}>v{version.versionNumber}{version.versionNumber === versionNumber ? ' — actuelle' : ''}</option>
        ))}
      </select>
    </label>
  )
}
