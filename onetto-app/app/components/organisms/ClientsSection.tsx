"use client";
import { Client } from "@/app/types";
import React from "react";
import ClientCard from "../molecules/Client/ClientCard";
import AddClientForm from "../molecules/Client/AddClientForm";
import DeleteClientModal from "../molecules/Client/DeleteClientModal";
import {
  createActiveCompanyClient,
  deleteActiveCompanyClient,
  updateActiveCompanyClient,
} from "@/lib/companies/catalog";
import { useToast } from "../context/ToastContext";
import CatalogToolbar, { type CatalogView } from "../molecules/CatalogToolbar";

interface ClientSectionProps {
  clients: Client[];
  canCreate: boolean;
}

function ClientSection({ clients, canCreate }: ClientSectionProps) {
  const [isAddFormActive, setIsAddFormActive] = React.useState(false);
  const [masterClientList, setMasterClientList] =
    React.useState<Client[]>(clients);
  const [clientToEdit, setClientToEdit] = React.useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = React.useState<Client | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [filter, setFilter] = React.useState("all");
  const [sort, setSort] = React.useState("name-asc");
  const [view, setView] = React.useState<CatalogView>("grid");
  const { showToast } = useToast();
  const collator = React.useMemo(() => new Intl.Collator("fr", { sensitivity: "base" }), []);
  const filters = React.useMemo(() => [
    { value: "all", label: "Tous", count: masterClientList.length },
    { value: "BUSINESS", label: "Entreprise", count: masterClientList.filter((client) => client.clientType === "BUSINESS").length },
    { value: "CLIENT", label: "Particulier", count: masterClientList.filter((client) => client.clientType === "CLIENT").length },
  ], [masterClientList]);
  const visibleClients = React.useMemo(() => {
    const query = deferredSearch.trim().toLocaleLowerCase("fr");
    return masterClientList
      .filter((client) => filter === "all" || client.clientType === filter)
      .filter((client) => !query || [client.name, client.email, client.city, client.siren, client.vatNumber]
        .some((value) => value?.toLocaleLowerCase("fr").includes(query)))
      .sort((a, b) => (sort === "name-desc" ? -1 : 1) * collator.compare(a.name, b.name));
  }, [masterClientList, deferredSearch, filter, sort, collator]);

  async function handleAddClient(newClient: Client) {
    const response = await createActiveCompanyClient(newClient);

    if (!response.ok) {
      showToast("Impossible de créer ce client.", "error");
      return false;
    }

    setMasterClientList((clients) => [...clients, response.data]);
    showToast("Client créé avec succès.", "success");
    return true;
  }

  function handleTriggerEdit(clientId: string) {
    const client = masterClientList.find((client) => client.id === clientId);
    if (client) {
      setClientToEdit(client);
      setIsAddFormActive(true);
    }
  }

  async function handleEditClient(clientToEdit: Client) {
    const response = await updateActiveCompanyClient(clientToEdit);

    if (!response.ok) {
      showToast("Impossible de modifier ce client.", "error");
      return false;
    }

    setMasterClientList((clients) =>
      clients.map((client) =>
        client.id === clientToEdit.id ? response.data : client,
      ),
    );
    showToast("Client modifié avec succès.", "success");
    return true;
  }

  function handleTriggerDelete(clientId: string) {
    const client = masterClientList.find((client) => client.id === clientId);
    if (client) {
      setClientToDelete(client);
    }
  }

  async function handleConfirmDelete() {
    if (!clientToDelete) {
      return;
    }

    setIsDeleting(true);
    const response = await deleteActiveCompanyClient(clientToDelete.id);
    setIsDeleting(false);

    if (!response.ok) {
      showToast("Impossible de supprimer ce client.", "error");
      return;
    }

    setMasterClientList((clients) =>
      clients.filter((client) => client.id !== clientToDelete.id),
    );
    setClientToDelete(null);
    showToast("Client supprimé avec succès.", "success");
  }

  return (
    <>
      <AddClientForm
        key={clientToEdit?.id ?? "new-client"}
        isActive={isAddFormActive}
        setIsActive={setIsAddFormActive}
        onClose={() => setClientToEdit(null)}
        handleAddClient={handleAddClient}
        clientToEdit={clientToEdit}
        handleEditClient={handleEditClient}
      />
      {clientToDelete && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-client-title"
        >
          <DeleteClientModal
            client={clientToDelete}
            isDeleting={isDeleting}
            onCancel={() => setClientToDelete(null)}
            onConfirm={() => void handleConfirmDelete()}
          />
        </div>
      )}
      <div>
        <CatalogToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Rechercher un client…"
          filters={filters}
          filter={filter}
          onFilterChange={setFilter}
          sort={sort}
          sortOptions={[{ value: "name-asc", label: "Trier par : Nom (A → Z)" }, { value: "name-desc", label: "Trier par : Nom (Z → A)" }]}
          onSortChange={setSort}
          view={view}
          onViewChange={setView}
          resultCount={visibleClients.length}
          resultName="client"
          addLabel="Ajouter un client"
          onAdd={() => {
            setClientToEdit(null);
            setIsAddFormActive(true);
          }}
          canCreate={canCreate}
        />

        {visibleClients.length === 0 ? (
          <div className="mt-6 rounded-ui-card border border-ui-border bg-ui-surface p-8 text-center text-sm text-ui-secondary">
            {masterClientList.length === 0 ? "Aucun client dans ce catalogue." : "Aucun client ne correspond à votre recherche."}
          </div>
        ) : (
          <ul className={`mt-5 grid gap-4 ${view === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>
            {visibleClients.map((client) => (
              <li key={client.id} className="h-full">
                <ClientCard
                  client={client}
                  triggerEdit={handleTriggerEdit}
                  triggerDelete={handleTriggerDelete}
                  view={view}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export default ClientSection;
