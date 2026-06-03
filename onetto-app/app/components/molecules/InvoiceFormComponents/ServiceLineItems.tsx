import { ServiceLineItem } from '@/app/types'
import { Edit, Plus, Trash2 } from 'lucide-react'
import React from 'react'
import AddLineItemModal from './AddLineItemModal'


interface ServiceLineItemsProps {
  onLineItemsChange: (lineItems: ServiceLineItem[]) => void;
  onInvoiceDatesChange: (dates: { creationDate: string, dueDate: string }) => void;
}
function ServiceLineItems({ onLineItemsChange, onInvoiceDatesChange }: ServiceLineItemsProps) {

  const [lineItems, setLineItems] = React.useState<ServiceLineItem[]>([])
  const [isModalVisible, setIsModalVisible] = React.useState(false)

  const [invoiceDates, setInvoiceDates] = React.useState(() => {
    const d = new Date()
    // set to one month ahead, handling month overflow
    const month = d.getMonth()
    const year = d.getFullYear()
    const day = d.getDate()
    const nextMonth = month + 1
    const creationDate = d.toISOString().split('T')[0]
    const dueDate = new Date(year, nextMonth, day)
    return {
      creationDate,
      dueDate: dueDate.toISOString().split('T')[0]
    }
  })

  function handleInvoiceDatesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setInvoiceDates({ ...invoiceDates, [name]: value })
    onInvoiceDatesChange({ ...invoiceDates, [name]: value })
  }

  const [lineItemToModify, setLineItemToModify] = React.useState<{
    item: ServiceLineItem | null
    index: number | null
  } | null>(null)

  function handleOnCloseModal() {
    setIsModalVisible(false)
  }

  function handleOnAddLineItem(lineItem: ServiceLineItem) {
    setLineItems(prev => [...prev, lineItem])
    setIsModalVisible(false)
    onLineItemsChange([...lineItems, lineItem])
  }

  function handleOnEditLineItem(lineItem: ServiceLineItem, index: number) {
    const newLineItems = [...lineItems]
    newLineItems[index] = lineItem
    setLineItems(newLineItems)
    onLineItemsChange(newLineItems)

    setLineItemToModify(null)
    setIsModalVisible(false)
  }

  function deleteLineItem(index: number) {
    const newLineItems = [...lineItems]
    newLineItems.splice(index, 1)
    setLineItems(newLineItems)
    onLineItemsChange(newLineItems)
  }

  return (
    <>
      <AddLineItemModal isVisible={isModalVisible} onClose={handleOnCloseModal} onAddLineItem={handleOnAddLineItem} lineItemToModify={lineItemToModify} onEditLineItem={handleOnEditLineItem} />
      <div className="border border-gray-200 rounded-md p-4 mb-6">
        <header className="flex flex-col items-center mb-10 md:flex-row md:justify-between">
          <div className='flex items-center gap-4 w-full md:w-fit'>
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold font-title">
              <span>02</span>
            </div>
            <h2 className="text-lg font-title font-semibold mb-1">Détails du service</h2>
          </div>

          <div className="mt-2 md:mt-0">
            <button className="flex items-center gap-2 text-sm text-primary font-medium hover:text-primary-hover transition-colors" onClick={() => setIsModalVisible(true)}>
              <Plus size={16} />
              <span>Ajouter un service</span>
            </button>
          </div>

        </header>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-140">
            <thead className="border-b border-gray-200  text-sm text-gray-500">
              <tr className="">
                <th className="pb-5 font-bold font-title tracking-wide">Description</th>
                <th className="pb-5 font-bold font-title tracking-wide">Quantité</th>
                <th className="pb-5 font-bold font-title tracking-wide">Prix unitaire</th>
                <th className="pb-5 font-bold font-title tracking-wide">TVA</th>
                <th className="pb-5 font-bold font-title tracking-wide">Total HT</th>
                <th className="pb-5 font-bold font-title tracking-wide">Total TTC</th>
                <th className="pb-5 font-bold font-title tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((lineItem, index) => {
                const totalHT = lineItem.unitPrice * lineItem.quantity
                const totalTTC = totalHT + (totalHT * (lineItem.taxRate / 100))
                return (

                <tr key={index}>
                  <td className="py-4 border-b border-gray-200 font-semibold">{lineItem.description}</td>
                  <td className="py-4 border-b border-gray-200">{lineItem.quantity}</td>
                  <td className="py-4 border-b border-gray-200">{lineItem.unitPrice} € / {lineItem.unit}</td>
                  <td className="py-4 border-b border-gray-200">{lineItem.taxRate}%</td>
                  <td className="py-4 border-b border-gray-200">{totalHT} €</td>
                  <td className="py-4 border-b border-gray-200 font-semibold">{totalTTC} €</td>
                  <td className="py-4 border-b border-gray-200">
                    <button className="text-primary hover:text-primary-hover" onClick={() => {
                      setLineItemToModify({ item: lineItem, index })
                      setIsModalVisible(true)
                    }}>
                      <Edit size={16} />
                    </button>
                    <button className="text-danger hover:text-danger-hover ml-2" onClick={() => deleteLineItem(index)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-10 flex justify-end gap-4">
          <div className="bg-primary/10 p-5 rounded-md flex flex-col items-center gap-5 w-full max-w-100 mx-auto md:flex-row md:mx-0">
              <div className="flex flex-col gap-2 w-full">
                <span className="uppercase text-xs font-semibold tracking-wide text-primary/80">Date de création</span>
                <input
                  type="date"
                  name="creationDate"
                  id=""
                  value={invoiceDates.creationDate}
                  onChange={handleInvoiceDatesChange}
                  className="bg-primary/20 rounded-md p-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
                  placeholder='11/07/2026'
                  />
              </div>

              <div className="flex flex-col gap-2 w-full">
                <span className="uppercase text-xs font-semibold tracking-wide text-primary/80">Date d'échéance</span>
                <input
                  type="date"
                  name="dueDate"
                  id=""
                  value={invoiceDates.dueDate}
                  onChange={handleInvoiceDatesChange}
                  className="bg-primary/20 rounded-md p-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
                />
              </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ServiceLineItems