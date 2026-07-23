
import { Client } from '@/app/types';
import { InvoiceClientError } from '@/shared/invoiceErrorsTypes';
import { ChevronDown } from 'lucide-react'
import React from 'react'


interface CustomerDetailsProps {
  onClientChange: (client: Client | null) => void;
  invoiceClientErrors?: InvoiceClientError
}
const clients : Client[] = [
  {
    id: "CUST-001",
    name: 'Société ABC',
    email: 'contact@societe-abc.com',
    street: '10 rue de la Paix',
    city: 'Paris',
    postalCode: '75002',
    country: 'France'
  },
  {
    id: "CUST-002",
    name: 'Entreprise XYZ',
    email: 'contact@entreprise-xyz.com',
    street: '14 rue de la Joie',
    city: 'Paris',
    postalCode: '75012',
    country: 'France'
  },
  {
    id: "CUST-003",
    name: 'Client 123',
    email: 'contact@client-123.com',
    street: '23 Boulevard de la Richesse',
    city: 'Paris',
    postalCode: '75014',
    country: 'France'
  }
]

function CustomerDetails({ onClientChange, invoiceClientErrors }: CustomerDetailsProps) {
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
  const [clientInfos, setClientInfos] = React.useState<Client>({
    id: "",
    name: "",
    email: "",
    street: "",
    city: "",
    postalCode: "",
    country: ""
  });
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setClientInfos(prev => ({
      ...prev,
      [name]: value
    }))

    onClientChange({
      id: clientInfos.id,
      email: name === "email" ? value : clientInfos.email,
      name: name === "name" ? value : clientInfos.name,
      street: name === "street" ? value : clientInfos.street,
      city: name === "city" ? value : clientInfos.city,
      postalCode: name === "postalCode" ? value : clientInfos.postalCode,
      country: name === "country" ? value : clientInfos.country
    });
  }

  return (
    <div className="border border-gray-200 rounded-md p-4 mb-6">
      <header className="flex items-center gap-4 mb-6">
        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold font-title">
          <span>01</span>
        </div>
        <h2 className="text-lg font-title font-semibold mb-1">Détails du client</h2>

      </header>

        <div className="flex justify-end">
          <div className="flex flex-col items-end">
            {/* client selector */}
            <div className='relative inline-block border border-gray-300 rounded-md px-2 py-1 cursor-pointer' onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <span className="flex items-center gap-2 text-sm font-medium  tracking-wider"> <ChevronDown className="w-4 h-4" />  {selectedClient ? selectedClient.name : 'Sélectionner un client'}</span>

              <ul className={`absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-10 ${isDropdownOpen ? 'block' : 'hidden'}`}>
                <li className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 cursor-pointer" onClick={() => {
                  setSelectedClient(null);
                  setClientInfos({
                    id: "",
                    name: "",
                    email: "",
                    street: "",
                    city: "",
                    postalCode: "",
                    country: ""
                  });
                  setIsDropdownOpen(false);
                  onClientChange(null);
                }}>
                  Sélectionner un client
                </li>
                {clients.map(client => (
                  <li
                    key={client.id}
                    className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setSelectedClient(client);
                      setClientInfos({
                        id: client.id,
                        name: client.name,
                        email: client.email,
                        street: client.street,
                        city: client.city,
                        postalCode: client.postalCode,
                        country: client.country
                      });
                      setIsDropdownOpen(false);
                      onClientChange(client);
                    }}
                  >
                    {client.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className='space-y-8'>

          {/* Name and email */}
          <div className="flex flex-col gap-8 md:flex-row md:gap-16">

            <div>
              <label htmlFor="customer-name" className="inline-block text-sm font-medium text-gray-500 tracking-wider mb-1">Nom du client <span className="text-red-500">*</span></label>
              <input
                type="text"
                id="customer-name"
                name="name"
                className="inline-block w-full border-b border-gray-300 p-2 outline-none focus:outline-none placeholder:text-gray-300"
                placeholder="e.g. Société ABC"
                value={clientInfos.name}
                onChange={handleChange}
              />
              {invoiceClientErrors && invoiceClientErrors.name && (
                <ul>
                  { invoiceClientErrors.name.map((error, index) => (
                      <li><span key={index} className="text-red-500">{error}</span></li>
                    ))
                  }
                </ul>
              )}
            </div>

            <div>
              <label htmlFor="customer-email" className="inline-block text-sm font-medium text-gray-500 tracking-wider mb-1">Email du client <span className="text-red-500">*</span></label>
              <input
                type="email"
                id="customer-email"
                name="email"
                className="inline-block w-full border-b border-gray-300 p-2 outline-none focus:outline-none placeholder:text-gray-300"
                placeholder="e.g. contact@societe-abc.com"
                value={clientInfos.email}
                onChange={handleChange}
              />
              {invoiceClientErrors && invoiceClientErrors.email && (
                <ul>
                  { invoiceClientErrors.email.map((error, index) => (
                      <li><span key={index} className="text-red-500">{error}</span></li>
                    ))
                  }
                </ul>
              )}
            </div>
          </div>

          {/* Street */}
          <div>
            <label htmlFor="customer-street" className="inline-block text-sm font-medium text-gray-500 tracking-wider mb-1">Adresse du client <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="customer-street"
              name="street"
              className="inline-block w-full border-b border-gray-300 p-2 outline-none focus:outline-none placeholder:text-gray-300 mb-4"
              placeholder="e.g. 10 rue de la Paix"
              value={clientInfos.street}
              onChange={handleChange}
            />
              {invoiceClientErrors && invoiceClientErrors.address && (
                <ul>
                  { invoiceClientErrors.address.map((error, index) => (
                      <li><span key={index} className="text-red-500">{error}</span></li>
                    ))
                  }
                </ul>
              )}
          </div>

          {/* city and postal code */}
          <div className="flex flex-col gap-8 md:flex-row md:gap-16">

            <div className="md:w-1/2">
              <label htmlFor="city" className="inline-block text-sm font-medium text-gray-500 tracking-wider mb-1">Ville <span className="text-red-500">*</span></label>
              <input
                type="text"
                id="city"
                name="city"
                className="inline-block w-full border-b border-gray-300 p-2 outline-none focus:outline-none placeholder:text-gray-300"
                placeholder="e.g. Paris"
                value={clientInfos.city}
                onChange={handleChange}
              />
              {invoiceClientErrors && invoiceClientErrors.city && (
                <ul>
                  { invoiceClientErrors.city.map((error, index) => (
                      <li><span key={index} className="text-red-500">{error}</span></li>
                    ))
                  }
                </ul>
              )}
            </div>

            <div className="md:w-1/2">
              <label htmlFor="postal-code" className="inline-block text-sm font-medium text-gray-500 tracking-wider mb-1">Code postal <span className="text-red-500">*</span></label>
              <input
                type="text"
                id="postal-code"
                name="postalCode"
                className="inline-block w-full border-b border-gray-300 p-2 outline-none focus:outline-none placeholder:text-gray-300"
                placeholder="e.g. 77500"
                value={clientInfos.postalCode}
                onChange={handleChange}
              />
              {invoiceClientErrors && invoiceClientErrors.name && (
                <ul>
                  { invoiceClientErrors.name.map((error, index) => (
                      <li><span key={index} className="text-red-500">{error}</span></li>
                    ))
                  }
                </ul>
              )}
            </div>

          </div>

          {/* Country */}
          <div>
            <label htmlFor="customer-country" className="inline-block text-sm font-medium text-gray-500 tracking-wider mb-1">Pays <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="customer-country"
              name="country"
              className="inline-block w-full border-b border-gray-300 p-2 outline-none focus:outline-none placeholder:text-gray-300 mb-4"
              placeholder="e.g. France"
              value={clientInfos.country}
              onChange={handleChange}
            />
          </div>

          {invoiceClientErrors && invoiceClientErrors.general && (
            <>
              <ul>
                { invoiceClientErrors.general.map((error, index) => (
                    <span key={index} className="text-red-500">{error}</span>
                  ))
                }
              </ul>
            </>
          )}
        </div>
    </div>
  )
}

export default CustomerDetails