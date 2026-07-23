'use client';

import CreateCompanyForm from '@/app/components/molecules/Forms/CreateCompanyForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function CreateCompanyPage() {
  const router = useRouter();

  return (
    <div className="w-full p-4">
      <Link href="/my-companies" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Retour aux entreprises
      </Link>
      <div className="mt-5 max-w-4xl">
        <h1 className="font-title text-2xl font-black">Ajouter une entreprise</h1>
        <p className="mt-1 text-sm text-zinc-500">Cette entreprise deviendra votre entreprise active après sa création.</p>
        <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50">
          <CreateCompanyForm
            onCancel={() => router.push('/my-companies')}
            onSuccess={() => {
              router.refresh();
              router.push('/my-companies');
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default CreateCompanyPage;
