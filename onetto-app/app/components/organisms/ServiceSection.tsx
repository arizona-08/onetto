"use client";
import { Service } from "@/app/types";
import React from "react";
import ServiceCard from "../molecules/Service/ServiceCard";
import AddServiceForm from "../molecules/Service/AddServiceForm";
import DeleteServiceModal from "../molecules/Service/DeleteServiceModal";
import {
  createActiveCompanyService,
  deleteActiveCompanyService,
  updateActiveCompanyService,
} from "@/lib/companies/catalog";
import { useToast } from "../context/ToastContext";
import CatalogToolbar, { type CatalogView } from "../molecules/CatalogToolbar";

interface ServiceSectionProps {
  services: Service[];
  canCreate: boolean;
}
function ServiceSection({ services, canCreate }: ServiceSectionProps) {
  const [isAddFormActive, setIsAddFormActive] = React.useState(false);
  const [masterServiceList, setMasterServiceList] =
    React.useState<Service[]>(services);

  const [serviceToEdit, setServiceToEdit] = React.useState<Service | null>(
    null,
  );
  const [serviceToDelete, setServiceToDelete] = React.useState<Service | null>(
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
  const searchedServices = React.useMemo(() => {
    const query = deferredSearch.trim().toLocaleLowerCase("fr");
    return masterServiceList
      .filter((service) => !query || [service.name, service.description, service.category, service.unit]
        .some((value) => value?.toLocaleLowerCase("fr").includes(query)));
  }, [masterServiceList, deferredSearch]);
  const filters = React.useMemo(() => [
    { value: "all", label: "Tout", count: searchedServices.length },
    { value: "SERVICES", label: "Services", count: searchedServices.filter((service) => service.itemType === "SERVICES").length },
    { value: "GOODS", label: "Produits", count: searchedServices.filter((service) => service.itemType === "GOODS").length },
  ], [searchedServices]);
  const visibleServices = React.useMemo(() => {
    return searchedServices
      .filter((service) => filter === "all" || service.itemType === filter)
      .sort((a, b) => {
        if (sort === "price-asc" || sort === "price-desc") {
          return (sort === "price-asc" ? 1 : -1) * (Number(a.unitPrice) - Number(b.unitPrice));
        }
        return (sort === "name-desc" ? -1 : 1) * collator.compare(a.name, b.name);
      });
  }, [searchedServices, filter, sort, collator]);

  async function handleAddService(newService: Service) {
    const response = await createActiveCompanyService(newService);

    if (!response.ok) {
      showToast("Impossible de créer ce service.", "error");
      return false;
    }

    setMasterServiceList((services) => [...services, response.data]);
    showToast("Service créé avec succès.", "success");
    return true;
  }

  function handleTriggerEdit(serviceId: string) {
    const service = masterServiceList.find(
      (service) => service.id === serviceId,
    );
    if (service) {
      setServiceToEdit(service);
      setIsAddFormActive(true);
    }
  }

  async function handleEditService(serviceToEdit: Service) {
    const response = await updateActiveCompanyService(serviceToEdit);

    if (!response.ok) {
      showToast("Impossible de modifier ce service.", "error");
      return false;
    }

    setMasterServiceList((services) =>
      services.map((service) =>
        service.id === serviceToEdit.id ? response.data : service,
      ),
    );
    showToast("Service modifié avec succès.", "success");
    return true;
  }

  function handleTriggerDelete(serviceId: string) {
    const service = masterServiceList.find(
      (service) => service.id === serviceId,
    );
    if (service) {
      setServiceToDelete(service);
    }
  }

  async function handleConfirmDelete() {
    if (!serviceToDelete) {
      return;
    }

    setIsDeleting(true);
    const response = await deleteActiveCompanyService(serviceToDelete.id);
    setIsDeleting(false);

    if (!response.ok) {
      showToast("Impossible de supprimer ce service.", "error");
      return;
    }

    setMasterServiceList((services) =>
      services.filter((service) => service.id !== serviceToDelete.id),
    );
    setServiceToDelete(null);
    showToast("Service supprimé avec succès.", "success");
  }

  return (
    <>
      <AddServiceForm
        key={serviceToEdit?.id ?? "new-service"}
        isActive={isAddFormActive}
        setIsActive={setIsAddFormActive}
        onClose={() => setServiceToEdit(null)}
        handleAddService={handleAddService}
        serviceToEdit={serviceToEdit}
        handleEditService={handleEditService}
      />
      {serviceToDelete && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-service-title"
        >
          <DeleteServiceModal
            service={serviceToDelete}
            isDeleting={isDeleting}
            onCancel={() => setServiceToDelete(null)}
            onConfirm={() => void handleConfirmDelete()}
          />
        </div>
      )}
      <div>
        <CatalogToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Rechercher un produit ou un service…"
          filters={filters}
          filter={filter}
          onFilterChange={setFilter}
          sort={sort}
          sortOptions={[
            { value: "name-asc", label: "Trier par : Nom (A → Z)" },
            { value: "name-desc", label: "Trier par : Nom (Z → A)" },
            { value: "price-asc", label: "Trier par : Prix croissant" },
            { value: "price-desc", label: "Trier par : Prix décroissant" },
          ]}
          onSortChange={setSort}
          view={view}
          onViewChange={setView}
          resultCount={visibleServices.length}
          resultName="produit ou service"
          resultPlural="produits ou services"
          addLabel="Ajouter un produit ou service"
          onAdd={() => {
            setServiceToEdit(null);
            setIsAddFormActive(true);
          }}
          canCreate={canCreate}
        />

        {visibleServices.length === 0 ? (
          <div className="mt-6 rounded-ui-card border border-ui-border bg-ui-surface p-8 text-center text-sm text-ui-secondary">
            {masterServiceList.length === 0 ? "Aucun produit ou service dans ce catalogue." : "Aucun résultat ne correspond à votre recherche."}
          </div>
        ) : (
          <ul className={`mt-5 grid gap-4 ${view === "grid" ? "sm:grid-cols-2" : "grid-cols-1"}`}>
            {visibleServices.map((service) => (
              <li key={service.id} className="h-full">
                <ServiceCard
                  service={service}
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

export default ServiceSection;
