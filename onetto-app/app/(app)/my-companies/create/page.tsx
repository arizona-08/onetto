"use client";

import CreateCompanyForm from "@/app/components/molecules/Forms/CreateCompanyForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function CreateCompanyPage() {
  const router = useRouter();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-7 lg:px-9">
      <Link
        href="/my-companies"
        className="inline-flex items-center gap-2 text-sm font-medium text-ui-secondary hover:text-ui-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux entreprises
      </Link>
      <div className="mt-5">
        <h1 className="font-title text-3xl font-semibold tracking-tight text-ui-text">
          Ajouter une entreprise
        </h1>
        <p className="mt-1 text-sm text-ui-secondary">
          Cette entreprise deviendra votre entreprise active après sa création.
        </p>
        <div className="mt-6">
          <CreateCompanyForm
            onCancel={() => router.push("/my-companies")}
            onSuccess={() => {
              router.refresh();
              router.push("/my-companies");
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default CreateCompanyPage;
