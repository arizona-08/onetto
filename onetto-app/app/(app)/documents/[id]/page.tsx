import ShowDocument from '@/app/components/organisms/ShowDocument';
import { getDocumentByIdServer } from '@/lib/documents/document.server';

async function ShowDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const documentResponse = await getDocumentByIdServer(id, true);

  if(!documentResponse.ok){
    console.error("Erreur lors de la récupération de la facture ", documentResponse.error)
    throw new Error("Erreur lors de la récupération de la facture ")
  }

  const document = documentResponse.data;
  
  return (
    <div className="mx-auto w-full max-w-6xl p-4">
      <ShowDocument document={document} />
    </div>
  );
}

export default ShowDocumentPage
