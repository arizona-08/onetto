import { Building2 } from "lucide-react";
import { getCompanyLogoUrl } from "@/lib/companies/companies";

export default function CompanyLogo({ companyId, updatedAt, className = "w-20" }: {
  companyId: string;
  updatedAt?: string | null;
  className?: string;
}) {
  if (updatedAt) {
    return (
      <div className={`shrink-0 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getCompanyLogoUrl(companyId, updatedAt)}
          alt="Logo de l’entreprise"
          className="block h-auto w-full"
        />
      </div>
    );
  }

  return (
    <div className={`grid aspect-square shrink-0 place-items-center rounded-ui-control bg-ui-primary-soft text-ui-primary ${className}`}>
      <Building2 className="h-1/3 w-1/3" aria-hidden="true" />
    </div>
  );
}
