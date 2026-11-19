"use client";

import { ChevronDown, Download, FileCode2, FileText, LoaderCircle } from "lucide-react";
import { useRef } from "react";

export type SupplierInvoiceDownloadFormat = "original" | "pdf";

export default function SupplierInvoiceDownloadMenu({
  invoiceNumber,
  originalContentType,
  busy,
  onDownload,
}: {
  invoiceNumber: string;
  originalContentType: string | null;
  busy: boolean;
  onDownload: (format: SupplierInvoiceDownloadFormat) => void;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  function choose(format: SupplierInvoiceDownloadFormat) {
    if (menuRef.current) menuRef.current.open = false;
    onDownload(format);
  }

  return (
    <details ref={menuRef} className="relative inline-block text-left">
      <summary
        aria-label={`Télécharger la facture fournisseur ${invoiceNumber}`}
        className={`inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden ${busy ? "pointer-events-none opacity-60" : ""}`}
      >
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
        {busy ? "Téléchargement…" : "Télécharger"}
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </summary>
      <div className="absolute right-0 z-20 mt-1 min-w-52 rounded-xl border border-ui-border bg-white p-1.5 shadow-ui-popover">
        <button
          type="button"
          onClick={() => choose("pdf")}
          disabled={busy}
          className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-ui-text hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          PDF lisible
        </button>
        <button
          type="button"
          onClick={() => choose("original")}
          disabled={busy}
          className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-ui-text hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
        >
          <FileCode2 className="h-4 w-4" aria-hidden="true" />
          {originalContentType?.includes("xml")
            ? "XML brut"
            : originalContentType?.includes("pdf")
              ? "PDF original"
              : "Fichier original (XML/PDF)"}
        </button>
      </div>
    </details>
  );
}
