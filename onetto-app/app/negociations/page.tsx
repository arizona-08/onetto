import { getNegociationByTokenServer } from '@/lib/documents/document.server'
import NegociationView from './NegociationView'

async function NegociationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const negociationToken = typeof params.token === 'string' ? params.token : undefined

  if (!negociationToken) {
    return <main className="grid min-h-screen place-items-center bg-background p-6"><p className="rounded-xl bg-white px-5 py-4 text-sm shadow-sm">Token de négociation invalide ou requis.</p></main>
  }

  const response = await getNegociationByTokenServer(negociationToken)
  if (!response.ok) {
    return <main className="grid min-h-screen place-items-center bg-background p-6"><p className="rounded-xl bg-white px-5 py-4 text-sm shadow-sm">Cette négociation est introuvable ou n’est plus disponible.</p></main>
  }

  return <NegociationView negociation={response.data} token={negociationToken} />
}

export default NegociationPage
