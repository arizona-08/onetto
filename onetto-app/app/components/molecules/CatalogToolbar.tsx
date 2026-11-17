"use client";

import { LayoutGrid, List, Plus, Search } from "lucide-react";
import { useId } from "react";

export type CatalogView = "grid" | "list";

type Filter = { value: string; label: string; count: number };
type SortOption = { value: string; label: string };

interface CatalogToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  filters: Filter[];
  filter: string;
  onFilterChange: (value: string) => void;
  sort: string;
  sortOptions: SortOption[];
  onSortChange: (value: string) => void;
  view: CatalogView;
  onViewChange: (value: CatalogView) => void;
  resultCount: number;
  resultName: string;
  resultPlural?: string;
  addLabel: string;
  onAdd: () => void;
  canCreate: boolean;
}

export default function CatalogToolbar({
  search, onSearchChange, searchPlaceholder, filters, filter, onFilterChange,
  sort, sortOptions, onSortChange, view, onViewChange, resultCount, resultName, resultPlural,
  addLabel, onAdd, canCreate,
}: CatalogToolbarProps) {
  const sortId = useId();
  return (
    <div className="mt-8 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-1 basis-64">
          <span className="sr-only">{searchPlaceholder}</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-secondary" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-11 w-full rounded-ui-control border border-ui-border bg-ui-surface pl-10 pr-4 text-sm text-ui-text shadow-ui-card outline-none placeholder:text-ui-secondary focus:border-ui-primary focus:ring-2 focus:ring-ui-primary/15"
          />
        </label>
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-ui-control border border-ui-border bg-ui-surface p-1 shadow-ui-card" role="group" aria-label="Filtrer le catalogue">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onFilterChange(item.value)}
              aria-pressed={filter === item.value}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${filter === item.value ? "bg-ui-primary-soft text-ui-primary" : "text-ui-secondary hover:bg-ui-subtle hover:text-ui-text"}`}
            >
              {item.label} <span className="text-xs opacity-70">({item.count})</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={!canCreate}
          title={canCreate ? undefined : "L’entreprise active est fermée"}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-ui-control bg-ui-primary px-5 text-sm font-semibold text-white shadow-ui-card transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {addLabel}
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-ui-secondary" aria-live="polite">
          {resultCount} {resultCount === 1 ? resultName : resultPlural ?? `${resultName}s`}
        </p>
        <div className="flex items-center gap-3">
          <label className="sr-only" htmlFor={sortId}>Trier par</label>
          <select
            id={sortId}
            value={sort}
            onChange={(event) => onSortChange(event.target.value)}
            className="h-10 max-w-52 rounded-ui-control border border-ui-border bg-ui-surface px-3 text-sm text-ui-text shadow-ui-card focus-visible:outline-2 focus-visible:outline-ui-primary"
          >
            {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <div className="flex rounded-ui-control border border-ui-border bg-ui-surface p-1 shadow-ui-card" role="group" aria-label="Affichage du catalogue">
            <button type="button" onClick={() => onViewChange("grid")} aria-label="Affichage en grille" aria-pressed={view === "grid"} className={`rounded-lg p-2 ${view === "grid" ? "bg-ui-primary-soft text-ui-primary" : "text-ui-secondary hover:bg-ui-subtle"}`}>
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onViewChange("list")} aria-label="Affichage en liste" aria-pressed={view === "list"} className={`rounded-lg p-2 ${view === "list" ? "bg-ui-primary-soft text-ui-primary" : "text-ui-secondary hover:bg-ui-subtle"}`}>
              <List className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
