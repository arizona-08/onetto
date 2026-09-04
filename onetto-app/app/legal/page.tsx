import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Informations légales | Onetto',
  description: 'Mentions légales du service Onetto.',
};

const sections = [
  { number: '01', label: 'Mentions légales', available: true },
  { number: '02', label: 'Politique de confidentialité', available: false },
  { number: '03', label: 'Conditions générales d’utilisation', available: false },
  { number: '04', label: 'Conditions générales de vente', available: false },
];

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground sm:px-10 lg:px-16 lg:py-16">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-3xl">
          <p className="font-title text-sm font-bold uppercase tracking-[0.18em] text-primary">Onetto</p>
          <h1 className="mt-4 font-title text-4xl font-semibold tracking-tight text-secondary sm:text-5xl">
            Informations légales
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
            Retrouvez les informations qui encadrent l’utilisation de la plateforme Onetto.
          </p>
        </header>

        <div className="mt-16 grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-20">
          <aside className="lg:pt-1" aria-label="Sommaire des informations légales">
            <p className="font-title text-xs font-bold uppercase tracking-[0.16em] text-primary">Sommaire</p>
            <nav className="mt-4 border-l border-primary/20" aria-label="Navigation des rubriques">
              <ol className="space-y-1">
                {sections.map((section) => (
                  <li key={section.number}>
                    {section.available ? (
                      <a
                        href="#mentions-legales"
                        className="-ml-px flex items-start gap-3 border-l-2 border-primary px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                      >
                        <span className="pt-0.5 text-xs font-bold text-primary/60">{section.number}</span>
                        <span>{section.label}</span>
                      </a>
                    ) : (
                      <span className="flex items-start gap-3 px-4 py-3 text-sm leading-5 text-zinc-400">
                        <span className="pt-0.5 text-xs font-bold text-zinc-300">{section.number}</span>
                        <span>{section.label}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article id="mentions-legales" className="max-w-2xl scroll-mt-8">
            <div className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">01</span>
              <p className="font-title text-xs font-bold uppercase tracking-[0.16em] text-primary">Informations légales</p>
            </div>

            <h2 className="mt-5 font-title text-3xl font-semibold tracking-tight text-secondary">Mentions légales</h2>
            <p className="mt-3 text-sm text-zinc-500">Dernière mise à jour : 10 septembre 2026</p>

            <div className="mt-10 space-y-10 text-[15px] leading-7 text-zinc-600 sm:text-base">
              <section>
                <h3 className="font-title text-lg font-bold text-secondary">Éditeur du service</h3>
                <p className="mt-4">Le site et l’application <strong className="font-semibold text-secondary">Onetto</strong>, accessibles à l’adresse <a className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-hover" href="https://onetto.fr">onetto.fr</a>, sont édités par :</p>
                <address className="mt-4 not-italic">
                  <p className="font-semibold text-secondary">Jonathan ASSI</p>
                  <p>Entrepreneur individuel exerçant sous le régime de la micro-entreprise</p>
                  <p>10 rue des Semailles, 77230 Rouvres, France</p>
                  <p>SIREN : 102 765 955</p>
                  <p>SIRET : 102 765 955 00012</p>
                  <p>E-mail : <a className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-hover" href="mailto:contact@marc-assi.com">contact@marc-assi.com</a></p>
                </address>
                <p className="mt-5">Directeur de la publication : <strong className="font-semibold text-secondary">Jonathan ASSI</strong>.</p>
              </section>

              <section>
                <h3 className="font-title text-lg font-bold text-secondary">Hébergement</h3>
                <p className="mt-4">Le site et l’application sont hébergés par <strong className="font-semibold text-secondary">OVH SAS</strong>, 2 rue Kellermann, 59100 Roubaix, France.</p>
                <p className="mt-4">Les documents et fichiers associés au service peuvent être stockés via <strong className="font-semibold text-secondary">Amazon Web Services EMEA SARL (AWS)</strong>, 38 Avenue John F. Kennedy, L-1855 Luxembourg.</p>
              </section>

              <section>
                <h3 className="font-title text-lg font-bold text-secondary">Objet du service</h3>
                <p className="mt-4">Onetto est une application destinée aux professionnels, permettant notamment de créer, gérer et envoyer des devis et des factures, ainsi que d’accéder à des fonctionnalités associées, dont des solutions de paiement.</p>
              </section>

              <section>
                <h3 className="font-title text-lg font-bold text-secondary">Propriété intellectuelle</h3>
                <p className="mt-4">L’ensemble des éléments composant Onetto, notamment les textes, marques, logos, illustrations, graphismes, interfaces, logiciels et bases de données, est protégé par les droits de propriété intellectuelle.</p>
                <p className="mt-4">Toute reproduction, représentation, adaptation ou exploitation, totale ou partielle, de ces éléments sans autorisation écrite préalable de l’éditeur est interdite, sauf disposition légale contraire.</p>
              </section>

              <section>
                <h3 className="font-title text-lg font-bold text-secondary">Responsabilité</h3>
                <p className="mt-4">L’éditeur s’efforce d’assurer l’exactitude et la mise à jour des informations et fonctionnalités proposées sur Onetto. Il ne peut toutefois garantir l’absence d’erreur, d’interruption ou d’indisponibilité temporaire du service.</p>
                <p className="mt-4">L’utilisateur reste responsable de l’utilisation du service, des informations qu’il renseigne et de la conformité des documents commerciaux ou comptables qu’il émet.</p>
              </section>

              <section>
                <h3 className="font-title text-lg font-bold text-secondary">Données personnelles</h3>
                <p className="mt-4">Les modalités de collecte et de traitement des données personnelles sont détaillées dans la Politique de confidentialité d’Onetto.</p>
                <p className="mt-4">Pour toute question relative aux données personnelles ou pour exercer vos droits, vous pouvez écrire à <a className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-hover" href="mailto:contact@marc-assi.com">contact@marc-assi.com</a>.</p>
              </section>

              <section>
                <h3 className="font-title text-lg font-bold text-secondary">Droit applicable</h3>
                <p className="mt-4">Les présentes mentions légales sont soumises au droit français.</p>
              </section>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
