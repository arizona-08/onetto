
import { Service, ServiceLineItem } from '@/app/types';
import { ChevronDown } from 'lucide-react';
import React from 'react'

interface AddLineItemModalProps {
  isVisible: boolean
  onClose: () => void
  onAddLineItem: (lineItem: ServiceLineItem) => void;
  lineItemToModify: {
    item: ServiceLineItem | null
    index: number | null
  } | null;
  onEditLineItem: (lineItem: ServiceLineItem, index: number) => void;
}

const predefinedServices: Service[] = [
  {
    id: "SERV-1",
    name: "Développement d'application",
    description: "Développement d'une application web ou mobile sur mesure.",
    unitPrice: 5000,
    taxRate: 20,
    unit: "application",
    category: "Développement"
  },
  {
    id: "SERV-2",
    name: "Pose de carrelage",
    description: "Pose de carrelage dans un espace donné.",
    unitPrice: 12,
    taxRate: 20,
    unit: "m²",
    category: "Rénovation"
  },
  {
    id: "SERV-3",
    name: "Pose de peinture",
    description: "Pose de peinture dans un espace donné.",
    unitPrice: 15,
    taxRate: 20,
    unit: "m²",
    category: "Maison"
  },
]

function AddLineItemModal({ isVisible, onClose, onAddLineItem, lineItemToModify, onEditLineItem }: AddLineItemModalProps) {

  const [lineItemDetails, setLineItemDetails] = React.useState<ServiceLineItem>({
    description: "",
    quantity: 1,
    unitPrice: 0,
    taxRate: 0.00,
    unit: ""
  })

  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [preSelectedService, setPreSelectedService] = React.useState<Service | null>(null);

  function handleServiceSelect(service: Service | null) {
    setPreSelectedService(service);
    if(service) {
      setLineItemDetails({
        description: service.description as string,
        quantity: 1,
        unitPrice: service.unitPrice,
        taxRate: service.taxRate,
        unit: service.unit
      })
    } else {
      setLineItemDetails({
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 0.00,
        unit: ""
      })
    }
    setIsDropdownOpen(false);
  }

  React.useEffect(() => {
    if (lineItemToModify) {
      setLineItemDetails(lineItemToModify.item || {
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 0.00,
        unit: ""
      })
    } else {
      resetLineItemDetails()
    }
  }, [lineItemToModify])

  function resetLineItemDetails() {
    setLineItemDetails({
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: 0.00,
      unit: ""
    })
  }


  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setLineItemDetails(prev => ({
      ...prev,
      [name]: name === "quantity" || name === "unitPrice" || name === "taxRate" ? Number(value) : value
    }))
  }

  return (
    <>
      {isVisible && (
        <>
          <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-xl"></div>
          <div className="w-full max-w-180 fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white p-6 rounded-md">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-title font-semibold mb-4">Ajouter un service</h2>
              {/* service dropdown */}
              <div
                className="relative flex items-center gap-2 border border-gray-300 rounded-md px-2 py-1 cursor-pointer"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <ChevronDown/> <span className={`${preSelectedService ? 'text-gray-700' : 'text-gray-400'}`}>{preSelectedService?.name || "Choisir un service"}</span>

                <ul className={`absolute top-full right-0 w-75 bg-white border border-gray-300 rounded-md  mt-1 shadow-lg z-10  ${isDropdownOpen ? 'block' : 'hidden'}`}>
                  <li
                    className="px-3 py-1 text-gray-400 hover:bg-gray-200"
                    onClick={() => handleServiceSelect(null)}
                    >
                      Choisir un service
                    </li>
                  {predefinedServices.map(service => (
                    <li key={service.id} className=" px-3 py-1 hover:bg-gray-200" onClick={() => handleServiceSelect(service)}>
                      {service.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {/* Formulaire d'ajout de service */}
            <form className="space-y-4">
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Titre du service</label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  placeholder="Développement application"
                  className=" p-3 mt-1 block w-full border border-gray-300 rounded-md shadow-sm outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  value={lineItemDetails.description}
                  onChange={handleChange}
                />
              </div>

              <div className="flex flex-col gap-4 items-center bg-primary/10 p-4 rounded-md">

                <div className="w-full flex flex-col gap-4 md:flex-row">
                  <div className="md:w-1/2">
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantité</label>
                    <input
                      type="number"
                      id="quantity"
                      name="quantity"
                      placeholder='1'
                      className="bg-primary/20 p-3 mt-1 block w-full text-primary placeholder:text-primary/50 rounded-md outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      value={lineItemDetails.quantity}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="md:w-1/2">
                    <label htmlFor="unitPrice" className="block text-sm font-medium text-gray-700">Prix unitaire (€)</label>
                    <input
                      type="number"
                      id="unitPrice"
                      name="unitPrice"
                      placeholder='5000'
                      className="bg-primary/20 p-3 mt-1 block w-full text-primary placeholder:text-primary/50 rounded-md outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      value={lineItemDetails.unitPrice}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="w-full flex flex-col gap-4 md:flex-row">

                  <div className="md:w-1/2">
                    <label htmlFor="unit" className="block text-sm font-medium text-gray-700">Unité</label>
                    <input
                      type="text"
                      id="unit"
                      name="unit"
                      placeholder='application'
                      className="bg-primary/20 p-3 mt-1 block w-full text-primary placeholder:text-primary/50 rounded-md outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      value={lineItemDetails.unit}
                      
                      onChange={handleChange}
                    />
                  </div>

                  <div className="md:w-1/2">
                    <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700">TVA (%)</label>
                    <input
                      type="number"
                      id="taxRate"
                      name="taxRate"
                      placeholder='20'
                      className="bg-primary/20 p-3 mt-1 block w-full text-primary placeholder:text-primary/50 rounded-md outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      value={lineItemDetails.taxRate}
                      min={0}
                      max={100}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button type="button" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors" onClick={onClose}>Annuler</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors" onClick={(e) => {
                  e.preventDefault();
                  if (lineItemToModify) {
                    onEditLineItem(lineItemDetails, lineItemToModify.index || 0);
                  } else {
                    onAddLineItem(lineItemDetails);
                  }
                  resetLineItemDetails();
                  onClose();
                }}>{lineItemToModify ? "Modifier" : "Ajouter"}</button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  )
}

export default AddLineItemModal