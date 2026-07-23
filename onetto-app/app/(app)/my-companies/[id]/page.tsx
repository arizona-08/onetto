'use client';

import CreateCompanyForm from '@/app/components/molecules/Forms/CreateCompanyForm';
import { Company } from '@/lib/companies/dtos/create-company.dto';
import { getCompany } from '@/lib/companies/companies';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React from 'react';

function MyCompanyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [company, setCompany] = React.useState<Company | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadCompany() {
      const response = await getCompany(params.id);
      if (!response.ok) {
        setError('Impossible de charger cette entreprise.');
        return;
      }
      setCompany(response.data);
    }

    void loadCompany();
  }, [params.id]);

  return (
    <div className="w-full p-4">
      <Link href="/my-companies" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Retour aux entreprises
      </Link>
      <div className="mt-5 max-w-4xl">
        <h1 className="font-title text-2xl font-black">Modifier l’entreprise</h1>
        <p className="mt-1 text-sm text-zinc-500">Mettez à jour les informations de votre entreprise.</p>
        {error && <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {!error && !company && <p className="mt-6 text-sm text-zinc-500">Chargement de l’entreprise…</p>}
        {company && (
          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50">
            <CreateCompanyForm
              companyToEdit={company}
              onCancel={() => router.push('/my-companies')}
              onSuccess={() => router.push('/my-companies')}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default MyCompanyPage;
