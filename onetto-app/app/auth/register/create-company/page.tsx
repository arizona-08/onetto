import CreateCompanyForm from '@/app/components/molecules/Forms/CreateCompanyForm'
import Link from 'next/link'
import React from 'react'

async function CreateCompanyPage({ searchParams }: {searchParams : Promise<{ companyOwnerId?: string }>} ) {
  const params = await searchParams;

  return (
    <div className="p-4 flex flex-col gap-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-800 text-center">Créer mon entreprise</h1>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-end">
          <Link href="/auth/login" className="inline-block px-3 py-2 bg-primary rounded-full text-sm text-white font-medium">Passer cette étape et me connecter</Link>
        </div>

        <CreateCompanyForm companyOwnerId={params.companyOwnerId || ''} />
      </div>
    </div>
  )
}

export default CreateCompanyPage