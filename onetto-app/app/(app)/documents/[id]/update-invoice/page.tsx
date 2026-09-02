import DocumentCreator from '@/app/components/organisms/DocumentCreation/DocumentCreator';
import { getDocumentByIdServer } from '@/lib/documents/document.server';
import Link from 'next/link';

//Modifier les documents déjà confirmé (notamment pour la création de version de devis)
async function UpdateInvoice({ params } : { params: Promise<{id: string}> }) {
  const routeParams = await params;
  const documentId = routeParams.id;

  const invoiceResponse = await getDocumentByIdServer(documentId);
  if(!invoiceResponse.ok) {
    return (
      <div className="mx-auto w-full max-w-6xl p-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <p>Cette facture n’a pas pu être chargée pour modification. Actualisez la page ou réessayez plus tard.</p>
          <Link href="/documents" className="mt-3 inline-block font-semibold underline">Retour aux factures et devis</Link>
        </div>
      </div>
    );
  }

  const invoice = invoiceResponse.data;

  return (
    <div className="mx-auto w-full max-w-6xl p-4">
      <DocumentCreator mode="update" document={invoice} />
    </div>
  );
}

export default UpdateInvoice
