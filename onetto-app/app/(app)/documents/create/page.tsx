import DocumentCreator from '@/app/components/organisms/DocumentCreation/DocumentCreator'
import React from 'react'

function CreateEstimatePage() {
  return (
    <div className="w-full p-4">
      <h1 className="text-2xl font-title font-black mb-1">Création d'un devis</h1>
      <p className="text-gray-500 mb-6">Créez facilement vos devis à partir des services sélectionnés.</p>

      <DocumentCreator mode="create" />
    </div>
  )
}

export default CreateEstimatePage