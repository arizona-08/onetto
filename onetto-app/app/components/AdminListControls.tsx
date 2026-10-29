import Link from "next/link";

export type AdminSearchParams = Record<string, string | string[] | undefined>;

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function getAdminListState(
  params: AdminSearchParams,
  queryKey = "q",
  pageKey = "page",
) {
  const rawQuery = params[queryKey];
  const rawPage = params[pageKey];
  const query =
    typeof rawQuery === "string" ? rawQuery.trim().slice(0, 100) : "";
  const parsedPage = typeof rawPage === "string" ? Number(rawPage) : 1;
  const page =
    Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  return { query, page };
}

export default function AdminListControls({
  path,
  searchParams,
  pagination,
  placeholder,
  label,
  queryKey = "q",
  pageKey = "page",
}: {
  path: string;
  searchParams: AdminSearchParams;
  pagination: Pagination;
  placeholder: string;
  label: string;
  queryKey?: string;
  pageKey?: string;
}) {
  const { query } = getAdminListState(searchParams, queryKey, pageKey);
  const retainedParams = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key !== queryKey && key !== pageKey && typeof value === "string") {
      retainedParams.set(key, value);
    }
  }

  function pageHref(page: number, clearQuery = false) {
    const params = new URLSearchParams(retainedParams);
    if (query && !clearQuery) params.set(queryKey, query);
    if (page > 1) params.set(pageKey, String(page));
    const suffix = params.toString();
    return suffix ? `${path}?${suffix}` : path;
  }

  return (
    <div className="space-y-3 border-b border-zinc-100 px-5 py-4">
      <form action={path} method="get" className="flex flex-wrap gap-2">
        {Array.from(retainedParams).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
        <label className="sr-only" htmlFor={`${queryKey}-search`}>
          {label}
        </label>
        <input
          id={`${queryKey}-search`}
          type="search"
          name={queryKey}
          defaultValue={query}
          maxLength={100}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Rechercher
        </button>
        {query && (
          <Link
            href={pageHref(1, true)}
            className="rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Effacer
          </Link>
        )}
      </form>
      <nav
        aria-label={`Pagination ${label.toLowerCase()}`}
        className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600"
      >
        <span>
          {pagination.total} résultat{pagination.total > 1 ? "s" : ""} · page{" "}
          {pagination.page} sur {pagination.totalPages}
        </span>
        <span className="flex items-center gap-2">
          {pagination.page > pagination.totalPages && (
            <Link href={pageHref(1)} className="hover:text-primary">
              Retour à la première page
            </Link>
          )}
          {pagination.page > 1 && (
            <Link
              href={pageHref(pagination.page - 1)}
              className="hover:text-primary"
            >
              Précédent
            </Link>
          )}
          {pagination.page < pagination.totalPages && (
            <Link
              href={pageHref(pagination.page + 1)}
              className="hover:text-primary"
            >
              Suivant
            </Link>
          )}
        </span>
      </nav>
    </div>
  );
}
