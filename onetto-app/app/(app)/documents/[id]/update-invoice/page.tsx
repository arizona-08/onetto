import DocumentCreator from '@/app/components/organisms/DocumentCreation/DocumentCreator';
import { getDocumentByIdServer } from '@/lib/documents/document.server';

//Modifier les documents déjà confirmé (notamment pour la création de version de devis)
async function UpdateInvoice({ params } : { params: Promise<{id: string}> }) {
  const routeParams = await params;
  const documentId = routeParams.id;

  const invoiceResponse = await getDocumentByIdServer(documentId);
  let errorMessage;
  if(!invoiceResponse.ok) {
    errorMessage = invoiceResponse.error;
    console.error(errorMessage);
    return 
  }

  const invoice = invoiceResponse.data;

  return (
    <div className="mx-auto w-full max-w-6xl p-4">
      <DocumentCreator mode="update" document={invoice} />
    </div>
  );
}

export default UpdateInvoice
