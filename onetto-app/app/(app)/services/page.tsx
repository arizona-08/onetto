import ServiceSection from '@/app/components/organisms/ServiceSection'
import { Service } from '@/app/types'
import { Plus } from 'lucide-react'
import React from 'react'


const servicesData: Service[] = [
  {
    id: "SRV-001",
    name: "Consultation juridique",
    description: "Service de consultation juridique pour les entreprises.",
    unitPrice: 150.00,
    unit: "heure",
    taxRate: 20,
    category: "Conseil",
  },
  {
    id: "SRV-002",
    name: "Développement web",
    description: "Création de sites web personnalisés pour les clients.",
    unitPrice: 500.00,
    unit: "site",
    taxRate: 20,
    category: "Informatique",
  },
  {
    id: "SRV-003",
    name: "Formation en marketing digital",
    description: "Sessions de formation pour améliorer les compétences en marketing digital.",
    unitPrice: 200.00,
    unit: "session",
    taxRate: 20,
    category: "Formation",
  },
  {
    id: "SRV-004",
    name: "Design graphique",
    description: "Création de designs graphiques pour les besoins spécifiques des clients.",
    unitPrice: 300.00,
    unit: "projet",
    taxRate: 20,
    category: "Design",
  }
]

function services() {
  return (
    <div>
      <h1 className="text-4xl font-black font-title">Mon catalogue de services</h1>

      <p className="text-gray-500 max-w-90 mt-3">Gérer vos services et gagnez du temps lors de la création de vos factures.</p>

      <ServiceSection services={servicesData} />
    </div>
  )
}

export default services