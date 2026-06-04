import ClientSection from '@/app/components/organisms/ClientsSection'
import { clientsData } from '@/shared/clients'

function clients() {
  return (
    <div className="w-full p-4">
      <h1 className="text-4xl font-black font-title">Mon catalogue de clients</h1>

      <p className="text-gray-500 max-w-90 mt-3">Gérer vos clients et gagnez du temps lors de la création de vos factures.</p>

      <ClientSection clients={clientsData} />
    </div>
  )
}

export default clients