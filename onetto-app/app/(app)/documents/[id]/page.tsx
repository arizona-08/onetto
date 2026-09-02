import ShowDocument from '@/app/components/organisms/ShowDocument';
import { getDocumentByIdServer } from '@/lib/documents/document.server';
import Link from 'next/link';

async function ShowDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const documentResponse = await getDocumentByIdServer(id, true);

  if(!documentResponse.ok){
    return (
      <div className="mx-auto w-full max-w-6xl p-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <p>Ce document n’a pas pu être chargé. Il a peut-être été supprimé ou vous n’y avez plus accès.</p>
          <Link href="/documents" className="mt-3 inline-block font-semibold underline">Retour aux factures et devis</Link>
        </div>
      </div>
    );
  }

  const document = documentResponse.data;
  
  return (
    <div className="mx-auto w-full max-w-6xl p-4">
      <ShowDocument document={document} />
    </div>
  );
}

export default ShowDocumentPage
