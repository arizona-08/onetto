import CreateCompanyForm from "@/app/components/molecules/Forms/CreateCompanyForm";
import AuthBrand from "../../AuthBrand";
import Link from "next/link";

export default function CreateCompanyPage() {
  return (
    <main
      className="min-h-dvh bg-ui-background px-4 py-10 sm:px-6"
      style={{ backgroundImage: "radial-gradient(circle at 50% 20%, var(--onetto-surface) 0%, var(--onetto-background) 72%, var(--onetto-primary-soft) 160%)" }}
    >
      <div className="mx-auto w-full max-w-4xl">
        <AuthBrand />
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-title text-3xl font-semibold tracking-tight text-ui-text sm:text-4xl">Créer mon entreprise</h1>
            <p className="mt-1 text-sm text-ui-secondary">Renseignez les informations nécessaires pour commencer à utiliser Onetto.</p>
          </div>
          <Link
            href="/auth/login"
            className="inline-flex min-h-10 items-center rounded-ui-control border border-ui-border bg-ui-surface px-4 py-2 text-sm font-semibold text-ui-text shadow-ui-card transition-colors hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-ui-primary"
          >
            Passer cette étape et me connecter
          </Link>
        </header>
        <CreateCompanyForm />
      </div>
    </main>
  );
}
