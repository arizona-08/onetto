
import { Client } from '@/app/types';
import { DocumentClientError } from '@/shared/DocumentErrorsTypes';
import { ChevronDown } from 'lucide-react'
import React, { useEffect } from 'react'
import { getActiveCompanyClients } from '@/lib/companies/catalog';
import { getSuperPdpDirectoryEntries, searchSuperPdpDirectory, SuperPdpDirectoryCompany, SuperPdpDirectoryEntry } from '@/lib/documents/document';


interface CustomerDetailsProps {
  client?: Client | null;
  onClientChange: (client: Client | null) => void;
  documentClientErrors?: DocumentClientError
  disabled?: boolean
}
function CustomerDetails({ client, onClientChange, documentClientErrors, disabled = false }: CustomerDetailsProps) {
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = React.useState(true);
  const [directoryCompanies, setDirectoryCompanies] = React.useState<SuperPdpDirectoryCompany[]>([]);
  const [directoryEntries, setDirectoryEntries] = React.useState<SuperPdpDirectoryEntry[]>([]);
  const [isSearchingDirectory, setIsSearchingDirectory] = React.useState(false);
  const [directoryError, setDirectoryError] = React.useState<string | null>(null);
  const [clientInfos, setClientInfos] = React.useState<Client>({
    id: "",
    name: "",
    email: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
    clientType: 'CLIENT',
  });


  useEffect(() => {
    if(client) {
      setClientInfos(client);
    }
  }, [client])

  useEffect(() => {
    let isMounted = true;

    async function loadClients() {
      const response = await getActiveCompanyClients();

      if (!isMounted) {
        return;
      }

      if (response.ok) {
        setClients(response.data);
      }

      setIsLoadingClients(false);
    }

    void loadClients();

    return () => {
      isMounted = false;
    };
  }, []);

  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (disabled) return;
    const { name, value } = e.target;
    setClientInfos(prev => ({
      ...prev,
      [name]: value
    }))

    onClientChange({ ...clientInfos, [name]: value });
  }

  function handleClientTypeChange(clientType: Client['clientType']) {
    if (disabled) return;
    setClientInfos((current) => ({ ...current, clientType }));
    onClientChange({ ...clientInfos, clientType });
  }

  async function searchDirectory() {
    const query = clientInfos.siren?.trim() || clientInfos.name.trim();
    if (query.length < 2) {
      setDirectoryError('Renseignez un SIREN ou au moins deux caractères du nom.');
      return;
    }
    setIsSearchingDirectory(true);
    setDirectoryError(null);
    setDirectoryEntries([]);
    const response = await searchSuperPdpDirectory(query);
    setIsSearchingDirectory(false);
    if (!response.ok) {
      setDirectoryError('Impossible de rechercher cette entreprise dans l’annuaire.');
      return;
    }
    setDirectoryCompanies(response.data.data);
    if (!response.data.data.length) setDirectoryError('Aucune entreprise trouvée dans l’annuaire.');
  }

  async function loadDirectoryEntries(company: SuperPdpDirectoryCompany) {
    setIsSearchingDirectory(true);
    setDirectoryError(null);
    const response = await getSuperPdpDirectoryEntries(company.number);
    setIsSearchingDirectory(false);
    if (!response.ok) {
      setDirectoryError('Impossible de charger les adresses de réception.');
      return;
    }
    setDirectoryEntries(response.data.data.filter((entry) => entry.is_active));
    if (!response.data.data.some((entry) => entry.is_active)) setDirectoryError('Cette entreprise ne possède pas d’adresse de réception active.');
  }

  function selectDirectoryEntry(entry: SuperPdpDirectoryEntry) {
    const separator = entry.identifier.indexOf(':');
    if (separator < 1) {
      setDirectoryError('L’adresse retournée par l’annuaire est invalide.');
      return;
    }
    const [electronicAddressScheme, electronicAddress] = [entry.identifier.slice(0, separator), entry.identifier.slice(separator + 1)];
    const nextClient: Client = {
      ...clientInfos,
      name: entry.company.formal_name || clientInfos.name,
      address: entry.company.address || clientInfos.address,
      city: entry.company.city || clientInfos.city,
      postalCode: entry.company.postcode || clientInfos.postalCode,
      country: entry.company.country || clientInfos.country,
      clientType: 'BUSINESS',
      siren: entry.company.number,
      electronicAddress,
      electronicAddressScheme,
    };
    setClientInfos(nextClient);
    onClientChange(nextClient);
    setDirectoryEntries([]);
    setDirectoryCompanies([]);
  }

  return (
    <div className={`border border-gray-200 rounded-md p-4 mb-6 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <header className="flex items-center gap-4 mb-6">
        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold font-title">
          <span>01</span>
        </div>
        <h2 className="text-lg font-title font-semibold mb-1">Détails du client</h2>

      </header>

        <div className="flex justify-end">
          <div className="flex flex-col items-end">
            {/* client selector */}
            <div className='relative inline-block border border-gray-300 rounded-md px-2 py-1 cursor-pointer' onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}>
              <span className="flex items-center gap-2 text-sm font-medium  tracking-wider"> <ChevronDown className="w-4 h-4" />  {selectedClient ? selectedClient.name : 'Sélectionner un client'}</span>

              <ul className={`absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-md z-10 ${isDropdownOpen ? 'block' : 'hidden'}`}>
                <li className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 cursor-pointer" onClick={() => {
                  setSelectedClient(null);
                  setClientInfos({
                    id: "",
                    name: "",
                    email: "",
                    address: "",
                    city: "",
                    postalCode: "",
                    country: "",
                    clientType: 'CLIENT',
                  });
                  setIsDropdownOpen(false);
                  onClientChange(null);
                }}>
                  Sélectionner un client
                </li>
                {isLoadingClients && (
                  <li className="px-3 py-2 text-sm text-gray-500">
                    Chargement des clients…
                  </li>
                )}
                {!isLoadingClients && clients.length === 0 && (
                  <li className="px-3 py-2 text-sm text-gray-500">
                    Aucun client enregistré
                  </li>
                )}
                {clients.map(client => (
                  <li
                    key={client.id}
                    className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setSelectedClient(client);
                      setClientInfos(client);
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

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-gray-500 tracking-wider">Type de client</legend>
            <div className="flex flex-wrap gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input type="radio" name="document-client-type" value="BUSINESS" checked={clientInfos.clientType === 'BUSINESS'} onChange={() => handleClientTypeChange('BUSINESS')} />
                Entreprise
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input type="radio" name="document-client-type" value="CLIENT" checked={clientInfos.clientType === 'CLIENT'} onChange={() => handleClientTypeChange('CLIENT')} />
                Particulier
              </label>
            </div>
          </fieldset>

          {clientInfos.clientType === 'BUSINESS' && <>
            <div className="grid gap-4 md:grid-cols-2">{(['siren', 'vatNumber', 'electronicAddress', 'electronicAddressScheme'] as const).map((field) => <div key={field}><label className="mb-1 inline-block text-sm font-medium text-gray-500">{{ siren: 'SIREN', vatNumber: 'TVA intracommunautaire', electronicAddress: 'Adresse électronique de réception', electronicAddressScheme: 'Schéma de réception' }[field]}</label><input disabled={disabled} name={field} value={clientInfos[field] ?? ''} onChange={handleChange} className="w-full border-b border-gray-300 p-2 outline-none" /></div>)}</div>
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
              <p className="mb-2 font-medium text-zinc-700">Adresse de réception électronique</p>
              <button type="button" disabled={disabled || isSearchingDirectory} onClick={() => void searchDirectory()} className="rounded-md border border-primary px-3 py-2 text-primary hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50">
                {isSearchingDirectory ? 'Recherche…' : 'Rechercher dans l’annuaire SuperPDP'}
              </button>
              {directoryError && <p className="mt-2 text-rose-600">{directoryError}</p>}
              {!!directoryCompanies.length && <div className="mt-3 space-y-2"><p className="text-zinc-600">Choisissez l’entreprise :</p>{directoryCompanies.map((company) => <button key={company.number} type="button" onClick={() => void loadDirectoryEntries(company)} className="block w-full rounded border border-zinc-200 bg-white p-2 text-left hover:border-primary"><strong>{company.formal_name}</strong> · {company.number}<br /><span className="text-xs text-zinc-500">{company.address}, {company.postcode} {company.city}</span></button>)}</div>}
              {!!directoryEntries.length && <div className="mt-3 space-y-2"><p className="text-zinc-600">Choisissez le point de réception :</p>{directoryEntries.map((entry) => <button key={entry.identifier} type="button" onClick={() => selectDirectoryEntry(entry)} className="block w-full rounded border border-zinc-200 bg-white p-2 text-left font-mono hover:border-primary">{entry.identifier}</button>)}</div>}
            </div>
          </>}

          {/* Name and email */}
          <div className="flex flex-col gap-8 md:flex-row md:gap-16">

            <div>
              <label htmlFor="customer-name" className="inline-block text-sm font-medium text-gray-500 tracking-wider mb-1">Nom du client <span className="text-red-500">*</span></label>
              <input disabled={disabled}
                type="text"
                id="customer-name"
                name="name"
                className="inline-block w-full border-b border-gray-300 p-2 outline-none focus:outline-none placeholder:text-gray-300"
                placeholder="e.g. Société ABC"
                value={clientInfos.name}
                onChange={handleChange}
              />
              {documentClientErrors && documentClientErrors.name && (
                <ul>
                  { documentClientErrors.name.map((error, index) => (
                      <li><span key={index} className="text-red-500">{error}</span></li>
                    ))
                  }
                </ul>
              )}
            </div>

            <div>
              <label htmlFor="customer-email" className="inline-block text-sm font-medium text-gray-500 tracking-wider mb-1">Email du client <span className="text-red-500">*</span></label>
              <input disabled={disabled}
                type="email"
                id="customer-email"
                name="email"
                className="inline-block w-full border-b border-gray-300 p-2 outline-none focus:outline-none placeholder:text-gray-300"
                placeholder="e.g. contact@societe-abc.com"
                value={clientInfos.email}
                onChange={handleChange}
              />
              {documentClientErrors && documentClientErrors.email && (
                <ul>
                  {documentClientErrors.email.map((error, index) => (
                      <li><span key={index} className="text-red-500">{error}</span></li>
                    ))
                  }
                </ul>
              )}
            </div>
          </div>

          {/* address */}
          <div>
            <label htmlFor="customer-address" className="inline-block text-sm font-medium text-gray-500 tracking-wider mb-1">Adresse du client <span className="text-red-500">*</span></label>
            <input disabled={disabled}
              type="text"
              id="customer-address"
              name="address"
              className="inline-block w-full border-b border-gray-300 p-2 outline-none focus:outline-none placeholder:text-gray-300 mb-4"
              placeholder="e.g. 10 rue de la Paix"
              value={clientInfos.address}
              onChange={handleChange}
            />
              {documentClientErrors && documentClientErrors.address && (
                <ul>
                  { documentClientErrors.address.map((error, index) => (
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
              <input disabled={disabled}
                type="text"
                id="city"
                name="city"
                className="inline-block w-full border-b border-gray-300 p-2 outline-none focus:outline-none placeholder:text-gray-300"
                placeholder="e.g. Paris"
                value={clientInfos.city}
                onChange={handleChange}
              />
              {documentClientErrors && documentClientErrors.city && (
                <ul>
                  { documentClientErrors.city.map((error, index) => (
                      <li><span key={index} className="text-red-500">{error}</span></li>
                    ))
                  }
                </ul>
              )}
            </div>

            <div className="md:w-1/2">
              <label htmlFor="postal-code" className="inline-block text-sm font-medium text-gray-500 tracking-wider mb-1">Code postal <span className="text-red-500">*</span></label>
              <input disabled={disabled}
                type="text"
                id="postal-code"
                name="postalCode"
                className="inline-block w-full border-b border-gray-300 p-2 outline-none focus:outline-none placeholder:text-gray-300"
                placeholder="e.g. 77500"
                value={clientInfos.postalCode}
                onChange={handleChange}
              />
              {documentClientErrors && documentClientErrors.postalCode && (
                <ul>
                  { documentClientErrors.postalCode.map((error, index) => (
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
            <input disabled={disabled}
              type="text"
              id="customer-country"
              name="country"
              className="inline-block w-full border-b border-gray-300 p-2 outline-none focus:outline-none placeholder:text-gray-300 mb-4"
              placeholder="e.g. France"
              value={clientInfos.country}
              onChange={handleChange}
            />
          </div>

          {documentClientErrors && documentClientErrors.general && (
            <>
              <ul>
                { documentClientErrors.general.map((error, index) => (
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
