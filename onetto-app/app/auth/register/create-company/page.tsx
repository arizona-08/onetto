import CreateCompanyForm from '@/app/components/molecules/Forms/CreateCompanyForm'
import Link from 'next/link'
import React from 'react'

async function CreateCompanyPage({ searchParams }: {searchParams : Promise<{ companyOwnerId?: string }>} ) {
  const params = await searchParams;

  return (
    <div>
      <h1>Créer mon entreprise</h1>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-end">
          <Link href="/auth/login" className="inline-block px-3 py-2 bg-primary text-white font-medium">Passer cette étape et me connecter</Link>
        </div>

        <CreateCompanyForm companyOwnerId={params.companyOwnerId || ''} />
      </div>
    </div>
  )
}

export default CreateCompanyPage